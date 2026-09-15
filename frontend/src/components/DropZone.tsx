import React, { useState, useRef } from 'react';
import { AlertCircle, UploadCloud, FileUp } from 'lucide-react';
import type { PrivacyPreset } from '../types';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress?: string;
  preset: PrivacyPreset;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  isUploading,
  uploadProgress,
  preset: _preset,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndPassFiles = (fileList: FileList | null) => {
    setErrorMsg(null);
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const maxSize = 25 * 1024 * 1024; // 25MB

    for (const f of filesArray) {
      if (f.size > maxSize) {
        setErrorMsg(`File "${f.name}" exceeds the 25 MB sandbox limit.`);
        return;
      }
    }

    onFilesSelected(filesArray);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    validateAndPassFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndPassFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        accept=".png,.jpg,.jpeg,.webp,.pdf,.csv,.json,.docx"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed transition-all cursor-pointer rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white shadow-xs ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
        }`}
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>DRAG & DROP SENSITIVE FILES HERE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                MAX 25MB
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              or click anywhere to browse from local computer filesystem
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={isUploading}
            className="px-5 py-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{uploadProgress || 'Uploading to RAM...'}</span>
              </span>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                <span>Select Files to Stage</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
