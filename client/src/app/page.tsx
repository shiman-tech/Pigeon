'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Connecting to Pigeon Scheduler...</span>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
