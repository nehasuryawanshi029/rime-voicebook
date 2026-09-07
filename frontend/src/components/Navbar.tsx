'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Mic, Search, Ticket, Cpu, CheckCircle2, Info, Menu, X, Sparkles } from 'lucide-react';
import { ConnectionStatus } from '@/types';

interface NavbarProps {
  connectionStatus?: ConnectionStatus;
  currentGen?: number;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus = 'CONNECTED',
  demoMode = true,
  onToggleDemoMode,
}) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Assistant', href: '/assistant', icon: Mic },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Bookings', href: '/bookings', icon: Ticket },
    { label: 'Voice Lab', href: '/voice-lab', icon: Cpu },
    { label: 'Evaluation', href: '/evaluation', icon: CheckCircle2 },
    { label: 'About', href: '/about', icon: Info },
  ];

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
            Live WS
          </span>
        );
      case 'CONNECTING':
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1.5" />
            Connecting
          </span>
        );
      case 'ERROR':
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5" />
            Offline
          </span>
        );
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-violet-600/30 group-hover:scale-105 transition-transform duration-300">
                <Plane className="w-5 h-5 text-white transform -rotate-45" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold tracking-tight text-white font-mono group-hover:text-violet-300 transition-colors">
                    VoiceBook
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    RIME AI
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Interruptible Voice Booking
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            {getStatusBadge()}

            {onToggleDemoMode && (
              <button
                onClick={onToggleDemoMode}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
                  demoMode
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
                title="Toggle 4s search latency simulation to allow speech interruption"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Demo Delay:</span>
                <span className="font-bold">{demoMode ? '4s' : '0.2s'}</span>
              </button>
            )}

            <Link
              href="/assistant"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Talk to Book</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {getStatusBadge()}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#070b14]/95 px-4 pt-3 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 text-violet-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
