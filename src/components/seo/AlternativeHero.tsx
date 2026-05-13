/**
 * AlternativeHero — Hero section for /alternatives/{slug} pages.
 *
 * Design spec §1.1.A + §2.3:
 *   - Dark slate-900 canvas
 *   - Pill label ("Alternative") with indigo accent
 *   - H1 (text-4xl md:text-6xl extrabold white)
 *   - Subhead (slate-400 max-w-2xl)
 *   - Optional indigo glass savings callout
 *   - Two CTAs: indigo-glow primary + ghost secondary
 */

import { Link } from 'react-router-dom';

export interface AlternativeHeroProps {
  /** Pill label, default "Alternative" */
  pillLabel?: string;
  /** Remix Icon class for the pill icon. Default ri-arrow-left-right-line. */
  pillIcon?: string;
  /** H1 — alternativePageData.h1 */
  h1: string;
  /** Subhead text — alternativePageData.subhead */
  subhead: string;
  /** Optional savings callout. Hidden when empty. */
  savingsCallout?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; to: string };
}

export default function AlternativeHero({
  pillLabel = 'Alternative',
  pillIcon = 'ri-arrow-left-right-line',
  h1,
  subhead,
  savingsCallout,
  primaryCta,
  secondaryCta,
}: AlternativeHeroProps) {
  return (
    <section className="relative bg-slate-900 pt-32 pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.07] blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
          <i className={`${pillIcon} text-indigo-400 text-sm`} aria-hidden="true"></i>
          <span className="text-indigo-300/90 text-sm font-medium">{pillLabel}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
          {h1}
        </h1>

        <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
          {subhead}
        </p>

        {savingsCallout && (
          <div className="inline-block bg-indigo-900/40 border border-indigo-500/40 rounded-xl px-6 py-4 text-indigo-200 text-sm max-w-xl mb-10 backdrop-blur-sm">
            {savingsCallout}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={primaryCta.href}
            className="inline-flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-4 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {primaryCta.label}
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20">
              <i className="ri-arrow-right-line text-sm" aria-hidden="true"></i>
            </span>
          </a>
          {secondaryCta && (
            <Link
              to={secondaryCta.to}
              className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/80 hover:border-white/20 hover:text-white font-semibold px-8 py-4 rounded-full backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
