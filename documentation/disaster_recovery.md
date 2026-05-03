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
| Schedule | On startup + every 24 hours automatically |
| Retention | Last 7 snapshots (oldest deleted automatically) |
| Storage | `backend_backups` named Docker volume, mounted at `/app/backups` in the container (Compose prefixes the physical name with the project name, e.g. `tran_main1_backend_backups`) |
| Filename format | `wondercomic_YYYYMMDD_HHMMSS_ffffff.zip` (microsecond precision) |
| Archive contents | `wondercomic.db` + `images/<filename>` for every file in `backend/images/` |

### Manual Backup (API)

Trigger an immediate backup without restarting:

```bash
# Docker deployment (through nginx on port 443)
curl -k -X POST -H "Authorization: Bearer <token>" https://localhost/api/backup/trigger

# Local dev (uvicorn direct, no nginx)
curl -X POST -H "Authorization: Bearer <token>" http://localhost:8000/api/backup/trigger
```

### Check Backup Status (API)

```bash
# Docker deployment
curl -k https://localhost/api/backup/status

# Local dev
curl http://localhost:8000/api/backup/status
```

The response includes the last backup timestamp and a list of all available snapshots.
The `-k` flag skips certificate verification for the self-signed dev cert.

### Status UI

Visit `https://localhost/status` (Docker) or `http://localhost:3000/status` (local dev)
for a visual backup inventory and a **Back up now** button.

---

## Restore Procedures

### Scenario 1 — Corrupt or missing database and/or images (Docker deployment)

1. **Stop the backend container.**
   ```bash
   docker compose stop backend
   ```

2. **Remove WAL sidecar files.**
   SQLite keeps a write-ahead log (`wondercomic.db-wal`) and shared-memory file
   (`wondercomic.db-shm`) alongside the main database. If these files from the old
   (possibly corrupt) database are present when the backend restarts with the restored
   database, SQLite will attempt to apply them, causing inconsistency. Delete them first.
   ```bash
   docker compose run --rm --no-deps backend \
     sh -c "rm -f /app/wondercomic.db-wal /app/wondercomic.db-shm"
   ```

3. **Identify the backup to restore.**
   ```bash
   docker compose run --rm --no-deps backend ls /app/backups
   ```
   Pick the most recent `wondercomic_YYYYMMDD_HHMMSS_ffffff.zip` file.

4. **Extract the database from the backup archive.**
   ```bash
   docker compose run --rm --no-deps backend \
     python3 -c "
   import zipfile, shutil
   with zipfile.ZipFile('/app/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.zip') as z:
       z.extract('wondercomic.db', '/app')
   "
   ```
   Replace `wondercomic_YYYYMMDD_HHMMSS_ffffff.zip` with the chosen filename.

5. **Restore the images from the backup archive.**
   ```bash
   docker compose run --rm --no-deps backend \
     python3 -c "
   import zipfile, pathlib
   images_dir = pathlib.Path('/app/images')
   images_dir.mkdir(exist_ok=True)
   with zipfile.ZipFile('/app/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.zip') as z:
       for name in z.namelist():
           if name.startswith('images/') and not name.endswith('/'):
               dest = images_dir / pathlib.Path(name).name
               dest.write_bytes(z.read(name))
   "
   ```

6. **Restart the backend.**
   ```bash
   docker compose start backend
   ```

7. **Verify** by visiting `https://localhost/status` or running `curl -k https://localhost/health`.

---

### Scenario 2 — Local development (no Docker)

1. **Stop the running server** (Ctrl+C in the uvicorn terminal).

2. **Remove WAL sidecar files.**
   ```bash
   rm -f backend/wondercomic.db-wal backend/wondercomic.db-shm
   ```

3. **Extract the database.**
   ```bash
   python3 -c "
   import zipfile
   with zipfile.ZipFile('backend/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.zip') as z:
       z.extract('wondercomic.db', 'backend')
   "
   ```

4. **Restore the images.**
   ```bash
   python3 -c "
   import zipfile, pathlib
   images_dir = pathlib.Path('backend/images')
   images_dir.mkdir(exist_ok=True)
   with zipfile.ZipFile('backend/backups/wondercomic_YYYYMMDD_HHMMSS_ffffff.zip') as z:
       for name in z.namelist():
           if name.startswith('images/') and not name.endswith('/'):
               dest = images_dir / pathlib.Path(name).name
               dest.write_bytes(z.read(name))
   "
   ```

5. **Restart the server.**
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
| `backend/db/backup.py` | Backup creation, rotation, and listing logic |
| `backend/routers/backup.py` | `GET /api/backup/status` and `POST /api/backup/trigger` endpoints |
| `backend/main.py` | Startup backup + 24-hour scheduled task |
| `backend/services/image_storage.py` | Defines `IMAGES_DIR` — the directory included in each backup |
| `docker-compose.yml` | Declares `backend_backups` named volume (mounted at `/app/backups`) and `backend_images` named volume (mounted at `/app/images`) |
| `frontend/pages/status/StatusPage.tsx` | `/status` page — shows backup inventory and manual trigger |
