'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import Header from '@/components/Header';
import ComposeModal from '@/components/ComposeModal';
import ScheduledEmails from '@/components/ScheduledEmails';
import SentEmails from '@/components/SentEmails';
import { EmailJob, DashboardStats } from '@/types';
import { fetchApi } from '@/lib/api';
import {
  Clock,
  Send,
  Plus,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadScheduled = useCallback(async (search = '') => {
    try {
      setLoadingScheduled(true);
      const res = await fetchApi<EmailJob[]>(
        `/emails/scheduled?search=${encodeURIComponent(search)}`
      );
      if (res.success && res.data) {
        setScheduledJobs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled emails:', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const loadSent = useCallback(async (search = '') => {
    try {
      setLoadingSent(true);
      const res = await fetchApi<EmailJob[]>(
        `/emails/sent?search=${encodeURIComponent(search)}`
      );
      if (res.success && res.data) {
        setSentJobs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch sent emails:', err);
    } finally {
      setLoadingSent(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchApi<{ stats: DashboardStats }>('/stats');
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([loadScheduled(searchQuery), loadSent(searchQuery), loadStats()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    // Auto refresh every 4 seconds for live worker updates
    const interval = setInterval(() => {
      refreshAll();
    }, 4000);

    return () => clearInterval(interval);
  }, [searchQuery]);

  const handleCancelJob = async (id: string) => {
    try {
      await fetchApi(`/emails/${id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <Header onRefresh={refreshAll} isRefreshing={isRefreshing} />

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6">
        {/* Top Hero & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Email Dispatch Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent BullMQ queue with rate throttling & Ethereal SMTP delivery.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-600/25 transition cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-white transition-transform group-hover:rotate-90" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Scheduled */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Scheduled / Queued</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stats ? stats.scheduled : '—'}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Delayed BullMQ jobs</span>
          </div>

          {/* Card 2: Sent */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Delivered Emails</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stats ? stats.sent : '—'}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Ethereal test dispatches</span>
          </div>

          {/* Card 3: Hourly Rate Limiter Window */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Rate Window Usage</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stats ? `${stats.currentHourRateCount} / ${stats.defaultHourlyLimit}` : '—'}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Current hour window</span>
          </div>

          {/* Card 4: Worker Engine */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Engine Status</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              BullMQ + Redis
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Concurrency: 5 workers</span>
          </div>
        </div>

        {/* Main Tabs and Content Panel */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 backdrop-blur-xl overflow-hidden shadow-xl flex-1 flex flex-col">
          {/* Tabs Navigation & Search Bar */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40">
            {/* Tab buttons */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('scheduled')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'scheduled'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled Emails</span>
                {scheduledJobs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                    {scheduledJobs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sent'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sent Emails</span>
                {sentJobs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                    {sentJobs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient or subject..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Tab Views */}
          <div className="flex-1">
            {activeTab === 'scheduled' ? (
              <ScheduledEmails
                jobs={scheduledJobs}
                loading={loadingScheduled}
                onCancelJob={handleCancelJob}
              />
            ) : (
              <SentEmails jobs={sentJobs} loading={loadingSent} />
            )}
          </div>
        </div>
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          refreshAll();
          setActiveTab('scheduled');
        }}
      />
    </div>
  );
}
