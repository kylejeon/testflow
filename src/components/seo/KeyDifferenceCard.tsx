/**
 * KeyDifferenceCard — Light / Dark variant card for "Why Leave" / "Why Switch"
 * sections on /alternatives/{slug}.
 *
 * Visual: extracted from /compare/{slug} Key Differences grid so dark sections
 * (slate-900 canvases) can reuse the same component with inverted colors.
 */

export interface KeyDifferenceCardProps {
  /** "01" prefix for the numbered list. Omitted means no number badge. */
  number?: string;
  title: string;
  body: string;
  /** light: white bg sections.  dark: slate-900 sections. */
  variant: 'light' | 'dark';
}

export default function KeyDifferenceCard({
  number,
  title,
  body,
  variant,
}: KeyDifferenceCardProps) {
  if (variant === 'dark') {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm hover:border-indigo-500/20 hover:-translate-y-0.5 transition-all duration-300">
        {number && (
          <p className="text-indigo-400 font-bold text-sm mb-3 tracking-wider">{number}</p>
        )}
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{body}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-indigo-500/20 hover:-translate-y-0.5 transition-all duration-300">
      {number && (
        <p className="text-indigo-500 font-bold text-sm mb-3 tracking-wider">{number}</p>
      )}
      <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
