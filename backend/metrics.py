"""
Shared Prometheus metrics for the WonderComic backend.

Import these singletons instead of defining new metrics in individual modules —
prometheus_client raises ValueError if the same metric name is registered twice.
"""

from prometheus_client import Counter, Gauge

story_funnel_total = Counter(
    "story_funnel_total",
    "Comic generation funnel — counts by stage and outcome",
    labelnames=["stage", "status"],
)

stories_generation_in_progress = Gauge(
    "stories_generation_in_progress",
    "Number of story generations currently in progress",
)
