import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { OnboardingState } from '../../hooks/useOnboarding';

interface OnboardingChecklistProps {
  state: OnboardingState;
  onDismiss: () => void;
  firstProjectId?: string | null;
}

const HIDDEN_PATHS = ['/auth', '/', '/pricing'];

export default function OnboardingChecklist({ state, onDismiss, firstProjectId }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginCount] = useState(() => {
    const stored = Number(localStorage.getItem('_tc_logins') ?? '0');
    const next = stored + 1;
    localStorage.setItem('_tc_logins', String(next));
    return next;
  });
  const [expanded, setExpanded] = useState(loginCount <= 3);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; actionFn?: () => void } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(5);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Trigger celebration when all steps complete
  const prevCompleteRef = useRef(state.isComplete);
  useEffect(() => {
    if (state.isComplete && !prevCompleteRef.current) {
      setCelebrating(true);
      setCloseCountdown(5);
    }
    prevCompleteRef.current = state.isComplete;
  }, [state.isComplete]);

  // Countdown for celebration auto-close
  useEffect(() => {
    if (!celebrating) return;
    setCloseCountdown(5);
    closeTimerRef.current = setInterval(() => {
      setCloseCountdown(prev => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (closeTimerRef.current) clearInterval(closeTimerRef.current); };
  }, [celebrating, onDismiss]);

  const showToast = (message: string, actionLabel?: string, actionFn?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, actionLabel, actionFn });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const shouldHide =
    state.checklistDismissed ||
    HIDDEN_PATHS.some(p => location.pathname === p || location.pathname.startsWith('/auth'));

  if (shouldHide) return null;

  const steps = [
    {
      key: 'createProject' as const,
      label: 'Create your first project',
      sublabel: 'Create a project to get started',
      completedText: 'Project created',
      icon: 'ri-folder-add-line',
      getLink: () => '/projects?action=create',
      dependency: null,
    },
    {
      key: 'createTestcase' as const,
      label: 'Write your first test case',
      sublabel: 'Add test coverage to your project',
      completedText: 'First TC written',
      icon: 'ri-file-add-line',
      getLink: () => firstProjectId ? `/projects/${firstProjectId}/testcases?action=create` : '/projects?action=create',
      dependency: 'createProject' as const,
    },
    {
      key: 'tryAi' as const,
      label: 'Try AI test generation',
      sublabel: 'Let AI generate test cases for you',
      completedText: 'AI generation tried',
      icon: 'ri-sparkling-2-fill',
      getLink: () => firstProjectId ? `/projects/${firstProjectId}/testcases?action=ai-generate` : '/projects?action=create',
      dependency: null,
    },
    {
      key: 'runTest' as const,
      label: 'Run your first test',
      sublabel: 'Execute a test run and see results',
      completedText: 'First run created',
      icon: 'ri-play-circle-line',
      getLink: () => firstProjectId ? `/projects/${firstProjectId}/runs?action=create` : '/projects?action=create',
      dependency: 'createTestcase' as const,
    },
    {
      key: 'inviteMember' as const,
      label: 'Invite a team member',
      sublabel: 'Collaborate with your team',
      completedText: 'Member invited',
      icon: 'ri-user-add-line',
      getLink: () => '/settings?tab=members&action=invite',
      dependency: null,
    },
    {
      key: 'connectJira' as const,
      label: 'Connect Jira',
      sublabel: 'Sync Jira issues with Testably',
      completedText: 'Jira connected',
      icon: 'ri-links-fill',
      getLink: () => '/settings?tab=integrations',
      dependency: null,
      optional: true,
    },
  ];

  const handleItemClick = (step: typeof steps[number]) => {
    if (state.steps[step.key]) return; // already completed

    // Dependency check
    if (step.dependency && !state.steps[step.dependency]) {
      if (step.dependency === 'createProject') {
        showToast(
          'Create a project first to add test cases.',
          'Create Project →',
          () => navigate('/projects?action=create'),
        );
      } else if (step.dependency === 'createTestcase') {
        showToast(
          'Write a test case first before running a test.',
          'Write Test Case →',
          () => navigate(firstProjectId ? `/projects/${firstProjectId}/testcases?action=create` : '/projects?action=create'),
        );
      }
      return;
    }

    navigate(step.getLink());
  };

  // SVG ring math
  const CIRCUMFERENCE = 2 * Math.PI * 11; // r=11
  const completedNonOptional = Object.entries(state.steps)
    .filter(([k, v]) => v && k !== 'connectJira')
    .length;
  const totalNonOptional = 5;
  const ringOffset = CIRCUMFERENCE - (completedNonOptional / totalNonOptional) * CIRCUMFERENCE;

  // Next-up: first incomplete non-optional step
  const nextUpKey = steps.find(s => !s.optional && !state.steps[s.key])?.key ?? null;

  if (celebrating) {
    return (
      <div className={`fixed bottom-6 right-6 z-[1000] transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="w-[340px] bg-white border-2 border-green-500 rounded-xl shadow-xl overflow-hidden text-center p-7">
          <div className="text-5xl mb-3 leading-none">🎉</div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">All done!</h3>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">You've completed the setup. Explore what's next!</p>
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-500" />
            ))}
          </div>
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-check-line"></i>
            Close
          </button>
          <p className="text-xs text-gray-400 mt-2">Closes in {closeCountdown}s</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-[1000] transition-all duration-300 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
      {/* Toast */}
      {toast && (
        <div className="absolute bottom-full right-0 mb-3 bg-amber-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap animate-fade-in">
          <i className="ri-information-line text-base shrink-0"></i>
          <span>{toast.message}</span>
          {toast.actionLabel && toast.actionFn && (
            <button
              onClick={() => { toast.actionFn!(); setToast(null); }}
              className="text-indigo-300 text-xs font-semibold underline cursor-pointer ml-1"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Collapsed pill */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full pl-3 pr-4 py-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="relative w-7 h-7">
            <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
              <circle cx="14" cy="14" r="11" fill="none" strokeWidth="3" stroke="#E5E7EB" />
              <circle
                cx="14" cy="14" r="11" fill="none" strokeWidth="3"
                stroke="#6366F1" strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            <span className="text-indigo-600">{state.completedCount}</span>/6 completed
          </span>
          <i className="ri-arrow-up-s-line text-gray-400 text-base"></i>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="w-[340px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🚀</span>
              <h3 className="text-sm font-bold text-gray-900">Get Started</h3>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <i className="ri-subtract-line text-base"></i>
            </button>
          </div>

          {/* Progress */}
          <div className="px-4 pt-3 pb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Your progress</span>
              <span className="text-xs font-bold text-indigo-600">{state.completedCount} of 6 completed</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
                style={{ width: `${(state.completedCount / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* Items */}
          <div className="px-2 pb-2">
            {steps.map(step => {
              const done = state.steps[step.key];
              const isNextUp = !done && step.key === nextUpKey;
              const depMissing = step.dependency && !state.steps[step.dependency];

              return (
                <div
                  key={step.key}
                  onClick={() => handleItemClick(step)}
                  className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                    done
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-gray-50'
                  } ${depMissing ? 'bg-amber-50 border border-dashed border-amber-300' : ''}`}
                >
                  {/* Checkbox circle */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      done
                        ? 'bg-green-500 border-green-500'
                        : isNextUp
                        ? 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                        : depMissing
                        ? 'border-amber-400'
                        : 'border-gray-300'
                    }`}
                  >
                    {done && <i className="ri-check-line text-white text-xs leading-none"></i>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium flex items-center gap-1.5 ${
                      done ? 'text-gray-400 line-through' : depMissing ? 'text-amber-600' : 'text-gray-800'
                    }`}>
                      {(isNextUp || depMissing) && !done && (
                        <i className={`text-xs ${depMissing ? 'ri-alert-line text-amber-500' : `${step.icon} text-indigo-600`}`}></i>
                      )}
                      {step.label}
                      {step.optional && (
                        <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">Optional</span>
                      )}
                    </div>
                    {!done && (
                      <p className={`text-xs mt-0.5 leading-tight ${depMissing ? 'text-amber-700' : 'text-gray-400'}`}>
                        {depMissing ? `Requires: ${steps.find(s => s.key === step.dependency)?.label ?? 'previous step'}` : step.sublabel}
                      </p>
                    )}
                    {done && (
                      <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                        <i className="ri-check-line text-xs"></i>
                        {step.completedText}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  {!done && !depMissing && (
                    <i className="ri-arrow-right-s-line text-gray-300 text-sm mt-0.5 shrink-0 group-hover:text-indigo-400"></i>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <a
              href="/docs"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <i className="ri-question-line"></i>
              Help Center
            </a>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none"
            >
              Dismiss checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
