import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../../lib/supabase';
import { Avatar } from '../../../components/Avatar';

interface SparseStateProps {
  projects: Project[];
  testCaseCounts: Record<string, number>;
  testRunCounts: Record<string, number>;
  projectPassRates?: Record<string, number | null>;
  projectMembers?: Record<string, Array<{ initials: string; color: string; userId?: string; name?: string }>>;
  onCreateProject: () => void;
  onTrySample: () => void;
  isSampleLoading?: boolean;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  canDeleteProjectIds?: Set<string>;
  /** TipsBanner button handlers */
  onTipCreateTC?: () => void;
  onTipExploreSample?: () => void;
  isTipsSampleLoading?: boolean;
  /** ActionCard "Import from TestRail" handler */
  onImport?: () => void;
}

// ── Health helpers ────────────────────────────────────────────────────────────
function getHealth(passRate: number | null): { badge: string; dot: string; label: string } {
  if (passRate === null || passRate === undefined) return { badge: 'bg-slate-100 text-slate-400', dot: 'bg-slate-400', label: '—' };
  if (passRate >= 80) return { badge: 'bg-green-50 text-green-600', dot: 'bg-green-500', label: `${passRate}%` };
  if (passRate >= 50) return { badge: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500', label: `${passRate}%` };
  return { badge: 'bg-red-50 text-red-600', dot: 'bg-red-500', label: `${passRate}%` };
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
    desc: 'Create your first test case, invite a teammate, or explore with a sample project to see Testably in action.',
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
  onTrySample: () => void,
  navigate: ReturnType<typeof useNavigate>,
  onImport?: () => void,
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
      onClick: onTrySample,
    },
    {
      key: 'invite',
      title: 'Invite Teammates',
      desc: 'Collaborate with your QA team in real-time',
      icon: 'ri-user-add-line',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      showWhen: () => true,
      onClick: () => navigate('/settings?tab=members'),
    },
    {
      key: 'import',
      title: 'Import from TestRail',
      desc: 'Migrate your existing test cases in minutes',
      icon: 'ri-upload-cloud-line',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      showWhen: (c) => c <= 1,
      onClick: onImport,
    },
  ];
  return all.filter((c) => c.showWhen(count));
}

// ── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  testCaseCount,
  testRunCount,
  passRate,
  members,
  animDelay,
  onEdit,
  onDelete,
  canDelete,
}: {
  project: Project;
  testCaseCount: number;
  testRunCount: number;
  passRate?: number | null;
  members?: Array<{ initials: string; color: string; userId?: string; name?: string }>;
  animDelay: number;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canDelete?: boolean;
}) {
  const navigate = useNavigate();
  const health = getHealth(passRate ?? null);
  const visibleMembers = (members ?? []).slice(0, 4);
  const extraMembers = (members ?? []).length - visibleMembers.length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-px"
      style={{ animation: `fadeInUp 0.4s ease-out ${animDelay}ms backwards` }}
      onClick={(e) => {
        if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
        navigate(`/projects/${project.id}`);
      }}
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
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {/* Health badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${health.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`}></span>
            {health.label}
          </span>
          {/* 3-dot menu — only shown for owners/admins */}
          {(onEdit || onDelete) && canDelete !== false && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(o => !o); }}
                className="flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                style={{ width: '1.75rem', height: '1.75rem' }}
              >
                <i className="ri-more-2-fill" style={{ fontSize: '1rem' }} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 bg-white rounded-lg shadow-lg z-10"
                  style={{ top: 'calc(100% + 4px)', width: '11rem', border: '1px solid #E2E8F0' }}
                >
                  {onEdit && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onEdit(project); }}
                      className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      <i className="ri-edit-line" /> Edit
                    </button>
                  )}
                  {onDelete && (
                    canDelete !== false ? (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(project); }}
                        className="w-full text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        <i className="ri-delete-bin-line" /> Delete
                      </button>
                    ) : (
                      <div
                        title="Only project owner can delete"
                        className="w-full text-left text-sm text-gray-300 flex items-center gap-2"
                        style={{ padding: '0.5rem 1rem', cursor: 'not-allowed' }}
                      >
                        <i className="ri-delete-bin-line" /> Delete
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[0.8125rem] text-slate-500 mt-1 mb-4 line-clamp-2 leading-snug">
        {project.description || 'No description added yet.'}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <i className="ri-play-circle-line text-sm"></i>
          {testRunCount} active run{testRunCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <i className="ri-file-list-3-line text-sm"></i>
          {testCaseCount} case{testCaseCount !== 1 ? 's' : ''}
        </span>
        <span className="flex-1"></span>
        {/* Member avatars */}
        {visibleMembers.length > 0 && (
          <div className="flex items-center">
            {visibleMembers.map((m, i) => (
              <Avatar
                key={i}
                userId={m.userId}
                name={m.name}
                size="xs"
                style={{ marginLeft: i === 0 ? 0 : '-6px', border: '2px solid #fff' }}
                title={m.initials}
              />
            ))}
            {extraMembers > 0 && (
              <span className="text-[0.6875rem] text-slate-400 ml-1">+{extraMembers}</span>
            )}
          </div>
        )}
      </div>

      {/* Activity footer */}
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
  isSampleLoading,
}: {
  card: ActionCard;
  animDelay: number;
  isSampleLoading?: boolean;
}) {
  const isLoading = card.key === 'sample' && isSampleLoading;
  return (
    <div
      className="bg-white rounded-xl p-5 cursor-pointer transition-all flex flex-col items-center justify-center text-center"
      style={{
        border: '1.5px dashed #C7D2FE',
        minHeight: '190px',
        animation: `fadeInUp 0.4s ease-out ${animDelay}ms backwards`,
        opacity: isLoading ? 0.7 : 1,
      }}
      onClick={isLoading ? undefined : card.onClick}
      onMouseEnter={(e) => {
        if (isLoading) return;
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
        <i className={`${isLoading ? 'ri-loader-4-line animate-spin' : card.icon} text-xl ${card.iconColor}`}></i>
      </div>
      <div className="text-sm font-semibold text-slate-800 mb-1">
        {isLoading ? 'Creating...' : card.title}
      </div>
      <div className="text-[0.6875rem] text-slate-400 leading-snug max-w-[200px]">{card.desc}</div>
    </div>
  );
}

// ── Tips banner ──────────────────────────────────────────────────────────────
function TipsBanner({
  count,
  onDismiss,
  onPrimary,
  onSecondary,
  isSecondaryLoading,
}: {
  count: 1 | 2;
  onDismiss: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  isSecondaryLoading?: boolean;
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
        <button
          onClick={onPrimary}
          className="text-[0.6875rem] px-3 py-1.5 rounded-full font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all cursor-pointer whitespace-nowrap"
        >
          {tip.primary}
        </button>
        <button
          onClick={isSecondaryLoading ? undefined : onSecondary}
          disabled={isSecondaryLoading}
          className="text-[0.6875rem] px-3 py-1.5 rounded-full font-semibold text-indigo-600 hover:bg-indigo-100/60 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isSecondaryLoading && <i className="ri-loader-4-line animate-spin text-xs"></i>}
          {isSecondaryLoading ? 'Creating...' : tip.secondary}
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
  projectPassRates,
  projectMembers,
  onCreateProject,
  onTrySample,
  isSampleLoading,
  onEditProject,
  onDeleteProject,
  canDeleteProjectIds,
  onTipCreateTC,
  onTipExploreSample,
  isTipsSampleLoading,
  onImport,
}: SparseStateProps) {
  const navigate = useNavigate();
  const count = projects.length as 1 | 2;
  const storageKey = `testably_tips_dismissed_${count}`;
  const [tipsDismissed, setTipsDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(storageKey)
  );

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setTipsDismissed(true);
  };

  const actionCards = buildActionCards(count, onCreateProject, onTrySample, navigate, onImport);

  // All cards in one grid: project cards first, then action cards
  const totalProjectCards = projects.length;

  return (
    <div>
      {/* Tips banner */}
      {!tipsDismissed && (
        <TipsBanner
          count={count}
          onDismiss={handleDismiss}
          onPrimary={count === 1 ? onTipCreateTC : undefined}
          onSecondary={count === 1 ? onTipExploreSample : undefined}
          isSecondaryLoading={count === 1 ? isTipsSampleLoading : false}
        />
      )}

      {/* Explore Sample loading card */}
      {isTipsSampleLoading && (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '0.625rem',
            padding: '2.5rem 1.5rem',
            marginBottom: '1rem',
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: '2rem', height: '2rem',
              border: '3px solid #E2E8F0',
              borderTopColor: '#6366F1',
              borderRadius: '50%',
              marginBottom: '0.75rem',
            }}
          />
          <p className="text-[0.875rem] font-semibold text-slate-900 mb-1">Creating sample project...</p>
          <p className="text-[0.75rem] text-slate-400 max-w-xs leading-snug">
            Setting up 'Sample E-commerce App' with test cases, milestones, and test runs.
          </p>
        </div>
      )}

      {/* Unified grid: projects + action cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
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
            passRate={projectPassRates?.[project.id] ?? null}
            members={projectMembers?.[project.id] ?? []}
            animDelay={i * 50}
            onEdit={onEditProject}
            onDelete={onDeleteProject}
            canDelete={canDeleteProjectIds ? canDeleteProjectIds.has(project.id) : true}
          />
        ))}

        {/* Action cards */}
        {actionCards.map((card, i) => (
          <ActionCard
            key={card.key}
            card={card}
            animDelay={(totalProjectCards + i) * 50}
            isSampleLoading={isSampleLoading}
          />
        ))}
      </div>
    </div>
  );
}
