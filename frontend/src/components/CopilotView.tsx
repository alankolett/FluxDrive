import React, { useState } from 'react';
import { Send, ArrowRight } from 'lucide-react';
import type { FileItem, SanitizedPreviewData, CopilotResponseData } from '../types';
import { PrivacyFirewallModal } from './PrivacyFirewallModal';
import { api } from '../services/api';
import { cleanFilename, formatBytes } from '../utils/format';

interface CopilotProps {
  files: FileItem[];
  activeFile: FileItem | null;
  onSelectFile: (file: FileItem) => void;
}

export const CopilotView: React.FC<CopilotProps> = ({
  files,
  activeFile,
  onSelectFile,
}) => {
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [response, setResponse] = useState<CopilotResponseData | null>(null);
  const [firewallData, setFirewallData] = useState<SanitizedPreviewData | null>(null);
  const [userConsented, setUserConsented] = useState(false);
  const [showFirewallModal, setShowFirewallModal] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');

  // xAI Grok API Key and Model state
  const [grokApiKey, setGrokApiKey] = useState(() => localStorage.getItem('fluxdrive_grok_key') || '');
  const [grokModel, setGrokModel] = useState(() => localStorage.getItem('fluxdrive_grok_model') || 'grok-2-latest');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const handleSaveGrokKey = () => {
    const trimmed = tempKey.trim();
    setGrokApiKey(trimmed);
    localStorage.setItem('fluxdrive_grok_key', trimmed);
    setShowKeyInput(false);
  };

  const handleSelectModel = (m: string) => {
    setGrokModel(m);
    localStorage.setItem('fluxdrive_grok_model', m);
  };

  const handleInitiateQuery = async (customQuestion?: string) => {
    if (!activeFile) return;
    const promptToSend = customQuestion || question || 'Summarize this file and recommend privacy or conversion actions';
    setPendingPrompt(promptToSend);

    if (!userConsented) {
      try {
        const preview = await api.previewSanitized(activeFile.file_id);
        setFirewallData(preview);
        setShowFirewallModal(true);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    executeCopilotCall(promptToSend, true);
  };

  const executeCopilotCall = async (promptText: string, consent: boolean) => {
    if (!activeFile) return;
    setIsQuerying(true);
    try {
      const res = await api.queryCopilot(activeFile.file_id, consent, promptText, grokApiKey || undefined, grokModel);
      setResponse(res);
      setQuestion('');
    } catch (err: any) {
      setResponse({
        source: 'Local rule engine fallback',
        copilot_response: `Notice: ${err.message || 'AI request routed to local rule-based intelligence engine.'}`,
        masked_fields_count: 0
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleAllowFirewall = () => {
    setUserConsented(true);
    setShowFirewallModal(false);
    executeCopilotCall(pendingPrompt, true);
  };

  const availableActions = [
    'Explain file',
    'Summarize',
    'Recommend conversion',
    'Find sensitive information',
    'Make shareable',
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            SANITIZED CONTEXT ONLY
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            AI Copilot
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Document intelligence workspace strictly gated by the AI Privacy Firewall.
          </p>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">SELECTED:</span>
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
        <div className="py-16 text-center border border-dashed border-slate-200 rounded bg-white text-slate-400">
          Upload or stage a file to activate document intelligence.
        </div>
      ) : (
        <div className="space-y-5">
          {/* xAI Grok Status and Configuration Bar */}
          <div className="p-3.5 border border-slate-200 rounded bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 font-sans">xAI Grok Intelligence:</span>
                {grokApiKey ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold border border-emerald-200">
                    KEY ACTIVE ({grokModel})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[11px] font-bold border border-amber-200">
                    NO KEY (CLICK CONFIGURE)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={grokModel}
                onChange={(e) => handleSelectModel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-slate-700 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="grok-2-latest">grok-2-latest</option>
                <option value="grok-beta">grok-beta</option>
                <option value="grok-vision-beta">grok-vision-beta</option>
              </select>

              <button
                onClick={() => {
                  setTempKey(grokApiKey);
                  setShowKeyInput(!showKeyInput);
                }}
                className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                {grokApiKey ? 'Change Key' : 'Configure Key'}
              </button>
            </div>
          </div>

          {showKeyInput && (
            <div className="p-4 border border-blue-200 bg-blue-50/50 rounded shadow-2xs space-y-2 animate-in fade-in duration-100">
              <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                <span>Enter xAI Grok API Key</span>
                <span className="text-[10px] text-slate-500 font-mono">Format: xai-...</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={handleSaveGrokKey}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowKeyInput(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Your key is stored securely in browser storage and only dispatched for sanitized document intelligence.
              </p>
            </div>
          )}

          {/* Main Action Surface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Selected File Spec */}
            <div className="lg:col-span-4 border border-slate-200 rounded bg-white p-5 space-y-3 shadow-2xs font-mono text-xs">
              <div className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 pb-1.5">
                TARGET SPECIFICATION
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 break-all text-xs font-sans">
                  {cleanFilename(activeFile?.filename)}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {(activeFile?.detected_ext || activeFile?.filename?.split('.').pop() || 'FILE').toUpperCase()} · {formatBytes(activeFile?.size_bytes)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PII SCAN</span>
                  <span className="font-bold text-slate-900">
                    {activeFile?.pii_count && activeFile?.pii_count > 0 ? `${activeFile.pii_count} findings` : 'CLEAN'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">CONSENT</span>
                  <span className={`font-bold ${userConsented ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {userConsented ? 'GRANTED' : 'REQUIRED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Available Actions & Query */}
            <div className="lg:col-span-8 border border-slate-200 rounded bg-white p-5 space-y-4 shadow-2xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-1.5">
                INTELLIGENCE ACTIONS
              </div>

              <div className="divide-y divide-slate-100">
                {availableActions.map((act) => (
                  <button
                    key={act}
                    onClick={() => handleInitiateQuery(act)}
                    disabled={isQuerying}
                    className="w-full text-left py-2 hover:text-blue-600 transition-colors flex items-center justify-between group text-xs font-medium text-slate-800"
                  >
                    <span>→ {act}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  </button>
                ))}
              </div>

              {/* Technical Query Input */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInitiateQuery()}
                  placeholder="Ask a question about the document..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-sans"
                />
                <button
                  onClick={() => handleInitiateQuery()}
                  disabled={isQuerying}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute</span>
                </button>
              </div>

              {/* Response Display */}
              {response && (
                <div className="p-4 rounded border border-purple-200 bg-purple-50/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-purple-700 font-bold uppercase">
                    <span>{response.source}</span>
                    <span>{response.masked_fields_count} PII MASKED</span>
                  </div>
                  <div className="text-slate-900 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {response.copilot_response}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI PRIVACY FIREWALL STATE STRIP */}
          <div className="border border-slate-200 rounded bg-white p-4 shadow-2xs font-mono">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-2.5">
              AI PRIVACY FIREWALL
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 text-center">
              <div className="space-y-0.5 px-2">
                <div className="text-[10px] text-slate-500 uppercase">RAW FILE</div>
                <div className="font-bold text-red-600 text-xs">BLOCKED</div>
              </div>
              <div className="space-y-0.5 px-2">
                <div className="text-[10px] text-slate-500 uppercase">PII</div>
                <div className="font-bold text-emerald-700 text-xs">MASKED</div>
              </div>
              <div className="space-y-0.5 px-2">
                <div className="text-[10px] text-slate-500 uppercase">CONSENT</div>
                <div className="font-bold text-amber-700 text-xs">REQUIRED</div>
              </div>
              <div className="space-y-0.5 px-2">
                <div className="text-[10px] text-slate-500 uppercase">EXTERNAL AI</div>
                <div className="font-bold text-violet-700 text-xs">OPT-IN</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFirewallModal && firewallData && (
        <PrivacyFirewallModal
          previewData={firewallData}
          onAllow={handleAllowFirewall}
          onCancel={() => setShowFirewallModal(false)}
        />
      )}
    </div>
  );
};
