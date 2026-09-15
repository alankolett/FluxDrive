import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { PrivacyPreset } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  preset: PrivacyPreset;
  onSelectPreset: (preset: PrivacyPreset) => void;
  vaultCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  preset,
  onSelectPreset,
  vaultCount,
  onRefresh,
  isRefreshing,
}) => {
  const ttlMap: Record<PrivacyPreset, string> = {
    standard: 'TTL 15:00',
    private: 'TTL 10:00',
    maximum: 'TTL 05:00',
  };

  return (
    <header className="h-14 border-b border-slate-200 px-6 md:px-8 flex items-center justify-between bg-white sticky top-0 z-20 select-none">
      {/* LEFT: Current page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-xs font-bold text-slate-900 tracking-widest uppercase">
          {title}
        </h1>
      </div>

      {/* CENTER: Workspace status */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 tracking-wide">
        <span className="text-slate-800 font-semibold uppercase text-[11px]">ACTIVE WORKSPACE</span>
        <span className="text-slate-300">·</span>
        <span className="font-medium text-slate-600 uppercase text-[11px]">{vaultCount} {vaultCount === 1 ? 'FILE' : 'FILES'}</span>
        <span className="text-slate-300">·</span>
        <span className="text-amber-700 font-mono font-bold text-[11px]">{ttlMap[preset]}</span>
      </div>

      {/* RIGHT: Compact segmented preset control & refresh */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded p-0.5 text-xs">
          {(['standard', 'private', 'maximum'] as PrivacyPreset[]).map((p) => {
            const isSel = preset === p;
            return (
              <button
                key={p}
                onClick={() => onSelectPreset(p)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  isSel
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          title="Refresh workspace telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
