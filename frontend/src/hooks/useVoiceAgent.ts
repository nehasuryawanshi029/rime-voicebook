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

export function useVoiceAgent() {
  const [sessionId, setSessionId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [currentGen, setCurrentGen] = useState<number>(0);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [demoMode, setDemoMode] = useState<boolean>(true);
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

  const socketRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<any[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const recognitionRef = useRef<any>(null);
  const currentGenRef = useRef<number>(0);
  const voiceStateRef = useRef<VoiceState>('IDLE');
  const reconnectTimerRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Keep refs synchronized
  useEffect(() => {
    currentGenRef.current = currentGen;
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
    } catch (e) {
      console.error('Error stopping audio playback:', e);
    }
  }, []);

  // Play audio chunk with generation fencing
  const playAudioChunk = useCallback(
    async (base64Audio: string, chunkGen: number) => {
      if (chunkGen < currentGenRef.current) {
        return;
      }

      try {
        const ctx = getAudioContext();
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        let audioBuffer: AudioBuffer;
        try {
          audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        } catch {
          // Fallback: 24kHz 16-bit mono PCM
          const int16Array = new Int16Array(bytes.buffer);
          audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768.0;
          }
        }

        // Generation check before outputting sound
        if (chunkGen < currentGenRef.current) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();

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

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const wsUrl = `${protocol}//${host}:8000/ws/voice/${currentSessionId}`;

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
              setVoiceState(msg.voice_state);
              if (msg.metrics) setMetrics((m) => ({ ...m, ...msg.metrics }));
              if (msg.services) setServices((s) => ({ ...s, ...msg.services }));
              if (msg.timeline_events) setTimelineEvents(msg.timeline_events);
            } else if (msg.type === 'interruption_detected') {
              stopAllAudio();
              setVoiceState('INTERRUPTED');
              const newG = msg.data?.new_generation || msg.generation;
              setCurrentGen(newG);
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
              setMessages((prev) => [
                ...prev,
                {
                  id: `ast-${Date.now()}`,
                  role: 'assistant',
                  content: msg.data.text,
                  timestamp: new Date().toLocaleTimeString(),
                  generation: msg.generation,
                },
              ]);
            } else if (msg.type === 'agent_speech_end') {
              setVoiceState('COMPLETED');
              if (msg.data?.metrics) setMetrics((m) => ({ ...m, ...msg.data.metrics }));
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
  }, [stopAllAudio, playAudioChunk]);

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

      // If AI is currently speaking or searching, barge in immediately
      if (voiceStateRef.current === 'SPEAKING' || voiceStateRef.current === 'SEARCHING') {
        triggerInterruption('user_voice_barge_in');
      }

      safeSend({
        type: 'user_speech',
        transcript: text.trim(),
      });
    },
    [triggerInterruption, safeSend]
  );

  // Initialize Browser Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

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
          if (voiceStateRef.current === 'SPEAKING') {
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
      };

      recognitionRef.current = recognition;
    }
  }, [triggerInterruption, sendSpeechTranscript]);

  const toggleListening = useCallback(() => {
    getAudioContext();
    if (!isListening) {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setVoiceState('LISTENING');
      } catch {
        setIsListening(true);
        setVoiceState('LISTENING');
      }
    } else {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setVoiceState('IDLE');
    }
  }, [isListening, getAudioContext]);

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
        socketRef.current.close();
      } catch {}
    }
  }, []);

  return {
    sessionId,
    connectionStatus,
    voiceState,
    currentGen,
    messages,
    liveTranscript,
    timelineEvents,
    demoMode,
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
    reconnect,
  };
}

