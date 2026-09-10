'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Plane, LogIn, UserCircle, Loader2, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, continueAsGuest, isAuthenticated, isGuest, isLoading: authLoading } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Read URL query parameters for registration success and pre-filled identifier
  useEffect(() => {
    if (searchParams) {
      if (searchParams.get('registered') === 'true') {
        setSuccessMsg('Account created successfully! Please sign in with your credentials.');
      }
      const prefill = searchParams.get('identifier');
      if (prefill) {
        setUsernameOrEmail(prefill);
      }
    }
  }, [searchParams]);

  // If already logged in or guest, redirect to main/home page
  useEffect(() => {
    if (!authLoading && (isAuthenticated || isGuest)) {
      router.push('/');
    }
  }, [isAuthenticated, isGuest, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await login(usernameOrEmail, password);
      if (result.success) {
        // Successful login redirects to the main/home page
        router.push('/');
      } else {
        setErrorMsg(result.error || 'Invalid credentials. Please verify your email/username and password.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to process login request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGuestLoading(true);
    try {
      await continueAsGuest();
      // Successful guest entry redirects to the main/home page
      router.push('/');
    } catch (err) {
      setErrorMsg('Failed to initialize guest session. Please try again.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-600/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-2 mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 mb-2 shadow-inner">
          <Plane className="w-6 h-6 transform -rotate-45" />
        </div>
        <div className="flex items-center justify-center space-x-2">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-violet-400 font-mono">
            VoiceBook
          </h2>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
        <p className="text-xs text-slate-400">Sign in to your account or continue exploring as guest</p>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4 relative z-10">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 ml-1">Email / Username</label>
          <input
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            placeholder="demo@voicebook.ai or username"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            required
            disabled={isSubmitting || isGuestLoading}
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-slate-300">Password</label>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            required
            disabled={isSubmitting || isGuestLoading}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isGuestLoading || !usernameOrEmail.trim() || !password}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </>
          )}
        </button>
      </form>

      {/* Don't have an account? Create Account */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 text-center relative z-10">
        <p className="text-xs text-slate-400 mb-3">Don&apos;t have an account?</p>
        <Link
          href="/signup"
          className="w-full inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:text-white text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Account</span>
        </Link>
      </div>

      {/* Divider: ---------------- OR ---------------- */}
      <div className="flex items-center my-5 relative z-10">
        <div className="flex-1 h-px bg-slate-800"></div>
        <span className="px-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
          OR
        </span>
        <div className="flex-1 h-px bg-slate-800"></div>
      </div>

      {/* Continue as Guest button */}
      <button
        type="button"
        onClick={handleGuest}
        disabled={isSubmitting || isGuestLoading}
        className="relative z-10 w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-sm font-semibold transition-all hover:border-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isGuestLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            <span>Entering as Guest...</span>
          </>
        ) : (
          <>
            <UserCircle className="w-4 h-4 text-violet-400" />
            <span>Continue as Guest</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
