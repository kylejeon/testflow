import { useState } from 'react';

const STORAGE_KEY = 'testably_checklist_dismissed';

const ITEMS = [
  {
    key: 'create_project',
    label: 'Create your first project',
    desc: 'Set up a QA project with a name and description.',
    icon: 'ri-folder-add-line',
  },
  {
    key: 'add_test_case',
    label: 'Add a test case',
    desc: 'Write your first test case manually or use AI generation.',
    icon: 'ri-file-list-3-line',
  },
  {
    key: 'invite_teammate',
    label: 'Invite a teammate',
    desc: 'Collaborate with your QA team in real-time.',
    icon: 'ri-user-add-line',
  },
  {
    key: 'start_test_run',
    label: 'Start a test run',
    desc: 'Execute tests and track pass/fail results.',
    icon: 'ri-play-circle-line',
  },
  {
    key: 'create_milestone',
    label: 'Create a milestone',
    desc: 'Track your release quality with milestone-based runs.',
    icon: 'ri-flag-line',
  },
];

interface GettingStartedChecklistProps {
  completedKeys?: string[];
}

export default function GettingStartedChecklist({ completedKeys = [] }: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY)
  );
  const [checked, setChecked] = useState<Set<string>>(
    () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('testably_checklist_checked') : null;
      const fromStorage: string[] = stored ? JSON.parse(stored) : [];
      return new Set([...completedKeys, ...fromStorage]);
    }
  );

  if (dismissed) return null;

  const handleCheck = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      localStorage.setItem('testably_checklist_checked', JSON.stringify([...next]));
      return next;
    });
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  const completedCount = ITEMS.filter(item => checked.has(item.key)).length;
  const progress = Math.round((completedCount / ITEMS.length) * 100);

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 mb-4"
      style={{ animation: 'fadeInUp 0.4s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <i className="ri-rocket-line text-base text-indigo-500"></i>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Getting Started</div>
            <div className="text-xs text-slate-500">{completedCount}/{ITEMS.length} completed</div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors"
          title="Dismiss"
        >
          <i className="ri-close-line text-base"></i>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {ITEMS.map((item) => {
          const done = checked.has(item.key);
          return (
            <div
              key={item.key}
              onClick={() => handleCheck(item.key)}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                done ? 'opacity-50' : 'hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'
                }`}
              >
                {done && <i className="ri-check-line text-white text-[10px]"></i>}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <i className={`${item.icon} text-sm ${done ? 'text-slate-400' : 'text-indigo-500'} flex-shrink-0`}></i>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.label}
                  </div>
                  <div className="text-[0.6875rem] text-slate-400 leading-snug">{item.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
