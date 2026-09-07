'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Mic,
  Zap,
  ShieldAlert,
  Sparkles,
  Plane,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Cpu,
  Layers,
  Volume2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-violet-600/25 via-indigo-600/20 to-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-medium tracking-wide shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Rime Hackathon Differentiator</span>
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            <span className="text-slate-300 font-mono">Zero-Latency Barge-In</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Book flights by <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              simply talking.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            VoiceBook is an interruptible AI flight-booking agent that keeps up when your plans change. Speak naturally, change your mind mid-sentence, and never get locked out while tools run.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/assistant"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-base shadow-xl shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-5 h-5" />
              <span>START VOICE BOOKING</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/assistant?demo=true"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm transition-all hover:border-slate-600"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>SEE INTERRUPTION DEMO</span>
            </Link>
          </div>

          {/* Key Value Micro-metrics */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 block font-mono">TTS Latency</span>
              <span className="text-lg font-bold text-white font-mono">Streaming</span>
              <span className="text-[10px] text-violet-400 block">Rime Mist Model</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 block font-mono">Interruption Stop</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">&lt; 20ms</span>
              <span className="text-[10px] text-slate-400 block">Immediate Abort</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 block font-mono">Stale Speech</span>
              <span className="text-lg font-bold text-violet-400 font-mono">0 Spoken</span>
              <span className="text-[10px] text-slate-400 block">Generation Fenced</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-[11px] text-slate-400 block font-mono">Flight GDS</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">Live SQLite</span>
              <span className="text-[10px] text-slate-400 block">Instant Booking</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem & Solution Showcase */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-[#090e1a]/60">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">The Problem &amp; Solution</h2>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              Why Existing Voice Booking Agents Break
            </p>
            <p className="text-sm text-slate-400">
              When users talk to typical AI agents, tool calls freeze the UI and obsolete audio speaks over the user. VoiceBook solves this with generation fencing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="p-6 rounded-2xl bg-rose-950/15 border border-rose-900/30 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Traditional Rigid Voice Agents</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-500 font-bold">&times;</span>
                  <span><strong>Locked during tool calls:</strong> While the airline search API runs for 3-5 seconds, user corrections are ignored or buffered.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-500 font-bold">&times;</span>
                  <span><strong>Speaking obsolete results:</strong> If you say "actually Mumbai", it still finishes speaking the 5 Pune flights first.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-500 font-bold">&times;</span>
                  <span><strong>Context loss:</strong> Correction wipes out previously specified constraints like date or budget.</span>
                </li>
              </ul>
            </div>

            {/* The VoiceBook Way */}
            <div className="p-6 rounded-2xl bg-violet-950/20 border border-violet-800/40 space-y-4 shadow-lg shadow-violet-900/10">
              <div className="flex items-center space-x-2 text-violet-400 font-semibold text-sm">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span>VoiceBook Interruptible Engine</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span><strong>Generation Fencing:</strong> Every user speech turn assigns an authoritative generation ID. Obsolete tasks are cancelled instantly.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span><strong>Sub-20ms Audio Abort:</strong> Rime TTS playback halts immediately upon user speech detection.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span><strong>Seamless Constraint Merging:</strong> Changing origin to Mumbai preserves "tomorrow" and "under ₹5,000".</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">Architecture</h2>
            <p className="text-2xl sm:text-3xl font-bold text-white">How It Works in 4 Steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h3 className="font-semibold text-sm text-white">Full-Duplex Speech</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Client WebRTC / Web Speech streams live speech input while listening for user barge-ins.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h3 className="font-semibold text-sm text-white">Gemini Intent Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini extracts route, date, budget, and passengers, updating the authoritative conversation state.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h3 className="font-semibold text-sm text-white">Interruptible Search</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Flight queries execute with non-blocking checkpoints. Any interruption cancels the old generation.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h3 className="font-semibold text-sm text-white">Rime TTS Streaming</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rime generates conversational voice output. If stale, audio chunks are suppressed instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Interruption Demo Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-gradient-to-b from-[#090d19] to-[#070b14]">
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-gradient-to-r from-violet-950/40 via-indigo-950/40 to-slate-900/60 border border-violet-800/40 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Zap className="w-3.5 h-3.5" />
            <span>Live Hackathon Verification Flow</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Experience the Hackathon Interruption Demo
          </h2>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left max-w-xl mx-auto font-mono text-xs space-y-2 text-slate-300">
            <div className="text-slate-400">1. YOU: "Find me a flight from Pune to Delhi tomorrow."</div>
            <div className="text-amber-400">2. YOU (during search): "Under ₹5,000."</div>
            <div className="text-rose-400">3. YOU (barge-in): "Wait — actually from Mumbai."</div>
            <div className="text-emerald-400">&rarr; RESULT: Mumbai &rarr; Delhi, ₹5,000 budget preserved, Pune discarded!</div>
          </div>

          <div className="pt-2">
            <Link
              href="/assistant?demo=true"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all hover:scale-105"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Live Interruption Demo</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
