import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable

logger = logging.getLogger("voicebook.generation")


class GenerationRequest:
    def __init__(self, session_id: str, generation: int, query: str = ""):
        self.request_id = str(uuid.uuid4())
        self.session_id = session_id
        self.generation = generation
        self.query = query
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.status = "ACTIVE"  # ACTIVE, CANCELLED, SUPERSEDED, COMPLETED
        self.result: Optional[Any] = None

    def mark_interrupted(self):
        self.status = "CANCELLED"

    def mark_completed(self, result: Any):
        self.status = "COMPLETED"
        self.result = result

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "request_id": self.request_id,
            "generation": self.generation,
            "created_at": self.created_at,
            "status": self.status,
            "query": self.query
        }


class GenerationManager:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_generation: int = 0
        self.requests: Dict[int, GenerationRequest] = {}
        self.active_tasks: Dict[int, asyncio.Task] = {}
        self.stale_results_discarded: int = 0
        self.stale_results_spoken: int = 0  # Goal: must always stay 0

    def new_generation(self, query: str = "") -> GenerationRequest:
        """
        Increment generation, cancel previous active tasks, and register new generation.
        """
        # Invalidate previous generation if active
        if self.current_generation in self.requests:
            prev_req = self.requests[self.current_generation]
            if prev_req.status == "ACTIVE":
                prev_req.status = "SUPERSEDED"
                logger.info(
                    f"[{self.session_id}] Generation {self.current_generation} superseded by new generation."
                )

        # Cancel previous running task if still executing
        if self.current_generation in self.active_tasks:
            prev_task = self.active_tasks[self.current_generation]
            if not prev_task.done():
                prev_task.cancel()
                logger.info(
                    f"[{self.session_id}] Cancelled active async task for generation {self.current_generation}."
                )

        self.current_generation += 1
        req = GenerationRequest(self.session_id, self.current_generation, query)
        self.requests[self.current_generation] = req
        logger.info(
            f"[{self.session_id}] Initialized Generation {self.current_generation} (request_id={req.request_id})."
        )
        return req

    def register_task(self, generation: int, task: asyncio.Task):
        self.active_tasks[generation] = task

    def is_generation_authoritative(self, generation: int) -> bool:
        """
        Returns True ONLY if this generation matches the active current generation.
        """
        return generation == self.current_generation

    def handle_tool_result(self, generation: int, result: Any) -> Optional[Any]:
        """
        Generation fencing checkpoint. If result is stale, immediately discard.
        """
        if not self.is_generation_authoritative(generation):
            self.stale_results_discarded += 1
            logger.warning(
                f"[{self.session_id}] FENCE TRIGGERED: Stale result from generation {generation} discarded! Current is {self.current_generation}."
            )
            return None
        
        req = self.requests.get(generation)
        if req:
            req.mark_completed(result)
        return result

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "current_generation": self.current_generation,
            "stale_results_discarded": self.stale_results_discarded,
            "stale_results_spoken": self.stale_results_spoken,
        }
