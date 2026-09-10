import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceState,
  ConnectionStatus,
  ConversationMessage,
  BookingConstraints,
  Flight,
  VoiceMetrics,
  ServiceStatus,
  TimelineEvent,
} from '@/types';
import { getWsUrl } from '@/lib/api';

export function useVoiceAgent() {
  const [sessionId, setSessionId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [currentGen, setCurrentGen] = useState<number>(0);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [language, setLanguageState] = useState<string>('en');
  const [constraints, setConstraints] = useState<BookingConstraints>({
    origin: null,
    destination: null,
    date: null,
    budget: null,
    passengers: 1,
    selected_flight: null,
  });
  const [flights, setFlights] = useState<Flight[]>([]);
  const [metrics, setMetrics] = useState<VoiceMetrics>({
    end_of_speech_to_first_audio: null,
    tool_duration: null,
    interruption_stop_latency: null,
    stale_results_discarded: 0,
    stale_results_spoken: 0,
  });
  const [services, setServices] = useState<ServiceStatus>({
    rime: 'CONNECTED',
    gemini: 'CONNECTED',
    deepgram: 'CONNECTED',
    livekit: 'CONFIGURED',
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [reconnectTrigger, setReconnectTrigger] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<any[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const recognitionRef = useRef<any>(null);
  const currentGenRef = useRef<number>(0);
  const voiceStateRef = useRef<VoiceState>('IDLE');
  const reconnectTimerRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const languageRef = useRef<string>('en');
  const isListeningRef = useRef<boolean>(false);

  // Keep refs synchronized
  useEffect(() => {
    // Only used as a fallback. Synchronous updates happen in WS handler.
    if (currentGen > currentGenRef.current) {
      currentGenRef.current = currentGen;
    }
  }, [currentGen]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);


  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const nextAudioTimeRef = useRef<number>(0);

  // Stop and flush all playing audio immediately (Interruption stop latency < 20ms)
  const stopAllAudio = useCallback(() => {
    try {
      activeAudioSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Source may already be stopped
        }
      });
      activeAudioSourcesRef.current = [];
      nextAudioTimeRef.current = 0; // Reset audio scheduling queue
    } catch (e) {
      console.error('Error stopping audio playback:', e);
    }
  }, []);

  // Play audio chunk with generation fencing and sequential scheduling
  const playAudioChunk = useCallback(
    async (base64Audio: string, chunkGen: number) => {
      if (chunkGen < currentGenRef.current) {
        return;
      }

      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume();
          } catch (resumeErr) {
            console.warn('AudioContext resume warning:', resumeErr);
          }
        }

        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // We know Rime will stream PCM 24000Hz 16-bit Mono.
        // Convert raw bytes to Int16Array, then into an AudioBuffer.
        const validLen = Math.floor(bytes.buffer.byteLength / 2) * 2;
        const validBuffer = bytes.buffer.slice(0, validLen);
        const int16Array = new Int16Array(validBuffer);
        const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }

        // Generation check before outputting sound
        if (chunkGen < currentGenRef.current) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        // Schedule sequential playback
        const currentTime = ctx.currentTime;
        if (nextAudioTimeRef.current < currentTime) {
          nextAudioTimeRef.current = currentTime;
        }
        
        source.start(nextAudioTimeRef.current);
        nextAudioTimeRef.current += audioBuffer.duration;

        activeAudioSourcesRef.current.push(source);
        source.onended = () => {
          activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter((s) => s !== source);
        };
      } catch (err) {
        console.warn('Audio decoding warning:', err);
      }
    },
    [getAudioContext]
  );

  // Safe WebSocket send - NEVER calls .send() when readyState is not OPEN
  const safeSend = useCallback((message: object) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
      }
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      // Buffer message to send when connection opens
      pendingQueueRef.current.push(message);
    } else {
      console.warn('WebSocket not connected. Message dropped:', (message as any).type);
    }
  }, []);

  // Initialize and manage WebSocket connection with full lifecycle
  useEffect(() => {
    let unmounted = false;
    const currentSessionId = `session-${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(currentSessionId);

    const connectWebSocket = () => {
      if (unmounted) return;

      const wsUrl = getWsUrl(`/ws/voice/${currentSessionId}`);

      setConnectionStatus((prev) => (reconnectAttemptsRef.current > 0 ? 'RECONNECTING' : 'CONNECTING'));

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) {
            try {
              ws.close(1000, 'Unmounted');
            } catch {}
            return;
          }
          console.log('[VoiceBook] WebSocket connected to', wsUrl);
          setConnectionStatus('CONNECTED');
          reconnectAttemptsRef.current = 0;

          // Flush any buffered messages now that we are OPEN
          while (pendingQueueRef.current.length > 0) {
            const queued = pendingQueueRef.current.shift();
            if (queued && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(queued));
            }
          }
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const msg = JSON.parse(event.data);

            if (msg.data?.timeline_entry) {
              setTimelineEvents((prev) => [...prev.slice(-49), msg.data.timeline_entry]);
            }

            if (msg.type === 'connected') {
              setCurrentGen(msg.generation);
              currentGenRef.current = msg.generation;
              setVoiceState(msg.voice_state);
              if (msg.metrics) setMetrics((m) => ({ ...m, ...msg.metrics }));
              if (msg.services) setServices((s) => ({ ...s, ...msg.services }));
              if (msg.timeline_events) setTimelineEvents(msg.timeline_events);
            } else if (msg.type === 'interruption_detected') {
              stopAllAudio();
              setVoiceState('INTERRUPTED');
              const newG = msg.data?.new_generation || msg.generation;
              setCurrentGen(newG);
              currentGenRef.current = newG;
              if (msg.data?.metrics) setMetrics((m) => ({ ...m, ...msg.data.metrics }));

              // Mark last assistant message as interrupted
              setMessages((prev) => {
                const copy = [...prev];
                for (let i = copy.length - 1; i >= 0; i--) {
                  if (copy[i].role === 'assistant') {
                    copy[i] = { ...copy[i], interrupted: true };
                    break;
                  }
                }
                return copy;
              });
            } else if (msg.type === 'audio_chunk') {
              if (msg.generation >= currentGenRef.current) {
                playAudioChunk(msg.audio_base64, msg.generation);
              }
            } else if (msg.type === 'user_utterance') {
              setVoiceState('THINKING');
              setCurrentGen(msg.generation);
              currentGenRef.current = msg.generation;
              setLiveTranscript('');
              setMessages((prev) => [
                ...prev,
                {
                  id: `usr-${Date.now()}`,
                  role: 'user',
                  content: msg.data.transcript,
                  timestamp: new Date().toLocaleTimeString(),
                  generation: msg.generation,
                },
              ]);
            } else if (msg.type === 'agent_speech_start') {
              setVoiceState('SPEAKING');
              const ttsProvider = msg.data.tts_provider || 'rime';
              const speechLang = msg.data.language || 'en';
              setMessages((prev) => [
                ...prev,
                {
                  id: `ast-${Date.now()}`,
                  role: 'assistant',
                  content: msg.data.text,
                  timestamp: new Date().toLocaleTimeString(),
                  generation: msg.generation,
                  ttsProvider: ttsProvider as 'rime' | 'browser',
                  language: speechLang,
                },
              ]);

              // Browser TTS fallback for languages not supported by Rime (e.g. Marathi)
              if (ttsProvider === 'browser' && typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                  // Cancel any ongoing browser speech
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(msg.data.text);
                  // Map language codes to BCP 47 tags
                  const langMap: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
                  utterance.lang = langMap[speechLang] || 'en-IN';
                  utterance.rate = 1.0;
                  utterance.pitch = 1.0;
                  utterance.onend = () => {
                    // Only update state if generation still matches
                    if (msg.generation >= currentGenRef.current) {
                      setVoiceState('COMPLETED');
                    }
                  };
                  utterance.onerror = (e) => {
                    console.warn('Browser TTS error:', e);
                    setVoiceState('COMPLETED');
                  };
                  window.speechSynthesis.speak(utterance);
                } catch (err) {
                  console.warn('Browser speechSynthesis failed:', err);
                }
              }
            } else if (msg.type === 'agent_speech_end') {
              setVoiceState('COMPLETED');
              if (msg.data?.metrics) setMetrics((m) => ({ ...m, ...msg.data.metrics }));
            } else if (msg.type === 'services_updated') {
              if (msg.data?.services) setServices((s) => ({ ...s, ...msg.data.services }));
            } else if (msg.type === 'state_updated') {
              if (msg.data?.constraints) {
                setConstraints((c) => ({ ...c, ...msg.data.constraints }));
              }
            } else if (msg.type === 'tool_started' || msg.type === 'tool_start') {
              setVoiceState('SEARCHING');
            } else if (msg.type === 'flights_found') {
              setFlights(msg.data.flights || []);
            } else if (msg.type === 'flight_selected') {
              setConstraints((c) => ({ ...c, selected_flight: msg.data.flight }));
            } else if (msg.type === 'booking_confirmed') {
              setConstraints((c) => ({ ...c, selected_flight: msg.data.flight }));
            } else if (msg.type === 'booking_cancelled') {
              setFlights([]);
              setConstraints({
                origin: null,
                destination: null,
                date: null,
                budget: null,
                passengers: 1,
                selected_flight: null,
              });
            } else if (msg.type === 'stale_result_discarded') {
              setMetrics((m) => ({ ...m, stale_results_discarded: m.stale_results_discarded + 1 }));
            }
          } catch (e) {
            console.error('Error handling WS message:', e);
          }
        };

        ws.onerror = (e) => {
          if (unmounted) return;
          console.warn('[VoiceBook] WebSocket error event:', e);
          setConnectionStatus('ERROR');
        };

        ws.onclose = (e) => {
          if (unmounted) return;
          console.log('[VoiceBook] WebSocket closed:', e.code, e.reason);
          setConnectionStatus('DISCONNECTED');
          socketRef.current = null;

          // Auto-reconnect with backoff if not cleanly closed
          if (e.code !== 1000 && reconnectAttemptsRef.current < 5) {
            const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 5000);
            reconnectAttemptsRef.current += 1;
            setConnectionStatus('RECONNECTING');
            reconnectTimerRef.current = setTimeout(() => {
              connectWebSocket();
            }, timeout);
          }
        };
      } catch (err) {
        console.error('[VoiceBook] Failed to construct WebSocket:', err);
        setConnectionStatus('ERROR');
      }
    };

    connectWebSocket();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      stopAllAudio();

      const ws = socketRef.current;
      if (ws) {
        // Prevent "WebSocket is closed before connection established" error in React StrictMode
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws.close(1000, 'Unmounted');
            } catch {}
          };
          ws.onerror = () => {};
          ws.onclose = () => {};
        } else if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close(1000, 'Unmounted');
          } catch {}
        }
        socketRef.current = null;
      }
    };
  }, [stopAllAudio, playAudioChunk, reconnectTrigger]);

  // Respond to global logout/exit guest event: immediately halt mic, audio playback, and WebSocket
  useEffect(() => {
    const handleLogoutEvent = () => {
      // 1. Stop Speech Recognition & mic
      try {
        if (recognitionRef.current) {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
          if (typeof recognitionRef.current.abort === 'function') {
            recognitionRef.current.abort();
          }
        }
      } catch (err) {
        console.warn('Error halting SpeechRecognition on logout:', err);
      }
      setIsListening(false);
      setLiveTranscript('');

      // 2. Stop all active audio playback immediately
      stopAllAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.suspend();
        } catch {}
      }

      // 3. Clear speech state & conversation history
      setVoiceState('IDLE');
      voiceStateRef.current = 'IDLE';
      setMessages([]);
      setFlights([]);
      setConstraints({
        origin: null,
        destination: null,
        date: null,
        budget: null,
        passengers: 1,
        selected_flight: null,
      });

      // 4. Close WebSocket
      const ws = socketRef.current;
      if (ws) {
        try {
          ws.close(1000, 'User logged out');
        } catch {}
        socketRef.current = null;
      }
      setConnectionStatus('DISCONNECTED');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('voicebook:logout', handleLogoutEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('voicebook:logout', handleLogoutEvent);
      }
    };
  }, [stopAllAudio]);

  // Handle User Speech Barge-in & Interruption
  const triggerInterruption = useCallback(
    (reason: string = 'manual_button') => {
      stopAllAudio();
      setVoiceState('INTERRUPTED');
      safeSend({
        type: 'interrupt',
        reason,
      });
    },
    [stopAllAudio, safeSend]
  );

  // Toggle Demo Mode (4-second search delay vs instant 0.2s delay)
  const toggleDemoMode = useCallback(() => {
    const nextMode = !demoMode;
    setDemoMode(nextMode);
    safeSend({
      type: 'set_search_delay',
      delay: nextMode ? 4.0 : 0.2,
    });
  }, [demoMode, safeSend]);

  // Send speech transcript
  const sendSpeechTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Unlock AudioContext immediately during user interaction
      getAudioContext();

      // If AI is currently speaking or searching, barge in immediately
      if (voiceStateRef.current === 'SPEAKING' || voiceStateRef.current === 'SEARCHING') {
        triggerInterruption('user_voice_barge_in');
      }

      safeSend({
        type: 'user_speech',
        transcript: text.trim(),
      });
    },
    [triggerInterruption, safeSend, getAudioContext]
  );

  // Initialize Browser Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Set language based on current language selection
      const langMap: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
      recognition.lang = langMap[languageRef.current] || 'en-IN';

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setLiveTranscript(interim);
          if (
            voiceStateRef.current === 'SPEAKING' || 
            voiceStateRef.current === 'SEARCHING' || 
            voiceStateRef.current === 'THINKING'
          ) {
            triggerInterruption('speech_detected_barge_in');
          }
        }

        if (finalTranscript.trim()) {
          sendSpeechTranscript(finalTranscript);
          setLiveTranscript('');
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition event:', e.error);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setVoiceState('IDLE');
        }
      };

      recognition.onend = () => {
        // In Chrome, SpeechRecognition automatically stops on silence or speech pause.
        // If the user hasn't explicitly clicked mic to stop, restart recognition automatically:
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  recognition.start();
                } catch {}
              }
            }, 300);
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [triggerInterruption, sendSpeechTranscript, language]);

  const toggleListening = useCallback(() => {
    getAudioContext();
    if (!isListeningRef.current) {
      isListeningRef.current = true;
      setIsListening(true);
      setVoiceState('LISTENING');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    } else {
      isListeningRef.current = false;
      setIsListening(false);
      setVoiceState('IDLE');
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
  }, [getAudioContext]);

  const selectFlight = useCallback(
    (flight: Flight) => {
      setConstraints((c) => ({ ...c, selected_flight: flight }));
      safeSend({
        type: 'select_flight',
        flight_id: flight.id,
      });
    },
    [safeSend]
  );

  const bookFlight = useCallback(
    (flight: Flight) => {
      safeSend({
        type: 'book_flight',
        flight_id: flight.id,
      });
    },
    [safeSend]
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'Manual reconnect');
      } catch {}
    }
    setReconnectTrigger((prev) => prev + 1);
  }, []);

  const updateBudget = useCallback((budget: number | null) => {
    safeSend({
      type: 'update_budget',
      budget: budget
    });
    // Optimistically update local constraints
    setConstraints((c) => ({ ...c, budget }));
  }, [safeSend]);

  // Set language and sync with backend + restart speech recognition
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    languageRef.current = lang;
    safeSend({ type: 'set_language', language: lang });

    // Cancel any ongoing browser TTS when switching language
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Restart speech recognition with new language if currently listening
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setTimeout(() => {
        try {
          const langMap: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
          recognitionRef.current.lang = langMap[lang] || 'en-IN';
          recognitionRef.current.start();
        } catch (err) {
          console.warn('Failed to restart speech recognition with new language:', err);
        }
      }, 200);
    }
  }, [safeSend, isListening]);

  return {
    sessionId,
    connectionStatus,
    voiceState,
    currentGen,
    messages,
    liveTranscript,
    timelineEvents,
    demoMode,
    language,
    constraints,
    flights,
    metrics,
    services,
    isListening,
    toggleListening,
    toggleDemoMode,
    triggerInterruption,
    sendSpeechTranscript,
    selectFlight,
    bookFlight,
    updateBudget,
    setLanguage,
    reconnect,
  };
}
