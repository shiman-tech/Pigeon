'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, Send, Clock, Gauge, UserCheck } from 'lucide-react';
import Papa from 'papaparse';
import { fetchApi } from '@/lib/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Scheduling params
  const [scheduleType, setScheduleType] = useState<'immediate' | 'future'>('immediate');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  // Sender details
  const [senderName, setSenderName] = useState('Pegion Campaign');
  const [senderEmail, setSenderEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract unique valid email addresses
  const extractEmails = (text: string): string[] => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = text.match(emailRegex) || [];
    return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  };

  // Handle CSV or text lead file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileName(file.name);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const flat = results.data.flat().join(' ');
          const emails = extractEmails(flat);
          if (emails.length === 0) {
            setFileError('No valid email addresses found in CSV.');
          } else {
            setParsedRecipients((prev) => Array.from(new Set([...prev, ...emails])));
          }
        },
        error: (err) => {
          setFileError(`Failed to parse CSV: ${err.message}`);
        },
      });
    } else {
      // Plain text file
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const emails = extractEmails(text);
        if (emails.length === 0) {
          setFileError('No valid email addresses found in file.');
        } else {
          setParsedRecipients((prev) => Array.from(new Set([...prev, ...emails])));
        }
      };
      reader.readAsText(file);
    }
  };

  // Combine typed + parsed recipients
  const getAllRecipients = (): string[] => {
    const typed = extractEmails(recipientsInput);
    return Array.from(new Set([...typed, ...parsedRecipients]));
  };

  const totalCount = getAllRecipients().length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const recipients = getAllRecipients();
    if (recipients.length === 0) {
      setErrorMessage('Please add at least 1 valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please write your email body.');
      return;
    }

    let scheduledAt: string | undefined = undefined;
    if (scheduleType === 'future') {
      if (!scheduledDateTime) {
        setErrorMessage('Please select a scheduled start date & time.');
        return;
      }
      const date = new Date(scheduledDateTime);
      if (isNaN(date.getTime()) || date.getTime() < Date.now() - 5000) {
        setErrorMessage('Scheduled date and time must be in the future.');
        return;
      }
      scheduledAt = date.toISOString();
    }

    try {
      setSubmitting(true);
      await fetchApi('/emails/schedule', {
        method: 'POST',
        body: JSON.stringify({
          recipients,
          subject,
          body,
          scheduledAt,
          delaySeconds: Number(delaySeconds) || 2,
          hourlyLimit: Number(hourlyLimit) || 200,
          senderName: senderName || undefined,
          senderEmail: senderEmail || undefined,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compose New Campaign</h2>
              <p className="text-xs text-slate-400">Schedule cold outreach with BullMQ & rate throttling</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Recipients Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recipients / Lead List
              </label>
              {totalCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  {totalCount} {totalCount === 1 ? 'email detected' : 'emails detected'}
                </span>
              )}
            </div>

            {/* CSV File Upload Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl p-3.5 text-center cursor-pointer transition flex items-center justify-center gap-3 group"
            >
              <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition" />
              <div className="text-left">
                <span className="text-xs font-medium text-slate-200 group-hover:text-white block">
                  {fileName ? `Uploaded: ${fileName}` : 'Upload CSV / Text Leads File'}
                </span>
                <span className="text-[11px] text-slate-500">Supports .csv or .txt (comma or newline separated)</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {fileError && <p className="text-xs text-red-400">{fileError}</p>}

            {/* Direct Input */}
            <textarea
              rows={2}
              value={recipientsInput}
              onChange={(e) => setRecipientsInput(e.target.value)}
              placeholder="Or paste recipient emails separated by comma, space or newline (e.g. john@acme.com, sarah@tech.io)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding your cold email infrastructure"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Email Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Email Body
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}},&#10;&#10;I noticed you're scaling outreach at your company..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 transition resize-none font-sans"
            />
          </div>

          {/* Scheduling & Rate Limiting Grid */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Delivery Timing & Scheduler
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('immediate')}
                  className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                    scheduleType === 'immediate'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                  }`}
                >
                  Send Now (Delayed Queue)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('future')}
                  className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                    scheduleType === 'future'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                  }`}
                >
                  Schedule for Later
                </button>
              </div>
            </div>

            {scheduleType === 'future' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs text-slate-400">Start Time (UTC/Local):</label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Rate limiting controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1 flex items-center justify-between">
                  <span>Delay Between Sends</span>
                  <span className="text-blue-400 font-semibold">{delaySeconds}s</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 flex items-center justify-between">
                  <span>Hourly Rate Limit</span>
                  <span className="text-blue-400 font-semibold">{hourlyLimit}/hr</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling {totalCount} email(s)...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Schedule {totalCount > 0 ? `${totalCount} Emails` : 'Campaign'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
