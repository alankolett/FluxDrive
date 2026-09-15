import React, { useState } from 'react';
import {
  Eye,
  X,
  ArrowRight,
  Lock
} from 'lucide-react';
import type { SanitizedPreviewData } from '../types';

interface FirewallModalProps {
  previewData: SanitizedPreviewData;
  onAllow: () => void;
  onCancel: () => void;
}

export const PrivacyFirewallModal: React.FC<FirewallModalProps> = ({
  previewData,
  onAllow,
  onCancel,
}) => {
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-[#C8C8C1] shadow-2xl rounded overflow-hidden font-sans animate-in fade-in zoom-in-98 duration-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E3DE] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#6D28D9]" />
            <span className="text-xs font-mono font-bold tracking-wider text-[#141413] uppercase">
              AI PRIVACY FIREWALL
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-[#878780] hover:text-[#141413] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          <div className="text-[#5C5C56]">
            Before transmitting any extracted document text to the AI model:
          </div>

          {/* Guaranteed Exclusions */}
          <div className="p-3 rounded bg-[#F7F7F5] border border-[#E3E3DE] space-y-2 text-[#141413] font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[#15803D] font-bold">✓</span>
              <span>Raw binary file excluded (never uploaded to model)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#15803D] font-bold">✓</span>
              <span>EXIF & camera hardware tags excluded</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#15803D] font-bold">✓</span>
              <span>Identified PII tokens masked (Luhn verified)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#15803D] font-bold">✓</span>
              <span>Workspace directory identifiers excluded</span>
            </div>
          </div>

          {/* Masked Field Count Notice */}
          <div className="p-3 rounded border border-[#DDD6FE] bg-[#F5F3FF] flex items-center justify-between">
            <span className="text-[#6D28D9] font-mono font-semibold">
              {previewData.masked_field_count} sensitive fields will be masked
            </span>

            <button
              onClick={() => setShowPayloadPreview(!showPayloadPreview)}
              className="text-[#6D28D9] hover:underline font-mono text-[11px] flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPayloadPreview ? 'Hide Payload' : 'Preview Sanitized Data'}</span>
            </button>
          </div>

          {/* Sanitized Text Preview */}
          {showPayloadPreview && (
            <div className="space-y-1.5 animate-in fade-in duration-100">
              <div className="text-[10px] font-mono uppercase text-[#878780]">
                Actual Transmitted Text Buffer
              </div>
              <div className="max-h-36 overflow-y-auto p-3 rounded bg-[#F7F7F5] border border-[#E3E3DE] font-mono text-[11px] text-[#141413] whitespace-pre-wrap select-all">
                {previewData.sanitized_payload_preview || '(No text content extracted)'}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="px-6 py-3.5 bg-[#F7F7F5] border-t border-[#E3E3DE] flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded border border-[#E3E3DE] text-xs font-semibold text-[#5C5C56] hover:text-[#141413] hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAllow}
            className="px-4 py-1.5 rounded bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>Allow AI Processing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
