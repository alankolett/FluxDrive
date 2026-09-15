import React from 'react';
import { Download, FileCheck2, Clock } from 'lucide-react';
import type { JobItem } from '../types';
import { cleanFilename, formatBytes } from '../utils/format';

interface ActivityProps {
  jobs: JobItem[];
  onOpenPassport: (jobId: string) => void;
}

export const ActivityView: React.FC<ActivityProps> = ({
  jobs,
  onOpenPassport,
}) => {
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Top Heading */}
      <div className="border-b border-slate-200 pb-4 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            SESSION LOG
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological timeline of operations and transformations executed in this session.
          </p>
        </div>

        <span className="text-xs font-mono text-slate-500">
          {jobs.length} {jobs.length === 1 ? 'EVENT' : 'EVENTS'}
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded bg-white text-xs font-mono text-slate-400">
          No operations recorded yet in this workspace session.
        </div>
      ) : (
        /* Event Timeline Stream */
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100 shadow-2xs">
          {jobs.map((job) => {
            const isCompleted = job.status === 'COMPLETED';
            const isFailed = job.status === 'FAILED';

            return (
              <div
                key={job.job_id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Time & Operation */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className="font-mono font-bold text-slate-500 w-12 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatTime(job.created_at)}</span>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-900 uppercase font-mono text-xs">
                      {job.operation.replace(/_/g, ' ')}
                    </div>
                    <div className="text-slate-600 font-sans text-xs truncate max-w-sm">
                      {cleanFilename(job.output_filename) || 'Processed document'}
                    </div>
                  </div>
                </div>

                {/* Metrics & Status */}
                <div className="flex items-center gap-4 sm:self-center shrink-0">
                  {job.metrics && (
                    <div className="font-mono text-slate-500 text-[11px] hidden md:block">
                      {formatBytes(job.metrics.before_size)} → <strong className="text-slate-900">{formatBytes(job.metrics.after_size)}</strong>
                      <span className="ml-1.5 text-emerald-700 font-semibold">
                        (-{job.metrics.savings_pct}%)
                      </span>
                    </div>
                  )}

                  <span
                    className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isFailed
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {job.status}
                  </span>

                  <div className="flex items-center gap-2">
                    {job.passport_available && (
                      <button
                        onClick={() => onOpenPassport(job.job_id)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View Security Passport"
                      >
                        <FileCheck2 className="w-4 h-4" />
                      </button>
                    )}

                    {job.download_url && (
                      <a
                        href={job.download_url}
                        className="p-1 text-slate-400 hover:text-emerald-700 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
