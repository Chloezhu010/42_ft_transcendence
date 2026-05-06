# Disaster Recovery — WonderComic

## Overview

WonderComic stores persistent data in two locations:

- **SQLite database** (`wondercomic.db`) — user accounts, stories, panel metadata, and image *paths*
- **Image files** (`backend/images/`) — the actual PNG files referenced by those paths

The backup system creates timestamped zip archives using SQLite's built-in online-backup API for
the database and a directory snapshot for the images. Both components are bundled together so that
restoring a backup restores user content end-to-end.

---

## Backup Strategy

| Setting | Value |
|---------|-------|
| Mechanism | zip archive: SQLite `Connection.backup()` + image directory snapshot |
| Schedule | On startup + every `BACKUP_INTERVAL_SECONDS` seconds (default 24 h) via the `backup-worker` Compose service |
| Retention | Last 7 snapshots (oldest deleted automatically) |
| Storage | `backend_backups` named Docker volume, mounted at `/app/backups` in the container (Compose prefixes the physical name with the project name, e.g. `tran_main1_backend_backups`) |
| Filename format | `wondercomic_YYYYMMDD_HHMMSS_ffffff.zip` (microsecond precision) |
| Archive contents | `wondercomic.db` + `images/…` for every file under `backend/images/` including subdirectories (e.g. `images/avatars/`) |

### Granting Admin Access

Both backup API endpoints require an **admin JWT token**. Use the `promote_admin.py` CLI
to grant admin rights to an existing user — no code changes or API exposure needed.

```bash
# Run from the repo root
python backend/scripts/promote_admin.py
```

The script prompts for `ADMIN_PROMOTION_SECRET` (set in `.env`) then the target username
or email, and requires `y` confirmation before updating the database. It reads `DB_PATH`
from `.env` and resolves it relative to `backend/`.

After promotion, log in as that user through the web UI to obtain a fresh JWT.

### Manual Backup (API)

Both endpoints require an admin JWT token (see _Granting Admin Access_ above).

```bash
# Docker deployment (through nginx on host port 8443)
curl -k -X POST -H "Authorization: Bearer <token>" https://localhost:8443/api/backup/trigger

# Local dev (uvicorn direct, no nginx)
curl -X POST -H "Authorization: Bearer <token>" http://localhost:8000/api/backup/trigger
```

### Check Backup Status (API)

```bash
# Docker deployment
curl -k -H "Authorization: Bearer <token>" https://localhost:8443/api/backup/status

# Local dev
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/backup/status
```

The response includes the last backup timestamp and a list of all available snapshots.
The `-k` flag skips certificate verification for the self-signed dev cert.

### Status UI

Visit `https://localhost:8443/status` (Docker) or `http://localhost:3000/status` (local dev)
for a visual backup inventory and a **Back up now** button.

---

## Health Check and Alerting

`GET /health` (no auth required) reports both database and backup status:

| `checks.backup` | Meaning | HTTP status |
|-----------------|---------|-------------|
| `ok` | Last backup is within `BACKUP_INTERVAL_SECONDS × 1.5` | 200 |
| `stale` | Last backup exists but is older than the threshold | 503 |
| `never` | No backup has ever been created | 503 |
| `unavailable` | Backup metadata could not be read | 503 |

```bash
curl -k https://localhost:8443/health
# {"status":"healthy","version":"1.0.0","checks":{"database":"ok","backup":"ok"}}
```

A 503 response means uptime monitors / Prometheus alerts will fire. The most common
cause after a fresh deployment is `never` — the `backup-worker` has not completed its
first run yet. If the worker is still waiting for the DB schema to initialize it retries
every 30 seconds; once the schema is ready the first backup runs immediately.

---

## Restore Procedures

### Scenario 1 — Corrupt or missing database and/or images (Docker deployment)

Use `restore_backup.py` — the same script as local dev, now working in Docker too.
Pass `RESTORE_BACKUP_SECRET` via `--env-file` so the script can authenticate.

