"""Small in-memory rate limit helpers for expensive backend operations."""

import asyncio
import math
import os
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitDecision:
    """Result of one rate-limit check."""

    allowed: bool
    retry_after_seconds: int = 0


class FixedWindowRateLimiter:
    """Async-safe fixed-window limiter keyed by caller identity.

    This intentionally stays process-local and dependency-free. It protects the
    Gemini-backed endpoints from accidental bursts in this single-service demo
    deployment; multi-worker deployments should replace it with shared storage.
    """

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self._max_requests = max(1, max_requests)
        self._window_seconds = max(1, window_seconds)
        self._buckets: dict[str, tuple[float, int]] = {}
        self._lock = asyncio.Lock()

    @property
    def max_requests(self) -> int:
        return self._max_requests

    @property
    def window_seconds(self) -> int:
        return self._window_seconds

    async def check(self, key: str) -> RateLimitDecision:
        """Consume one request for ``key`` if quota remains."""
        now = time.monotonic()

        async with self._lock:
            window_start, request_count = self._buckets.get(key, (now, 0))
            elapsed = now - window_start

            if elapsed >= self._window_seconds:
                self._buckets[key] = (now, 1)
                return RateLimitDecision(allowed=True)

            if request_count >= self._max_requests:
                retry_after = math.ceil(self._window_seconds - elapsed)
                return RateLimitDecision(allowed=False, retry_after_seconds=max(1, retry_after))

            self._buckets[key] = (window_start, request_count + 1)
            return RateLimitDecision(allowed=True)

    async def reset(self) -> None:
        """Clear all buckets. Useful for isolated tests."""
        async with self._lock:
            self._buckets.clear()

    async def configure(self, max_requests: int, window_seconds: int) -> None:
        """Update limits and clear existing buckets."""
        async with self._lock:
            self._max_requests = max(1, max_requests)
            self._window_seconds = max(1, window_seconds)
            self._buckets.clear()


def _read_positive_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        parsed = int(value)
    except ValueError:
        return default

    return parsed if parsed > 0 else default


generation_rate_limiter = FixedWindowRateLimiter(
    max_requests=_read_positive_int("GENERATION_RATE_LIMIT_REQUESTS", 20),
    window_seconds=_read_positive_int("GENERATION_RATE_LIMIT_WINDOW_SECONDS", 60),
)

public_api_rate_limiter = FixedWindowRateLimiter(
    max_requests=_read_positive_int("PUBLIC_API_RATE_LIMIT_REQUESTS", 60),
    window_seconds=_read_positive_int("PUBLIC_API_RATE_LIMIT_WINDOW_SECONDS", 60),
)
