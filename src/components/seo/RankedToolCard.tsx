/**
 * RankedToolCard — Ranked tool comparison card used in /blog/{slug}-alternatives-2026
 * ranking lists. Testably gets an indigo-gradient Editor's Pick treatment when
 * `isTestably` is true; everything else gets a neutral white card.
 *
 * Design spec: docs/specs/design-spec-seo-competitor-pages.md §2.3 RankedToolCard
 */

export interface RankedToolCardProps {
  rank: number;
  name: string;
  bestFor: string;
  pricing: string;
  pros: string[];
  cons: string[];
  cta?: { label: string; href: string };
  /** Render as Testably Editor's Pick (indigo gradient + badge). */
  isTestably?: boolean;
  /** Optional Remix Icon class shown in the title badge (e.g. "ri-flask-line"). */
  iconClass?: string;
}

export default function RankedToolCard({
  rank,
  name,
  bestFor,
  pricing,
  pros,
  cons,
  cta,
  isTestably,
  iconClass,
}: RankedToolCardProps) {
  const baseClass = isTestably
    ? 'relative bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 shadow-md'
    : 'bg-white border border-gray-200 shadow-sm';

  return (
    <div className={`rounded-2xl p-6 lg:p-8 ${baseClass}`}>
      {isTestably && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider">
          <i className="ri-star-fill text-[10px]"></i>
          Editor&apos;s Pick
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold ${
            isTestably
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`text-xl font-bold flex items-center gap-2 ${
              isTestably ? 'text-indigo-900' : 'text-gray-900'
            }`}
          >
            {iconClass && <i className={`${iconClass} text-base`}></i>}
            {name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-600">Best for:</span> {bestFor}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-600">Pricing:</span> {pricing}
          </p>
        </div>
      </div>

      {/* Pros / Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Pros
          </p>
          <ul className="space-y-1.5">
            {pros.map((p) => (
              <li
                key={p}
                className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed"
              >
                <i className="ri-check-line text-emerald-500 mt-0.5 flex-shrink-0"></i>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2">
            Cons
          </p>
          <ul className="space-y-1.5">
            {cons.map((c) => (
              <li
                key={c}
                className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed"
              >
                <i className="ri-close-line text-rose-500 mt-0.5 flex-shrink-0"></i>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      {cta && (
        <div className="mt-5 pt-5 border-t border-gray-200/70">
          <a
            href={cta.href}
            className={`inline-flex items-center gap-1 text-sm font-semibold transition-colors ${
              isTestably
                ? 'text-indigo-600 hover:text-indigo-700'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
            {...(cta.href.startsWith('http')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {cta.label}
            <i className="ri-arrow-right-line text-xs"></i>
          </a>
        </div>
      )}
    </div>
  );
}
