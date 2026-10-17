"""Import data-only records exported from the legacy D1 schema."""

import argparse
import asyncio
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from saathi_api.database import SessionFactory, engine
from saathi_api.models import User, Workspace
from saathi_api.schemas import WorkspaceData


def google_username(email: str) -> str:
    return f"g_{hashlib.sha256(email.lower().encode()).hexdigest()[:30]}"


def parsed_workspace(value) -> str:
    data = json.loads(value) if isinstance(value, str) else value
    return WorkspaceData.model_validate(data).model_dump_json()


async def import_export(source: Path) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    local_users = payload.get("local_users", [])
    auth_sessions = payload.get("auth_sessions", [])
    workspaces = payload.get("worker_workspaces", [])
    accounts: dict[str, User] = {}

    async with SessionFactory() as db:
        try:
            imported_accounts = 0
            for row in local_users:
                if row.get("user_id") == "local_demo":
                    continue
                accounts[row["user_id"]] = User(
                    id=row["user_id"],
                    username=row["username"].strip().lower(),
                    email=row["username"].strip().lower(),
                    display_name=row["display_name"][:60],
                    password_hash=row["password_hash"],
                )
            for row in auth_sessions:
                user_id = row.get("user_id", "")
                if not user_id or user_id == "local_demo" or user_id in accounts:
                    continue
                email = row.get("email", "")[:320]
                if not email:
                    continue
                accounts[user_id] = User(
                    id=user_id,
                    username=google_username(email),
                    email=email,
                    display_name=(row.get("display_name") or email.split("@")[0])[:60],
                    password_hash="",
                )
            for row in workspaces:
                user_id = row.get("user_id", "")
                if not user_id or user_id == "local_demo":
                    continue
                if user_id not in accounts:
                    email = (row.get("email") or "")[:320]
                    accounts[user_id] = User(
                        id=user_id,
                        username=google_username(email or user_id),
                        email=email,
                        display_name=(row.get("display_name") or "Saathi worker")[:60],
                        password_hash="",
                    )

            for user in accounts.values():
                existing = await db.get(User, user.id)
                if existing is None:
                    conflict = await db.scalar(select(User.id).where(User.username == user.username))
                    if conflict:
                        raise ValueError(f"Username collision while importing account {user.id!r}.")
                    db.add(user)
                    imported_accounts += 1
            await db.flush()

            imported_workspaces = 0
            for row in workspaces:
                user_id = row.get("user_id", "")
                if user_id not in accounts or await db.get(Workspace, user_id):
                    continue
                revision = row.get("updated_at") or datetime.now(timezone.utc).isoformat()
                db.add(Workspace(user_id=user_id, data=parsed_workspace(row.get("data", "{}")), revision=str(revision)[:40]))
                imported_workspaces += 1
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        finally:
            await engine.dispose()
    print(f"Imported {imported_accounts} accounts and {imported_workspaces} workspaces. Existing records were left as-is.")
    print("Sessions were intentionally not migrated; users must sign in again.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path, help="Private JSON export with local_users, auth_sessions and worker_workspaces arrays")
    asyncio.run(import_export(parser.parse_args().export))
