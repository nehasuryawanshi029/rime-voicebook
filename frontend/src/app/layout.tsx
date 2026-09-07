import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoiceBook | Interruptible AI Flight Booking Voice Agent',
  description: 'Real-time interruptible low-latency voice agent for flight booking powered by Rime TTS, LiveKit, Deepgram, and Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-violet-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
