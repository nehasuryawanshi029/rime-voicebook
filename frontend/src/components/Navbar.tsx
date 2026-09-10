'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plane,
  Mic,
  Search,
  Ticket,
  Cpu,
  CheckCircle2,
  Info,
  Menu,
  X,
  Sparkles,
  Zap,
  LogOut,
  LogIn,
  UserCircle,
} from 'lucide-react';
import { ConnectionStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  connectionStatus?: ConnectionStatus;
  currentGen?: number;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
  onRunDemo?: () => void;
  isDemoRunning?: boolean;
  demoStep?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus = 'CONNECTED',
  demoMode = true,
  onToggleDemoMode,
  onRunDemo,
  isDemoRunning = false,
  demoStep = 0,
}) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isGuest, isAuthenticated, isLoading, logout, exitGuest } = useAuth();

  const navItems = [
    { label: 'Assistant', href: '/assistant', icon: Mic },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Bookings', href: '/bookings', icon: Ticket },
    { label: 'Voice Lab', href: '/voice-lab', icon: Cpu },
    { label: 'Evaluation', href: '/evaluation', icon: CheckCircle2 },
    { label: 'About', href: '/about', icon: Info },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl transition-all">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Brand / Logo Area */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-violet-600/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-white transform -rotate-45" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-mono group-hover:text-violet-300 transition-colors whitespace-nowrap">
                VoiceBook
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 whitespace-nowrap shrink-0">
                RIME AI
              </span>
            </div>
          </Link>

          {/* 2. Desktop Navigation Links (Large screens >= 1024px) */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`h-8 inline-flex items-center gap-1.5 px-2.5 xl:px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Controls Container */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 3. Demo Controls Group (Desktop >= 1024px) */}
            {(onRunDemo || onToggleDemoMode) && (
              <div className="hidden lg:inline-flex items-center gap-1.5 shrink-0 pr-1 sm:pr-2 sm:border-r sm:border-slate-800/80">
                {onRunDemo && (
                  <button
                    onClick={onRunDemo}
                    disabled={isDemoRunning}
                    className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                      isDemoRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-rose-500/20'
                    }`}
                    title="Run automated voice demo"
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    <span>{isDemoRunning ? `RUNNING (${demoStep}/3)` : 'RUN DEMO'}</span>
                  </button>
                )}

                {onToggleDemoMode && (
                  <button
                    onClick={onToggleDemoMode}
                    className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                      demoMode
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title="Toggle 4s search latency simulation to allow speech interruption"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="hidden xl:inline">Demo Delay:</span>
                    <span className="xl:hidden">Delay:</span>
                    <span className="font-bold">{demoMode ? '4s' : '0.2s'}</span>
                  </button>
                )}
              </div>
            )}

            {/* 4. Action Group: Talk to Book + Auth (Desktop & Tablet) */}
            {!isLoading && (
              <div className="hidden sm:inline-flex items-center gap-2 shrink-0">
                {isAuthenticated && (
                  <>
                    <Link
                      href="/assistant"
                      className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-violet-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>Talk to Book</span>
                    </Link>

                    <button
                      onClick={() => logout()}
                      className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium bg-slate-900/90 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-all shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                      title={`Logged in as ${user?.name || user?.username || 'User'}. Click to Logout`}
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Logout</span>
                    </button>
                  </>
                )}

                {isGuest && (
                  <>
                    <Link
                      href="/assistant"
                      className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-violet-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>Talk to Book</span>
                    </Link>

                    <button
                      onClick={() => exitGuest()}
                      className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-rose-500/15 text-amber-300 hover:text-rose-300 border border-amber-500/30 hover:border-rose-500/40 transition-all shadow-sm active:scale-[0.98] whitespace-nowrap shrink-0"
                      title="Guest Session. Click to Exit Guest"
                    >
                      <UserCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="hidden xl:inline">Guest / Exit Guest</span>
                      <span className="xl:hidden">Exit Guest</span>
                    </button>
                  </>
                )}

                {!isAuthenticated && !isGuest && (
                  <Link
                    href="/login"
                    className="h-8 inline-flex items-center gap-1.5 px-4 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-violet-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>Log in</span>
                  </Link>
                )}
              </div>
            )}

            {/* Mobile-only compact actions */}
            {!isLoading && (
              <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                {(isAuthenticated || isGuest) ? (
                  <Link
                    href="/assistant"
                    className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold bg-violet-600 text-white whitespace-nowrap"
                  >
                    <Mic className="w-3 h-3 shrink-0" />
                    <span>Talk</span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold bg-violet-600 text-white whitespace-nowrap"
                  >
                    <LogIn className="w-3 h-3 shrink-0" />
                    <span>Log in</span>
                  </Link>
                )}
              </div>
            )}

            {/* Mobile/Tablet Menu Button (< 1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-[#070b14]/98 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Navigation Links */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Demo Controls in Mobile Menu */}
          {(onRunDemo || onToggleDemoMode) && (
            <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 px-3">
                Demo Controls
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onRunDemo && (
                  <button
                    onClick={() => {
                      onRunDemo();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isDemoRunning}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                      isDemoRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-rose-500/20'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    <span>{isDemoRunning ? `RUNNING (${demoStep}/3)` : 'RUN DEMO'}</span>
                  </button>
                )}

                {onToggleDemoMode && (
                  <button
                    onClick={onToggleDemoMode}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      demoMode
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Demo Delay:</span>
                    <span className="font-bold">{demoMode ? '4s' : '0.2s'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auth Section in Mobile Menu */}
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            {isAuthenticated && (
              <div className="space-y-1.5">
                <div className="px-3 py-1 text-xs text-slate-400 font-mono">
                  Signed in as <span className="text-violet-300 font-semibold">{user?.name || user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {isGuest && (
              <div className="space-y-1.5">
                <div className="px-3 py-1 text-xs text-amber-400/90 font-mono">
                  Active Guest Mode
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    exitGuest();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Exit Guest Mode</span>
                </button>
              </div>
            )}

            {!isAuthenticated && !isGuest && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-md shadow-violet-600/25"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Log in to VoiceBook</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
