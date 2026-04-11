"""
Helpers for consuming streaming LLM output.

Gemini returns the comic story as a single JSON document shaped by
`GenerateStoryScriptResponse`. When we stream that response we receive it as
raw text fragments. This module provides a tiny state machine that peeks at
those fragments and emits partial values for a fixed set of top-level string
fields (here: ``title`` and ``foreword``) as soon as their characters arrive.

The parser is intentionally minimal: it only supports the fields it is told
about, and it assumes they appear in order and are plain strings. That covers
the streaming-intro use case without pulling in a full JSON streaming library.
"""

from collections.abc import Iterable
from dataclasses import dataclass

# Maps the character following a backslash inside a JSON string to its decoded
# form. Used to turn `\n`, `\"`, etc. into real characters as they stream in.
_JSON_ESCAPES: dict[str, str] = {
    '"': '"',
    "\\": "\\",
    "/": "/",
    "b": "\b",
    "f": "\f",
    "n": "\n",
    "r": "\r",
    "t": "\t",
}


@dataclass
class IntroDelta:
    """A chunk of text produced for one of the tracked intro fields."""

    field: str
    delta: str


class StoryIntroStreamer:
    """Progressive extractor for selected top-level JSON string fields.

    Feed raw text chunks via :meth:`feed` and collect :class:`IntroDelta`
    events in the order the characters arrive. The parser handles standard
    JSON string escapes but ignores ``\\uXXXX`` sequences, which do not appear
    in the story titles or forewords Gemini produces for this project.

    The parser stops emitting events once all tracked fields have been seen,
    so callers can safely keep feeding trailing JSON bytes without side
    effects.
    """

    def __init__(self, fields: Iterable[str]) -> None:
        self._fields: tuple[str, ...] = tuple(fields)
        if not self._fields:
            raise ValueError("StoryIntroStreamer requires at least one field")

        self._buffer: str = ""
        self._field_index: int = 0
        self._inside_value: bool = False
        self._pending_escape: bool = False

    @property
    def is_done(self) -> bool:
        """Whether every tracked field has been fully parsed."""
        return self._field_index >= len(self._fields)

    def feed(self, chunk: str) -> list[IntroDelta]:
        """Ingest a text chunk and return any delta events it produced."""
        if not chunk or self.is_done:
            return []

        self._buffer += chunk
        events: list[IntroDelta] = []

        while not self.is_done:
            current_field = self._fields[self._field_index]

            if not self._inside_value:
                if not self._advance_to_value(current_field):
                    return events
                continue

            delta, finished = self._consume_value_chars()
            if delta:
                events.append(IntroDelta(field=current_field, delta=delta))
            if not finished:
                return events

            self._inside_value = False
            self._field_index += 1

        return events

    def _advance_to_value(self, field: str) -> bool:
        """Skip buffer forward until we are inside ``"field"``'s string value.

        Returns ``True`` when the opening quote of the value has been consumed
        and the parser is ready to read the value's characters. Returns
        ``False`` if more input is needed.
        """
        marker = f'"{field}"'
        marker_index = self._buffer.find(marker)
        if marker_index < 0:
            return False

        after_marker = marker_index + len(marker)
        open_quote_index = self._buffer.find('"', after_marker)
        if open_quote_index < 0:
            return False

        self._buffer = self._buffer[open_quote_index + 1 :]
        self._inside_value = True
        self._pending_escape = False
        return True

    def _consume_value_chars(self) -> tuple[str, bool]:
        """Consume buffered characters that belong to the current string value.

        Returns a tuple ``(delta, finished)`` where ``delta`` contains the
        decoded characters that should be emitted, and ``finished`` is True
        iff the closing quote was reached in this call.
        """
        delta_chars: list[str] = []
        index = 0
        buffer_len = len(self._buffer)

        while index < buffer_len:
            char = self._buffer[index]

            if self._pending_escape:
                self._pending_escape = False
                # `\uXXXX` sequences would need four more characters. We drop
                # them on the floor here rather than shipping partial glyphs.
                if char != "u":
                    delta_chars.append(_JSON_ESCAPES.get(char, char))
                index += 1
                continue

            if char == "\\":
                self._pending_escape = True
                index += 1
                continue

            if char == '"':
                self._buffer = self._buffer[index + 1 :]
                return "".join(delta_chars), True

            delta_chars.append(char)
            index += 1

        self._buffer = ""
        return "".join(delta_chars), False
