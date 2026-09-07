import React, { useEffect, useRef } from 'react';
import { VoiceState } from '@/types';

interface WaveformProps {
  voiceState: VoiceState;
  isActive: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ voiceState, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      const bars = 28;
      const barWidth = 3;
      const gap = (width - bars * barWidth) / (bars - 1);

      // Only animate when there is real audio activity
      const isVoiceActive = voiceState === 'LISTENING' || voiceState === 'SPEAKING' || voiceState === 'SEARCHING' || voiceState === 'INTERRUPTED';

      for (let i = 0; i < bars; i++) {
        let amplitude = 2; // Flat resting height when idle

        if (isVoiceActive) {
          if (voiceState === 'LISTENING') {
            // Modulate on speech frequencies
            amplitude = 4 + Math.sin(step * 0.18 + i * 0.45) * 14 + Math.cos(step * 0.22 + i * 0.3) * 6;
          } else if (voiceState === 'SPEAKING') {
            // Richer harmonics for TTS speech output
            amplitude = 6 + Math.sin(step * 0.28 + i * 0.55) * 18 + Math.sin(step * 0.14 + i * 0.25) * 8;
          } else if (voiceState === 'SEARCHING') {
            // Subtle rhythmic pulse during tool execution
            amplitude = 3 + Math.sin(step * 0.1 + i * 0.25) * 5;
          } else if (voiceState === 'INTERRUPTED') {
            // Sharp cutoff / scatter spike
            amplitude = Math.random() * 12;
          }
        }

        const barHeight = Math.max(2, Math.min(height - 4, Math.abs(amplitude)));
        const x = i * (barWidth + gap);
        const y = centerY - barHeight / 2;

        let color = '#1e293b'; // resting slate-800
        if (voiceState === 'LISTENING') color = '#10b981'; // emerald
        else if (voiceState === 'SPEAKING') color = '#8b5cf6'; // violet
        else if (voiceState === 'SEARCHING') color = '#f59e0b'; // amber
        else if (voiceState === 'INTERRUPTED') color = '#f43f5e'; // rose

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        ctx.fill();
      }

      if (isVoiceActive) {
        step++;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceState, isActive]);

  return (
    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5 px-1">
        <span>AUDIO ACTIVITY</span>
        <span className={voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
          {voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 'ACTIVE' : 'RESTING'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={240}
        height={40}
        className="w-full h-10 rounded"
      />
    </div>
  );
};
