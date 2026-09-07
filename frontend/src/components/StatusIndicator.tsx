import React from 'react';
import { VoiceState } from '@/types';
import { Mic, Cpu, Search, Volume2, ShieldAlert, CheckCircle, AlertOctagon } from 'lucide-react';

interface StatusIndicatorProps {
  state: VoiceState;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'LISTENING':
        return {
          label: 'LISTENING',
          icon: <Mic className="w-4 h-4 animate-bounce text-emerald-400" />,
          bgColor: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300',
          dotColor: 'bg-emerald-400'
        };
      case 'TRANSCRIBING':
        return {
          label: 'TRANSCRIBING',
          icon: <Cpu className="w-4 h-4 animate-spin text-sky-400" />,
          bgColor: 'bg-sky-950/60 border-sky-500/50 text-sky-300',
          dotColor: 'bg-sky-400'
        };
      case 'THINKING':
        return {
          label: 'THINKING (GEMINI)',
          icon: <Cpu className="w-4 h-4 animate-pulse text-indigo-400" />,
          bgColor: 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300',
          dotColor: 'bg-indigo-400'
        };
      case 'SEARCHING':
        return {
          label: 'SEARCHING FLIGHTS',
          icon: <Search className="w-4 h-4 animate-pulse text-amber-400" />,
          bgColor: 'bg-amber-950/60 border-amber-500/50 text-amber-300',
          dotColor: 'bg-amber-400'
        };
      case 'SPEAKING':
        return {
          label: 'SPEAKING (RIME TTS)',
          icon: <Volume2 className="w-4 h-4 animate-pulse text-violet-400" />,
          bgColor: 'bg-violet-950/60 border-violet-500/50 text-violet-300',
          dotColor: 'bg-violet-400'
        };
      case 'INTERRUPTING':
      case 'INTERRUPTED':
        return {
          label: 'INTERRUPTED',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />,
          bgColor: 'bg-rose-950/60 border-rose-500/50 text-rose-300',
          dotColor: 'bg-rose-400'
        };
      case 'COMPLETED':
        return {
          label: 'READY',
          icon: <CheckCircle className="w-4 h-4 text-slate-400" />,
          bgColor: 'bg-slate-900 border-slate-700 text-slate-300',
          dotColor: 'bg-emerald-400'
        };
      case 'ERROR':
        return {
          label: 'ERROR',
          icon: <AlertOctagon className="w-4 h-4 text-red-500" />,
          bgColor: 'bg-red-950/60 border-red-500/50 text-red-300',
          dotColor: 'bg-red-500'
        };
      case 'IDLE':
      default:
        return {
          label: 'IDLE',
          icon: <Mic className="w-4 h-4 text-slate-500" />,
          bgColor: 'bg-slate-900/80 border-slate-800 text-slate-400',
          dotColor: 'bg-slate-600'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-medium tracking-wide shadow-sm backdrop-blur-sm ${config.bgColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-ping`} style={{ animationDuration: '2s' }} />
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};
