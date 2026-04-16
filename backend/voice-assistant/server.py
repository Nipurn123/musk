import asyncio
import logging
import os
import json
import uuid
from flask import Flask, request, jsonify

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ai-assistant-server")

app = Flask(__name__)

GOOGLE_CREDENTIALS_PATH = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/app/backend/voice-assistant/google-credentials.json",
)


def load_google_credentials():
    try:
        with open(GOOGLE_CREDENTIALS_PATH, "r") as f:
            creds_dict = json.load(f)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        project_id = creds_dict.get("project_id")
        logger.info("Google credentials loaded successfully")
        return credentials, project_id
    except Exception as e:
        logger.error(f"Failed to load Google credentials: {e}")
        return None, None


try:
    from livekit import api, rtc
    from livekit.agents import Agent, AgentSession, RunContext
    from livekit.agents.llm import function_tool
    from livekit.agents.voice.room_io import RoomOptions, AudioInputOptions
    from livekit.plugins import google, silero
    from google.oauth2 import service_account
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    exit(1)

try:
    from livekit.plugins import dtln

    DTLN_AVAILABLE = True
except ImportError:
    DTLN_AVAILABLE = False

room_refs = {}


class PersonalAIAssistant(Agent):
    def __init__(self, room: rtc.Room) -> None:
        self._room = room
        super().__init__(
            instructions="""You are the 100X Prompt Personal AI Assistant — a warm, intelligent companion.

RESPONSE STYLE:
- Keep responses BRIEF (2-3 sentences) by default
- Go deeper when user asks follow-up questions or complex topics
- Match response length to question depth

CAPABILITIES:
- You can see the user's screen share
- Answer questions about what's visible on screen
- Help with coding, debugging, explanations
- Multilingual - respond in user's language

AVAILABLE TOOLS:
- set_prompt: Set text in the 100XPrompt input box for vibe coding. Use when user wants to write code or make changes.
- submit_prompt: Submit the current prompt to start coding. Use after set_prompt when user confirms they want to proceed.
- get_nipun: Test function that returns 'nipun' as a string.

BEHAVIOR:
- Be helpful and proactive
- When user wants to vibe code, use set_prompt to put their request in the input box, then immediately ask if they want to submit
- When they confirm, call submit_prompt
- DO NOT say anything after calling set_prompt or submit_prompt on success - the UI handles it
- Only speak if there's an error from the tool
- Acknowledge what you see on screen
- Ask clarifying questions when needed

Start by greeting warmly and asking how you can help!""",
        )
        self.greeted = False

    @function_tool()
    async def set_prompt(self, context: RunContext, prompt: str) -> str | None:
        """Set the prompt text in the 100XPrompt input box. Use this when user wants to vibe coding.

        Args:
            prompt: The text to put in the input box (the coding request)
        """
        logger.info(f"📝 set_prompt called: {prompt[:100]}...")

        try:
            data = json.dumps({"type": "set_prompt", "prompt": prompt}).encode("utf-8")

            await self._room.local_participant.publish_data(data, reliable=True)
            logger.info("✅ Prompt sent to frontend via data channel")
        except Exception as e:
            logger.error(f"Failed to send prompt: {e}")
            return f"Error: {str(e)}"

    @function_tool()
    async def submit_prompt(self, context: RunContext) -> str | None:
        """Submit the current prompt in the input box to start coding. Call this after set_prompt when user confirms."""
        logger.info("🚀 submit_prompt called")

        try:
            data = json.dumps({"type": "submit_prompt"}).encode("utf-8")

            await self._room.local_participant.publish_data(data, reliable=True)
            logger.info("✅ Submit command sent to frontend")
        except Exception as e:
            logger.error(f"Failed to submit: {e}")
            return f"Error: {str(e)}"

    @function_tool()
    async def get_nipun(self, context: RunContext) -> str:
        """Test function that returns 'nipun' as a string. Call this when user asks to test the function call."""
        return "nipun"

    async def on_enter(self):
        if not self.greeted:
            self.greeted = True
            await self.session.generate_reply(
                instructions="Greet warmly: 'Hey! I'm your 100X Prompt AI Assistant. I can help you vibe code - just tell me what you want to build!'"
            )


active_sessions = {}
vad_instance = None


def get_vad():
    global vad_instance
    if vad_instance is None:
        vad_instance = silero.VAD.load(
            min_speech_duration=0.08,
            min_silence_duration=0.4,
            prefix_padding_duration=0.3,
            activation_threshold=0.45,
            max_buffered_speech=45.0,
            force_cpu=True,
        )
        logger.info("VAD model loaded")
    return vad_instance


