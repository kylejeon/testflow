// f025 — Temporary placeholder component used until Desi delivers the final
// SVG illustrations. Each `kind` renders a soft tinted tile with a primary
// Remix icon + an optional small secondary icon offset to the top-right.
//
// When the real SVGs land, consumers swap:
//   <IllustrationPlaceholder kind="milestones" />
// for:
//   <MilestonesIllustration />
// (one-line change, everything else remains).

export type IllustrationPlaceholderKind =
  | 'testcases'
  | 'runs'
  | 'milestones'
  | 'sessions'
  | 'requirements'
  | 'nothing';

interface KindConfig {
  bg: string;
  fg: string;
  primary: string;
  secondary?: string;
}

const KIND_MAP: Record<IllustrationPlaceholderKind, KindConfig> = {
  testcases: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    fg: 'text-indigo-500 dark:text-indigo-400',
    primary: 'ri-clipboard-line',
    secondary: 'ri-sparkling-2-line',
  },
  runs: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    fg: 'text-emerald-500 dark:text-emerald-400',
    primary: 'ri-play-circle-line',
    secondary: 'ri-check-line',
  },
  milestones: {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    fg: 'text-violet-500 dark:text-violet-400',
    primary: 'ri-flag-2-line',
    secondary: 'ri-sparkling-2-line',
  },
  sessions: {
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    fg: 'text-cyan-500 dark:text-cyan-400',
    primary: 'ri-compass-3-line',
    secondary: 'ri-search-2-line',
  },
  requirements: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    fg: 'text-amber-500 dark:text-amber-400',
    primary: 'ri-file-list-3-line',
    secondary: 'ri-links-line',
  },
  nothing: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    fg: 'text-slate-400 dark:text-slate-500',
    primary: 'ri-inbox-line',
  },
};

interface IllustrationPlaceholderProps {
  kind: IllustrationPlaceholderKind;
  className?: string;
}

export default function IllustrationPlaceholder({
  kind,
  className = '',
}: IllustrationPlaceholderProps) {
  const c = KIND_MAP[kind];
  return (
    <div
      aria-hidden="true"
      className={`relative w-24 h-24 rounded-2xl flex items-center justify-center ${c.bg} ${className}`}
    >
      <i className={`${c.primary} ${c.fg} text-5xl`} aria-hidden="true" />
      {c.secondary && (
        <i
          className={`${c.secondary} ${c.fg} absolute -top-2 -right-2 text-xl opacity-80`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
