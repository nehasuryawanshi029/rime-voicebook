import React from 'react';
import Link from 'next/link';
import { Plane, Heart, Github, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#050811] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white">
              <Plane className="w-4 h-4 transform -rotate-45" />
            </div>
            <span className="text-base font-bold text-white font-mono">VoiceBook</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The interruptible conversational AI flight booking agent designed for the Rime Hackathon. Zero-latency barge-in and generation fencing.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Product</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/assistant" className="hover:text-violet-400 transition-colors">Voice Assistant</Link></li>
            <li><Link href="/search" className="hover:text-violet-400 transition-colors">Search Flights</Link></li>
            <li><Link href="/bookings" className="hover:text-violet-400 transition-colors">Manage Bookings</Link></li>
            <li><Link href="/voice-lab" className="hover:text-violet-400 transition-colors">Voice Lab</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Engineering</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/evaluation" className="hover:text-violet-400 transition-colors">Latency & Accuracy Benchmarks</Link></li>
            <li><Link href="/voice-lab" className="hover:text-violet-400 transition-colors">Rime TTS Integration</Link></li>
            <li><Link href="/about" className="hover:text-violet-400 transition-colors">System Architecture</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Powered By</h4>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">Rime TTS</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">Google Gemini</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">Web Speech API</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">FastAPI</span>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">Next.js</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div>
          &copy; {new Date().getFullYear()} VoiceBook. Built for Rime Hackathon.
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <span>Engineered with interruptible generation fencing</span>
        </div>
      </div>
    </footer>
  );
};
