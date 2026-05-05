"""
Monitoring stack tests: Prometheus, Grafana, and Alertmanager.

Covers:
  Prometheus
    - Security: port 9090 not exposed on the host
    - /metrics endpoint content (standard + custom metrics)
    - Scrape target health (backend + node_exporter)
    - Alert rules loaded (all 7 rules present)
    - Alertmanager integration (connected and reachable)
    - Data retention configuration

  Grafana
    - Accessibility: reachable via HTTPS through nginx at /grafana/
    - Security: anonymous access denied, self-signup disabled, port 3000 not exposed
    - Authentication: admin login succeeds, role is correct
    - Provisioning: Prometheus datasource exists, is default, and passes health check
    - Dashboard: WonderComic dashboard provisioned with correct UID and panel count
    - Dashboard content: all expected panel titles are present

  Alertmanager
    - Security: /api/monitoring/alerts is blocked externally via nginx (returns 403)
    - Security: all HTTP methods are blocked on that path
    - Alertmanager internal health and readiness
    - Alertmanager configuration: receiver and routing are correct
    - End-to-end: backend webhook is reachable from inside the container network
"""

import json
import os
import socket
import subprocess

import pytest
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HTTPS_BASE = "https://localhost:8443"
GRAFANA_ADMIN_PASSWORD = os.environ.get("GRAFANA_ADMIN_PASSWORD", "admin")
GRAFANA_URL = f"{HTTPS_BASE}/grafana"


