'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Plane, Cpu, Sparkles, ShieldCheck, Heart, Zap, Layers, Volume2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rime Hackathon Project</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            The VoiceBook Story
          </h1>
          <p className="text-base text-slate-300 max-w-2xl mx-auto">
            Why we built an interruptible conversational flight agent where user barge-ins are treated as first-class events.
          </p>
        </div>

        {/* Story Section */}
        <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-6 text-sm text-slate-300 leading-relaxed backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">The Core Insight</h2>
          <p>
            When booking travel, human beings rarely formulate their entire journey in a single rigid command. In real conversations, people say:
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-violet-300">
            &ldquo;Find me a flight from Pune to Delhi tomorrow... wait, under 5000... actually make that from Mumbai.&rdquo;
          </div>
          <p>
            Traditional voice assistants break down completely in this scenario. They lock the user out while the flight search API runs, or worse, they continue speaking out 5 irrelevant Pune flights while the user is already asking about Mumbai.
          </p>
          <p>
            VoiceBook introduces <strong>Generation Fencing</strong>: an architectural design pattern where every user utterance increments an authoritative generation token. Any active tool tasks or TTS streaming buffers from older generations are cancelled and discarded immediately.
          </p>
        </div>

        {/* Tech Stack Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Technology Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-violet-400 font-semibold text-sm">
                <Volume2 className="w-4 h-4" />
                <span>Rime TTS (Mist Model)</span>
              </div>
              <p className="text-xs text-slate-400">
                Ultra-low latency streaming text-to-speech with explicit chunk suppression on barge-in.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Google Gemini 2.5 Flash</span>
              </div>
              <p className="text-xs text-slate-400">
                Fast conversational reasoning engine preserving continuity across partial corrections.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Deepgram &amp; Web Speech</span>
              </div>
              <p className="text-xs text-slate-400">
                Full-duplex continuous audio transcription with interim token detection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                <Layers className="w-4 h-4" />
                <span>FastAPI + SQLite</span>
              </div>
              <p className="text-xs text-slate-400">
                Async WebSocket hub with non-blocking tool execution and transactional booking records.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
