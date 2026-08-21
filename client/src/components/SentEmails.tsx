'use client';

import React from 'react';
import { EmailJob } from '@/types';
import { CheckCircle2, XCircle, ExternalLink, MailCheck, Send, AlertTriangle } from 'lucide-react';

interface SentEmailsProps {
  jobs: EmailJob[];
  loading: boolean;
}

export default function SentEmails({ jobs, loading }: SentEmailsProps) {
  if (loading && jobs.length === 0) {
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
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
          <MailCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">No Sent Emails Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Once your scheduled jobs execute, delivered emails along with direct Ethereal test inbox previews will appear here.
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
            <th className="px-6 py-4">Sent At</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Ethereal Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {jobs.map((job) => {
            const sentDate = job.sentAt ? new Date(job.sentAt) : new Date(job.createdAt);
            const isSuccess = job.status === 'SENT';

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

                {/* Sent Time */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">
                      {sentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {sentDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Delivered
                    </span>
                  ) : (
                    <span
                      title={job.errorMessage || 'Failed to dispatch'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                    >
                      <XCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </td>

                {/* Ethereal Preview URL */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {job.etherealUrl ? (
                    <a
                      href={job.etherealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition cursor-pointer"
                    >
                      <span>View Email</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
