#!/usr/bin/env python3
"""Restore a WonderComic backup archive (database + images).

Run from the repo root:
    python backend/scripts/restore_backup.py
"""

import getpass
import hmac
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# scripts/ → backend/ → repo root
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
ENV_FILE = REPO_ROOT / ".env"


def _load_dotenv() -> dict[str, str]:
    """Parse key=value pairs from .env, ignoring comments and blank lines."""
    if not ENV_FILE.exists():
        return {}
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def main() -> None:
    env = _load_dotenv()

    expected_secret = os.environ.get("RESTORE_BACKUP_SECRET") or env.get("RESTORE_BACKUP_SECRET", "")
    if not expected_secret:
        print(
            "Error: RESTORE_BACKUP_SECRET is not set. Add it to .env or export it as an environment variable.",
            file=sys.stderr,
        )
        sys.exit(1)

    entered_secret = getpass.getpass("Restore backup secret: ")
    if not hmac.compare_digest(entered_secret.encode(), expected_secret.encode()):
        print("Error: incorrect secret.", file=sys.stderr)
        sys.exit(1)

    backups_dir = BACKEND_DIR / "backups"
    if not backups_dir.exists():
        print(f"Error: backups directory not found at {backups_dir}", file=sys.stderr)
        sys.exit(1)

    zips = sorted(backups_dir.glob("wondercomic_*.zip"), reverse=True)
    if not zips:
        print("Error: no backup files found in backups/", file=sys.stderr)
        sys.exit(1)

    print("\nAvailable backups:\n")
    for i, path in enumerate(zips, start=1):
        print(f"  [{i}] {path.name}")
    print()

    choice_str = input("Choose backup number: ").strip()
    try:
        choice = int(choice_str)
    except ValueError:
        print("Error: invalid input — enter a number.", file=sys.stderr)
        sys.exit(1)

    if choice < 1 or choice > len(zips):
        print(f"Error: number out of range (1–{len(zips)}).", file=sys.stderr)
        sys.exit(1)

    chosen = zips[choice - 1]

    db_path_env = os.environ.get("DB_PATH") or env.get("DB_PATH", "wondercomic.db")
    db_path = BACKEND_DIR / db_path_env
    images_dir = BACKEND_DIR / "images"
    aside_name = "images_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".bak"
    aside_dir = BACKEND_DIR / aside_name

    print(f"\nThis will overwrite {db_path.name} and replace the images directory.")
    if images_dir.exists():
        print(f"  Existing images will be moved to: {aside_name}/")
    confirm = input("Continue? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    wal = db_path.parent / (db_path.name + "-wal")
    shm = db_path.parent / (db_path.name + "-shm")
    for sidecar in (wal, shm):
        if sidecar.exists():
            sidecar.unlink()

    # Move existing images aside so the restored tree is an exact replica of the
    # archive — no stale files from newer or deleted content survive the restore.
    # The .bak directory remains as a safety net if extraction fails.
    if images_dir.exists():
        images_dir.rename(aside_dir)
    images_dir.mkdir(parents=True)
    image_count = 0

    try:
        with zipfile.ZipFile(chosen) as z:
            names = z.namelist()

            if "wondercomic.db" not in names:
                print("Error: wondercomic.db not found inside the archive.", file=sys.stderr)
                sys.exit(1)

            # Archive always stores the DB as "wondercomic.db"; write bytes directly
            # so the destination matches DB_PATH regardless of its basename.
            db_path.write_bytes(z.read("wondercomic.db"))

            images_root = images_dir.resolve()
            for name in names:
                if name.startswith("images/") and not name.endswith("/"):
                    rel = Path(name).relative_to("images")
                    dest = (images_dir / rel).resolve()
                    if not dest.is_relative_to(images_root):
                        print(f"Error: unsafe path in archive: {name}", file=sys.stderr)
                        sys.exit(1)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(z.read(name))
                    image_count += 1
    except zipfile.BadZipFile:
        print(f"Error: {chosen.name} is not a valid zip file.", file=sys.stderr)
        sys.exit(1)

    print("\nRestore complete.")
    print(f"  Database restored to: {db_path}")
    print(f"  Images restored:      {image_count}")
    print(f"  Backup used:          {chosen.name}")
    if aside_dir.exists():
        print(f"  Old images kept at:   {aside_name}/  (remove when verified)")


if __name__ == "__main__":
    main()
