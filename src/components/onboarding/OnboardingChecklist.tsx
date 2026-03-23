import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  FolderPlus,
  FileText,
  Sparkles,
  Play,
  UserPlus,
  Link,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { OnboardingState } from '../../hooks/useOnboarding';
import ChecklistItem from './ChecklistItem';
import OnboardingProgress from './OnboardingProgress';

interface OnboardingChecklistProps {
  state: OnboardingState;
  onDismiss: () => void;
  firstProjectId?: string | null;
}

// Pages where checklist should be hidden
const HIDDEN_PATHS = ['/auth', '/', '/pricing'];

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  state,
  onDismiss,
  firstProjectId,
}) => {
  const { t } = useTranslation('onboarding');
  const location = useLocation();

  // Expand for first 3 logins (tracked in sessionStorage per session)
  const [loginCount] = useState(() => {
    const stored = Number(localStorage.getItem('_tc_logins') ?? '0');
    const next = stored + 1;
    localStorage.setItem('_tc_logins', String(next));
    return next;
  });
  const [expanded, setExpanded] = useState(loginCount <= 3);
  const [visible, setVisible] = useState(false);

  // Slide-up on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Hide on certain pages
  const shouldHide =
    state.isComplete ||
    state.checklistDismissed ||
    HIDDEN_PATHS.some((p) => location.pathname === p || location.pathname.startsWith('/auth'));

  if (shouldHide) return null;

  const projectTestcasesLink = firstProjectId
    ? `/projects/${firstProjectId}/testcases`
    : '/projects';
  const projectRunsLink = firstProjectId
    ? `/projects/${firstProjectId}/runs`
    : '/projects';

  const steps = [
    {
      key: 'createProject' as const,
      label: t('checklist.steps.createProject'),
      icon: FolderPlus,
      linkTo: '/projects',
    },
    {
      key: 'createTestcase' as const,
      label: t('checklist.steps.createTestcase'),
      icon: FileText,
      linkTo: projectTestcasesLink,
    },
    {
      key: 'tryAi' as const,
      label: t('checklist.steps.tryAi'),
      icon: Sparkles,
      linkTo: projectTestcasesLink,
    },
    {
      key: 'runTest' as const,
      label: t('checklist.steps.runTest'),
      icon: Play,
      linkTo: projectRunsLink,
    },
    {
      key: 'inviteMember' as const,
      label: t('checklist.steps.inviteMember'),
      icon: UserPlus,
      linkTo: '/settings#team',
    },
    {
      key: 'connectJira' as const,
      label: t('checklist.steps.connectJira'),
      icon: Link,
      linkTo: '/settings#integrations',
      optional: true,
    },
  ];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[1000] transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300 ${
          expanded ? 'w-[360px]' : 'w-[320px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors"
          >
            {t('checklist.title')}
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label={t('checklist.dismiss')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar (always visible) */}
        <OnboardingProgress completed={state.completedCount} total={6} />

        {/* Steps (only when expanded) */}
        {expanded && (
          <div className="px-2 pb-3">
            {steps.map((step) => (
              <ChecklistItem
                key={step.key}
                label={step.label}
                completed={state.steps[step.key]}
                icon={step.icon}
                linkTo={step.linkTo}
                optional={step.optional}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
