#!/usr/bin/env python3
"""Promote an existing user to admin.

Run from the repo root:
    python backend/scripts/promote_admin.py
"""

import getpass
import hmac
import os
import sqlite3
import sys
from pathlib import Path

# scripts/ is one level inside the backend directory in both layouts:
#   local : tran_main1/backend/scripts/promote_admin.py  → parent.parent = backend/
#   Docker: /app/scripts/promote_admin.py                → parent.parent = /app/
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
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

    expected_secret = os.environ.get("ADMIN_PROMOTION_SECRET") or env.get("ADMIN_PROMOTION_SECRET", "")
    if not expected_secret:
        print(
            "Error: ADMIN_PROMOTION_SECRET is not set. Add it to .env or export it as an environment variable.",
            file=sys.stderr,
        )
        sys.exit(1)

    db_path_env = os.environ.get("DB_PATH") or env.get("DB_PATH", "wondercomic.db")
    db_path = BACKEND_DIR / db_path_env
    if not db_path.exists():
        print(f"Error: database not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    entered_secret = getpass.getpass("Admin promotion secret: ")
    if not hmac.compare_digest(entered_secret.encode(), expected_secret.encode()):
        print("Error: incorrect secret.", file=sys.stderr)
        sys.exit(1)

    identifier = input("Username or email to promote: ").strip()
    if not identifier:
        print("Error: identifier cannot be empty.", file=sys.stderr)
        sys.exit(1)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT id, username, email, is_admin FROM users WHERE username = ? OR email = ?",
            (identifier, identifier),
        )
        user = cursor.fetchone()

    if user is None:
        print(f"Error: no user found matching '{identifier}'.", file=sys.stderr)
        sys.exit(1)

    print(f"Found: id={user['id']}  username={user['username']}  email={user['email']}")

    if user["is_admin"]:
        print(f"'{user['username']}' is already an admin. Nothing to do.")
        sys.exit(0)

    confirm = input(f"Promote '{user['username']}' to admin? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (user["id"],))
        conn.commit()

    print(f"Done: '{user['username']}' (id={user['id']}) is now an admin.")


if __name__ == "__main__":
    main()
