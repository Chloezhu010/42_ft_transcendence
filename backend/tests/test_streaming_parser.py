"""Tests for :mod:`llm.streaming`."""

import json

from llm.streaming import IntroDelta, StoryIntroStreamer


def _collected(streamer: StoryIntroStreamer, chunks: list[str]) -> dict[str, str]:
    """Feed chunks and return the joined delta text keyed by field name."""
    joined: dict[str, str] = {}
    for chunk in chunks:
        for event in streamer.feed(chunk):
            joined[event.field] = joined.get(event.field, "") + event.delta
    return joined


def test_extracts_fields_from_single_chunk() -> None:
    payload = json.dumps(
        {
            "title": "Leo and the Moonbeam",
            "foreword": "A quiet night, a brave heart.",
            "characterDescription": "ignored",
        }
    )
    streamer = StoryIntroStreamer(("title", "foreword"))

    result = _collected(streamer, [payload])

    assert result == {
        "title": "Leo and the Moonbeam",
        "foreword": "A quiet night, a brave heart.",
    }
    assert streamer.is_done


def test_stops_after_last_tracked_field() -> None:
    streamer = StoryIntroStreamer(("title",))
    payload = '{"title": "Hi", "foreword": "Ignore me"}'

    result = _collected(streamer, [payload])

    assert result == {"title": "Hi"}
    assert streamer.is_done
    # Further feeds are no-ops even if unparsed trailing data would match.
    assert streamer.feed('"title": "again"') == []


def test_handles_chunks_split_mid_value() -> None:
    streamer = StoryIntroStreamer(("title", "foreword"))
    chunks = [
        '{"titl',
        'e": "Moon',
        "light Q",
        'uest", "forew',
        'ord": "Tiny ',
        "hero, big skies.",
        '"}',
    ]

    result = _collected(streamer, chunks)

    assert result == {
        "title": "Moonlight Quest",
        "foreword": "Tiny hero, big skies.",
    }
    assert streamer.is_done


def test_decodes_standard_escapes() -> None:
    streamer = StoryIntroStreamer(("title", "foreword"))
    payload = '{"title": "Hero \\"Flash\\"", "foreword": "Line one\\nLine two"}'

    result = _collected(streamer, [payload])

    assert result["title"] == 'Hero "Flash"'
    assert result["foreword"] == "Line one\nLine two"


def test_emits_deltas_incrementally_per_character() -> None:
    streamer = StoryIntroStreamer(("title",))
    streamer.feed('{"title": "')

    # Each character should stream out as its own delta.
    events: list[IntroDelta] = []
    for char in "Bo!":
        events.extend(streamer.feed(char))

    assert [event.delta for event in events] == ["B", "o", "!"]
    assert all(event.field == "title" for event in events)
    assert not streamer.is_done

    closing = streamer.feed('"}')
    assert closing == []
    assert streamer.is_done


def test_raises_on_empty_field_list() -> None:
    try:
        StoryIntroStreamer(())
    except ValueError as err:
        assert "at least one field" in str(err)
    else:
        raise AssertionError("expected ValueError for empty field list")
