'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { VoiceOrb } from '@/components/VoiceOrb';
import { Waveform } from '@/components/Waveform';
import { Conversation } from '@/components/Conversation';
import { FlightCard } from '@/components/FlightCard';
import { BookingModal } from '@/components/BookingModal';
import { BudgetControl } from '@/components/BudgetControl';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { Flight } from '@/types';
import {
  Send,
  Sparkles,
  Plane,
  Calendar,
  IndianRupee,
  Users,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';

function AssistantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoDemo = searchParams.get('demo') === 'true';
  const { user, isGuest, isAuthenticated, isLoading: authLoading } = useAuth();

  // Route protection: redirect to /login if not authenticated and not guest
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isGuest) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, isGuest, router]);

  const {
    sessionId,
    connectionStatus,
    voiceState,
    currentGen,
    messages,
    liveTranscript,
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
  } = useVoiceAgent();

  const [inputVal, setInputVal] = useState('');
  const [selectedFlightForModal, setSelectedFlightForModal] = useState<Flight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);

  // Auto trigger demo if URL query ?demo=true was provided
  useEffect(() => {
    if (autoDemo && !isDemoRunning && demoStep === 0) {
      runInterruptionDemo();
    }
  }, [autoDemo]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      sendSpeechTranscript(inputVal.trim());
      setInputVal('');
    }
  };

  const handleCardBookClick = (flight: Flight) => {
    setSelectedFlightForModal(flight);
    setIsModalOpen(true);
  };

  const handleConfirmBookingInModal = async (flightId: number, passengerName: string, passengerCount: number) => {
    if (selectedFlightForModal) {
      bookFlight(selectedFlightForModal);
    }
    return {
      success: true,
      booking: {
        booking_id: `VBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        total_price: (selectedFlightForModal?.price || 4200) * passengerCount,
        passenger_name: passengerName,
        passengers_count: passengerCount,
      }
    };
  };

  // Automated Real Hackathon Interruption Demo
  const runInterruptionDemo = async () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setDemoStep(1);

    // Step 1: Initial query
    sendSpeechTranscript("Find me a flight from Pune to Delhi tomorrow.");

    // Step 2: Mid-search refinement after 1.5s
    await new Promise((r) => setTimeout(r, 1500));
    setDemoStep(2);
    sendSpeechTranscript("Under ₹5,000.");

    // Step 3: Hard interruption barge-in after 1.2s
    await new Promise((r) => setTimeout(r, 1200));
    setDemoStep(3);
    sendSpeechTranscript("Wait — actually from Mumbai.");

    // Completed
    await new Promise((r) => setTimeout(r, 3500));
    setDemoStep(4);
    setIsDemoRunning(false);
  };

  if (authLoading || (!isAuthenticated && !isGuest)) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-xs">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Verifying VoiceBook session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar
        connectionStatus={connectionStatus}
        currentGen={currentGen}
        demoMode={demoMode}
        onToggleDemoMode={toggleDemoMode}
        onRunDemo={runInterruptionDemo}
        isDemoRunning={isDemoRunning}
        demoStep={demoStep}
      />

      {isGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-300 font-medium flex items-center justify-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Guest Mode Active — Session data and bookings are temporary. To save bookings permanently, please log in.</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: HERO VOICE INTERFACE (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 shadow-xl">
              {/* Voice Orb */}
              <VoiceOrb
                state={voiceState}
                isListening={isListening}
                onClick={toggleListening}
                onInterrupt={() => triggerInterruption('user_manual_barge_in')}
              />

              {/* Waveform visualizer */}
              <Waveform voiceState={voiceState} isActive={isListening} />

              {/* Language Picker */}
              <div className="w-full pt-4 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Globe className="w-3 h-3" />
                  <span>Language</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { code: 'en', label: 'English', flag: '🇬🇧' },
                    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', sublabel: 'Rime' },
                    { code: 'mr', label: 'मराठी', flag: '🇮🇳', sublabel: 'Browser' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex flex-col items-center px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        language === lang.code
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/10'
                          : 'bg-slate-950/70 text-slate-400 border border-slate-800/60 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      <span className="mt-0.5">{lang.label}</span>
                      {lang.sublabel && (
                        <span className={`text-[9px] mt-0.5 ${
                          language === lang.code ? 'text-violet-400/70' : 'text-slate-500'
                        }`}>
                          {lang.sublabel} TTS
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="w-full pt-4 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                  Try Saying:
                </span>
                <div className="space-y-1.5 text-xs">
                  {language === 'en' && (
                    <>
                      <button
                        onClick={() => sendSpeechTranscript('Find me a flight from Pune to Delhi tomorrow.')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;Pune to Delhi tomorrow&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('Under five thousand rupees.')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;Under five thousand rupees&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('Wait — actually from Mumbai.')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      >
                        ⚡ &ldquo;Wait — actually from Mumbai&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('Book the cheapest one.')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                      >
                        &ldquo;Book the cheapest one&rdquo;
                      </button>
                    </>
                  )}
                  {language === 'hi' && (
                    <>
                      <button
                        onClick={() => sendSpeechTranscript('मुझे पुणे से दिल्ली की फ्लाइट चाहिए कल के लिए।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;पुणे से दिल्ली कल&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('पांच हजार से कम बजट में।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;पांच हजार से कम&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('रुको — मुंबई से चाहिए।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      >
                        ⚡ &ldquo;रुको — मुंबई से चाहिए&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('सबसे सस्ती वाली बुक करो।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                      >
                        &ldquo;सबसे सस्ती बुक करो&rdquo;
                      </button>
                    </>
                  )}
                  {language === 'mr' && (
                    <>
                      <button
                        onClick={() => sendSpeechTranscript('मला पुणे ते दिल्ली फ्लाइट हवी आहे उद्याची।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;पुणे ते दिल्ली उद्या&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('पाच हजार रुपयांच्या आत।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/60 transition-colors"
                      >
                        &ldquo;पाच हजारांच्या आत&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('थांबा — मुंबई हून हवे।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      >
                        ⚡ &ldquo;थांबा — मुंबई हून हवे&rdquo;
                      </button>
                      <button
                        onClick={() => sendSpeechTranscript('सर्वात स्वस्त बुक करा।')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                      >
                        &ldquo;सर्वात स्वस्त बुक करा&rdquo;
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Trip State Card */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
                  Authoritative Trip State
                </span>
                <span className="text-[11px] font-mono text-slate-400">Gen #{currentGen}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">From</span>
                  <span className="font-semibold text-white">{constraints.origin || '—'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">To</span>
                  <span className="font-semibold text-white">{constraints.destination || '—'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Date</span>
                  <span className="font-semibold text-white">{constraints.date || '—'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Budget</span>
                  <span className="font-semibold text-emerald-400">
                    {constraints.budget ? `₹${constraints.budget}` : 'Any'}
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Control */}
            <BudgetControl currentBudget={constraints.budget || null} onUpdateBudget={updateBudget} />
          </div>

          {/* CENTER: CONVERSATION STREAM (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex flex-col h-[580px] bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 shrink-0">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Live Conversation
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {messages.length} messages
                </span>
              </div>

              {/* Dialogue History */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <Conversation messages={messages} liveTranscript={liveTranscript} />
              </div>

              {/* Text Input Bar */}
              <form onSubmit={handleTextSubmit} className="shrink-0 relative mt-3 pt-3 border-t border-slate-800/80 flex items-center">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type or speak a flight request..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 pr-10"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="absolute right-2 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: FLIGHT RESULTS & BOOKING (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Available Flights ({flights.length})
              </span>
              {constraints.origin && constraints.destination && (
                <span className="text-xs text-violet-300 font-medium">
                  {constraints.origin} &rarr; {constraints.destination}
                </span>
              )}
            </div>

            {flights.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/60 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-500 mx-auto">
                  <Plane className="w-6 h-6 transform -rotate-45" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">No Flights Loaded</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Speak a route to start searching. E.g. "Find me a flight from Pune to Delhi tomorrow under ₹5,000".
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {flights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    isSelected={constraints.selected_flight?.id === flight.id}
                    onSelect={() => selectFlight(flight)}
                    onBook={() => handleCardBookClick(flight)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BookingModal
        flight={selectedFlightForModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmBooking={handleConfirmBookingInModal}
      />

      <Footer />
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-xs">Loading VoiceBook Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}