async def run_agent(room_name: str, livekit_url: str, api_key: str, api_secret: str):
    """Run the AI agent in a LiveKit room."""
    logger.info(f"Starting AI Assistant for room: {room_name}")
    print(f"[DEBUG] Starting AI Assistant for room: {room_name}", flush=True)

    room = rtc.Room()

    token = api.AccessToken(api_key, api_secret)
    token.with_identity(f"ai-assistant-{room_name}")
    token.with_name("AI Assistant")
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )

    jwt_token = token.to_jwt()

    try:
        await room.connect(livekit_url, jwt_token)
        logger.info(f"Connected to room: {room_name}")
        print(f"[DEBUG] Connected to room: {room_name}", flush=True)
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        print(f"[DEBUG] Failed to connect: {e}", flush=True)
        return

    vad = get_vad()

    google_creds, project_id = load_google_credentials()
    if not google_creds or not project_id:
        logger.error("Could not load Google credentials")
        return

    session = AgentSession(
        vad=vad,
        llm=google.beta.realtime.RealtimeModel(
            model="gemini-live-2.5-flash-native-audio",
            voice="Aoede",
            temperature=0.7,
            vertexai=True,
            project=project_id,
            credentials=google_creds,
        ),
    )

    agent = PersonalAIAssistant(room)
    logger.info(f"Agent created with {len(agent.tools)} tools")

    @session.on("function_tools_executed")
    def _on_tools_executed(ev):
        for call, out in zip(ev.function_calls, ev.function_call_outputs):
            logger.info(f"✅ TOOL EXECUTED: {call.name} -> {out.output}")

    @session.on("error")
    def _on_error(ev):
        logger.error(f"Session error: {ev}")

    if DTLN_AVAILABLE:
        audio_input = AudioInputOptions(
            noise_cancellation=dtln.noise_suppression(strength=1.0)
        )
        logger.info("DTLN noise cancellation enabled")
    else:
        audio_input = AudioInputOptions()
        logger.warning("DTLN not available")

    try:
        await session.start(
            agent=agent,
            room=room,
            room_options=RoomOptions(
                audio_input=audio_input,
                video_input=True,
                text_output=True,
            ),
        )
        logger.info("AI Assistant started — listening with VIDEO ENABLED")
        print(f"[DEBUG] Agent started with video_input=True", flush=True)

        await agent.on_enter()

        while room.isconnected:
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"Session error: {e}")
        print(f"[DEBUG] Session error: {e}", flush=True)
    finally:
        await room.disconnect()
        logger.info(f"Disconnected from room: {room_name}")
        if room_name in active_sessions:
            del active_sessions[room_name]


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "active_sessions": len(active_sessions)})


@app.route("/start", methods=["POST"])
def start_agent():
    """Start the AI agent in a LiveKit room."""
    print("[DEBUG] /start endpoint called", flush=True)
    data = request.json
    print(f"[DEBUG] Received data: {data}", flush=True)

    livekit_url = data.get("livekit_url") or os.environ.get("LIVEKIT_URL")
    api_key = data.get("api_key") or os.environ.get("LIVEKIT_API_KEY")
    api_secret = data.get("api_secret") or os.environ.get("LIVEKIT_API_SECRET")

    room_name = data.get("room_name") or f"room-{uuid.uuid4().hex[:8]}"

    if not all([livekit_url, api_key, api_secret]):
        return jsonify({"error": "Missing LiveKit configuration"}), 400

    if room_name in active_sessions:
        pass

    token = api.AccessToken(api_key, api_secret)
    token.with_identity(f"user-{room_name}")
    token.with_name("User")
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )
    jwt_token = token.to_jwt()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def run_async():
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_agent(room_name, livekit_url, api_key, api_secret))

    import threading

    thread = threading.Thread(target=run_async, daemon=True)
    thread.start()

    active_sessions[room_name] = thread

    return jsonify(
        {
            "success": True,
            "url": livekit_url,
            "token": jwt_token,
            "roomId": room_name,
        }
    )


@app.route("/stop", methods=["POST"])
def stop_agent():
    """Stop the AI agent in a LiveKit room."""
    data = request.json
    room_name = data.get("room_name")

    if room_name in active_sessions:
        del active_sessions[room_name]
        return jsonify({"success": True, "message": "Session stopped"})

    return jsonify({"error": "No active session for this room"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=port)
