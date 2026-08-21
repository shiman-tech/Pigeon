'use client';

import React from 'react';
import { EmailJob } from '@/types';
import { Clock, Ban, AlertCircle, RefreshCw, Calendar, Mail, Timer } from 'lucide-react';

interface ScheduledEmailsProps {
  jobs: EmailJob[];
  loading: boolean;
  onCancelJob: (id: string) => void;
}

export default function ScheduledEmails({ jobs, loading, onCancelJob }: ScheduledEmailsProps) {
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
          <Clock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No Scheduled Emails</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          You don’t have any emails in the delayed dispatch queue right now. Click "Compose New Email" to schedule a campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
          <tr>
            <th className="px-6 py-4">Recipient</th>
            <th className="px-6 py-4">Subject</th>
            <th className="px-6 py-4">Scheduled For</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {jobs.map((job) => {
            const scheduledDate = new Date(job.scheduledAt);
            const isRescheduled = job.status === 'RESCHEDULED';

            return (
              <tr
                key={job.id}
                className="hover:bg-slate-800/30 transition group"
              >
                {/* Recipient */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium text-xs">
                      {job.recipientEmail.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-200">{job.recipientEmail}</span>
                  </div>
                </td>

                {/* Subject */}
                <td className="px-6 py-4 max-w-xs truncate text-slate-300">
                  {job.subject}
                </td>

                {/* Scheduled Time */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">
                      {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {isRescheduled ? (
                    <span
                      title={job.errorMessage || 'Rescheduled to next hour window'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    >
                      <Timer className="w-3 h-3" />
                      Rate-Limited (Next Hr)
                    </span>
                  ) : job.status === 'PROCESSING' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Processing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Clock className="w-3 h-3" />
                      Scheduled
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to cancel the scheduled email to ${job.recipientEmail}?`)) {
                        onCancelJob(job.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition cursor-pointer"
                    title="Cancel scheduled dispatch"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
