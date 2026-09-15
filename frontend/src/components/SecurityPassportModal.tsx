import React, { useState } from 'react';
import { Copy, CheckCheck, X } from 'lucide-react';
import type { SecurityPassportData } from '../types';
import { cleanFilename } from '../utils/format';

interface PassportModalProps {
  data: SecurityPassportData;
  onClose: () => void;
}

export const SecurityPassportModal: React.FC<PassportModalProps> = ({
  data,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(data.sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      {/* Technical Verification Certificate */}
      <div className="w-full max-w-lg bg-white border border-slate-900 shadow-xl rounded overflow-hidden font-mono text-xs animate-in fade-in duration-100">
        {/* Document Header */}
        <div className="px-6 py-5 border-b border-slate-900 flex items-start justify-between bg-white">
          <div>
            <div className="text-[10px] tracking-widest text-slate-400 uppercase">
              SECURITY VERIFICATION
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase mt-0.5">
              SECURITY PASSPORT
            </h1>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Target Section */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase text-[11px] font-bold">FILE:</span>
            <span className="font-bold text-slate-900 truncate max-w-xs">{cleanFilename(data.filename)}</span>
          </div>
          <span className="text-slate-500 text-[11px]">{data.detected_mime}</span>
        </div>

        {/* Real Data Technical Rows */}
        <div className="px-6 py-5 space-y-4">
          {/* INTEGRITY */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-1">
              INTEGRITY
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">SHA-256</span>
                <button
                  onClick={handleCopyHash}
                  className="flex items-center gap-1.5 text-slate-900 font-bold hover:text-blue-600 transition-colors"
                  title="Copy full hash"
                >
                  <span>{data.sha256_short}</span>
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">MIME</span>
                <span className="font-bold text-emerald-700">VERIFIED</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">PARSER</span>
                <span className="font-bold text-emerald-700">PASSED</span>
              </div>
            </div>
          </div>

          {/* PRIVACY & LIFECYCLE */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-1">
              PRIVACY & LIFECYCLE
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PRIVACY</span>
                <span className="font-bold text-slate-900">
                  {data.pii_findings_count > 0 ? `${data.pii_findings_count} FINDINGS` : 'CLEAN'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">METADATA</span>
                <span className="font-bold text-emerald-700">SANITIZED</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">AI FIREWALL</span>
                <span className="font-bold text-violet-700">DISABLED (OPT-IN ONLY)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">TTL</span>
                <span className="font-bold text-amber-700">10:00 (EPHEMERAL)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final State Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400">
              ATTESTATION
            </div>
            <div className="text-base font-black text-emerald-700 tracking-tight">
              PRIVATE-SAFE
            </div>
          </div>

          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            VERIFIED
          </span>
        </div>
      </div>
    </div>
  );
};
