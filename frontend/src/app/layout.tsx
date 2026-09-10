import type { Metadata } from 'next';
import { DM_Sans, Nunito } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export const metadata: Metadata = {
  title: 'VoiceBook | Interruptible AI Flight Booking Voice Agent',
  description: 'Real-time interruptible low-latency voice agent for flight booking powered by Rime TTS and Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${nunito.variable} font-sans bg-[#F4F1FA] text-[#332F3A] min-h-screen antialiased selection:bg-violet-600 selection:text-white`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
