from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx

from session_manager import (
    create_session,
    get_session,
    get_or_create_session_for_client,
    validate_path,
    sanitize_path,
    cleanup_old_sessions,
    list_sessions,
    delete_session,
    update_activity,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)

    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()

    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    for check in status_checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])

    return status_checks


class SessionCreate(BaseModel):
    client_id: Optional[str] = None


class PathValidateRequest(BaseModel):
    session_id: str
    path: str


@api_router.post("/session/create")
async def api_create_session(data: SessionCreate):
    session = create_session(data.client_id)
    return JSONResponse(content=session)


@api_router.post("/session/get-or-create")
async def api_get_or_create_session(data: SessionCreate):
    if not data.client_id:
        raise HTTPException(status_code=400, detail="client_id required")
    session = get_or_create_session_for_client(data.client_id)
    return JSONResponse(content=session)


@api_router.get("/session/{session_id}")
async def api_get_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content=session)


@api_router.delete("/session/{session_id}")
async def api_delete_session(session_id: str):
    success = delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content={"success": True})


@api_router.get("/sessions")
async def api_list_sessions():
    return JSONResponse(content=list_sessions())


@api_router.post("/session/validate-path")
async def api_validate_path(data: PathValidateRequest):
    valid, result = validate_path(data.session_id, data.path)
    if not valid:
        raise HTTPException(status_code=403, detail=result)
    return JSONResponse(content={"valid": True, "resolved_path": result})


@api_router.post("/session/sanitize-path")
async def api_sanitize_path(data: PathValidateRequest):
    valid, result = sanitize_path(data.session_id, data.path)
    if not valid:
        raise HTTPException(status_code=403, detail=result)
    return JSONResponse(content={"valid": True, "resolved_path": result})


@api_router.post("/session/cleanup")
async def api_cleanup_sessions():
    count = cleanup_old_sessions()
    return JSONResponse(content={"deleted_count": count})


# Proxy voice assistant routes to port 3001
@api_router.api_route("/ai-assistant", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_ai_assistant_base(request: Request):
    async with httpx.AsyncClient() as client:
        url = "http://127.0.0.1:3001/"
        if request.method == "POST":
            url = "http://127.0.0.1:3001/start"
        response = await client.request(
            method=request.method,
            url=url,
            content=await request.body(),
            headers=dict(request.headers),
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
        )


@api_router.api_route(
    "/ai-assistant/{path:path}", methods=["GET", "POST", "PUT", "DELETE"]
)
async def proxy_ai_assistant(request: Request, path: str):
    async with httpx.AsyncClient() as client:
        url = f"http://127.0.0.1:3001/{path}"
        response = await client.request(
            method=request.method,
            url=url,
            content=await request.body(),
            headers=dict(request.headers),
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
        )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
