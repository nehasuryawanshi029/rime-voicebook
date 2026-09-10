import logging
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone

logger = logging.getLogger("voicebook.state")


class VoiceState(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    TRANSCRIBING = "TRANSCRIBING"
    THINKING = "THINKING"
    SEARCHING = "SEARCHING"
    SPEAKING = "SPEAKING"
    INTERRUPTING = "INTERRUPTING"
    INTERRUPTED = "INTERRUPTED"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


VALID_TRANSITIONS = {
    VoiceState.IDLE: {VoiceState.LISTENING, VoiceState.THINKING, VoiceState.ERROR},
    VoiceState.LISTENING: {VoiceState.TRANSCRIBING, VoiceState.THINKING, VoiceState.INTERRUPTING, VoiceState.IDLE, VoiceState.ERROR},
    VoiceState.TRANSCRIBING: {VoiceState.THINKING, VoiceState.INTERRUPTING, VoiceState.IDLE, VoiceState.ERROR},
    VoiceState.THINKING: {VoiceState.SEARCHING, VoiceState.SPEAKING, VoiceState.INTERRUPTING, VoiceState.ERROR},
    VoiceState.SEARCHING: {VoiceState.SPEAKING, VoiceState.INTERRUPTING, VoiceState.THINKING, VoiceState.ERROR},
    VoiceState.SPEAKING: {VoiceState.INTERRUPTING, VoiceState.COMPLETED, VoiceState.IDLE, VoiceState.ERROR},
    VoiceState.INTERRUPTING: {VoiceState.INTERRUPTED, VoiceState.LISTENING, VoiceState.THINKING, VoiceState.ERROR},
    VoiceState.INTERRUPTED: {VoiceState.LISTENING, VoiceState.THINKING, VoiceState.IDLE, VoiceState.ERROR},
    VoiceState.COMPLETED: {VoiceState.IDLE, VoiceState.LISTENING, VoiceState.THINKING},
    VoiceState.ERROR: {VoiceState.IDLE, VoiceState.LISTENING}
}


class BookingConstraints(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    date: Optional[str] = None
    budget: Optional[float] = None
    passengers: int = Field(default=1, ge=1)
    selected_flight: Optional[Dict[str, Any]] = None
    booking_id: Optional[str] = None

    def merge_update(self, new_constraints: Dict[str, Any]) -> "BookingConstraints":
        """
        Merge new constraints without losing existing valid constraints.
        """
        for k, v in new_constraints.items():
            if v is not None and hasattr(self, k):
                # Clean strings if needed
                if isinstance(v, str) and v.strip() == "":
                    continue
                setattr(self, k, v)
        return self

    def is_searchable(self) -> bool:
        return bool(self.origin and self.destination)


class StateMachine:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_state: VoiceState = VoiceState.IDLE
        self.history: List[Dict[str, Any]] = []
        self._record_transition(VoiceState.IDLE, reason="init")

    def _record_transition(self, new_state: VoiceState, reason: str = ""):
        event = {
            "session_id": self.session_id,
            "previous_state": self.current_state.value if hasattr(self, "current_state") else None,
            "new_state": new_state.value,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.history.append(event)
        logger.info(f"[{self.session_id}] State Transition: {event['previous_state']} -> {new_state.value} ({reason})")

    def transition_to(self, target_state: VoiceState, reason: str = "") -> bool:
        if target_state == self.current_state:
            return True
        allowed = VALID_TRANSITIONS.get(self.current_state, set())
        if target_state not in allowed:
            # If unexpected transition occurs (e.g. emergency interrupt or error), log warning but allow recovery
            logger.warning(
                f"[{self.session_id}] Force transition {self.current_state} -> {target_state} (Not in strict allowed {allowed})"
            )
        self._record_transition(target_state, reason)
        self.current_state = target_state
        return True
