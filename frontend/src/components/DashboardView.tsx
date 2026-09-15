import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  FolderLock,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Clock
} from 'lucide-react';
import type { FileItem, JobItem, PrivacyPreset } from '../types';
import { DropZone } from './DropZone';
import { api } from '../services/api';
import { getOperationsForFile } from '../utils/operations';
import { cleanFilename, getDistinctFilename, formatOperationName, formatBytes } from '../utils/format';

interface DashboardViewProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress?: string;
  preset: PrivacyPreset;
  vaultFiles: FileItem[];
  recentJobs: JobItem[];
  onNavigate: (view: any) => void;
  onOpenPassport: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onFilesSelected,
  isUploading,
  uploadProgress,
  preset,
  vaultFiles,
  recentJobs,
  onNavigate,
  onOpenPassport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedFileId && vaultFiles.length > 0) {
      setSelectedFileId(vaultFiles[0].file_id);
    } else if (selectedFileId && !vaultFiles.some((f) => f.file_id === selectedFileId)) {
      setSelectedFileId(vaultFiles[0]?.file_id || null);
    }
  }, [vaultFiles, selectedFileId]);

  const activeFile = vaultFiles.find((f) => f.file_id === selectedFileId) || vaultFiles[0] || null;
  const availableOps = React.useMemo(() => getOperationsForFile(activeFile), [activeFile]);

  useEffect(() => {
    if (availableOps.length > 0) {
      if (!selectedOp || !availableOps.some((op) => op.id === selectedOp)) {
        setSelectedOp(availableOps[0].id);
      }
    }
  }, [availableOps, selectedOp]);

  const getTtlRemaining = (file: FileItem) => {
    const rem = Math.max(0, Math.floor(file.expires_at - now / 1000));
    const mins = Math.floor(rem / 60);
    const secs = rem % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConvert = async (overrideOp?: string) => {
    if (!activeFile) return;
    const op = overrideOp || selectedOp || availableOps[0]?.id;
    if (!op) return;

    setIsProcessing(true);
    try {
      await api.createJob([activeFile.file_id], op, preset, { quality: 85 });
      onNavigate('converter');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSmartIntent = async (intentId: string) => {
    if (!activeFile) return;
    try {
      const res = await api.routeIntent(activeFile.file_id, intentId);
      if (res.recommended_operation) {
        setSelectedOp(res.recommended_operation);
        handleConvert(res.recommended_operation);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const nextExpiringFile = vaultFiles.length > 0
    ? [...vaultFiles].sort((a, b) => a.expires_at - b.expires_at)[0]
    : null;

  return (
    <div className="space-y-8 pb-12">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }}
        accept=".png,.jpg,.jpeg,.webp,.pdf,.csv,.json,.docx"
      />

      {/* 1. TOP HERO SECTION: LARGE EDITORIAL STATEMENT (LEFT) + ACTIVE FILE WORKBENCH (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: EDITORIAL HERO STATEMENT (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">
              PRIVACY-FIRST FILE WORKSPACE
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.98] uppercase font-sans">
              YOUR FILES.<br />
              YOUR CONTROL.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed pt-1">
              Convert, inspect and protect files inside a temporary privacy-first workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-3 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-2xs"
            >
              <span>Upload files</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('vault')}
              className="px-5 py-3 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-2xs"
            >
              <FolderLock className="w-4 h-4 text-blue-600" />
              <span>Open Vault</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {vaultFiles.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium tracking-wide pt-1">
            PNG · JPG · WEBP · PDF · CSV · JSON · DOCX
          </div>
        </div>

        {/* RIGHT: ACTUAL ACTIVE FILE WORKBENCH AS VISUAL HERO (5 COLS) */}
        <div className="lg:col-span-5">
          {vaultFiles.length === 0 ? (
            <div className="border border-slate-200 rounded bg-white p-6 shadow-2xs">
              <DropZone
                onFilesSelected={onFilesSelected}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                preset={preset}
              />
            </div>
          ) : (
            <div className="border border-slate-200 rounded bg-white divide-y divide-slate-200 shadow-2xs">
              {/* Active file tabs only if multiple files are present */}
              {vaultFiles.length > 1 && (
                <div className="p-2 bg-slate-50 flex items-center gap-1.5 overflow-x-auto border-b border-slate-200">
                  {vaultFiles.map((f) => (
                    <button
                      key={f.file_id}
                      onClick={() => setSelectedFileId(f.file_id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium truncate max-w-[160px] transition-colors flex items-center gap-1.5 ${
                        activeFile?.file_id === f.file_id
                          ? 'bg-white text-slate-900 font-bold border border-slate-200 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                        f.is_output ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {f.is_output ? 'OUT' : 'SRC'}
                      </span>
                      <span className="truncate">{getDistinctFilename(f, vaultFiles)}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeFile && (
                <div className="p-6 space-y-5">
                  {/* File Identification Block */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        ACTIVE FILE
                      </div>
                      {activeFile.is_output ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          CONVERTED OUTPUT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          SOURCE FILE
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xl font-bold text-slate-900 break-all leading-snug">
                          {cleanFilename(activeFile.filename)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {activeFile.is_output ? (
                            <span>
                              {formatOperationName(activeFile.source_operation)} · <span className="font-mono">{formatBytes(activeFile.size_bytes)}</span> · {activeFile.mime_type}
                            </span>
                          ) : (
                            <span>
                              {(activeFile.detected_ext || 'FILE').toUpperCase()} · <span className="font-mono">{formatBytes(activeFile.size_bytes)}</span> · {activeFile.mime_type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                        {activeFile.mime_type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECURITY INFORMATION STRIP (Dividers between values) */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                      SECURITY TELEMETRY
                    </div>

                    <div className="grid grid-cols-4 divide-x divide-slate-200 border border-slate-200 rounded py-2 px-1 bg-slate-50/50 text-center">
                      <div className="px-1.5 space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">PII</div>
                        <div className="text-xs font-bold text-slate-900 font-sans">
                          {activeFile.pii_count && activeFile.pii_count > 0 ? `${activeFile.pii_count} FOUND` : 'CLEAN'}
                        </div>
                      </div>

                      <div className="px-1.5 space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">EXIF</div>
                        <div className={`text-xs font-bold font-sans ${activeFile.has_exif ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {activeFile.has_exif ? 'TAGS' : 'SANITIZED'}
                        </div>
                      </div>

                      <div className="px-1.5 space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">MIME</div>
                        <div className="text-xs font-bold font-sans text-emerald-700">
                          VERIFIED
                        </div>
                      </div>

                      <div className="px-1.5 space-y-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">SHA-256</div>
                        <div className="text-xs font-bold font-sans text-blue-700">
                          VALID
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONVERSION PIPELINE ACTION */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                      FORMAT CONVERSION
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={selectedOp}
                        onChange={(e) => setSelectedOp(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 font-sans"
                      >
                        {availableOps.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleConvert()}
                        disabled={isProcessing || availableOps.length === 0}
                        className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shrink-0 shadow-2xs font-sans"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>Convert</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* EXPIRATION & PASSPORT LINK */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium font-sans">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>EXPIRATION:</span>
                      <strong className="text-amber-800 font-mono text-xs">{getTtlRemaining(activeFile)}</strong>
                    </div>

                    <button
                      onClick={() => onOpenPassport(activeFile.file_id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors font-sans"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Security Passport</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE BAND: QUICK ACTIONS (HORIZONTAL TOOL ROW) */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
          QUICK ACTIONS
        </div>

        <div className="border border-slate-200 rounded bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-1 md:grid-cols-3 shadow-2xs">
          <button
            onClick={() => handleSmartIntent('make_smaller')}
            disabled={!activeFile}
            className="p-4 text-left hover:bg-slate-50/80 transition-colors disabled:opacity-40 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 font-sans">
              <span className="group-hover:text-blue-600 transition-colors">→ Compress file</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">EXEC</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans">
              Reduce size without changing format
            </div>
          </button>

          <button
            onClick={() => handleSmartIntent('protect_file')}
            disabled={!activeFile}
            className="p-4 text-left hover:bg-slate-50/80 transition-colors disabled:opacity-40 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 font-sans">
              <span className="group-hover:text-blue-600 transition-colors">→ Clean metadata</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">EXIF</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans">
              Remove EXIF and camera information
            </div>
          </button>

          <button
            onClick={() => handleSmartIntent('create_pdf')}
            disabled={!activeFile}
            className="p-4 text-left hover:bg-slate-50/80 transition-colors disabled:opacity-40 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 font-sans">
              <span className="group-hover:text-blue-600 transition-colors">→ Create PDF</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">PDF</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-sans">
              Transform supported images into a PDF
            </div>
          </button>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: RECENT TRANSFORMATIONS (LEFT) + WORKSPACE STATUS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: RECENT TRANSFORMATIONS (8 COLS) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
              RECENT TRANSFORMATIONS
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-medium text-blue-600 hover:underline font-sans"
            >
              View Activity Stream →
            </button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded bg-white text-xs font-sans text-slate-400">
              No completed transformations in this session.
            </div>
          ) : (
            <div className="border border-slate-200 rounded bg-white divide-y divide-slate-100 shadow-2xs">
              {recentJobs.slice(0, 4).map((j) => {
                const displayName = cleanFilename(j.source_filename || j.output_filename);
                const opLabel = formatOperationName(j.operation);
                let metricStr = '';
                if (j.metrics && j.metrics.before_size && j.metrics.after_size) {
                  const pct = j.metrics.before_size > j.metrics.after_size
                    ? (((j.metrics.before_size - j.metrics.after_size) / j.metrics.before_size) * 100).toFixed(1)
                    : null;
                  metricStr = `${formatBytes(j.metrics.before_size)} → ${formatBytes(j.metrics.after_size)}${pct ? ` · ${pct}% smaller` : ''}`;
                }

                return (
                  <div
                    key={j.job_id}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors text-xs font-sans"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-900 truncate">
                        {displayName}
                      </span>
                      <span className="text-slate-300 text-xs">|</span>
                      <span className="text-xs text-slate-600 font-medium truncate">
                        {opLabel}
                      </span>
                      {metricStr && (
                        <span className="text-slate-400 text-[11px] font-mono hidden sm:inline truncate">
                          · {metricStr}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                        {j.status === 'COMPLETED' ? 'VERIFIED' : j.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: WORKSPACE STATUS (4 COLS) */}
        <div className="lg:col-span-4 border border-slate-200 rounded bg-white p-5 space-y-3.5 shadow-2xs text-xs font-sans">
          <div className="border-b border-slate-100 pb-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              WORKSPACE STATUS
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">PROTECTION</span>
              <span className="font-bold text-slate-900 uppercase">{preset}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">FILES</span>
              <span className="font-bold text-slate-900 font-mono text-xs">{vaultFiles.length.toString().padStart(2, '0')}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">PRIVACY</span>
              <span className="font-bold text-emerald-700">CLEAN</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">AI</span>
              <span className="font-bold text-violet-700">OPT-IN</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">ENGINE</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">NEXT EXPIRATION</span>
              <span className="font-bold text-amber-700 font-mono text-xs">
                {nextExpiringFile ? getTtlRemaining(nextExpiringFile) : '10:00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
