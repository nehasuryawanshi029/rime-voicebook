import React from 'react';
import { Mic, MicOff, Zap, Cpu, Search, Volume2, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';
import { VoiceState } from '@/types';

interface VoiceButtonProps {
  isListening: boolean;
  voiceState: VoiceState;
  onToggleListening: () => void;
  onInterrupt: () => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  voiceState,
  onToggleListening,
  onInterrupt,
}) => {
  const isSpeakingOrSearching = voiceState === 'SPEAKING' || voiceState === 'SEARCHING' || voiceState === 'THINKING';

  const getButtonVisuals = () => {
    switch (voiceState) {
      case 'LISTENING':
        return {
          bg: 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/40 animate-pulse',
          icon: <Mic className="w-10 h-10 text-white animate-bounce" />,
          label: 'Listening to your speech...',
        };
      case 'TRANSCRIBING':
        return {
          bg: 'bg-gradient-to-tr from-sky-500 to-blue-600 shadow-sky-500/40',
          icon: <Cpu className="w-10 h-10 text-white animate-spin" />,
          label: 'Transcribing speech...',
        };
      case 'THINKING':
        return {
          bg: 'bg-gradient-to-tr from-indigo-600 to-violet-700 shadow-indigo-500/40',
          icon: <Cpu className="w-10 h-10 text-white animate-pulse" />,
          label: 'Gemini reasoning...',
        };
      case 'SEARCHING':
        return {
          bg: 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/40 animate-pulse',
          icon: <Search className="w-10 h-10 text-white animate-spin" />,
          label: 'Searching flights (barge-in enabled)...',
        };
      case 'SPEAKING':
        return {
          bg: 'bg-gradient-to-tr from-violet-600 to-purple-700 shadow-violet-500/40 animate-pulse',
          icon: <Volume2 className="w-10 h-10 text-white animate-bounce" />,
          label: 'Rime TTS speaking...',
        };
      case 'INTERRUPTING':
      case 'INTERRUPTED':
        return {
          bg: 'bg-gradient-to-tr from-rose-600 to-red-700 shadow-rose-500/40 animate-pulse',
          icon: <ShieldAlert className="w-10 h-10 text-white" />,
          label: 'Interrupted! Previous query fenced.',
        };
      case 'COMPLETED':
        return {
          bg: 'bg-gradient-to-tr from-slate-700 to-slate-800 shadow-slate-700/30',
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
          label: 'Turn completed. Ready for next query.',
        };
      case 'ERROR':
        return {
          bg: 'bg-gradient-to-tr from-red-600 to-rose-700 shadow-red-600/40',
          icon: <AlertOctagon className="w-10 h-10 text-white" />,
          label: 'Error occurred. Tap to retry.',
        };
      case 'IDLE':
      default:
        return {
          bg: 'bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-violet-600/30 hover:brightness-110',
          icon: isListening ? <Mic className="w-10 h-10 text-white" /> : <MicOff className="w-10 h-10 text-white/80" />,
          label: isListening ? 'Microphone active' : 'Click to start voice conversation',
        };
    }
  };

  const visuals = getButtonVisuals();

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
      <div className="relative mb-4">
        {/* Animated Ripple when listening or speaking */}
        {(voiceState === 'LISTENING' || voiceState === 'SPEAKING') && (
          <>
            <span className="absolute -inset-2 rounded-full bg-violet-500/20 animate-ping" />
            <span className="absolute -inset-4 rounded-full bg-violet-500/10 animate-pulse" />
          </>
        )}

        <button
          onClick={onToggleListening}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${visuals.bg}`}
          title={isListening ? 'Mute Microphone' : 'Start Speaking'}
        >
          {visuals.icon}
        </button>
      </div>

      <div className="text-center mb-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block">
          {voiceState}
        </span>
        <span className="text-xs text-slate-400 max-w-[200px] inline-block truncate mt-0.5">
          {visuals.label}
        </span>
      </div>

      {/* Manual Barge-in Test Button */}
      <button
        onClick={onInterrupt}
        disabled={!isSpeakingOrSearching}
        className={`w-full max-w-xs py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center space-x-2 border transition-all ${
          isSpeakingOrSearching
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25 active:scale-98 animate-pulse'
            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 cursor-not-allowed'
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-rose-400" />
        <span>Barge-in / Interrupt AI</span>
      </button>
    </div>
  );
};
