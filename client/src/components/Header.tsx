'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Mail, LogOut, Shield, Activity, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-white/10 bg-slate-950">
            <img src="/logo.png" alt="Pegion Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">
                Pegion
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Scheduler
              </span>
            </div>
          </div>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition cursor-pointer disabled:opacity-50"
              title="Refresh queue status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}

          {/* User Info Capsule */}
          {user && (
            <div className="flex items-center gap-3 pl-3 pr-2 py-1 rounded-full bg-slate-900/80 border border-slate-800">
              {/* User Avatar */}
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full ring-1 ring-blue-500/40 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name & Email (desktop) */}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 truncate max-w-[130px]">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {user.email}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer ml-1"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
