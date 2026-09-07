import React from 'react';
import { TimelineEvent } from '@/types';
import { Clock, CheckCircle2, ShieldAlert, Cpu, Search, Volume2 } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const getEventIcon = (name: string) => {
    switch (name) {
      case 'interruption_detected':
      case 'generation_invalidated':
      case 'stale_result_discarded':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'speech_end':
      case 'stt_final':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'llm_start':
      case 'llm_first_token':
        return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'tool_start':
      case 'tool_end':
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'rime_start':
      case 'rime_first_audio':
      case 'rime_stopped':
        return <Volume2 className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getEventBadgeColor = (name: string) => {
    if (name.includes('interrupt') || name.includes('invalidated') || name.includes('stale')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (name.includes('speech') || name.includes('stt')) {
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
    if (name.includes('tool')) {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
    if (name.includes('rime')) {
      return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Realtime Event Timeline
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {events.length} events logged
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-center text-slate-600 text-xs py-4">No events logged yet.</p>
        ) : (
          events.slice().reverse().map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 text-xs font-mono"
            >
              <div className="flex items-center space-x-2 truncate">
                {getEventIcon(item.event)}
                <span className="text-slate-400 text-[11px]">{item.time_display}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getEventBadgeColor(item.event)}`}>
                  {item.event}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center space-x-2 flex-shrink-0">
                <span className="text-violet-400">Gen {item.generation}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">{item.request_id?.slice(0, 6)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
