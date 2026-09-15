import React, { useState } from 'react';
import { Settings, X, Cpu, Sparkles, Server, Check } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  aiMode: 'local' | 'privacy_filtered';
  onSelectAiMode: (mode: 'local' | 'privacy_filtered') => void;
  systemHealth: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  aiMode,
  onSelectAiMode,
  systemHealth,
}) => {
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('fluxdrive_api_url') || (import.meta.env.VITE_API_URL as string) || '';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveApiUrl = () => {
    const cleanUrl = apiUrl.trim().replace(/\/$/, '');
    if (cleanUrl) {
      localStorage.setItem('fluxdrive_api_url', cleanUrl);
    } else {
      localStorage.removeItem('fluxdrive_api_url');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white border border-[#C8C8C1] shadow-2xl rounded overflow-hidden font-sans animate-in fade-in zoom-in-98 duration-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E3DE] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#141413]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#141413]">
              Workstation Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#878780] hover:text-[#141413] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* Backend API URL */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#878780] font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#141413]" />
              <span>Backend API Server Endpoint</span>
            </div>
            <div className="p-3.5 rounded border border-[#E3E3DE] bg-[#F7F7F5] space-y-2">
              <p className="text-[11px] text-[#5C5C56]">
                Enter your deployed Render backend URL (e.g. <code className="bg-white px-1 py-0.5 rounded border border-[#E3E3DE] text-[#141413]">https://your-app.onrender.com</code>):
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://fluxdrive.onrender.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-[#C8C8C1] rounded font-mono text-xs text-[#141413] focus:outline-hidden focus:border-[#141413]"
                />
                <button
                  onClick={handleSaveApiUrl}
                  className="px-3 py-1.5 bg-[#141413] hover:bg-[#272725] text-white rounded font-mono text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save & Connect</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* AI Mode Selector */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#878780] font-semibold">
              AI Processing Mode
            </div>

            <div className="space-y-2">
              <label
                onClick={() => onSelectAiMode('local')}
                className={`p-3.5 rounded border flex items-start gap-3 cursor-pointer transition-colors ${
                  aiMode === 'local'
                    ? 'border-[#1D4ED8] bg-[#EFF4FE]'
                    : 'border-[#E3E3DE] bg-white hover:bg-[#F7F7F5]'
                }`}
              >
                <input
                  type="radio"
                  name="aiModeSetting"
                  checked={aiMode === 'local'}
                  onChange={() => onSelectAiMode('local')}
                  className="mt-0.5 accent-[#1D4ED8]"
                />
                <div>
                  <div className="font-semibold text-[#141413] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>Local / Rule-based</span>
                  </div>
                  <p className="text-[11px] text-[#5C5C56] mt-0.5 leading-relaxed">
                    Document analysis runs entirely on locally hosted rule-based engines. No external AI APIs called.
                  </p>
                </div>
              </label>

              <label
                onClick={() => onSelectAiMode('privacy_filtered')}
                className={`p-3.5 rounded border flex items-start gap-3 cursor-pointer transition-colors ${
                  aiMode === 'privacy_filtered'
                    ? 'border-[#6D28D9] bg-[#F5F3FF]'
                    : 'border-[#E3E3DE] bg-white hover:bg-[#F7F7F5]'
                }`}
              >
                <input
                  type="radio"
                  name="aiModeSetting"
                  checked={aiMode === 'privacy_filtered'}
                  onChange={() => onSelectAiMode('privacy_filtered')}
                  className="mt-0.5 accent-[#6D28D9]"
                />
                <div>
                  <div className="font-semibold text-[#141413] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>Privacy-Filtered AI (Groq LPU / LLaMA 3.3)</span>
                  </div>
                  <p className="text-[11px] text-[#5C5C56] mt-0.5 leading-relaxed">
                    Extracted text is stripped of all PII and sensitive identifiers before dispatch to Groq models.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Engine Status */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#878780] font-semibold">
              Engine Status
            </div>

            <div className="p-3 rounded bg-[#F7F7F5] border border-[#E3E3DE] space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#5C5C56]">
                <span>Backend Connection:</span>
                <span className={systemHealth ? "text-[#15803D] font-bold" : "text-[#B91C1C] font-bold"}>
                  {systemHealth ? "ONLINE & READY" : "OFFLINE / DISCONNECTED"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#5C5C56]">
                <span>Async Worker:</span>
                <span className="text-[#15803D] font-bold">POLLING ENGINE ACTIVE</span>
              </div>
              <div className="flex items-center justify-between text-[#5C5C56]">
                <span>Vault Active Objects:</span>
                <span className="text-[#141413]">{systemHealth?.active_files_in_vault ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F7F7F5] border-t border-[#E3E3DE] flex items-center justify-between text-xs font-mono text-[#878780]">
          <span>FluxDrive v2.0 Workstation</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#141413] hover:bg-[#272725] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
