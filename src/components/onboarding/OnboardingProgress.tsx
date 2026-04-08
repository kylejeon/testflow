import React from 'react';
import { useTranslation } from 'react-i18next';

interface OnboardingProgressProps {
  completed: number;
  total: number;
}

function getBarColor(completed: number): string {
  if (completed >= 5) return 'bg-emerald-600';
  if (completed >= 3) return 'bg-indigo-700';
  return 'bg-gray-400';
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ completed, total }) => {
  const { t } = useTranslation('onboarding');
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">
          {t('checklist.progress', { completed, total })}
        </span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(completed)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default OnboardingProgress;
