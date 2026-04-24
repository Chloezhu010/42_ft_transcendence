"""
Alertmanager webhook receiver.

Alertmanager POSTs alert payloads here whenever a rule fires or resolves.
This endpoint logs each alert so the notification is observable in container
logs — no external service required.
"""

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.post("/alerts")
async def receive_alerts(request: Request):
    """Receive alert notifications from Alertmanager."""
    payload = await request.json()
    status = payload.get("status", "unknown")
    alerts = payload.get("alerts", [])

    for alert in alerts:
        name = alert.get("labels", {}).get("alertname", "unknown")
        severity = alert.get("labels", {}).get("severity", "unknown")
        alert_status = alert.get("status", status)
        summary = alert.get("annotations", {}).get("summary", "")
        print(f"[ALERT] [{severity.upper()}] {name} — {alert_status}: {summary}")

    return {"status": "ok", "received": len(alerts)}
