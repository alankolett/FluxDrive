import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { FileItem, PrivacyScanData, ExifStripResult } from '../types';
import { api } from '../services/api';
import { cleanFilename } from '../utils/format';

interface PrivacyScannerProps {
  files: FileItem[];
  activeFile: FileItem | null;
  onSelectFile: (file: FileItem) => void;
  onRefresh: () => void;
}

export const PrivacyScannerView: React.FC<PrivacyScannerProps> = ({
  files,
  activeFile,
  onSelectFile,
  onRefresh,
}) => {
  const [scanData, setScanData] = useState<PrivacyScanData | null>(null);
  const [isStripping, setIsStripping] = useState(false);
  const [stripResult, setStripResult] = useState<ExifStripResult | null>(null);

  useEffect(() => {
    if (activeFile) {
      loadPrivacyTelemetry(activeFile.file_id);
    } else if (files.length > 0) {
      onSelectFile(files[0]);
    }
  }, [activeFile, files]);

  const loadPrivacyTelemetry = async (fileId: string) => {
    setStripResult(null);
    try {
      const scan = await api.getPrivacyScan(fileId);
      setScanData(scan);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStripExif = async () => {
    if (!activeFile) return;
    setIsStripping(true);
    try {
      const res = await api.stripExif(activeFile.file_id);
      setStripResult(res);
      onRefresh();
    } catch (err) {
      console.error('Failed to strip EXIF:', err);
    } finally {
      setIsStripping(false);
    }
  };

  const score = scanData?.risk_score ?? 0;
  const riskSeverity = score > 60 ? 'HIGH RISK' : score > 20 ? 'MEDIUM RISK' : 'CLEAN';

  const findingsList = scanData?.findings || [];
  const emailCount = findingsList.filter((f) => f.type.toLowerCase().includes('email')).length;
  const phoneCount = findingsList.filter((f) => f.type.toLowerCase().includes('phone')).length;
  const panCount = findingsList.filter((f) => f.type.toLowerCase().includes('pan')).length;
  const aadhaarCount = findingsList.filter((f) => f.type.toLowerCase().includes('aadhaar')).length;
  const cardCount = findingsList.filter((f) => f.type.toLowerCase().includes('card')).length;

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      {/* Forensic Report Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            LOCAL ANALYSIS · PATTERN-BASED
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Privacy Scanner
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule-based detection of sensitive personal identifiers and embedded metadata.
          </p>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">TARGET:</span>
            <select
              value={activeFile?.file_id || ''}
              onChange={(e) => {
                const f = files.find((item) => item.file_id === e.target.value);
                if (f) onSelectFile(f);
              }}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {files.map((f) => (
                <option key={f.file_id} value={f.file_id}>
                  {cleanFilename(f.filename)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded bg-white text-slate-400 space-y-2">
          <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700">No documents to inspect</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upload a file to view automated privacy findings.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-200 shadow-2xs">
          {/* Target File Row */}
          <div className="p-5 flex items-center justify-between bg-slate-50">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-mono font-bold">
                DOCUMENT OBJECT
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {cleanFilename(activeFile?.filename)}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-500">
              <span className="font-bold text-slate-700 uppercase">
                {activeFile?.detected_ext || 'FILE'}
              </span>
              <div>{activeFile?.mime_type}</div>
            </div>
          </div>

          {/* Section 1: PRIVACY RISK (Score presentation) */}
          <div className="p-5 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">
              PRIVACY RISK INDEX
            </div>
            <div className="flex items-baseline gap-3 font-mono">
              <span className="text-3xl font-black text-slate-900">
                {score} / 100
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  score > 60
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : score > 20
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {riskSeverity}
              </span>
            </div>
          </div>

          {/* Section 2: STRUCTURED ROWS (Clean structured rows, NO card grid!) */}
          <div className="p-5 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">
              STRUCTURED FINDINGS
            </div>

            <div className="divide-y divide-slate-100 font-mono text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">EMAIL</span>
                <span className="font-bold text-slate-900">
                  {emailCount} {emailCount === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">PHONE</span>
                <span className="font-bold text-slate-900">
                  {phoneCount} {phoneCount === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">PAN-LIKE</span>
                <span className="font-bold text-slate-900">
                  {panCount} {panCount === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">AADHAAR-LIKE</span>
                <span className="font-bold text-slate-900">
                  {aadhaarCount} {aadhaarCount === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">PAYMENT CARD</span>
                <span className="font-bold text-slate-900">
                  {cardCount} {cardCount === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">EXIF METADATA</span>
                <span className={activeFile?.has_exif ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {activeFile?.has_exif ? 'METADATA TAGS DETECTED' : 'SANITIZED'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: EXIF SANITIZATION ACTION */}
          {activeFile?.has_exif && (
            <div className="p-5 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-600 font-medium">
                Strip camera, GPS, and timestamp tags from this file:
              </span>
              <button
                onClick={handleStripExif}
                disabled={isStripping}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isStripping ? 'Stripping...' : 'Strip Metadata'}</span>
              </button>
            </div>
          )}

          {stripResult && (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Metadata successfully stripped. Document is sanitized.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
