import React from 'react';
import { Plane, Radio, Sliders } from 'lucide-react';
import { ServiceStatus } from '@/types';

interface HeaderProps {
  services: ServiceStatus;
  currentGen: number;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  services,
  currentGen,
  demoMode,
  onToggleDemoMode,
}) => {
  const getDot = (status: string) => {
    if (status === 'CONNECTED' || status === 'CONFIGURED') {
      return <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1" />;
    }
    if (status === 'MOCK_READY' || status === 'RULE_BASED_READY' || status === 'BROWSER_STT_READY' || status === 'DEV_LOCAL') {
      return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />;
    }
    return <span className="w-2 h-2 rounded-full bg-rose-500 inline-block mr-1" />;
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
            <Plane className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">VOICEBOOK</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Rime Hackathon
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interruptible AI Flight Booking
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Live Indicator */}
          <div className="flex items-center px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1.5" />
            <span className="font-bold">LIVE</span>
          </div>

          {/* Rime Status */}
          <div className="flex items-center px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            {getDot(services.rime)}
            <span>Rime {services.rime === 'CONNECTED' ? 'Connected' : 'Ready'}</span>
          </div>

          {/* Gemini Status */}
          <div className="flex items-center px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            {getDot(services.gemini)}
            <span>Gemini {services.gemini === 'CONNECTED' ? 'Connected' : 'Ready'}</span>
          </div>



          {/* Demo Mode Toggle */}
          <button
            onClick={onToggleDemoMode}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition-all ${
              demoMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
            title="Toggle Demo Mode (Locks fixed 4s search delay for demonstrating barge-in interruptions)"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo (4s Delay):</span>
            <span className="font-bold">{demoMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
