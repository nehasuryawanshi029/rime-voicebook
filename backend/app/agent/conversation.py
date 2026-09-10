import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable, Awaitable, List
from app.agent.state import StateMachine, VoiceState, BookingConstraints
from app.agent.generation import GenerationManager
from app.services.gemini import gemini_service
from app.services.rime import rime_service
from app.services.metrics import metrics_collector
from app.tools.flights import search_flights_tool
from app.tools.booking import select_flight_tool, confirm_booking_tool, cancel_booking_tool

logger = logging.getLogger("voicebook.agent.conversation")


class ConversationManager:
    def __init__(
        self,
        session_id: str,
        on_event: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
        on_audio_chunk: Optional[Callable[[bytes, int], Awaitable[None]]] = None
    ):
        self.session_id = session_id
        self.state_machine = StateMachine(session_id)
        self.generation_manager = GenerationManager(session_id)
        self.constraints = BookingConstraints()
        self.current_flights: list = []
        self.on_event = on_event
        self.on_audio_chunk = on_audio_chunk
        self.current_tts_abort_event: Optional[asyncio.Event] = None
        self.active_tts_task: Optional[asyncio.Task] = None
        self.active_search_task: Optional[asyncio.Task] = None
        self.timeline_events: List[Dict[str, Any]] = []
        self.custom_search_delay: Optional[float] = None
        # Multilingual support
        self.language: str = "en"  # Default language, updated by frontend

    def _get_current_request_id(self) -> str:
        req = self.generation_manager.requests.get(self.generation_manager.current_generation)
        return req.request_id if req else "init"

    async def emit_timeline_event(self, event_code: str, details: Optional[Dict[str, Any]] = None):
        """
        Emits a structured timeline event with timestamp, session_id, generation, and request_id.
        """
        now = datetime.now(timezone.utc)
        time_str = now.strftime("%H:%M:%S")
        gen = self.generation_manager.current_generation
        req_id = self._get_current_request_id()

        evt = {
            "event": event_code,
            "timestamp": now.isoformat(),
            "time_display": time_str,
            "session_id": self.session_id,
            "generation": gen,
            "request_id": req_id,
            "details": details or {}
        }
        self.timeline_events.append(evt)
        if len(self.timeline_events) > 100:
            self.timeline_events.pop(0)

        logger.info(f"[{self.session_id}] TIMELINE: {time_str} {event_code} (gen={gen}, req={req_id[:8]})")
        
        # Broadcast to client
        await self.emit_event(event_code, {
            "timeline_entry": evt,
            "details": details or {}
        })

    async def emit_event(self, event_type: str, data: Dict[str, Any]):
        payload = {
            "type": event_type,
            "session_id": self.session_id,
            "generation": self.generation_manager.current_generation,
            "voice_state": self.state_machine.current_state.value,
            "timestamp": time.time(),
            "request_id": self._get_current_request_id(),
            "data": data
        }
        if self.on_event:
            try:
                await self.on_event(payload)
            except Exception as e:
                logger.error(f"Error emitting event {event_type}: {e}")

    async def _abort_active_operations(self, old_gen: int, reason: str = "interruption"):
        """
        Halts in-flight TTS and background search tools for the superseded generation.
        """
        # 1. Abort TTS
        if self.current_tts_abort_event:
            self.current_tts_abort_event.set()
            self.current_tts_abort_event = None
            await self.emit_timeline_event("rime_stopped", {"generation": old_gen, "reason": reason})

        if self.active_tts_task and not self.active_tts_task.done():
            self.active_tts_task.cancel()
            logger.info(f"[{self.session_id}] Cancelled active TTS task for Gen {old_gen}")
            self.active_tts_task = None

        # 2. Cancel active search task
        if self.active_search_task and not self.active_search_task.done():
            self.active_search_task.cancel()
            logger.info(f"[{self.session_id}] Cancelled active search task for Gen {old_gen}")
            self.active_search_task = None

        await self.emit_timeline_event("generation_invalidated", {"invalidated_generation": old_gen, "reason": reason})

    async def handle_interruption(self, reason: str = "user_speech"):
        """
        Explicit interruption handler:
        1. Log interruption_detected with timestamp
        2. Invalidate previous generation
        3. Abort active operations
        4. Advance to new generation
        """
        old_gen = self.generation_manager.current_generation
        metrics_collector.record_interruption(old_gen)
        self.state_machine.transition_to(VoiceState.INTERRUPTING, reason)

        await self.emit_timeline_event("interruption_detected", {
            "interrupted_generation": old_gen,
            "reason": reason
        })

        await self._abort_active_operations(old_gen, reason)

        # Advance generation
        new_req = self.generation_manager.new_generation(query=f"Interrupted ({reason})")
        metrics_collector.record_audio_stopped(old_gen)
        self.state_machine.transition_to(VoiceState.INTERRUPTED, "audio_aborted")

    async def process_user_utterance(self, transcript: str):
        """
        Processes new user speech input.
        Handles atomic generation increment and full pipeline execution.
        """
        old_state = self.state_machine.current_state
        old_gen = self.generation_manager.current_generation

        # If currently speaking or searching, abort previous turn
        if old_state in [VoiceState.SPEAKING, VoiceState.SEARCHING, VoiceState.THINKING]:
            metrics_collector.record_interruption(old_gen)
            self.state_machine.transition_to(VoiceState.INTERRUPTING, "user_overlap_speech")
            await self.emit_timeline_event("interruption_detected", {
                "interrupted_generation": old_gen,
                "reason": "user_overlap_speech"
            })
            await self._abort_active_operations(old_gen, reason="user_overlap_speech")
            metrics_collector.record_audio_stopped(old_gen)

        # Start new authoritative generation
        req = self.generation_manager.new_generation(query=transcript)
        gen = req.generation
        metrics_collector.record_user_speech_end(gen)

        await self.emit_timeline_event("speech_end", {"generation": gen, "transcript": transcript})
        await self.emit_timeline_event("stt_final", {"generation": gen, "transcript": transcript})

        self.state_machine.transition_to(VoiceState.THINKING, "processing_utterance")
        await self.emit_event("user_utterance", {
            "transcript": transcript,
            "generation": gen,
            "request_id": req.request_id
        })

        # 1. Call Gemini LLM to parse intent & update constraints
        await self.emit_timeline_event("llm_start", {"generation": gen})
        
        llm_response = await gemini_service.generate_response(
            transcript=transcript,
            current_state=self.constraints.model_dump(),
            flights_context=self.current_flights,
            language_hint=self.language
        )

        await self.emit_timeline_event("llm_first_token", {"generation": gen})

        # Fencing check: has generation changed during LLM call?
        if not self.generation_manager.is_generation_authoritative(gen):
            metrics_collector.record_stale_discarded()
            await self.emit_timeline_event("stale_result_discarded", {
                "generation": gen,
                "stage": "gemini_llm"
            })
            logger.warning(f"[Gen {gen}] Discarding LLM response because current gen is {self.generation_manager.current_generation}")
            return

        # Merge constraints without losing valid existing fields
        extracted = llm_response.get("constraints", {})
        self.constraints.merge_update(extracted)

        # Extract detected language from LLM response
        response_language = llm_response.get("language", self.language)
        if response_language in {"en", "hi", "mr"}:
            self.language = response_language
        logger.info(f"[Gen {gen}] Detected language: {response_language}")

        await self.emit_event("state_updated", {
            "constraints": self.constraints.model_dump(),
            "llm_analysis": llm_response,
            "language": response_language
        })

        action = llm_response.get("action", "chat")
        speech_text = llm_response.get("speech", "")

        # 2. Route Actions
        if action == "search" and self.constraints.is_searchable():
            await self._execute_search_flow(gen, speech_text, response_language)
        elif action == "book":
            await self._execute_booking_flow(gen, llm_response.get("selected_flight_id"), speech_text, response_language)
        elif action == "cancel":
            await self._execute_cancel_flow(gen, speech_text, response_language)
        else:
            tts_task = asyncio.create_task(self._speak_response(gen, speech_text, response_language))
            self.active_tts_task = tts_task
            try:
                await tts_task
            except asyncio.CancelledError:
                pass
            finally:
                if self.active_tts_task is tts_task:
                    self.active_tts_task = None

    async def _execute_search_flow(self, generation: int, search_announcement: str, language: str = "en"):
        """
        Executes flight search with simulated delay and strict generation fencing.
        """
        self.state_machine.transition_to(VoiceState.SEARCHING, "executing_search")
        metrics_collector.record_tool_start(generation)

        await self.emit_timeline_event("tool_start", {
            "tool": "search_flights",
            "generation": generation,
            "constraints": self.constraints.model_dump()
        })

        # Launch search task
        search_task = asyncio.create_task(
            search_flights_tool(
                origin=self.constraints.origin,
                destination=self.constraints.destination,
                date=self.constraints.date,
                budget=self.constraints.budget,
                passengers=self.constraints.passengers,
                generation=generation,
                delay_seconds=self.custom_search_delay
            )
        )
        self.active_search_task = search_task
        self.generation_manager.register_task(generation, search_task)

        try:
            results_data = await search_task
        except asyncio.CancelledError:
            logger.info(f"[Gen {generation}] Search task cancelled due to interruption.")
            self.generation_manager.stale_results_discarded += 1
            metrics_collector.record_stale_discarded()
            await self.emit_timeline_event("stale_result_discarded", {
                "generation": generation,
                "stage": "cancelled_search_task"
            })
            return
        finally:
            metrics_collector.record_tool_end(generation)

        await self.emit_timeline_event("tool_end", {
            "tool": "search_flights",
            "generation": generation
        })

        # CRITICAL GENERATION FENCING CHECK:
        # If generation is no longer authoritative, DISCARD completely!
        if not self.generation_manager.is_generation_authoritative(generation):
            self.generation_manager.handle_tool_result(generation, results_data)
            metrics_collector.record_stale_discarded()
            await self.emit_timeline_event("stale_result_discarded", {
                "generation": generation,
                "stage": "search_flights_tool"
            })
            return

        # Generation is valid! Update authoritative state and present flights
        self.current_flights = results_data.get("flights", [])
        await self.emit_event("flights_found", {
            "generation": generation,
            "count": len(self.current_flights),
            "flights": self.current_flights
        })

        # Synthesize verbal summary of top flight — multilingual
        if self.current_flights:
            best = self.current_flights[0]
            if language == "hi":
                summary_speech = f"मुझे {self.constraints.origin} से {self.constraints.destination} की {len(self.current_flights)} फ्लाइट्स मिलीं। सबसे सस्ती {best['airline']} है, कीमत ₹{best['price']}, प्रस्थान {best['departure_time']}। क्या इसे बुक करूँ?"
            elif language == "mr":
                summary_speech = f"मला {self.constraints.origin} ते {self.constraints.destination} च्या {len(self.current_flights)} फ्लाइट्स सापडल्या. सर्वात स्वस्त {best['airline']} आहे, किंमत ₹{best['price']}, निघण्याची वेळ {best['departure_time']}. बुक करू का?"
            else:
                summary_speech = f"I found {len(self.current_flights)} flights from {self.constraints.origin} to {self.constraints.destination}. The cheapest is {best['airline']} at ₹{best['price']}, departing at {best['departure_time']}. Would you like to book it?"
        else:
            b_text = f" under ₹{int(self.constraints.budget)}" if self.constraints.budget else ""
            if language == "hi":
                b_text_hi = f" ₹{int(self.constraints.budget)} से कम" if self.constraints.budget else ""
                summary_speech = f"{self.constraints.origin} से {self.constraints.destination}{b_text_hi} की कोई फ्लाइट नहीं मिली। कृपया बजट या रूट बदलें।"
            elif language == "mr":
                b_text_mr = f" ₹{int(self.constraints.budget)} च्या आत" if self.constraints.budget else ""
                summary_speech = f"{self.constraints.origin} ते {self.constraints.destination}{b_text_mr} फ्लाइट सापडली नाही. कृपया बजेट किंवा मार्ग बदला."
            else:
                summary_speech = f"I couldn't find any flights from {self.constraints.origin} to {self.constraints.destination}{b_text}. Would you preset your budget or route?"

        tts_task = asyncio.create_task(self._speak_response(generation, summary_speech, language))
        self.active_tts_task = tts_task
        try:
            await tts_task
        except asyncio.CancelledError:
            pass
        finally:
            if self.active_tts_task is tts_task:
                self.active_tts_task = None

    async def _execute_booking_flow(self, generation: int, selected_id: Optional[int], speech_text: str, language: str = "en"):
        flight_id = selected_id
        if not flight_id and self.current_flights:
            flight_id = self.current_flights[0]["id"]

        if not flight_id:
            if language == "hi":
                await self._speak_response(generation, "कृपया पहले एक फ्लाइट चुनें।", language)
            elif language == "mr":
                await self._speak_response(generation, "कृपया आधी एक फ्लाइट निवडा.", language)
            else:
                await self._speak_response(generation, "Please select a flight first before booking.", language)
            return

        booking_res = confirm_booking_tool(
            flight_id=flight_id,
            passengers_count=self.constraints.passengers
        )

        if not self.generation_manager.is_generation_authoritative(generation):
            metrics_collector.record_stale_discarded()
            await self.emit_timeline_event("stale_result_discarded", {"generation": generation, "stage": "booking"})
            return

        if booking_res["success"]:
            self.constraints.selected_flight = booking_res["flight"]
            self.constraints.booking_id = booking_res["booking"]["booking_id"]

            if language == "hi":
                confirm_speech = f"आपकी फ्लाइट {booking_res['flight']['airline']} {booking_res['flight']['flight_number']} की पुष्टि हो गई! बुकिंग आईडी: {booking_res['booking']['booking_id']}।"
            elif language == "mr":
                confirm_speech = f"तुमची फ्लाइट {booking_res['flight']['airline']} {booking_res['flight']['flight_number']} कन्फर्म झाली! बुकिंग आयडी: {booking_res['booking']['booking_id']}."
            else:
                confirm_speech = f"Your flight {booking_res['flight']['airline']} {booking_res['flight']['flight_number']} is confirmed! Your booking ID is {booking_res['booking']['booking_id']}."

            await self.emit_event("booking_confirmed", {
                "booking": booking_res["booking"],
                "flight": booking_res["flight"]
            })
            tts_task = asyncio.create_task(self._speak_response(generation, confirm_speech, language))
            self.active_tts_task = tts_task
            try:
                await tts_task
            except asyncio.CancelledError:
                pass
            finally:
                if self.active_tts_task is tts_task:
                    self.active_tts_task = None
        else:
            if language == "hi":
                fail_speech = f"क्षमा करें, बुकिंग विफल: {booking_res.get('error')}"
            elif language == "mr":
                fail_speech = f"माफ करा, बुकिंग अयशस्वी: {booking_res.get('error')}"
            else:
                fail_speech = f"Sorry, booking failed: {booking_res.get('error')}"

            tts_task = asyncio.create_task(self._speak_response(generation, fail_speech, language))
            self.active_tts_task = tts_task
            try:
                await tts_task
            except asyncio.CancelledError:
                pass
            finally:
                if self.active_tts_task is tts_task:
                    self.active_tts_task = None

    async def _execute_cancel_flow(self, generation: int, speech_text: str, language: str = "en"):
        if hasattr(self.constraints, "booking_id") and self.constraints.booking_id:
            cancel_res = cancel_booking_tool(self.constraints.booking_id)
            if cancel_res["success"]:
                logger.info(f"Cancelled booking {self.constraints.booking_id}")
        self.constraints = BookingConstraints()
        self.current_flights = []
        await self.emit_event("booking_cancelled", {})

        if language == "hi":
            cancel_speech = "आपकी बुकिंग रद्द कर दी गई है। आप कहाँ यात्रा करना चाहते हैं?"
        elif language == "mr":
            cancel_speech = "तुमची बुकिंग रद्द केली आहे. तुम्हाला कुठे प्रवास करायचा आहे?"
        else:
            cancel_speech = "Your flight booking request has been cleared. Where would you like to travel?"

        tts_task = asyncio.create_task(self._speak_response(generation, cancel_speech, language))
        self.active_tts_task = tts_task
        try:
            await tts_task
        except asyncio.CancelledError:
            pass
        finally:
            if self.active_tts_task is tts_task:
                self.active_tts_task = None

    async def _speak_response(self, generation: int, text: str, language: str = "en"):
        """
        Streams audio via Rime TTS service.
        Guarantees that audio from stale generations is never spoken.
        For unsupported languages (Marathi), emits browser TTS event instead.
        """
        # Double check generation fence before speaking
        if not self.generation_manager.is_generation_authoritative(generation):
            metrics_collector.record_stale_discarded()
            await self.emit_timeline_event("stale_result_discarded", {"generation": generation, "stage": "tts_precheck"})
            return

        # Determine TTS provider
        tts_provider = "rime" if rime_service.is_language_supported(language) else "browser"

        self.state_machine.transition_to(VoiceState.SPEAKING, "tts_start")
        abort_event = asyncio.Event()
        self.current_tts_abort_event = abort_event

        if tts_provider == "browser":
            # For browser TTS (Marathi), we don't stream audio chunks.
            # The frontend will use window.speechSynthesis to speak the text.
            logger.info(f"[Gen {generation}] Using browser TTS for language '{language}'. Text: '{text[:60]}...'")
            await self.emit_timeline_event("tts_start", {"generation": generation, "text": text[:60], "language": language, "tts_provider": "browser"})
            await self.emit_event("agent_speech_start", {
                "text": text, "generation": generation, "language": language, "tts_provider": "browser"
            })
            # Small delay to simulate processing time
            await asyncio.sleep(0.1)
            # Emit speech end immediately — browser handles actual audio playback
            if self.generation_manager.is_generation_authoritative(generation):
                self.state_machine.transition_to(VoiceState.COMPLETED, "browser_tts_done")
                await self.emit_timeline_event("speech_end", {"generation": generation, "tts_provider": "browser"})
                await self.emit_event("agent_speech_end", {
                    "generation": generation,
                    "tts_provider": "browser",
                    "metrics": metrics_collector.snapshot()
                })
            return

        # Rime TTS streaming path
        is_first_chunk = True
        speech_start_emitted = False
        actual_tts_provider = tts_provider  # May be downgraded to "rime_fallback" if API fails
        try:
            async for chunk in rime_service.stream_speech(text, generation, abort_event, language=language):
                # Critical check before dispatching every audio chunk:
                if not self.generation_manager.is_generation_authoritative(generation) or abort_event.is_set():
                    logger.warning(f"[Gen {generation}] Rime audio chunk suppressed: stale generation {generation} vs {self.generation_manager.current_generation}")
                    break

                if is_first_chunk:
                    # The stream has now either connected to Rime or explicitly
                    # entered its local fallback.  Announce the actual provider,
                    # never an optimistic "rime" label.
                    actual_tts_provider = "rime_fallback" if rime_service.last_call_used_fallback else "rime"
                    await self.emit_timeline_event("tts_start", {
                        "generation": generation, "text": text[:60], "language": language,
                        "tts_provider": actual_tts_provider,
                    })
                    await self.emit_event("agent_speech_start", {
                        "text": text, "generation": generation, "language": language,
                        "tts_provider": actual_tts_provider,
                    })
                    speech_start_emitted = True
                    metrics_collector.record_first_audio(generation)
                    await self.emit_timeline_event("rime_first_audio", {"generation": generation})
                    is_first_chunk = False

                if self.on_audio_chunk:
                    await self.on_audio_chunk(chunk, generation)

        except asyncio.CancelledError:
            logger.info(f"[Gen {generation}] TTS stream cancelled.")
        finally:
            # Check if Rime silently fell back to local synthesis
            if rime_service.last_call_used_fallback:
                actual_tts_provider = "rime_fallback"
                logger.warning(f"[Gen {generation}] Rime API fell back to local synthesis — emitting corrective status.")
                await self.emit_event("services_updated", {"services": {"rime": "FALLBACK"}})

            if self.generation_manager.is_generation_authoritative(generation):
                self.state_machine.transition_to(VoiceState.COMPLETED, "tts_done")
                await self.emit_timeline_event("speech_end", {"generation": generation, "tts_provider": actual_tts_provider})
                await self.emit_event("agent_speech_end", {
                    "generation": generation,
                    "tts_provider": actual_tts_provider,
                    "metrics": metrics_collector.snapshot()
                })
            else:
                logger.info(f"[Gen {generation}] Finished in non-authoritative state.")
