"""
Shared Prometheus metrics for the WonderComic backend.

Import these singletons instead of defining new metrics in individual modules —
prometheus_client raises ValueError if the same metric name is registered twice.
"""

from prometheus_client import Counter, Gauge, Histogram

# --- Gemini AI metrics (Task D) ---

gemini_request_duration_seconds = Histogram(
    "gemini_request_duration_seconds",
    "Duration of Gemini API calls in seconds",
    labelnames=["operation"],
    buckets=[1, 2, 5, 10, 20, 30, 60, 120],
)

gemini_failures_total = Counter(
    "gemini_failures_total",
    "Total number of failed Gemini API calls",
    labelnames=["operation"],
)

# --- Story generation funnel metrics (Task E) ---

story_funnel_total = Counter(
    "story_funnel_total",
    "Comic generation funnel — counts by stage and outcome",
    labelnames=["stage", "status"],
)

# --- Concurrency metrics (Task F) ---

stories_generation_in_progress = Gauge(
    "stories_generation_in_progress",
    "Number of story generations currently in progress",
)
