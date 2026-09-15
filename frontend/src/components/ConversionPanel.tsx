import React, { useState, useEffect } from 'react';
import {
  Download,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  Trash2,
  Sliders,
  CheckCircle2,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import type { FileItem, JobItem, PrivacyPreset } from '../types';
import { api } from '../services/api';
import { getOperationsForFile } from '../utils/operations';
import { cleanFilename, formatBytes } from '../utils/format';

interface ConversionPanelProps {
  files: FileItem[];
  preset: PrivacyPreset;
  onJobCompleted: (job: JobItem) => void;
  onOpenPassport: (id: string) => void;
  onOpenSmartConvert: () => void;
  onReset: () => void;
}

export const ConversionPanel: React.FC<ConversionPanelProps> = ({
  files,
  preset,
  onJobCompleted,
  onOpenPassport,
  onOpenSmartConvert: _onOpenSmartConvert,
  onReset,
}) => {
  const [selectedOp, setSelectedOp] = useState<string>('');
  const [quality, setQuality] = useState<number>(85);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<JobItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const isMultiFile = files && files.length > 1;
  const firstFile = files && files.length > 0 ? files[0] : null;

  const availableOps = React.useMemo(() => {
    if (!files || files.length === 0) return [];

    if (isMultiFile) {
      const allImages = files.every((f) => f.mime_type.startsWith('image/'));
      if (allImages) {
        return [
          {
            id: 'batch_to_pdf',
            label: `Combine ${files.length} Images to PDF`,
            desc: 'Compile all selected images into a single multi-page portable PDF document.',
            targetBadge: 'PDF',
            badgeColor: 'bg-rose-600 text-white',
            category: 'Document' as const,
          },
        ];
      }
      return [];
    }

    return getOperationsForFile(firstFile);
  }, [files, isMultiFile, firstFile]);

  useEffect(() => {
    if (availableOps.length > 0) {
      if (!selectedOp || !availableOps.some((op) => op.id === selectedOp)) {
        setSelectedOp(availableOps[0].id);
      }
    }
  }, [availableOps, selectedOp]);

  const handleStartConversion = async (opOverride?: string) => {
    const targetOp = opOverride || selectedOp || (availableOps[0]?.id);
    if (!targetOp) {
      setErrorMsg('Please select a target format to convert.');
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const fileIds = files.map((f) => f.file_id);
      const job = await api.createJob(fileIds, targetOp, preset, { quality });
      setCurrentJob(job);

      const pollTimer = setInterval(async () => {
        try {
          const updated = await api.getJob(job.job_id);
          setCurrentJob(updated);

          if (updated.status === 'COMPLETED') {
            clearInterval(pollTimer);
            setIsProcessing(false);
            onJobCompleted(updated);
          } else if (updated.status === 'FAILED') {
            clearInterval(pollTimer);
            setIsProcessing(false);
            setErrorMsg(updated.error || 'Conversion processing failed.');
          }
        } catch (pollErr) {
          console.error(pollErr);
        }
      }, 500);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err.message || 'Failed to submit conversion job');
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (!firstFile) {
    return (
      <div className="space-y-6 max-w-3xl pb-10">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            FILE PROCESSING
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Convert
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transform document and media formats inside an isolated sandbox.
          </p>
        </div>

        <div className="border border-dashed border-slate-200 rounded bg-white p-12 text-center space-y-4 shadow-2xs">
          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">
              No Document Currently Staged
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a document from your computer or choose an active file from your Vault to start converting.
            </p>
          </div>
          <button
            onClick={() => onReset()}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Go to Overview
          </button>
        </div>
      </div>
    );
  }

  const fileExt = (firstFile.detected_ext || firstFile.filename?.split('.').pop() || 'FILE').toUpperCase();

  return (
    <div className="space-y-6 pb-10 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            FILE PROCESSING
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Convert
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transform formats inside isolated memory sandbox with cryptographic attestation.
          </p>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors self-start"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Selection</span>
        </button>
      </div>

      {/* Live Processing Notice */}
      {isProcessing && (
        <div className="border border-blue-200 bg-blue-50/70 rounded p-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Processing conversion inside isolated sandbox...</span>
          </div>
          <span className="text-slate-600 truncate max-w-xs">{cleanFilename(firstFile.filename)}</span>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COL 1: SOURCE SPEC (4 cols) */}
        <div className="lg:col-span-4 border border-slate-200 rounded bg-white p-5 space-y-4 shadow-2xs font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SOURCE SPEC
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              {isMultiFile ? 'BATCH' : fileExt}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
              {firstFile.mime_type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-blue-600" />
              ) : (
                <FileText className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="font-bold text-slate-900 break-all font-sans text-sm">
                {isMultiFile ? `${files.length} Selected Files` : cleanFilename(firstFile.filename)}
              </div>
              <div className="text-[11px] text-slate-500">
                {formatBytes(files.reduce((a, b) => a + (b.size_bytes || 0), 0))} · {firstFile.mime_type}
              </div>
            </div>
          </div>

          {!isMultiFile && (
            <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">SHA-256</span>
                <button
                  onClick={() => copyHash(firstFile.sha256)}
                  className="text-slate-800 hover:text-blue-600 flex items-center gap-1 font-semibold"
                  title="Click to copy hash"
                >
                  <span>{(firstFile.sha256 || '').slice(0, 8)}...{(firstFile.sha256 || '').slice(-6)}</span>
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">PRIVACY</span>
                <span className={firstFile.has_exif ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {firstFile.has_exif ? 'EXIF PRESENT' : 'SANITIZED'}
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onOpenPassport(firstFile.file_id)}
                  className="w-full py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Security Passport</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COL 2: OUTPUT SELECTION (5 cols) */}
        <div className="lg:col-span-5 border border-slate-200 rounded bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              TARGET FORMAT
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {preset} PRESET
            </span>
          </div>

          <div className="space-y-1.5">
            {availableOps.map((op) => {
              const isSel = selectedOp === op.id;
              return (
                <button
                  key={op.id}
                  onClick={() => setSelectedOp(op.id)}
                  className={`w-full p-3 rounded border text-left transition-colors flex items-center justify-between ${
                    isSel
                      ? 'border-blue-600 bg-blue-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className={`text-xs font-semibold ${isSel ? 'text-blue-900' : 'text-slate-900'}`}>
                      {op.label}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {op.desc}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 shrink-0 ml-3">
                    {op.targetBadge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quality Slider for compression */}
          {(selectedOp === 'compress_image' || selectedOp.includes('jpg') || selectedOp.includes('webp')) && (
            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-blue-600" />
                  Quality Target
                </span>
                <span className="font-bold text-slate-900">{quality}%</span>
              </div>
              <input
                type="range"
                min="25"
                max="95"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          )}

          {/* Execution Button */}
          <button
            disabled={!selectedOp || isProcessing}
            onClick={() => handleStartConversion()}
            className={`w-full py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-2xs ${
              !selectedOp || isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>Execute Conversion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Completed Job Card */}
          {currentJob && currentJob.status === 'COMPLETED' && (
            <div className="p-4 rounded border border-emerald-200 bg-emerald-50/70 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Conversion Complete</span>
                </span>
                {currentJob.download_url && (
                  <a
                    href={currentJob.download_url}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                )}
              </div>

              <div className="text-[11px] text-slate-700 truncate font-sans">
                Output: <strong className="text-slate-900">{cleanFilename(currentJob.output_filename)}</strong>
              </div>

              {currentJob.metrics && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-center text-[11px]">
                  <div>
                    <div className="text-slate-400">Before</div>
                    <div className="font-bold text-slate-800">{formatBytes(currentJob.metrics.before_size)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">After</div>
                    <div className="font-bold text-slate-800">{formatBytes(currentJob.metrics.after_size)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Saved</div>
                    <div className="font-bold text-emerald-700">-{currentJob.metrics.savings_pct}%</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* COL 3: QUICK WORKFLOWS (3 cols) */}
        <div className="lg:col-span-3 border border-slate-200 rounded bg-white p-5 space-y-3 shadow-2xs">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              WORKFLOW ACTIONS
            </h3>
          </div>

          <div className="space-y-1 text-xs">
            <button
              onClick={() => {
                const op = availableOps.find((o) => o.id === 'compress_image' || o.id.includes('webp'));
                if (op) {
                  setSelectedOp(op.id);
                  handleStartConversion(op.id);
                }
              }}
              className="w-full text-left p-2.5 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors block"
            >
              <div className="font-semibold text-slate-900">→ Compress file</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Optimize byte payload</div>
            </button>

            <button
              onClick={() => {
                const op = availableOps.find((o) => o.id.includes('pdf'));
                if (op) {
                  setSelectedOp(op.id);
                  handleStartConversion(op.id);
                }
              }}
              className="w-full text-left p-2.5 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors block"
            >
              <div className="font-semibold text-slate-900">→ Create PDF</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Compile into portable PDF</div>
            </button>

            <button
              onClick={() => {
                const op = availableOps.find((o) => o.id === 'strip_metadata');
                if (op) {
                  setSelectedOp(op.id);
                  handleStartConversion(op.id);
                }
              }}
              className="w-full text-left p-2.5 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors block"
            >
              <div className="font-semibold text-slate-900">→ Strip metadata</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Purge camera & GPS tags</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
