/**
 * BottomCTASection — Dark slate-900 footer CTA section used at the bottom of
 * /alternatives/{slug} pages. Mirrors the bottom CTA pattern from
 * /compare/{slug} page.
 */

import { Link } from 'react-router-dom';

export interface BottomCTASectionProps {
  heading: string;
  subhead?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; to: string };
}

export default function BottomCTASection({
  heading,
  subhead,
  primaryCta,
  secondaryCta,
}: BottomCTASectionProps) {
  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{heading}</h2>
        {subhead && (
          <p className="text-slate-400 mb-10 max-w-xl mx-auto">{subhead}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
