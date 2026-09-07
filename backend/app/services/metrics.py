import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("voicebook.metrics")


class TurnMetrics:
    def __init__(self, generation: int):
        self.generation = generation
        self.user_speech_start: Optional[float] = None
        self.user_speech_end: Optional[float] = None
        self.stt_complete: Optional[float] = None
        self.llm_start: Optional[float] = None
        self.llm_first_token: Optional[float] = None
        self.tool_start: Optional[float] = None
        self.tool_end: Optional[float] = None
        self.rime_start: Optional[float] = None
        self.first_audio: Optional[float] = None
        self.interruption_detected: Optional[float] = None
        self.rime_stop: Optional[float] = None

    def calculate(self) -> Dict[str, Any]:
        eos_to_first_audio_ms = None
        if self.user_speech_end and self.first_audio:
            eos_to_first_audio_ms = max(0.0, (self.first_audio - self.user_speech_end) * 1000)

        interruption_stop_latency_ms = None
        if self.interruption_detected and self.rime_stop:
            interruption_stop_latency_ms = max(0.0, (self.rime_stop - self.interruption_detected) * 1000)

        tool_duration_ms = None
        if self.tool_start and self.tool_end:
            tool_duration_ms = max(0.0, (self.tool_end - self.tool_start) * 1000)

        return {
            "generation": self.generation,
            "end_of_speech_to_first_audio_ms": round(eos_to_first_audio_ms, 1) if eos_to_first_audio_ms is not None else None,
            "interruption_stop_latency_ms": round(interruption_stop_latency_ms, 1) if interruption_stop_latency_ms is not None else None,
            "tool_duration_ms": round(tool_duration_ms, 1) if tool_duration_ms is not None else None,
        }


class MetricsCollector:
    def __init__(self):
        self.turns: Dict[int, TurnMetrics] = {}
        self.stale_results_discarded: int = 0
        self.stale_results_spoken: int = 0  # TARGET: ALWAYS 0
        self.last_eos_to_first_audio_ms: Optional[float] = None
        self.last_interruption_stop_latency_ms: Optional[float] = None
        self.last_tool_duration_ms: Optional[float] = None

    def get_or_create_turn(self, generation: int) -> TurnMetrics:
        if generation not in self.turns:
            self.turns[generation] = TurnMetrics(generation)
        return self.turns[generation]

    def record_user_speech_end(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        turn.user_speech_end = now

    def record_tool_start(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        turn.tool_start = now

    def record_tool_end(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        turn.tool_end = now
        metrics = turn.calculate()
        if metrics["tool_duration_ms"] is not None:
            self.last_tool_duration_ms = metrics["tool_duration_ms"]

    def record_first_audio(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        if turn.first_audio is None:
            turn.first_audio = now
            metrics = turn.calculate()
            if metrics["end_of_speech_to_first_audio_ms"] is not None:
                self.last_eos_to_first_audio_ms = metrics["end_of_speech_to_first_audio_ms"]

    def record_interruption(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        turn.interruption_detected = now

    def record_audio_stopped(self, generation: int):
        now = time.time()
        turn = self.get_or_create_turn(generation)
        turn.rime_stop = now
        metrics = turn.calculate()
        if metrics["interruption_stop_latency_ms"] is not None:
            self.last_interruption_stop_latency_ms = metrics["interruption_stop_latency_ms"]

    def record_stale_discarded(self):
        self.stale_results_discarded += 1

    def record_stale_spoken(self):
        self.stale_results_spoken += 1

    def snapshot(self) -> Dict[str, Any]:
        return {
            "end_of_speech_to_first_audio": self.last_eos_to_first_audio_ms,
            "tool_duration": self.last_tool_duration_ms,
            "interruption_stop_latency": self.last_interruption_stop_latency_ms,
            "stale_results_discarded": self.stale_results_discarded,
            "stale_results_spoken": self.stale_results_spoken,
        }


metrics_collector = MetricsCollector()