1. **Stop the backend and backup-worker containers.**
   ```bash
   docker compose stop backend backup-worker
   ```

2. **List available backups.**
   ```bash
   docker compose run --rm --no-deps backend ls /app/backups
   ```
   Note the filename you want to restore.

3. **Run the restore script.**
   ```bash
   docker compose run --rm --no-deps backend \
     python3 /app/scripts/restore_backup.py
   ```
   The script will prompt for `RESTORE_BACKUP_SECRET`, list available backups,
   ask you to choose one, confirm, then handle WAL removal, DB extraction, and
   image restoration automatically.

4. **Restart the backend and backup-worker.**
   ```bash
   docker compose start backend backup-worker
   ```

5. **Verify** by visiting `https://localhost:8443/status` or running `curl -k https://localhost:8443/health`.

---

### Scenario 2 — Local development (no Docker)

Use the `restore_backup.py` CLI — it handles WAL removal, DB extraction, and image
restoration in one step.

**Prerequisite:** `RESTORE_BACKUP_SECRET` must be set in `.env` (see `.env.example`).

1. **Stop the running server** (Ctrl+C in the uvicorn terminal).

2. **Run the restore script** from the repo root.
   ```bash
   python backend/scripts/restore_backup.py
   ```
   The script will:
   - Prompt for `RESTORE_BACKUP_SECRET`
   - List available backups newest-first and ask you to choose one
   - Ask for confirmation before writing anything
   - Delete WAL/SHM sidecar files, restore `wondercomic.db`, then restore all images
   - Print a summary: database path, image count, backup filename used

3. **Restart the server.**
   ```bash
   cd backend && uv run uvicorn main:app --reload
   ```

---

### Scenario 3 — Complete data loss (no backups available)

If no backup exists, the application will recreate an empty database with the
correct schema on next startup (handled by `init_db()` in `db/database.py`).
**User-generated images cannot be recovered** — both the database records and
the image files in `backend/images/` are lost.

---

## Backup Verification

Verify that a backup archive is intact and contains a healthy SQLite database:

```bash
python3 -c "
import zipfile, sqlite3, io, sys

zip_path = 'backend/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.zip'
with zipfile.ZipFile(zip_path) as z:
    assert 'wondercomic.db' in z.namelist(), 'wondercomic.db missing from archive'
    db_bytes = z.read('wondercomic.db')

conn = sqlite3.connect(':memory:')
conn.deserialize(db_bytes)
result = conn.execute('PRAGMA integrity_check').fetchone()[0]
conn.close()
print(result)  # expected: ok
"
```

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
| `backend/db/backup.py` | Backup creation, rotation, listing logic; defines `BACKUP_INTERVAL` and `STALE_THRESHOLD` |
| `backend/db/backup_lock.py` | POSIX flock shared/exclusive lock — prevents image deletion racing with backup packaging |
| `backend/routers/backup.py` | `GET /api/backup/status` (admin) and `POST /api/backup/trigger` (admin) endpoints |
| `backend/routers/health.py` | `GET /health` — DB integrity check + backup staleness check; returns 503 when backup is `never` or `stale` |
| `backend/backup_worker.py` | Standalone process: runs on startup then every `BACKUP_INTERVAL_SECONDS` seconds; retries after 30 s if DB schema is not yet initialized; POSIX flock prevents concurrent runs |
| `backend/scripts/promote_admin.py` | CLI to promote an existing user to admin (required to obtain tokens for backup API) |
| `backend/scripts/restore_backup.py` | CLI to restore a backup archive locally — lists snapshots, confirms, removes WAL sidecars, restores DB + images |
| `backend/main.py` | App factory — database init only, no backup scheduling |
| `backend/services/image_storage.py` | Defines `IMAGES_DIR`; acquires shared flock before deleting images |
| `docker-compose.yml` | `backup-worker` service + `backend_backups` and `backend_images` named volumes |
| `frontend/pages/status/StatusPage.tsx` | `/status` page — shows backup inventory and manual trigger (admin only) |
