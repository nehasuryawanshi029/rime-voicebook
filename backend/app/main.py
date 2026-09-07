import asyncio
import logging
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.database.database import init_db, query_flights, get_all_bookings, get_booking_by_id, cancel_booking_record
from app.database.seed import seed_database
from app.services.rime import rime_service
from app.services.gemini import gemini_service
from app.services.deepgram import deepgram_service
from app.services.metrics import metrics_collector
from app.agent.conversation import ConversationManager
from app.agent.state import VoiceState

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("voicebook.main")

app = FastAPI(
    title="VoiceBook API",
    description="Interruptible Low-Latency AI Flight Booking Voice Agent",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active conversation managers by session_id
active_sessions: Dict[str, ConversationManager] = {}


@app.on_event("startup")
async def on_startup():
    logger.info("Initializing VoiceBook SQLite database...")
    seed_database()
    logger.info("VoiceBook backend initialized successfully.")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "services": {
            "rime": "CONNECTED" if rime_service.is_healthy() else "MOCK_READY",
            "gemini": "CONNECTED" if gemini_service.is_healthy() else "RULE_BASED_READY",
            "deepgram": "CONNECTED" if deepgram_service.is_healthy() else "BROWSER_STT_READY",
            "livekit": "CONFIGURED" if settings.LIVEKIT_URL and "mock" not in settings.LIVEKIT_URL else "DEV_LOCAL"
        },
        "config": {
            "rime_model": settings.RIME_MODEL,
            "rime_speaker": settings.RIME_SPEAKER,
            "gemini_model": settings.GEMINI_MODEL,
            "search_delay_seconds": settings.FLIGHT_SEARCH_DELAY_SECONDS
        }
    }


@app.get("/api/livekit/token")
async def get_livekit_token(
    room: str = Query("voicebook-demo"),
    identity: Optional[str] = Query(None)
):
    """
    Generates LiveKit room access token for realtime WebRTC audio session.
    """
    user_identity = identity or f"user-{uuid.uuid4().hex[:6]}"
    try:
        from livekit import api
        token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET) \
            .with_identity(user_identity) \
            .with_name(user_identity) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True
            ))
        jwt_token = token.to_jwt()
    except Exception as e:
        logger.warning(f"Could not use livekit SDK for token ({e}), creating fallback JWT structure")
        jwt_token = f"mock-jwt-token-{user_identity}"

    return {
        "token": jwt_token,
        "url": settings.LIVEKIT_URL,
        "room": room,
        "identity": user_identity
    }


@app.get("/api/flights")
def get_flights(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    budget: Optional[float] = None
):
    flights = query_flights(origin=origin, destination=destination, date=date, max_price=budget)
    return {"count": len(flights), "flights": flights}


@app.get("/api/metrics")
def get_metrics():
    return metrics_collector.snapshot()


class UtteranceRequest(BaseModel):
    session_id: str
    transcript: str


@app.post("/api/simulate/utterance")
async def simulate_utterance(req: UtteranceRequest):
    """
    Simulate user speech utterance (for automated tests or UI testing).
    """
    session = active_sessions.get(req.session_id)
    if not session:
        session = ConversationManager(session_id=req.session_id)
        active_sessions[req.session_id] = session

    asyncio.create_task(session.process_user_utterance(req.transcript))
    return {
        "status": "processing",
        "session_id": req.session_id,
        "generation": session.generation_manager.current_generation
    }


class InterruptRequest(BaseModel):
    session_id: str
    reason: str = "manual_interrupt"


@app.post("/api/simulate/interrupt")
async def simulate_interrupt(req: InterruptRequest):
    """
    Triggers immediate interruption on the active session.
    """
    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await session.handle_interruption(reason=req.reason)
    return {
        "status": "interrupted",
        "session_id": req.session_id,
        "current_generation": session.generation_manager.current_generation,
        "metrics": metrics_collector.snapshot()
    }


@app.get("/api/bookings")
def list_bookings():
    return {"bookings": get_all_bookings()}


@app.get("/api/bookings/{booking_id}")
def retrieve_booking(booking_id: str):
    b = get_booking_by_id(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"booking": b}


@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking_endpoint(booking_id: str):
    success = cancel_booking_record(booking_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not cancel booking")
    return {"success": True, "booking_id": booking_id}


@app.websocket("/ws/voice/{session_id}")
async def voice_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Realtime WebSocket endpoint for telemetry, events, transcripts, and audio transport.
    """
    await websocket.accept()
    logger.info(f"WebSocket client connected: session {session_id}")

    is_open = True

    # Event forwarder callback
    async def forward_event(event: Dict[str, Any]):
        nonlocal is_open
        if not is_open:
            return
        try:
            await websocket.send_json(event)
        except Exception:
            is_open = False

    # Audio chunk forwarder callback (binary or base64)
    async def forward_audio(chunk: bytes, generation: int):
        nonlocal is_open
        if not is_open:
            return
        try:
            import base64
            b64_audio = base64.b64encode(chunk).decode("utf-8")
            await websocket.send_json({
                "type": "audio_chunk",
                "generation": generation,
                "audio_base64": b64_audio
            })
        except Exception:
            is_open = False

    session = ConversationManager(
        session_id=session_id,
        on_event=forward_event,
        on_audio_chunk=forward_audio
    )
    active_sessions[session_id] = session

    # Send initial state & metrics snapshot
    try:
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "generation": session.generation_manager.current_generation,
            "voice_state": session.state_machine.current_state.value,
            "metrics": metrics_collector.snapshot(),
            "services": {
                "rime": "CONNECTED" if rime_service.is_healthy() else "MOCK_READY",
                "gemini": "CONNECTED" if gemini_service.is_healthy() else "RULE_BASED_READY",
                "deepgram": "CONNECTED" if deepgram_service.is_healthy() else "BROWSER_STT_READY",
                "livekit": "CONFIGURED" if settings.LIVEKIT_URL and "mock" not in settings.LIVEKIT_URL else "DEV_LOCAL"
            },
            "timeline_events": session.timeline_events
        })
    except Exception as e:
        logger.warning(f"Failed to send initial connected event to session {session_id}: {e}")
        is_open = False
        return

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "user_speech":
                transcript = data.get("transcript", "")
                if transcript.strip():
                    await session.process_user_utterance(transcript)

            elif msg_type == "interrupt":
                reason = data.get("reason", "client_interrupted")
                await session.handle_interruption(reason=reason)

            elif msg_type == "set_search_delay":
                delay = float(data.get("delay", 4.0))
                session.custom_search_delay = delay
                await websocket.send_json({"type": "delay_updated", "delay": delay})

            elif msg_type == "select_flight":
                flight_id = data.get("flight_id")
                from app.tools.booking import select_flight_tool
                res = select_flight_tool(flight_id)
                if res["success"]:
                    session.constraints.selected_flight = res["flight"]
                    await session.emit_event("flight_selected", {"flight": res["flight"]})

            elif msg_type == "book_flight":
                flight_id = data.get("flight_id") or (session.constraints.selected_flight["id"] if session.constraints.selected_flight else None)
                gen = session.generation_manager.current_generation
                await session._execute_booking_flow(gen, flight_id, "Booking flight requested from UI")

            elif msg_type == "cancel_booking":
                gen = session.generation_manager.current_generation
                await session._execute_cancel_flow(gen, "Cancel booking requested from UI")

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "time": data.get("time")})

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected cleanly: session {session_id}")
    except Exception as e:
        logger.warning(f"WebSocket connection closed for session {session_id}: {e}")
    finally:
        is_open = False
        if session_id in active_sessions:
            del active_sessions[session_id]

