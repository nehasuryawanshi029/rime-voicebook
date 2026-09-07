import React, { useState } from 'react';
import { VoiceState, VoiceMetrics, ServiceStatus } from '@/types';
import { ChevronDown, ChevronUp, Activity, ShieldCheck, Gauge, Layers } from 'lucide-react';

interface VoiceEngineeringPanelProps {
  services: ServiceStatus;
  voiceState: VoiceState;
  currentGen: number;
  metrics: VoiceMetrics;
}

export const VoiceEngineeringPanel: React.FC<VoiceEngineeringPanelProps> = ({
  services,
  voiceState,
  currentGen,
  metrics,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const formatMs = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return `${Math.round(val)} ms`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CONNECTED' || status === 'CONFIGURED') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONNECTED</span>;
    }
    if (status === 'MOCK_READY' || status === 'RULE_BASED_READY' || status === 'BROWSER_STT_READY' || status === 'DEV_LOCAL') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">READY (DEV)</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">ERROR</span>;
  };

  return (
    <div className="border border-slate-800 bg-slate-950/90 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 bg-slate-900/80 hover:bg-slate-900 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Voice Engineering & Telemetry Panel
          </span>
          <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 text-[10px] font-mono">
            LIVE METRICS
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
            <span>Fence:</span>
            <span className="text-violet-400 font-bold">Gen {currentGen}</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-800 space-y-5">
          {/* Service Connections Grid */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Service Connections</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Rime TTS</span>
                {getStatusBadge(services.rime)}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Deepgram STT</span>
                {getStatusBadge(services.deepgram)}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Gemini LLM</span>
                {getStatusBadge(services.gemini)}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">LiveKit</span>
                {getStatusBadge(services.livekit)}
              </div>
            </div>
          </div>

          {/* Generation & State Machine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-mono text-slate-300">Current Generation:</span>
              </div>
              <span className="text-sm font-bold font-mono text-violet-400 px-3 py-1 rounded bg-violet-500/10 border border-violet-500/20">
                Generation {currentGen}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono text-slate-300">State Machine:</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-200">
                {voiceState}
              </span>
            </div>
          </div>

          {/* Real-time Telemetry Metrics */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <Gauge className="w-3.5 h-3.5 text-violet-400" />
              <span>Real-Time Latency & Generation-Fencing Metrics</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <p className="text-[10px] font-mono text-slate-400 uppercase">End-of-Speech → First Audio</p>
                <p className="text-base font-bold font-mono text-emerald-400 mt-1">
                  {formatMs(metrics.end_of_speech_to_first_audio)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Tool Search Duration</p>
                <p className="text-base font-bold font-mono text-sky-400 mt-1">
                  {formatMs(metrics.tool_duration)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Interruption Stop Latency</p>
                <p className="text-base font-bold font-mono text-rose-400 mt-1">
                  {formatMs(metrics.interruption_stop_latency)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Stale Results Discarded</p>
                <p className="text-base font-bold font-mono text-amber-400 mt-1">
                  {metrics.stale_results_discarded}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Stale Results Spoken</p>
                <p className="text-base font-bold font-mono text-emerald-400 mt-1">
                  {metrics.stale_results_spoken} (Target: 0)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
