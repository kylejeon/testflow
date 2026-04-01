import { type ReactNode } from 'react';

interface TierGateProps {
  requiredTier: number;
  currentTier: number;
  featureName: string;
  children: ReactNode;
}

export default function TierGate({ requiredTier, currentTier, featureName, children }: TierGateProps) {
  if (currentTier >= requiredTier) {
    return <>{children}</>;
  }

  const tierLabel = requiredTier >= 3 ? 'Professional' : 'Starter';

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="filter blur-[5px] pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
        <i className="ri-lock-fill text-[32px] text-violet-500" />
        <p className="text-[14px] font-medium text-gray-700 text-center">
          {featureName}
        </p>
        <p className="text-[12px] text-gray-500 text-center">
          {tierLabel}+ 플랜에서 사용 가능합니다
        </p>
        <a
          href="/settings"
          className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 mt-1"
        >
          업그레이드 →
        </a>
      </div>
    </div>
  );
}
