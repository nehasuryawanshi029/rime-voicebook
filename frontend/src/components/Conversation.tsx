import React, { useRef, useEffect, useState } from 'react';
import { ConversationMessage } from '@/types';
import { Bot, User, ShieldAlert } from 'lucide-react';

interface ConversationProps {
  messages: ConversationMessage[];
  liveTranscript: string;
}

export const Conversation: React.FC<ConversationProps> = ({ messages, liveTranscript }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // Consider it near bottom if within 60px
    setShouldAutoScroll(distanceToBottom < 60);
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, liveTranscript, shouldAutoScroll]);

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 h-full overflow-y-auto space-y-4 pr-2 pb-2"
    >
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
          className={`flex items-start space-x-3 w-full ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {msg.role !== 'user' && (
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-1">
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

            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>

            {msg.interrupted && (
              <div className="mt-2 pt-1.5 border-t border-rose-500/30 flex items-center space-x-1.5 text-xs text-rose-400 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Speech interrupted by user barge-in</span>
              </div>
            )}
          </div>

          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-1">
              <User className="w-4 h-4 text-indigo-300" />
            </div>
          )}
        </div>
      ))}

      {/* Live Streaming Speech Preview */}
      {liveTranscript && (
        <div className="flex items-start space-x-3 justify-end w-full">
          <div className="max-w-[80%] rounded-2xl rounded-br-none px-4 py-3 text-sm bg-violet-600/40 border border-violet-500/40 text-violet-200 animate-pulse shadow-md">
            <div className="text-[10px] font-mono opacity-80 mb-1">LISTENING...</div>
            <p className="italic break-words">"{liveTranscript}"</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-1">
            <User className="w-4 h-4 text-violet-400 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};