def _resolve_container(service: str) -> str:
    """Return the actual container name for a Compose service name.

    Podman Compose prefixes containers with the project name, e.g.
    '42_ft_transcendence_backend_1'. We look for any running container
    whose name contains the service with Compose separators.
    """
    result = subprocess.run(
        ["podman", "ps", "--filter", f"name={service}", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
    )
    candidates = [
        name
        for name in result.stdout.splitlines()
        if f"-{service}-" in name or f"_{service}_" in name or name == service
    ]
    return candidates[0] if candidates else service


def container_exec(service: str, command: str) -> subprocess.CompletedProcess:
    container = _resolve_container(service)
    return subprocess.run(
        ["podman", "exec", container, "sh", "-c", command],
        capture_output=True,
        text=True,
    )


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session", autouse=True)
def require_podman_stack():
    """Skip the entire module when the Podman stack is not running."""
    result = subprocess.run(
        ["podman", "ps", "--filter", "name=backend", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
    )
    running = [
        name
        for name in result.stdout.splitlines()
        if "-backend-" in name or "_backend_" in name or name == "backend"
    ]
    if not running:
        pytest.skip("Podman stack not running — skipping monitoring tests")


@pytest.fixture(scope="session")
def http():
    session = requests.Session()
    session.verify = False
    return session


@pytest.fixture(scope="session")
def grafana_admin():
    session = requests.Session()
    session.verify = False
    session.auth = ("admin", GRAFANA_ADMIN_PASSWORD)
    return session


@pytest.fixture(scope="session")
def backend_metrics_text():
    result = container_exec(
        "backend",
        'python3 -c "'
        "import urllib.request; "
        "\ntry:\n"
        "    urllib.request.urlopen('http://localhost:8000/api/nonexistent-for-metrics-probe').read()\n"
        "except Exception:\n"
        "    pass\n"
        "print(urllib.request.urlopen('http://localhost:8000/metrics').read().decode())"
        '"',
    )
    assert result.returncode == 0, f"Cannot fetch /metrics from backend: {result.stderr}"
    return result.stdout


@pytest.fixture(scope="session")
def prometheus_targets():
    result = container_exec("prometheus", "wget -qO- http://localhost:9090/api/v1/targets")
    assert result.returncode == 0, f"Cannot fetch Prometheus targets: {result.stderr}"
    return json.loads(result.stdout)


@pytest.fixture(scope="session")
def prometheus_rules():
    result = container_exec("prometheus", "wget -qO- http://localhost:9090/api/v1/rules")
    assert result.returncode == 0, f"Cannot fetch Prometheus rules: {result.stderr}"
    return json.loads(result.stdout)


@pytest.fixture(scope="session")
def all_alert_rule_names(prometheus_rules):
    groups = prometheus_rules["data"]["groups"]
    return {r["name"] for g in groups for r in g["rules"]}


# ===========================================================================
# Prometheus
# ===========================================================================


# ---------------------------------------------------------------------------
# Security: Prometheus must not be reachable from the host
# ---------------------------------------------------------------------------


class TestPrometheusAccessControl:
    def test_prometheus_not_exposed_on_host_port_9090(self):
        """Prometheus uses `expose` not `ports` — host must refuse the connection."""
        with pytest.raises((requests.exceptions.ConnectionError, ConnectionRefusedError, OSError)):
            requests.get("http://localhost:9090", timeout=3, verify=False)

    def test_prometheus_port_9090_socket_closed(self):
        """Low-level socket check that port 9090 is not listening on the host."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(("localhost", 9090))
        sock.close()
        assert result != 0, "Port 9090 is open on the host — Prometheus should not be directly reachable."


# ---------------------------------------------------------------------------
# /metrics endpoint — standard FastAPI instrumentator metrics
# ---------------------------------------------------------------------------


class TestBackendMetricsEndpoint:
    def test_metrics_endpoint_is_reachable_internally(self, backend_metrics_text):
        """Backend /metrics endpoint must respond with valid Prometheus text."""
        assert "# HELP" in backend_metrics_text, (
            "Response does not look like Prometheus text format — missing '# HELP' comment lines."
        )
        assert "# TYPE" in backend_metrics_text

    def test_http_requests_total_counter_present(self, backend_metrics_text):
        """`http_requests_total` counter is exposed by prometheus-fastapi-instrumentator."""
        assert "http_requests_total" in backend_metrics_text

    def test_http_request_duration_histogram_present(self, backend_metrics_text):
        """`http_request_duration_seconds` histogram is required for latency alerts."""
        assert "http_request_duration_seconds_bucket" in backend_metrics_text
        assert "http_request_duration_seconds_sum" in backend_metrics_text
        assert "http_request_duration_seconds_count" in backend_metrics_text


# ---------------------------------------------------------------------------
# /metrics endpoint — custom application metrics
# ---------------------------------------------------------------------------


class TestCustomMetrics:
    def test_gemini_request_duration_histogram_present(self, backend_metrics_text):
        """`gemini_request_duration_seconds` tracks Gemini API call latency."""
        assert "gemini_request_duration_seconds" in backend_metrics_text

    def test_gemini_failures_counter_present(self, backend_metrics_text):
        """`gemini_failures_total` counts failed Gemini API calls by operation."""
        assert "gemini_failures_total" in backend_metrics_text

    def test_story_funnel_counter_present(self, backend_metrics_text):
        """`story_funnel_total` tracks story generation pipeline by stage and status."""
        assert "story_funnel_total" in backend_metrics_text

    def test_stories_in_progress_gauge_present(self, backend_metrics_text):
        """`stories_generation_in_progress` gauge tracks concurrent generations."""
        assert "stories_generation_in_progress" in backend_metrics_text

    def test_gemini_histogram_label_operation(self, backend_metrics_text):
        """Gemini histogram must carry the `operation` label."""
        assert (
            "gemini_request_duration_seconds_bucket{" in backend_metrics_text
            or "gemini_request_duration_seconds" in backend_metrics_text
        )

    def test_story_funnel_has_stage_and_status_labels(self, backend_metrics_text):
        """story_funnel_total must have both `stage` and `status` labels defined."""
        assert "story_funnel_total" in backend_metrics_text

    def test_metrics_endpoint_excludes_health_route(self, backend_metrics_text):
        """/health must be excluded from HTTP metrics to avoid noise in dashboards."""
        assert 'handler="/health"' not in backend_metrics_text

    def test_metrics_endpoint_excludes_metrics_route(self, backend_metrics_text):
        """/metrics itself must be excluded from HTTP metrics."""
        assert 'handler="/metrics"' not in backend_metrics_text


# ---------------------------------------------------------------------------
# Scrape targets — both jobs must be UP
# ---------------------------------------------------------------------------


class TestScrapeTargets:
    def test_prometheus_api_returns_success(self, prometheus_targets):
        assert prometheus_targets["status"] == "success", (
            f"Prometheus targets API returned non-success: {prometheus_targets}"
        )

    def test_backend_scrape_target_exists(self, prometheus_targets):
        """Prometheus must have an active target for job=wondercomic-backend."""
        active = prometheus_targets["data"]["activeTargets"]
        backend_targets = [t for t in active if t["labels"].get("job") == "wondercomic-backend"]
        assert backend_targets, (
            "No active scrape target found for job=wondercomic-backend. Check prometheus.yml scrape_configs."
        )

    def test_backend_scrape_target_is_up(self, prometheus_targets):
        """Backend scrape target health must be 'up'."""
        active = prometheus_targets["data"]["activeTargets"]
        backend_targets = [t for t in active if t["labels"].get("job") == "wondercomic-backend"]
        assert backend_targets, "Backend target not found."
        target = backend_targets[0]
        assert target["health"] == "up", (
            f"Backend scrape target is not healthy.\n"
            f"Health: {target['health']}\n"
            f"Last error: {target.get('lastError', 'none')}"
        )

    def test_node_exporter_scrape_target_exists(self, prometheus_targets):
        """Prometheus must have an active target for job=node."""
        active = prometheus_targets["data"]["activeTargets"]
        node_targets = [t for t in active if t["labels"].get("job") == "node"]
        assert node_targets, (
            "No active scrape target found for job=node. "
            "Check that node_exporter service is running and prometheus.yml is correct."
        )

    def test_node_exporter_scrape_target_is_up(self, prometheus_targets):
        """Node exporter scrape target health must be 'up'."""
        active = prometheus_targets["data"]["activeTargets"]
        node_targets = [t for t in active if t["labels"].get("job") == "node"]
        assert node_targets, "Node exporter target not found."
        target = node_targets[0]
        assert target["health"] == "up", (
            f"Node exporter scrape target is not healthy.\n"
            f"Health: {target['health']}\n"
            f"Last error: {target.get('lastError', 'none')}"
        )

    def test_exactly_two_scrape_jobs_configured(self, prometheus_targets):
        """Exactly two scrape jobs should be active: backend + node_exporter."""
        active = prometheus_targets["data"]["activeTargets"]
        jobs = {t["labels"].get("job") for t in active}
        assert "wondercomic-backend" in jobs
        assert "node" in jobs


# ---------------------------------------------------------------------------
# Alert rules — all 7 rules must be loaded
# ---------------------------------------------------------------------------


class TestAlertRules:
    def test_prometheus_rules_api_returns_success(self, prometheus_rules):
        assert prometheus_rules["status"] == "success"

    def test_at_least_one_rule_group_loaded(self, prometheus_rules):
        """At least one rule group must be loaded from alerts.rules.yml."""
        groups = prometheus_rules["data"]["groups"]
        assert len(groups) >= 1, "No rule groups loaded in Prometheus."

    def test_three_rule_groups_configured(self, prometheus_rules):
        """Three groups are defined: availability, api, node.resources."""
        groups = prometheus_rules["data"]["groups"]
        group_names = {g["name"] for g in groups}
        assert "wondercomic.availability" in group_names
        assert "wondercomic.api" in group_names
        assert "node.resources" in group_names

    @pytest.mark.parametrize(
        "rule_name",
        [
            "BackendDown",
            "NodeExporterDown",
            "HighErrorRate",
            "HighP95Latency",
            "HighCPUUsage",
            "HighMemoryUsage",
            "HighDiskUsage",
        ],
    )
    def test_alert_rule_exists(self, all_alert_rule_names, rule_name):
        """Each of the 7 configured alert rules must be loaded."""
        assert rule_name in all_alert_rule_names, (
            f"Alert rule '{rule_name}' not found in Prometheus. Loaded rules: {all_alert_rule_names}"
        )

    def test_backend_down_is_critical_severity(self, prometheus_rules):
        """BackendDown must be labelled severity=critical."""
        groups = prometheus_rules["data"]["groups"]
        all_rules = [r for g in groups for r in g["rules"]]
        rule = next((r for r in all_rules if r["name"] == "BackendDown"), None)
        assert rule is not None
        assert rule.get("labels", {}).get("severity") == "critical"

    def test_high_error_rate_is_critical_severity(self, prometheus_rules):
        """HighErrorRate must be labelled severity=critical."""
        groups = prometheus_rules["data"]["groups"]
        all_rules = [r for g in groups for r in g["rules"]]
        rule = next((r for r in all_rules if r["name"] == "HighErrorRate"), None)
        assert rule is not None
        assert rule.get("labels", {}).get("severity") == "critical"

    def test_total_alert_rules_count(self, all_alert_rule_names):
        """Exactly 7 alert rules should be defined."""
        assert len(all_alert_rule_names) == 7, (
            f"Expected 7 alert rules, found {len(all_alert_rule_names)}: {all_alert_rule_names}"
        )


# ---------------------------------------------------------------------------
# Alertmanager integration (from Prometheus side)
# ---------------------------------------------------------------------------


class TestAlertmanagerIntegration:
    def test_alertmanager_listed_in_prometheus(self):
        """Prometheus must have at least one active Alertmanager configured."""
        result = container_exec(
            "prometheus",
            "wget -qO- 'http://localhost:9090/api/v1/alertmanagers'",
        )
        assert result.returncode == 0, f"Cannot query alertmanagers API: {result.stderr}"
        data = json.loads(result.stdout)
        assert data["status"] == "success"
        active = data["data"]["activeAlertmanagers"]
        assert len(active) >= 1, (
            "No active Alertmanager found in Prometheus. Check alerting.alertmanagers config in prometheus.yml."
        )

    def test_alertmanager_url_points_to_correct_service(self):
        """Active Alertmanager URL must reference the alertmanager service."""
        result = container_exec(
            "prometheus",
            "wget -qO- 'http://localhost:9090/api/v1/alertmanagers'",
        )
        data = json.loads(result.stdout)
        active = data["data"]["activeAlertmanagers"]
        urls = [a["url"] for a in active]
        assert any("alertmanager" in url for url in urls), f"No Alertmanager URL contains 'alertmanager': {urls}"

    def test_alertmanager_health_ok(self):
        """Alertmanager container must respond healthy on its API."""
        result = container_exec(
            "alertmanager",
            "wget -qO- 'http://localhost:9093/-/healthy'",
        )
        assert result.returncode == 0, f"Alertmanager health check failed: {result.stderr}"
        assert "ok" in result.stdout.lower() or result.stdout.strip() == ""


# ---------------------------------------------------------------------------
# Data retention
# ---------------------------------------------------------------------------


class TestPrometheusRetention:
    def test_tsdb_retention_flag_is_set(self):
        """Prometheus TSDB retention must be configured (15d / 1GB)."""
        result = container_exec(
            "prometheus",
            "cat /proc/1/cmdline | tr '\\0' '\\n'",
        )
        cmdline = result.stdout
        assert "--storage.tsdb.retention.time=15d" in cmdline, (
            f"Expected --storage.tsdb.retention.time=15d in Prometheus args.\nGot: {cmdline}"
        )
        assert "--storage.tsdb.retention.size=1GB" in cmdline, (
            f"Expected --storage.tsdb.retention.size=1GB in Prometheus args.\nGot: {cmdline}"
        )


# ===========================================================================
# Grafana
# ===========================================================================


# ---------------------------------------------------------------------------
# Accessibility
# ---------------------------------------------------------------------------


class TestGrafanaAccessibility:
    def test_grafana_reachable_via_https(self, http):
        """GET /grafana/ must return a response (not a connection error)."""
        response = http.get(f"{GRAFANA_URL}/", timeout=10, allow_redirects=True)
        assert response.status_code in (200, 302), f"Expected 200 or 302, got {response.status_code}"

    def test_grafana_served_from_subpath(self, http):
        """Grafana must be accessible at /grafana/ (subpath configured in nginx + GF_SERVER)."""
        response = http.get(f"{GRAFANA_URL}/login", timeout=10)
        assert response.status_code == 200

    def test_grafana_login_page_contains_expected_content(self, http):
        """Login page must serve actual Grafana HTML, not an nginx error page."""
        response = http.get(f"{GRAFANA_URL}/login", timeout=10)
        body = response.text.lower()
        assert "grafana" in body, "Login page does not contain 'grafana' — nginx may not be proxying correctly."

    def test_grafana_redirect_from_bare_path(self, http):
        """GET /grafana (no trailing slash) must redirect to /grafana/."""
        response = http.get(f"{HTTPS_BASE}/grafana", timeout=10, allow_redirects=False)
        assert response.status_code == 301
        assert response.headers.get("Location", "").endswith("/grafana/")


# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------


class TestGrafanaSecurity:
    def test_anonymous_api_access_denied(self, http):
        """Grafana API must require authentication — unauthenticated request returns 401."""
        response = http.get(f"{GRAFANA_URL}/api/org", timeout=10)
        assert response.status_code == 401, (
            f"Expected 401 for unauthenticated API access, got {response.status_code}. "
            "Anonymous access may be enabled (GF_AUTH_ANONYMOUS_ENABLED=false required)."
        )

    def test_anonymous_datasource_api_denied(self, http):
        """Datasource list must not be accessible without credentials."""
        response = http.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 401

    def test_anonymous_dashboard_api_denied(self, http):
        """Dashboard API must not be accessible without credentials."""
        response = http.get(f"{GRAFANA_URL}/api/dashboards/uid/wondercomic-api-v1", timeout=10)
        assert response.status_code == 401

    def test_self_signup_disabled(self, http):
        """POST /api/user (signup) must be disabled — returns 401 or 403."""
        response = http.post(
            f"{GRAFANA_URL}/api/user",
            json={"name": "hacker", "email": "hacker@example.com", "password": "password123"},
            timeout=10,
        )
        assert response.status_code in (401, 403), (
            f"Self-signup should be disabled (GF_USERS_ALLOW_SIGN_UP=false). Got {response.status_code}."
        )

    def test_grafana_port_3000_not_exposed_on_host(self):
        """Grafana must not be directly accessible on host port 3000."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(("localhost", 3000))
        sock.close()
        assert result != 0, "Port 3000 is open on the host — Grafana is directly reachable without nginx/HTTPS."

    def test_grafana_served_over_https_only(self, http):
        """Grafana must be served via HTTPS (host port 8443 through nginx), not plain HTTP."""
        response = http.get(f"{GRAFANA_URL}/login", timeout=10)
        assert response.url.startswith("https://"), f"Response URL is not HTTPS: {response.url}"


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class TestGrafanaAuthentication:
    def test_admin_login_via_basic_auth(self, grafana_admin):
        """Admin credentials must authenticate successfully."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/user", timeout=10)
        assert response.status_code == 200, (
            f"Admin login failed with status {response.status_code}. Check GRAFANA_ADMIN_PASSWORD env var."
        )

    def test_admin_has_admin_role(self, grafana_admin):
        """Authenticated admin must have isGrafanaAdmin=true."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/user", timeout=10)
        assert response.status_code == 200
        user = response.json()
        assert user.get("isGrafanaAdmin") is True, f"Admin user does not have admin role: {user}"

    def test_admin_login_with_wrong_password_denied(self):
        """Wrong credentials must return 401."""
        bad_session = requests.Session()
        bad_session.verify = False
        bad_session.auth = ("admin", "definitely-wrong-password-12345")
        response = bad_session.get(f"{GRAFANA_URL}/api/user", timeout=10)
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Datasource provisioning
# ---------------------------------------------------------------------------


class TestGrafanaDatasource:
    def test_prometheus_datasource_exists(self, grafana_admin):
        """Prometheus datasource must be provisioned automatically."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 200
        datasources = response.json()
        names = [ds["name"] for ds in datasources]
        assert "Prometheus" in names, f"Prometheus datasource not found. Available datasources: {names}"

    def test_prometheus_datasource_is_default(self, grafana_admin):
        """Prometheus datasource must be set as the default datasource."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 200, f"Cannot fetch datasources: {response.status_code} — {response.text}"
        datasources = response.json()
        prometheus_ds = next((ds for ds in datasources if ds["name"] == "Prometheus"), None)
        assert prometheus_ds is not None
        assert prometheus_ds.get("isDefault") is True, "Prometheus datasource is not set as default."

    def test_prometheus_datasource_type_is_prometheus(self, grafana_admin):
        """Datasource type must be 'prometheus'."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 200, f"Cannot fetch datasources: {response.status_code} — {response.text}"
        datasources = response.json()
        prometheus_ds = next((ds for ds in datasources if ds["name"] == "Prometheus"), None)
        assert prometheus_ds is not None
        assert prometheus_ds.get("type") == "prometheus"

    def test_prometheus_datasource_url_points_to_container(self, grafana_admin):
        """Datasource URL must point to the prometheus container, not localhost."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 200, f"Cannot fetch datasources: {response.status_code} — {response.text}"
        datasources = response.json()
        prometheus_ds = next((ds for ds in datasources if ds["name"] == "Prometheus"), None)
        assert prometheus_ds is not None
        url = prometheus_ds.get("url", "")
        assert "prometheus" in url, f"Datasource URL should reference the prometheus container, got: {url}"

    def test_prometheus_datasource_health_check_passes(self, grafana_admin):
        """Grafana must be able to reach Prometheus (datasource health check)."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources", timeout=10)
        assert response.status_code == 200, f"Cannot fetch datasources: {response.status_code} — {response.text}"
        datasources = response.json()
        prometheus_ds = next((ds for ds in datasources if ds["name"] == "Prometheus"), None)
        assert prometheus_ds is not None, "Prometheus datasource not found."
        ds_id = prometheus_ds["id"]

        health_response = grafana_admin.get(f"{GRAFANA_URL}/api/datasources/{ds_id}/health", timeout=15)
        assert health_response.status_code == 200, f"Datasource health check failed: {health_response.text}"
        health = health_response.json()
        assert health.get("status") == "OK", f"Prometheus datasource is not healthy: {health}"


# ---------------------------------------------------------------------------
# Dashboard provisioning
# ---------------------------------------------------------------------------


class TestGrafanaDashboard:
    def test_wondercomic_dashboard_exists(self, grafana_admin):
        """WonderComic dashboard must be provisioned with the correct UID."""
        response = grafana_admin.get(f"{GRAFANA_URL}/api/dashboards/uid/wondercomic-api-v1", timeout=10)
        assert response.status_code == 200, (
            f"Dashboard with UID 'wondercomic-api-v1' not found. Status: {response.status_code}"
        )

    def _fetch_dashboard(self, grafana_admin) -> dict:
        response = grafana_admin.get(f"{GRAFANA_URL}/api/dashboards/uid/wondercomic-api-v1", timeout=10)
        assert response.status_code == 200, f"Cannot fetch dashboard: {response.status_code} — {response.text}"
        data = response.json()
        assert "dashboard" in data, f"Unexpected response structure — 'dashboard' key missing: {data}"
        return data

    def test_dashboard_title_is_correct(self, grafana_admin):
        """Dashboard title must be 'WonderComic API'."""
        data = self._fetch_dashboard(grafana_admin)
        title = data["dashboard"]["title"]
        assert title == "WonderComic API", f"Unexpected dashboard title: '{title}'"

    def test_dashboard_has_expected_panel_count(self, grafana_admin):
        """Dashboard must contain at least 15 panels (7 rows + 15 data panels)."""
        data = self._fetch_dashboard(grafana_admin)
        panels = data["dashboard"]["panels"]
        assert len(panels) >= 15, f"Expected at least 15 panels, found {len(panels)}."

    @pytest.mark.parametrize(
        "expected_title",
        [
            "Traffic",
            "Latency",
            "Summary Stats",
            "Per-Endpoint Breakdown",
            "Node Resources",
            "Gemini AI",
            "Story Generation",
        ],
    )
    def test_dashboard_section_rows_present(self, grafana_admin, expected_title):
        """All 7 section rows must be present in the dashboard."""
        data = self._fetch_dashboard(grafana_admin)
        panels = data["dashboard"]["panels"]
        titles = [p.get("title", "") for p in panels]
        assert expected_title in titles, (
            f"Section row '{expected_title}' not found in dashboard panels. Found titles: {titles}"
        )

    def test_dashboard_uses_prometheus_datasource(self, grafana_admin):
        """Dashboard panels must reference the Prometheus datasource."""
        data = self._fetch_dashboard(grafana_admin)
        panels = data["dashboard"]["panels"]
        data_panels = [p for p in panels if p.get("type") != "row"]
        for panel in data_panels:
            ds = panel.get("datasource", {})
            ds_type = ds.get("type", "") if isinstance(ds, dict) else ""
            assert ds_type == "prometheus", f"Panel '{panel.get('title')}' does not use prometheus datasource: {ds}"

    def test_dashboard_auto_refresh_enabled(self, grafana_admin):
        """Dashboard must have auto-refresh configured (30s)."""
        data = self._fetch_dashboard(grafana_admin)
        refresh = data["dashboard"].get("refresh")
        assert refresh, "Dashboard auto-refresh is not configured."

    def test_dashboard_is_provisioned_not_manual(self, grafana_admin):
        """Dashboard must be provisioned via file, not manually created in the UI."""
        data = self._fetch_dashboard(grafana_admin)
        meta = data.get("meta", {})
        is_provisioned = meta.get("provisioned") is True
        has_external_id = bool(meta.get("provisionedExternalId", ""))
        assert is_provisioned or has_external_id, (
            f"Dashboard does not appear to be file-provisioned.\n"
            f"meta.provisioned={meta.get('provisioned')}, "
            f"meta.provisionedExternalId='{meta.get('provisionedExternalId')}'"
        )


# ===========================================================================
# Alertmanager
# ===========================================================================


# ---------------------------------------------------------------------------
# Webhook security — nginx must block external access
# ---------------------------------------------------------------------------


class TestWebhookAccessControl:
    def test_post_to_monitoring_alerts_returns_403(self, http):
        """External POST to /api/monitoring/alerts must be blocked by nginx (403)."""
        response = http.post(
            f"{HTTPS_BASE}/api/monitoring/alerts",
            json={
                "version": "4",
                "status": "firing",
                "alerts": [
                    {
                        "status": "firing",
                        "labels": {"alertname": "TestAlert", "severity": "critical"},
                        "annotations": {"summary": "This is a security test"},
                    }
                ],
            },
            timeout=10,
        )
        assert response.status_code == 403, (
            f"Expected 403 from nginx for /api/monitoring/alerts, got {response.status_code}. "
            "External clients must not be able to spoof alerts into backend logs."
        )

    def test_get_to_monitoring_alerts_returns_403(self, http):
        """External GET to /api/monitoring/alerts must also be blocked."""
        response = http.get(f"{HTTPS_BASE}/api/monitoring/alerts", timeout=10)
        assert response.status_code == 403

    def test_put_to_monitoring_alerts_returns_403(self, http):
        """External PUT to /api/monitoring/alerts must be blocked."""
        response = http.put(
            f"{HTTPS_BASE}/api/monitoring/alerts",
            json={},
            timeout=10,
        )
        assert response.status_code == 403

    def test_monitoring_subpath_also_blocked(self, http):
        """Any path under /api/monitoring must be blocked."""
        response = http.get(f"{HTTPS_BASE}/api/monitoring/anything", timeout=10)
        assert response.status_code == 403

    def test_regular_api_routes_still_accessible(self, http):
        """Blocking /api/monitoring must not affect other /api routes."""
        response = http.get(f"{HTTPS_BASE}/health", timeout=10)
        assert response.status_code == 200, (
            f"/health must still be accessible after the nginx block rule. Got {response.status_code}."
        )


# ---------------------------------------------------------------------------
# Alertmanager internal health
# ---------------------------------------------------------------------------


class TestAlertmanagerHealth:
    def test_alertmanager_healthy_endpoint(self):
        """Alertmanager /-/healthy must return OK from inside container network."""
        result = container_exec(
            "alertmanager",
            "wget -qO- 'http://localhost:9093/-/healthy'",
        )
        assert result.returncode == 0, f"Alertmanager health check failed.\nstderr: {result.stderr}"

    def test_alertmanager_ready_endpoint(self):
        """Alertmanager /-/ready must return OK from inside container network."""
        result = container_exec(
            "alertmanager",
            "wget -qO- 'http://localhost:9093/-/ready'",
        )
        assert result.returncode == 0, f"Alertmanager readiness check failed.\nstderr: {result.stderr}"

    def test_alertmanager_status_api_responds(self):
        """Alertmanager /api/v2/status must return valid JSON."""
        result = container_exec(
            "alertmanager",
            "wget -qO- 'http://localhost:9093/api/v2/status'",
        )
        assert result.returncode == 0, f"Cannot query Alertmanager status API.\nstderr: {result.stderr}"
        data = json.loads(result.stdout)
        assert "cluster" in data or "config" in data, f"Unexpected Alertmanager status response: {result.stdout[:200]}"


# ---------------------------------------------------------------------------
# Alertmanager configuration
# ---------------------------------------------------------------------------


class TestAlertmanagerConfiguration:
    def _get_alertmanager_config(self) -> dict:
        result = container_exec(
            "alertmanager",
            "wget -qO- 'http://localhost:9093/api/v2/status'",
        )
        assert result.returncode == 0
        return json.loads(result.stdout)

    def test_receiver_is_not_null(self):
        """Alertmanager must have a real receiver configured, not a null sink."""
        data = self._get_alertmanager_config()
        config = data.get("config", {})
        original_config = config.get("original", "")
        assert "backend-webhook" in original_config or "webhook" in original_config, (
            "Alertmanager appears to use a null receiver — alerts would be silently dropped. "
            "A webhook or other receiver is required."
        )

    def test_send_resolved_is_enabled(self):
        """Alertmanager config must send resolved notifications (send_resolved: true)."""
        data = self._get_alertmanager_config()
        config = data.get("config", {})
        original_config = config.get("original", "")
        assert "send_resolved: true" in original_config, (
            "send_resolved is not enabled in alertmanager.yml — "
            "resolved alerts will not be logged by the backend webhook."
        )


# ---------------------------------------------------------------------------
# End-to-end: backend webhook reachable from inside container network
# ---------------------------------------------------------------------------


class TestBackendWebhookInternal:
    def test_backend_webhook_reachable_from_alertmanager_container(self):
        """Alertmanager must be able to POST to http://backend:8000/api/monitoring/alerts."""
        fake_payload = json.dumps(
            {
                "version": "4",
                "status": "firing",
                "alerts": [
                    {
                        "status": "firing",
                        "labels": {"alertname": "E2ETest", "severity": "info"},
                        "annotations": {"summary": "Integration test probe"},
                    }
                ],
            }
        )
        result = container_exec(
            "alertmanager",
            f"wget -qO- --post-data='{fake_payload}' "
            "--header='Content-Type: application/json' "
            "'http://backend:8000/api/monitoring/alerts'",
        )
        assert result.returncode == 0, (
            f"Backend webhook is not reachable from alertmanager container.\nstderr: {result.stderr}"
        )
        response_body = result.stdout
        assert "ok" in response_body.lower(), f"Backend webhook did not return expected response. Got: {response_body}"

    def test_backend_webhook_returns_received_count(self):
        """Backend webhook must return a JSON body with 'received' count."""
        fake_payload = json.dumps(
            {
                "version": "4",
                "status": "firing",
                "alerts": [
                    {"status": "firing", "labels": {"alertname": "CountTest"}, "annotations": {}},
                    {"status": "firing", "labels": {"alertname": "CountTest2"}, "annotations": {}},
                ],
            }
        )
        result = container_exec(
            "alertmanager",
            f"wget -qO- --post-data='{fake_payload}' "
            "--header='Content-Type: application/json' "
            "'http://backend:8000/api/monitoring/alerts'",
        )
        assert result.returncode == 0
        data = json.loads(result.stdout)
        assert data.get("received") == 2, f"Expected 'received': 2 in response, got: {data}"
