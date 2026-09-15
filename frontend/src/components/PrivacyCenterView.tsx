import React from 'react';
import type { PrivacyPreset } from '../types';

interface PrivacyCenterProps {
  currentPreset: PrivacyPreset;
  onSelectPreset: (preset: PrivacyPreset) => void;
}

export const PrivacyCenterView: React.FC<PrivacyCenterProps> = ({
  currentPreset,
  onSelectPreset,
}) => {
  const modes: {
    id: PrivacyPreset;
    name: string;
    ttl: string;
    features: string[];
  }[] = [
    {
      id: 'standard',
      name: 'STANDARD',
      ttl: '15 MIN TTL',
      features: [
        'Basic validation',
        'Signed download',
        'Temporary storage',
      ],
    },
    {
      id: 'private',
      name: 'PRIVATE',
      ttl: '10 MIN TTL',
      features: [
        'PII scan',
        'Metadata sanitization',
        'Temporary storage',
      ],
    },
    {
      id: 'maximum',
      name: 'MAXIMUM',
      ttl: '5 MIN TTL',
      features: [
        'Sanitized output',
        'AI disabled',
        'Short lifecycle',
        'Enhanced inspection',
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      {/* Heading (§Privacy Center directive) */}
      <div className="border-b border-[#E3E3DE] pb-4">
        <h2 className="text-2xl font-black text-[#141413] tracking-tight uppercase font-mono">
          PRIVACY CENTER
        </h2>
        <p className="text-xs text-[#5C5C56]">
          Choose how aggressively FluxDrive protects each workspace.
        </p>
      </div>

      {/* Three Horizontal Modes Comparison Layout (§Privacy Center directive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        {modes.map((mode) => {
          const isSelected = currentPreset === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => onSelectPreset(mode.id)}
              className={`p-6 rounded border transition-all cursor-pointer space-y-4 shadow-xs ${
                isSelected
                  ? 'border-[#1D4ED8] bg-[#EFF4FE] ring-2 ring-[#BFDBFE]'
                  : 'border-[#E3E3DE] bg-white hover:border-[#C8C8C1] hover:bg-[#FAFAF8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-[#141413] tracking-tight">
                  {mode.name}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-[#F0F0EB] text-[#5C5C56]'
                  }`}
                >
                  {isSelected ? 'SELECTED' : 'SELECT'}
                </span>
              </div>

              <div className="text-xs font-bold text-[#B45309]">
                {mode.ttl}
              </div>

              <div className="pt-2 border-t border-[#E3E3DE] space-y-2 text-xs text-[#5C5C56]">
                {mode.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#15803D] font-bold">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
