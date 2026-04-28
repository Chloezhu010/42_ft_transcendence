# Disaster Recovery — WonderComic

## Overview

WonderComic stores all persistent data in a single SQLite database (`wondercomic.db`).
The backup system creates timestamped snapshots using SQLite's built-in online-backup
API, which is safe to run while the application is live (WAL mode).

---

## Backup Strategy

| Setting | Value |
|---------|-------|
| Mechanism | SQLite `Connection.backup()` (online, no downtime) |
| Schedule | On startup + every 24 hours automatically |
| Retention | Last 7 snapshots (oldest deleted automatically) |
| Storage | `backend/backups/` (Docker: `backend_backups` named volume) |
| Filename format | `wondercomic_YYYYMMDD_HHMMSS_ffffff.db` (microsecond precision) |

### Manual Backup (API)

Trigger an immediate backup without restarting:

```bash
curl -X POST -H "Authorization: Bearer <token>" http://localhost:8000/api/backup/trigger
```

### Check Backup Status (API)

```bash
curl http://localhost:8000/api/backup/status
```

The response includes the last backup timestamp and a list of all available snapshots.

### Status UI

Visit `http://localhost:3000/status` for a visual backup inventory and a
**Back up now** button.

---

## Restore Procedures

### Scenario 1 — Corrupt or missing database (Docker deployment)

1. **Stop the backend container.**
   ```bash
   docker compose stop backend
   ```

2. **Identify the backup to restore.**
   ```bash
   docker run --rm -v backend_backups:/backups alpine ls /backups
   ```
   Pick the most recent `wondercomic_YYYYMMDD_HHMMSS_ffffff.db` file.

3. **Copy the backup over the live database.**
   ```bash
   docker run --rm \
     -v backend_backups:/backups \
     -v tran_main1_backend_data:/app \
     alpine cp /backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.db /app/wondercomic.db
   ```
   Replace `wondercomic_YYYYMMDD_HHMMSS_ffffff.db` with the chosen filename and
   `tran_main1_backend_data` with your actual backend volume name.

4. **Restart the backend.**
   ```bash
   docker compose start backend
   ```

5. **Verify** by visiting `/status` in the UI or calling `GET /health`.

---

### Scenario 2 — Local development (no Docker)

1. **Stop the running server** (Ctrl+C in the uvicorn terminal).

2. **Replace the database.**
   ```bash
   cp backend/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.db backend/wondercomic.db
   ```

3. **Restart the server.**
   ```bash
   cd backend && uv run uvicorn main:app --reload
   ```

---

### Scenario 3 — Complete data loss (no backups available)

If no backup exists the application will recreate an empty database with the
correct schema on next startup (handled by `init_db()` in `db/database.py`).
User-generated images stored in the `backend/images/` folder are unaffected
because they live in a separate Docker volume (`backend_images`).

---

## Backup Verification

SQLite backups produced by `Connection.backup()` are fully valid SQLite databases.
Verify integrity at any time:

```bash
sqlite3 backend/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.db "PRAGMA integrity_check;"
```

Expected output: `ok`

---

## Off-site Backup (Recommended for Production)

For production deployments, copy backups to an external location on a schedule.
Example using `rclone` to sync to an S3-compatible store:

```bash
# Run from host, scheduled via cron or CI
rclone sync /path/to/backend_backups s3:my-bucket/wondercomic-backups
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `backend/db/backup.py` | Backup creation, rotation, and listing logic |
| `backend/routers/backup.py` | `GET /api/backup/status` and `POST /api/backup/trigger` endpoints |
| `backend/main.py` | Startup backup + 24-hour scheduled task |
| `docker-compose.yml` | `backend_backups` named volume declaration |
| `frontend/pages/status/StatusPage.tsx` | `/status` page — shows backup inventory and manual trigger |
