'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Plane, UserPlus, UserCircle, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { register, continueAsGuest, isAuthenticated, isGuest, isLoading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated or guest, redirect to home
  useEffect(() => {
    if (!authLoading && (isAuthenticated || isGuest)) {
      router.push('/');
    }
  }, [isAuthenticated, isGuest, authLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // Field validations
    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!trimmedUsername) {
      setErrorMsg('Please choose a username.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters long.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both passwords.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        password: password,
      });

      if (result.success) {
        // Redirect to Login page with registered status and identifier prefilled
        router.push(`/login?registered=true&identifier=${encodeURIComponent(trimmedUsername)}`);
      } else {
        setErrorMsg(result.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred during signup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setErrorMsg(null);
    setIsGuestLoading(true);
    try {
      await continueAsGuest();
      router.push('/');
    } catch (err) {
      setErrorMsg('Failed to initialize guest session. Please try again.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-600/10 blur-3xl rounded-full pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-2 mb-6 relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 mb-2 shadow-inner">
              <Plane className="w-6 h-6 transform -rotate-45" />
            </div>
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-violet-400 font-mono">
                VoiceBook
              </h2>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-xs text-slate-400">Join VoiceBook for personalized AI voice flight bookings</p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-3.5 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Captain Alex"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
                disabled={isSubmitting || isGuestLoading}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_flyer"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
                disabled={isSubmitting || isGuestLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@voicebook.ai"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
                disabled={isSubmitting || isGuestLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
                disabled={isSubmitting || isGuestLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                required
                disabled={isSubmitting || isGuestLoading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGuestLoading || !username.trim() || !email.trim() || !password || !confirmPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 mt-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Already have account? Log in */}
          <div className="text-center mt-5 relative z-10">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-violet-400 hover:text-violet-300 font-semibold transition-colors inline-flex items-center gap-1"
              >
                Log in
              </Link>
            </p>
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
      </main>

      <Footer />
    </div>
  );
}
