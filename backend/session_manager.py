import os
import uuid
import json
import time
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import threading

CHATS_BASE_DIR = "/app/100xprompt-chat"
SESSIONS_FILE = "/app/100xprompt-chat/.sessions.json"
WORKSPACE_DIR = "/app/100xprompt-chat"
MAX_SESSION_AGE_HOURS = 24
lock = threading.Lock()


def ensure_base_dir():
    os.makedirs(CHATS_BASE_DIR, exist_ok=True)


def load_sessions() -> Dict[str, Any]:
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_sessions(sessions: Dict[str, Any]):
    ensure_base_dir()
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2, default=str)


def create_session(client_id: Optional[str] = None) -> Dict[str, str]:
    with lock:
        ensure_base_dir()
        sessions = load_sessions()

        session_id = f"session-{uuid.uuid4().hex[:12]}"
        session_path = os.path.join(CHATS_BASE_DIR, session_id)

        os.makedirs(session_path, exist_ok=True)

        sessions[session_id] = {
            "path": session_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "client_id": client_id,
            "last_activity": datetime.now(timezone.utc).isoformat(),
        }
        save_sessions(sessions)

        return {"session_id": session_id, "path": session_path}


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    with lock:
        sessions = load_sessions()
        return sessions.get(session_id)


def update_activity(session_id: str):
    with lock:
        sessions = load_sessions()
        if session_id in sessions:
            sessions[session_id]["last_activity"] = datetime.now(
                timezone.utc
            ).isoformat()
            save_sessions(sessions)


def _is_within_workspace(path: Path) -> bool:
    workspace_root = Path(WORKSPACE_DIR).resolve()
    try:
        path.relative_to(workspace_root)
        return True
    except ValueError:
        return False


def validate_path(session_id: str, requested_path: str) -> tuple[bool, str]:
    requested = Path(requested_path).resolve()

    if not _is_within_workspace(requested):
        return False, "Path escapes workspace boundary. Access denied."

    session = get_session(session_id)
    if not session:
        return False, "Session not found"

    session_path = Path(session["path"]).resolve()

    try:
        requested.relative_to(session_path)
        return True, str(requested)
    except ValueError:
        return False, f"Path escapes session boundary. Access denied."


def sanitize_path(session_id: str, path: str) -> tuple[bool, str]:
    session = get_session(session_id)
    if not session:
        return False, "Session not found"

    session_path = Path(session["path"]).resolve()

    if os.path.isabs(path):
        requested = Path(path).resolve()
    else:
        requested = (session_path / path).resolve()

    if not _is_within_workspace(requested):
        return False, "Path escapes workspace boundary. Access denied."

    try:
        requested.relative_to(session_path)
        return True, str(requested)
    except ValueError:
        return False, f"Path escapes session boundary. Access denied."


def cleanup_old_sessions():
    with lock:
        sessions = load_sessions()
        now = datetime.now(timezone.utc)
        to_delete = []

        for session_id, session in sessions.items():
            created = datetime.fromisoformat(session["created_at"])
            age_hours = (now - created).total_seconds() / 3600

            if age_hours > MAX_SESSION_AGE_HOURS:
                to_delete.append(session_id)

        for session_id in to_delete:
            session = sessions[session_id]
            if os.path.exists(session["path"]):
                shutil.rmtree(session["path"])
            del sessions[session_id]

        if to_delete:
            save_sessions(sessions)

        return len(to_delete)


def list_sessions() -> Dict[str, Any]:
    return load_sessions()


def delete_session(session_id: str) -> bool:
    with lock:
        sessions = load_sessions()
        if session_id in sessions:
            session = sessions[session_id]
            if os.path.exists(session["path"]):
                shutil.rmtree(session["path"])
            del sessions[session_id]
            save_sessions(sessions)
            return True
        return False


def get_or_create_session_for_client(client_id: str) -> Dict[str, str]:
    with lock:
        sessions = load_sessions()

        for session_id, session in sessions.items():
            if session.get("client_id") == client_id:
                update_activity(session_id)
                return {"session_id": session_id, "path": session["path"]}

        return create_session(client_id)
