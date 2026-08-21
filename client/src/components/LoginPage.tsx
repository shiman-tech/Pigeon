'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Mail, ShieldCheck, Zap, Sparkles, Send, Clock, Layers, ArrowRight } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const { loginWithGoogle, loginAsDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-mock.apps.googleusercontent.com';

  const handleDemoLogin = async () => {
    try {
      setLoadingDemo(true);
      setError(null);
      await loginAsDemo('Alex Morgan (Growth Lead)', 'alex.morgan@pigeon.email');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Dynamic Background Gradients & Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-purple-600/20 via-blue-600/10 to-transparent blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Top Brand Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20 bg-slate-950">
            <img src="/logo.png" alt="Pigeon Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              Pigeon
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduler</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            BullMQ Queue Active
          </span>
        </div>
      </header>

      {/* Main Login Hero & Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Card Wrapper */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Production-Grade Scheduler</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Sign in to Pigeon
            </h1>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Scale your cold outreach with high-concurrency BullMQ scheduling, Redis hourly rate-limiting, and Ethereal SMTP delivery.
            </p>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* Login Actions */}
            <div className="space-y-4">
              {/* Google OAuth Login */}
              <div className="w-full flex justify-center bg-white/5 hover:bg-white/10 transition rounded-xl p-1 border border-slate-800">
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        loginWithGoogle(credentialResponse.credential).catch((err) =>
                          setError(err.message)
                        );
                      }
                    }}
                    onError={() => {
                      setError('Google sign in was unsuccessful. Try Demo Login.');
                    }}
                    shape="rectangular"
                    theme="filled_black"
                    text="continue_with"
                    width="360"
                  />
                </GoogleOAuthProvider>
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Or One-Click Demo
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Demo 1-Click Access Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loadingDemo}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer disabled:opacity-50"
              >
                {loadingDemo ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300 transition-transform group-hover:scale-110" />
                    <span>Enter Demo Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-blue-200 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>

            {/* Feature Highlights Footer inside card */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center">
                <Clock className="w-4 h-4 text-blue-400 mb-1" />
                <span className="text-[11px] text-slate-400 font-medium">No Cron Jobs</span>
              </div>
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[11px] text-slate-400 font-medium">Crash Resilient</span>
              </div>
              <div className="flex flex-col items-center">
                <Layers className="w-4 h-4 text-purple-400 mb-1" />
                <span className="text-[11px] text-slate-400 font-medium">Rate Limiting</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500">
        Pigeon Scheduler • BullMQ + Redis + Next.js + Express
      </footer>
    </div>
  );
}
