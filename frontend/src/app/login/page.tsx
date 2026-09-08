'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, Lock, ArrowRight, UserCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoMode = searchParams.get('demo') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    if (localStorage.getItem('voicebook_auth') === 'true') {
      router.push('/assistant');
    }
  }, [router]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      localStorage.setItem('voicebook_auth', 'true');
      localStorage.setItem('voicebook_user', email);
      router.push('/assistant');
    }
  };

  const handleGuest = () => {
    localStorage.setItem('voicebook_auth', 'true');
    localStorage.setItem('voicebook_user', 'guest');
    router.push('/assistant');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-[0_0_30px_rgba(124,58,237,0.3)]">
              <Zap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to VoiceBook</h1>
            <p className="text-sm text-slate-400 mt-2 text-center">
              Experience the world's fastest conversational flight booking agent.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="relative z-10 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 ml-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative z-10 mt-6 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-900/60 text-slate-500">Or continue without account</span>
            </div>
          </div>

          <button
            onClick={handleGuest}
            type="button"
            className="relative z-10 w-full flex items-center justify-center space-x-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          >
            <UserCircle className="w-4 h-4" />
            <span>Continue as Guest</span>
          </button>

          <p className="relative z-10 mt-8 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
              Create Account
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 text-xs">Loading Login...</div>}>
      <LoginContent />
    </React.Suspense>
  );
}
