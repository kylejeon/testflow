/**
 * VsHero — Hero section for /compare/{a}-vs-{b} vs-matrix pages.
 *
 * Design spec §1.2 + §2.3:
 *   - Dark slate-900 canvas with two glow blobs
 *   - Pill label ("Tool Comparison" by default)
 *   - H1 (text-4xl md:text-6xl extrabold white)
 *   - Subhead (slate-400 max-w-2xl)
 *   - Two competitor cards (bg-white/[0.04]) side-by-side on md+, stacked on mobile
 *   - "vs" badge between cards — absolute centered on md+, inline row on mobile
 *   - Intro paragraph (200+ words) below cards
 *
 * Intentionally no CTA buttons inside the hero — vs-matrix pages keep the hero
 * neutral and surface CTAs in the "Why Testably Wins" + Bottom CTA sections.
 */

export interface VsCompetitor {
  name: string;
  /** Remix Icon class. Default "ri-flask-line" / "ri-scales-3-line". */
  iconClass?: string;
  /** Price label rendered below the name (e.g. "from $36/user/month"). */
  priceLabel: string;
  /** 2~3 single-sentence bullets summarizing strengths/limits. */
  bullets: string[];
}

export interface VsHeroProps {
  pillLabel?: string;
  pillIcon?: string;
  h1: string;
  subhead: string;
  /** 200+ word intro paragraph rendered below the versus cards (SEO copy). */
  intro: string;
  competitorA: VsCompetitor;
  competitorB: VsCompetitor;
}

function CompetitorCard({
  competitor,
  defaultIcon,
}: {
  competitor: VsCompetitor;
  defaultIcon: string;
}) {
  return (
    <article className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
      <div
        className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <i className={`${competitor.iconClass ?? defaultIcon} text-indigo-300 text-xl`}></i>
      </div>
      <h3 className="text-xl font-bold text-white mb-1">{competitor.name}</h3>
      <p className="text-sm text-slate-400 mb-3">{competitor.priceLabel}</p>
      <ul className="space-y-1.5">
        {competitor.bullets.map((bullet) => (
          <li key={bullet} className="text-xs text-slate-300 flex items-start gap-1.5 text-left">
            <i
              className="ri-circle-fill text-indigo-400 text-[6px] mt-1.5 flex-shrink-0"
              aria-hidden="true"
            ></i>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function VsHero({
  pillLabel = 'Tool Comparison',
  pillIcon = 'ri-scales-3-line',
  h1,
  subhead,
  intro,
  competitorA,
  competitorB,
}: VsHeroProps) {
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

        <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
          {subhead}
        </p>

        {/* Versus cards. md+: 2-col with absolute vs badge centered.
            mobile: 1-col stack with inline "vs" badge between. */}
        <div className="relative max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-10">
          <CompetitorCard competitor={competitorA} defaultIcon="ri-flask-line" />

          {/* Mobile inline vs badge */}
          <div className="md:hidden flex items-center justify-center -my-1">
            <span
              className="w-12 h-12 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]"
              aria-label="versus"
            >
              vs
            </span>
          </div>

          <CompetitorCard competitor={competitorB} defaultIcon="ri-scales-3-line" />

          {/* Desktop absolute vs badge */}
          <span
            className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-indigo-500 text-white font-bold items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] z-10"
            aria-label="versus"
          >
            vs
          </span>
        </div>

        <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto text-left">
          {intro}
        </p>
      </div>
    </section>
  );
}
