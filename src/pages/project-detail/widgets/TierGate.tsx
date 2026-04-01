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
      <div className="filter blur-[4px] pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2.5 bg-white/60 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <i className="ri-lock-2-line text-xl text-violet-600" />
        </div>
        <p className="text-[13px] font-semibold text-gray-800 text-center">
          {featureName}
        </p>
        <p className="text-[12px] text-gray-500 text-center">
          {tierLabel}+ 플랜에서 사용 가능합니다
        </p>
        <a
          href="/settings"
          className="mt-1 px-4 py-1.5 text-[12px] font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          업그레이드 →
        </a>
      </div>
    </div>
  );
}
