import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import type { FileItem } from '../types';
import { api } from '../services/api';

interface SmartConvertModalProps {
  file: FileItem;
  onClose: () => void;
  onSelectAction: (op: string, options?: Record<string, any>) => void;
  onOpenCopilot: () => void;
}

export const SmartConvertModal: React.FC<SmartConvertModalProps> = ({
  file,
  onClose,
  onSelectAction,
  onOpenCopilot,
}) => {
  const [loadingIntent, setLoadingIntent] = useState<string | null>(null);

  const intents = [
    {
      id: 'make_smaller',
      label: 'Make smaller',
      desc: 'Lossless/lossy compression for disk and bandwidth efficiency',
      applicable: file.mime_type.startsWith('image/'),
    },
    {
      id: 'create_pdf',
      label: 'Create PDF',
      desc: 'Wrap or render into a portable, standardized PDF document',
      applicable: file.mime_type.startsWith('image/') || file.mime_type.includes('wordprocessingml'),
    },
    {
      id: 'change_format',
      label: 'Change format',
      desc: 'Pick from validated format matrix pairs specifically allowed for this file',
      applicable: (file.allowed_operations?.length ?? 0) > 0,
    },
    {
      id: 'protect_file',
      label: 'Protect file',
      desc: 'Sanitize EXIF metadata, GPS coordinates, and enforce maximum privacy preset',
      applicable: true,
    },
    {
      id: 'extract_data',
      label: 'Extract data',
      desc: 'Convert CSV/JSON tables or extract visual pages from PDF',
      applicable: ['text/csv', 'application/json', 'application/pdf'].includes(file.mime_type),
    },
    {
      id: 'analyze_file',
      label: 'Analyze file',
      desc: 'Rule-based structure breakdown, PII telemetry, or AI Copilot summary',
      applicable: true,
    },
  ];

  const handleIntentClick = async (intentId: string) => {
    if (intentId === 'change_format') {
      onClose();
      return;
    }

    if (intentId === 'analyze_file') {
      onClose();
      onOpenCopilot();
      return;
    }

    setLoadingIntent(intentId);
    try {
      const res = await api.routeIntent(file.file_id, intentId);
      if (res.recommended_operation) {
        onSelectAction(res.recommended_operation, res.options || {});
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIntent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-[#C8C8C1] shadow-2xl rounded overflow-hidden font-sans animate-in fade-in zoom-in-98 duration-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E3DE] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#141413]">
              Smart Convert Router
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#878780] hover:text-[#141413] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Intent Rows (§Smart Convert directive: rows with hover states) */}
        <div className="p-6 space-y-2">
          <div className="text-xs text-[#5C5C56] pb-1">
            What are you trying to accomplish with <strong>{file.filename}</strong>?
          </div>

          <div className="divide-y divide-[#F0F0EB] border border-[#E3E3DE] rounded overflow-hidden">
            {intents.map((intent) => {
              const isLoading = loadingIntent === intent.id;
              return (
                <button
                  key={intent.id}
                  disabled={!intent.applicable || isLoading}
                  onClick={() => handleIntentClick(intent.id)}
                  className={`w-full text-left p-3 flex items-center justify-between transition-colors group ${
                    !intent.applicable
                      ? 'opacity-40 bg-[#F7F7F5] cursor-not-allowed'
                      : 'hover:bg-[#FAFAF8] bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-[#141413] group-hover:text-[#1D4ED8] transition-colors">
                      → {intent.label}
                    </div>
                    <div className="text-[11px] text-[#878780]">{intent.desc}</div>
                  </div>

                  <div className="shrink-0 text-[#C8C8C1] group-hover:text-[#1D4ED8] transition-colors">
                    {isLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F7F7F5] border-t border-[#E3E3DE] flex items-center justify-between text-[11px] font-mono text-[#878780]">
          <span>Deterministic Routing</span>
          <button
            onClick={onClose}
            className="text-[#141413] hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
