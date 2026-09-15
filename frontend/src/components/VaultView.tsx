import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Download,
  FileCheck2,
  FolderLock,
  FileText,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import type { FileItem } from '../types';
import { api, getFullDownloadUrl } from '../services/api';
import { cleanFilename, formatBytes, formatTtl } from '../utils/format';

interface VaultProps {
  files: FileItem[];
  onRefresh: () => void;
  onOpenPassport: (id: string) => void;
}

export const VaultView: React.FC<VaultProps> = ({
  files,
  onRefresh,
  onOpenPassport,
}) => {
  const [destroyingId, setDestroyingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDestroy = async (fileId: string) => {
    setDestroyingId(fileId);
    try {
      await api.destroyFile(fileId);
      onRefresh();
    } catch (err) {
      console.error('Failed to destroy file:', err);
    } finally {
      setDestroyingId(null);
    }
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* PAGE HEADER */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            TEMPORARY FILESYSTEM
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Vault
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active files held in isolated memory with autonomous expiration shredding.
          </p>
        </div>

        <div className="font-mono text-xs text-slate-500 flex items-center gap-3">
          <span>{files.length} {files.length === 1 ? 'FILE' : 'FILES'}</span>
          <span>·</span>
          <span>{formatBytes(totalBytes)} TOTAL</span>
          <span>·</span>
          <span className="text-emerald-700 font-semibold">AUTONOMOUS CLEANUP ACTIVE</span>
        </div>
      </div>

      {/* TABLE WORKSPACE */}
      {files.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded bg-white space-y-2">
          <FolderLock className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">Vault is empty</div>
          <div className="text-xs text-slate-500 max-w-sm mx-auto">
            Converted or staged files will appear here with active countdown meters.
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">FILE</th>
                <th className="px-3 py-3 font-semibold">FORMAT</th>
                <th className="px-3 py-3 font-semibold">SIZE</th>
                <th className="px-3 py-3 font-semibold">PRIVACY</th>
                <th className="px-3 py-3 font-semibold">STATUS</th>
                <th className="px-5 py-3 font-semibold min-w-[140px]">EXPIRES</th>
                <th className="px-4 py-3 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {files.map((file) => {
                const ttl = formatTtl(file.expires_at, now);
                const isOutput = file.is_output;
                const isDestroying = destroyingId === file.file_id;
                const totalDuration = (file.expires_at - file.created_at) || 900;
                const pct = Math.min(100, Math.max(0, (ttl.remainingSeconds / totalDuration) * 100));

                return (
                  <tr key={file.file_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5 font-sans">
                        <span className="text-slate-400 shrink-0">
                          {file.mime_type?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-500" />
                          )}
                        </span>
                        <span className="font-semibold text-slate-900 truncate max-w-xs">
                          {cleanFilename(file.filename)}
                        </span>
                        {isOutput && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            OUT
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-slate-600 font-bold uppercase">
                      {file.detected_ext || file.filename?.split('.').pop() || 'FILE'}
                    </td>

                    <td className="px-3 py-3.5 text-slate-700">
                      {formatBytes(file.size_bytes)}
                    </td>

                    <td className="px-3 py-3.5">
                      <span className="uppercase text-[11px] font-medium text-slate-700 px-1.5 py-0.5 rounded bg-slate-100">
                        {file.privacy_preset || 'STANDARD'}
                      </span>
                    </td>

                    <td className="px-3 py-3.5">
                      <span className="text-emerald-700 font-semibold text-[11px]">
                        READY
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-700">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{ttl.timeStr}</span>
                        </div>
                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${ttl.remainingSeconds < 120 ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenPassport(file.file_id)}
                          className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          title="Inspect Security Passport"
                        >
                          <FileCheck2 className="w-4 h-4" />
                        </button>

                        {file.download_url && (
                          <a
                            href={getFullDownloadUrl(file.download_url)}
                            className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => handleDestroy(file.file_id)}
                          disabled={isDestroying}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Cryptographically shred"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
