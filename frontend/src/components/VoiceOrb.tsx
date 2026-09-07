'use client';

import React from 'react';
import { Mic, MicOff, Volume2, Search, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { VoiceState } from '@/types';

interface VoiceOrbProps {
  state: VoiceState;
  isListening: boolean;
  onClick: () => void;
  onInterrupt?: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  isListening,
  onClick,
  onInterrupt,
}) => {
  const getOrbVisuals = () => {
    switch (state) {
      case 'LISTENING':
        return {
          glow: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/40',
          ring: 'border-emerald-500/50 animate-ping',
          text: 'Listening...',
          subtext: 'Speak your flight requirements naturally',
          icon: Mic,
          pulse: 'animate-pulse scale-105',
        };
      case 'THINKING':
        return {
          glow: 'from-violet-600 via-indigo-500 to-purple-500 shadow-violet-500/40',
          ring: 'border-indigo-500/50 animate-spin',
          text: 'Understanding...',
          subtext: 'Gemini is extracting intent & constraints',
          icon: Sparkles,
          pulse: 'scale-100',
        };
      case 'SEARCHING':
        return {
          glow: 'from-indigo-600 via-sky-500 to-cyan-400 shadow-cyan-500/40',
          ring: 'border-cyan-500/60 animate-pulse',
          text: 'Searching Flights...',
          subtext: 'Interrupt anytime: e.g. "Wait, from Mumbai"',
          icon: Search,
          pulse: 'animate-bounce scale-105',
        };
      case 'SPEAKING':
        return {
          glow: 'from-purple-600 via-fuchsia-500 to-pink-500 shadow-fuchsia-500/50',
          ring: 'border-fuchsia-500/60 animate-ping',
          text: 'Speaking...',
          subtext: 'Streaming via Rime TTS. Speak to barge in!',
          icon: Volume2,
          pulse: 'scale-110',
        };
      case 'INTERRUPTING':
      case 'INTERRUPTED':
        return {
          glow: 'from-amber-500 via-rose-500 to-red-500 shadow-rose-500/50',
          ring: 'border-rose-500/70 scale-125',
          text: 'Interrupted!',
          subtext: 'Obsolete output halted (<20ms). New turn authoritative.',
          icon: AlertCircle,
          pulse: 'scale-95',
        };
      case 'COMPLETED':
        return {
          glow: 'from-violet-600 via-indigo-600 to-blue-500 shadow-indigo-500/30',
          ring: 'border-indigo-500/30',
          text: 'Ready',
          subtext: 'Click orb or speak to book or refine',
          icon: Mic,
          pulse: 'scale-100',
        };
      case 'ERROR':
        return {
          glow: 'from-red-600 to-rose-700 shadow-red-500/40',
          ring: 'border-red-500/50',
          text: 'Connection Error',
          subtext: 'Check WebSocket connection',
          icon: AlertCircle,
          pulse: 'scale-100',
        };
      case 'IDLE':
      default:
        return {
          glow: 'from-violet-700 via-indigo-800 to-slate-800 shadow-violet-700/20',
          ring: 'border-slate-700/40',
          text: 'Tap to Talk',
          subtext: 'Try: "Find me a flight from Pune to Delhi tomorrow"',
          icon: isListening ? Mic : MicOff,
          pulse: 'hover:scale-105',
        };
    }
  };

  const visuals = getOrbVisuals();
  const Icon = visuals.icon;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Outer Pulse Rings */}
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute w-44 h-44 rounded-full border ${visuals.ring} transition-all duration-700`}
        />
        <div
          className={`absolute w-36 h-36 rounded-full border border-violet-500/20 transition-all duration-500`}
        />

        {/* Core Glowing Orb */}
        <button
          onClick={onClick}
          className={`relative w-28 h-28 rounded-full bg-gradient-to-tr ${visuals.glow} shadow-2xl flex items-center justify-center text-white transition-all duration-300 transform ${visuals.pulse} focus:outline-none cursor-pointer group`}
          title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
        >
          {/* Subtle inner highlight */}
          <div className="absolute inset-1 rounded-full bg-white/10 backdrop-blur-[2px]" />
          <Icon className="w-10 h-10 relative z-10 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* State Label & Subtext */}
      <div className="mt-5 space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-base font-semibold text-white tracking-wide">
            {visuals.text}
          </span>
          {(state === 'SPEAKING' || state === 'SEARCHING') && onInterrupt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInterrupt();
              }}
              className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors"
              title="Click to trigger manual barge-in interruption"
            >
              Barge In
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          {visuals.subtext}
        </p>
      </div>
    </div>
  );
};
