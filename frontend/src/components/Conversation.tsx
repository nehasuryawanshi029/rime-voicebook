import React, { useRef, useEffect } from 'react';
import { ConversationMessage } from '@/types';
import { Bot, User, ShieldAlert, Sparkles } from 'lucide-react';

interface ConversationProps {
  messages: ConversationMessage[];
  liveTranscript: string;
}

export const Conversation: React.FC<ConversationProps> = ({ messages, liveTranscript }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  return (
    <div className="flex flex-col h-[520px] bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Live Dialogue</h2>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {messages.length} utterances
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Bot className="w-10 h-10 mb-2 opacity-40 text-violet-400" />
            <p className="text-sm font-medium text-slate-400">No conversation yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Click the microphone or type below. Try: <br />
              <span className="text-violet-400">"Find flights from Pune to Delhi tomorrow"</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-none'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-70 mb-1 font-mono">
                <span>{msg.role === 'user' ? 'YOU' : 'VOICEBOOK (RIME)'}</span>
                <span className="ml-2">Gen {msg.generation}</span>
              </div>

              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {msg.interrupted && (
                <div className="mt-2 pt-1.5 border-t border-rose-500/30 flex items-center space-x-1.5 text-xs text-rose-400 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Speech interrupted by user barge-in</span>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-indigo-300" />
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Speech Preview */}
        {liveTranscript && (
          <div className="flex items-start space-x-3 justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-none px-4 py-3 text-sm bg-violet-600/40 border border-violet-500/40 text-violet-200 animate-pulse">
              <div className="text-[10px] font-mono opacity-80 mb-1">LISTENING...</div>
              <p className="italic">"{liveTranscript}"</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-violet-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
