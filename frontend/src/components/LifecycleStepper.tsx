import React from 'react';
import { Check, AlertTriangle, Trash2 } from 'lucide-react';
import type { LifecycleState } from '../types';

interface StepperProps {
  currentState: LifecycleState;
  isError?: boolean;
}

export const LifecycleStepper: React.FC<StepperProps> = ({
  currentState,
  isError = false,
}) => {
  const steps: { state: LifecycleState; label: string }[] = [
    { state: 'UPLOADED', label: 'Uploaded' },
    { state: 'ANALYZED', label: 'Analyzed' },
    { state: 'PROCESSED', label: 'Processed' },
    { state: 'VERIFIED', label: 'Verified' },
    { state: 'DOWNLOADED', label: 'Downloaded' },
    { state: 'EXPIRED', label: 'Expired' },
    { state: 'DESTROYED', label: 'Destroyed' },
  ];

  const stateIndexMap: Record<LifecycleState, number> = {
    UPLOADED: 0,
    ANALYZED: 1,
    PROCESSED: 2,
    VERIFIED: 3,
    DOWNLOADED: 4,
    EXPIRED: 5,
    DESTROYED: 6,
  };

  const currentIndex = stateIndexMap[currentState] ?? 0;

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-[1px] bg-[#E3E3DE] -z-0" />
        
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isDestroyed = step.state === 'DESTROYED' && isCurrent;

          let badgeClass = 'bg-white border-[#E3E3DE] text-[#878780]';
          if (isError && isCurrent) {
            badgeClass = 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]';
          } else if (isDestroyed) {
            badgeClass = 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]';
          } else if (isDone) {
            badgeClass = 'bg-[#F0FDF4] border-[#15803D] text-[#15803D]';
          } else if (isCurrent) {
            badgeClass = 'bg-[#EFF4FE] border-[#1D4ED8] text-[#1D4ED8] font-bold ring-2 ring-[#BFDBFE]';
          }

          return (
            <div key={step.state} className="flex flex-col items-center relative z-10">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono transition-all ${badgeClass}`}
              >
                {isError && isCurrent ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : isDone ? (
                  <Check className="w-3 h-3" />
                ) : isDestroyed ? (
                  <Trash2 className="w-3 h-3" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[9px] font-mono mt-1 uppercase tracking-wider transition-colors ${
                  isCurrent
                    ? 'text-[#141413] font-bold'
                    : isDone
                    ? 'text-[#5C5C56]'
                    : 'text-[#878780]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
