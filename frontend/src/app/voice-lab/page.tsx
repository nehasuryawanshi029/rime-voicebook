'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Timeline } from '@/components/Timeline';
import { VoiceEngineeringPanel } from '@/components/VoiceEngineeringPanel';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { Cpu, Activity, Radio, Volume2, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function VoiceLabPage() {
  const {
    sessionId,
    connectionStatus,
    voiceState,
    currentGen,
    timelineEvents,
    demoMode,
    metrics,
    services,
    toggleDemoMode,
  } = useVoiceAgent();

  const [rawMetrics, setRawMetrics] = useState<any>(null);

  const fetchLiveMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/metrics');
      if (res.ok) {
        const data = await res.json();
        setRawMetrics(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar
        connectionStatus={connectionStatus}
        currentGen={currentGen}
        demoMode={demoMode}
        onToggleDemoMode={toggleDemoMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1">
            <Cpu className="w-4 h-4" />
            <span>Engineering Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Voice Lab &amp; Realtime Architecture
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Realtime telemetry, Rime TTS streaming chunks, generation fencing checkpoints, and latency logs.
          </p>
        </div>

        {/* Integration Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400">Rime TTS</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-base font-bold text-white">Mist / Streaming</div>
            <p className="text-[11px] text-slate-400">Primary voice synthesis. Zero-latency stream cutoff on abort.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400">Gemini LLM</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-base font-bold text-white">Gemini 2.5 Flash</div>
            <p className="text-[11px] text-slate-400">Structured intent &amp; parameter continuity extraction.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400">Deepgram STT</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <div className="text-base font-bold text-white">Nova-2 / Web Speech</div>
            <p className="text-[11px] text-slate-400">Streaming acoustic recognition with interim barge-in.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400">Fencing State</span>
              <span className="text-xs font-bold text-violet-400 font-mono">GEN #{currentGen}</span>
            </div>
            <div className="text-base font-bold text-emerald-400">0 Stale Spoken</div>
            <p className="text-[11px] text-slate-400">Stale results discarded: {metrics.stale_results_discarded || 0}</p>
          </div>
        </div>

        {/* Detailed Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <VoiceEngineeringPanel
              metrics={metrics}
              services={services}
              currentGen={currentGen}
              voiceState={voiceState}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Event Timeline ({timelineEvents.length})
              </span>
              <span className="text-[10px] text-violet-400 font-mono">Live WebSocket</span>
            </div>
            <Timeline events={timelineEvents} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
