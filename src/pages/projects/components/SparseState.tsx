import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../../lib/supabase';

interface SparseStateProps {
  projects: Project[];
  testCaseCounts: Record<string, number>;
  testRunCounts: Record<string, number>;
  onCreateProject: () => void;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// ── Tips banner content ──────────────────────────────────────────────────────
const TIPS = {
  1: {
    icon: 'ri-lightbulb-line',
    title: 'Getting started? Try these next steps',
    desc: 'Create your first test case, invite a teammate, or explore with a sample project.',
    primary: 'Create Test Case',
    secondary: 'Explore Sample',
  },
  2: {
    icon: 'ri-rocket-line',
    title: "You're building momentum!",
    desc: 'Invite your team to collaborate, or set up a milestone to track your first release.',
    primary: 'Invite Team',
    secondary: 'Create Milestone',
  },
} as const;

// ── Action card definitions ──────────────────────────────────────────────────
interface ActionCard {
  key: string;
  title: string;
  desc: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  showWhen: (count: number) => boolean;
  onClick?: () => void;
}

function buildActionCards(
  count: number,
  onCreateProject: () => void,
  navigate: ReturnType<typeof useNavigate>,
): ActionCard[] {
  const all: ActionCard[] = [
    {
      key: 'create',
      title: 'Create New Project',
      desc: 'Start a new QA testing project from scratch',
      icon: 'ri-add-circle-line',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      showWhen: () => true,
      onClick: onCreateProject,
    },
    {
      key: 'sample',
      title: 'Try Sample Project',
      desc: 'Explore Testably with pre-loaded test cases and runs',
      icon: 'ri-sparkling-line',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-500',
      showWhen: (c) => c < 2,
      onClick: onCreateProject,
    },
    {
      key: 'invite',
      title: 'Invite Teammates',
      desc: 'Collaborate with your QA team in real-time',
      icon: 'ri-user-add-line',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      showWhen: () => true,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'import',
      title: 'Import from TestRail',
      desc: 'Migrate your existing test cases in minutes',
      icon: 'ri-upload-cloud-line',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      showWhen: (c) => c <= 1,
      onClick: () => {},
    },
  ];
  return all.filter((c) => c.showWhen(count));
}

// ── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  testCaseCount,
  testRunCount,
  animDelay,
}: {
  project: Project;
  testCaseCount: number;
  testRunCount: number;
  animDelay: number;
}) {
  const navigate = useNavigate();
  const isActive = project.status === 'active';

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-px"
      style={{
        animation: `fadeInUp 0.4s ease-out ${animDelay}ms backwards`,
        // hover handled via Tailwind; shadow via style for rgb with alpha
      }}
      onClick={() => navigate(`/projects/${project.id}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#C7D2FE';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <i className="ri-folder-3-line text-base text-indigo-500"></i>
          </div>
          <span className="text-[0.9375rem] font-semibold text-slate-900 truncate">
            {project.name}
          </span>
        </div>
        {/* Status / health badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
            isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`}
          ></span>
          {isActive ? 'Active' : 'Archived'}
        </span>
      </div>

      {/* Description */}
      <p className="text-[0.8125rem] text-slate-500 mt-1 mb-4 line-clamp-2 leading-snug">
        {project.description || 'No description added yet.'}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <i className="ri-file-list-3-line text-sm"></i>
          {testCaseCount} test case{testCaseCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <i className="ri-play-circle-line text-sm"></i>
          {testRunCount} run{testRunCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <i className="ri-time-line text-sm"></i>
        <span>Updated {timeAgo(project.updated_at || project.created_at)}</span>
      </div>
    </div>
  );
}

// ── Action card ──────────────────────────────────────────────────────────────
function ActionCard({
  card,
  animDelay,
}: {
  card: ActionCard;
  animDelay: number;
}) {
  return (
    <div
      className="bg-white rounded-xl p-5 cursor-pointer transition-all flex flex-col items-center justify-center text-center"
      style={{
        border: '1.5px dashed #C7D2FE',
        minHeight: '190px',
        animation: `fadeInUp 0.4s ease-out ${animDelay}ms backwards`,
      }}
      onClick={card.onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#6366F1';
        el.style.backgroundColor = '#FAFAFF';
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 4px 16px rgba(99,102,241,0.06)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '';
        el.style.backgroundColor = '';
        el.style.transform = '';
        el.style.boxShadow = '';
      }}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>
        <i className={`${card.icon} text-xl ${card.iconColor}`}></i>
      </div>
      <div className="text-sm font-semibold text-slate-800 mb-1">{card.title}</div>
      <div className="text-[0.6875rem] text-slate-400 leading-snug max-w-[200px]">{card.desc}</div>
    </div>
  );
}

// ── Tips banner ──────────────────────────────────────────────────────────────
function TipsBanner({
  count,
  onDismiss,
}: {
  count: 1 | 2;
  onDismiss: () => void;
}) {
  const tip = TIPS[count];

  return (
    <div
      className="rounded-xl p-5 mb-4 flex items-center gap-4"
      style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        border: '1px solid #E0E7FF',
        animation: 'fadeInUp 0.4s ease-out',
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-100">
        <i className={`${tip.icon} text-xl text-indigo-500`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-indigo-900 mb-0.5">{tip.title}</div>
        <div className="text-xs text-indigo-600 leading-snug">{tip.desc}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="text-[0.6875rem] px-3 py-1.5 rounded-full font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all cursor-pointer whitespace-nowrap">
          {tip.primary}
        </button>
        <button className="text-[0.6875rem] px-3 py-1.5 rounded-full font-semibold text-indigo-600 hover:bg-indigo-100/60 transition-all cursor-pointer whitespace-nowrap">
          {tip.secondary}
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 flex-shrink-0 transition-colors"
        title="Dismiss"
      >
        <i className="ri-close-line text-base"></i>
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SparseState({
  projects,
  testCaseCounts,
  testRunCounts,
  onCreateProject,
}: SparseStateProps) {
  const navigate = useNavigate();
  const [tipsDismissed, setTipsDismissed] = useState(false);

  const count = projects.length as 1 | 2;
  const actionCards = buildActionCards(count, onCreateProject, navigate);

  // All cards in one grid: project cards first, then action cards
  const totalProjectCards = projects.length;

  return (
    <div>
      {/* Tips banner */}
      {!tipsDismissed && (
        <TipsBanner count={count} onDismiss={() => setTipsDismissed(true)} />
      )}

      {/* Unified grid: projects + action cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Project cards */}
        {projects.map((project, i) => (
          <ProjectCard
            key={project.id}
            project={project}
            testCaseCount={testCaseCounts[project.id] ?? 0}
            testRunCount={testRunCounts[project.id] ?? 0}
            animDelay={i * 50}
          />
        ))}

        {/* Action cards */}
        {actionCards.map((card, i) => (
          <ActionCard
            key={card.key}
            card={card}
            animDelay={(totalProjectCards + i) * 50}
          />
        ))}
      </div>
    </div>
  );
}
