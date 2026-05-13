/**
 * AlternativesArticleLayout — Shared layout for the 11 alternatives blog posts.
 *
 * Each /blog/{slug}-alternatives-2026 page passes its unique copy and ranked
 * tool list into this layout. The layout handles SEO meta, hero, TOC, the
 * ranked card list, comparison table, conclusion, FAQ + JSON-LD, and bottom
 * CTA — keeping per-page files small and content-focused.
 *
 * Mirrors the visual pattern from src/pages/blog/choosing-test-management-tool/page.tsx.
 */

import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../../components/SEOHead';
import MarketingFooter from '../../../components/marketing/MarketingFooter';
import MarketingHeader from '../../../components/marketing/MarketingHeader';
import RankedToolCard from '../../../components/seo/RankedToolCard';
import FaqSection from '../../../components/seo/FaqSection';

export interface RankedTool {
  rank: number;
  name: string;
  bestFor: string;
  pricing: string;
  pros: string[];
  cons: string[];
  cta?: { label: string; href: string };
  isTestably?: boolean;
  iconClass?: string;
}

export interface SummaryRow {
  name: string;
  bestFor: string;
  pricing: string;
  aiGen: string;
  cicdSdk: string;
  trialPlan: string;
  highlight?: boolean;
}

export interface AlternativesArticleProps {
  /** URL slug (matches the path: /blog/{slug}) */
  slug: string;
  /** Headline / og:title content */
  metaTitle: string;
  metaDescription: string;
  /** ISO date string (YYYY-MM-DD) used in JSON-LD and hero. */
  publishDate: string;
  /** Read time label, e.g. "8 min read". */
  readTime: string;
  /** Hero category pill text. */
  category: string;
  /** Pill icon (Remix Icon class). */
  categoryIcon: string;
  /** Hero H1. Must be unique per page. Optional second-line span gets gradient. */
  heroH1Plain: string;
  heroH1Highlight?: string;
  /** Hero subhead paragraph. */
  heroSubhead: string;
  /** Intro paragraphs (HTML allowed inside, rendered raw). */
  intro: string[];
  /** "Why teams look for alternatives" bullets, 4-6 items. */
  whyLookForAlternatives: { title: string; body: string }[];
  /** Top N alternatives list (ranked). Testably should typically be rank 1. */
  rankedTools: RankedTool[];
  /** Summary comparison table rows. */
  summary: SummaryRow[];
  /** "Why Testably stands out" 3 bullets. */
  testablyAdvantages: { title: string; body: string }[];
  /** Migration steps (3-5 steps). */
  migrationSteps: { title: string; body: string }[];
  /** FAQ items. */
  faqs: { question: string; answer: string }[];
  /** Bottom CTA heading. */
  ctaHeading: string;
  ctaSubhead: string;
  /** Optional related-read links shown above bottom CTA. */
  relatedReads?: { label: string; to: string }[];
}

export default function AlternativesArticleLayout({
  slug,
  metaTitle,
  metaDescription,
  publishDate,
  readTime,
  category,
  categoryIcon,
  heroH1Plain,
  heroH1Highlight,
  heroSubhead,
  intro,
  whyLookForAlternatives,
  rankedTools,
  summary,
  testablyAdvantages,
  migrationSteps,
  faqs,
  ctaHeading,
  ctaSubhead,
  relatedReads,
}: AlternativesArticleProps) {
  const navigate = useNavigate();
  const url = `https://testably.app/blog/${slug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: metaTitle,
    description: metaDescription,
    url,
    datePublished: publishDate,
    dateModified: publishDate,
    author: { '@type': 'Organization', name: 'Testably' },
    publisher: {
      '@type': 'Organization',
      name: 'Testably',
      logo: {
        '@type': 'ImageObject',
        url: 'https://testably.app/brand/og-dark-1200x630.png',
      },
    },
    image: 'https://testably.app/brand/og-dark-1200x630.png',
  };

  // Pretty-print the publish date for the hero meta strip.
  const prettyDate = new Date(publishDate + 'T00:00:00Z').toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' },
  );

  return (
    <>
      <SEOHead
        title={`${metaTitle} | Testably`}
        description={metaDescription}
        canonical={url}
        ogUrl={url}
        ogType="article"
        structuredData={structuredData}
      />

      <div
        className="min-h-screen bg-white"
        style={{ fontFamily: '"Inter", sans-serif' }}
      >
        <MarketingHeader />

        {/* Hero */}
        <section className="bg-slate-900 pt-32 pb-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Link
                to="/"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Home
              </Link>
              <i className="ri-arrow-right-s-line text-slate-600 text-sm"></i>
              <Link
                to="/blog"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Blog
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <i className={`${categoryIcon} text-indigo-400 text-sm`}></i>
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                {category}
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-black text-white mb-6"
              style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              {heroH1Plain}
              {heroH1Highlight && (
                <>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                    {heroH1Highlight}
                  </span>
                </>
              )}
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              {heroSubhead}
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <i className="ri-time-line"></i> {readTime}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="ri-calendar-line"></i> {prettyDate}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="ri-user-line"></i> Testably Team
              </span>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              In this article
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="#why"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">01</span>
                Why teams look for alternatives
              </a>
              <a
                href="#ranking"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">02</span>
                Top {rankedTools.length} alternatives ranked
              </a>
              <a
                href="#summary"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">03</span>
                Side-by-side comparison
              </a>
              <a
                href="#testably"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">04</span>
                Why Testably stands out
              </a>
              <a
                href="#migration"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">05</span>
                How to migrate
              </a>
              <a
                href="#faq"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
              >
                <span className="text-xs font-bold text-indigo-400 w-6">06</span>
                FAQ
              </a>
            </div>
          </div>
        </section>

        {/* Body */}
        <article className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Intro */}
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
              {intro.map((para, i) => (
                <p
                  key={i}
                  className={i === 0 ? 'text-lg' : 'mt-4'}
                  dangerouslySetInnerHTML={{ __html: para }}
                />
              ))}
            </div>

            {/* Why look for alternatives */}
            <section id="why" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-question-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Section 01
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    Why teams look for alternatives
                  </h2>
                </div>
              </div>
              <div className="pl-14 space-y-4">
                {whyLookForAlternatives.map((item) => (
                  <div
                    key={item.title}
                    className="border-l-2 border-indigo-200 pl-4 py-1"
                  >
                    <h3 className="text-base font-bold text-gray-900 mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Ranking */}
            <section id="ranking" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-trophy-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Section 02
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    Top {rankedTools.length} alternatives ranked
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Evaluated as of May 2026 across pricing, features, AI, CI/CD, and migration cost.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                {rankedTools.map((tool) => (
                  <RankedToolCard key={tool.rank} {...tool} />
                ))}
              </div>
            </section>

            {/* Summary comparison */}
            <section id="summary" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-table-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Section 03
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    Side-by-side comparison
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-5 py-4 font-semibold text-gray-500 w-32">
                        Tool
                      </th>
                      <th className="text-left px-5 py-4 font-semibold text-gray-500">
                        Best for
                      </th>
                      <th className="text-center px-4 py-4 font-semibold text-gray-500">
                        Pricing
                      </th>
                      <th className="text-center px-4 py-4 font-semibold text-gray-500">
                        AI gen
                      </th>
                      <th className="text-center px-4 py-4 font-semibold text-gray-500">
                        CI/CD SDK
                      </th>
                      <th className="text-center px-4 py-4 font-semibold text-gray-500">
                        Free / trial
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, i) => (
                      <tr
                        key={row.name}
                        className={`border-b border-gray-100 ${
                          row.highlight
                            ? 'bg-indigo-50/40'
                            : i % 2 === 0
                              ? 'bg-white'
                              : 'bg-gray-50/30'
                        }`}
                      >
                        <td
                          className={`px-5 py-4 font-bold ${
                            row.highlight ? 'text-indigo-700' : 'text-gray-900'
                          }`}
                        >
                          {row.name}
                          {row.highlight && (
                            <span className="block text-xs font-normal text-indigo-400">
                              Recommended
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs leading-relaxed">
                          {row.bestFor}
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-gray-600">
                          {row.pricing}
                        </td>
                        <td
                          className={`px-4 py-4 text-center text-xs font-medium ${
                            row.aiGen === 'Yes'
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {row.aiGen}
                        </td>
                        <td
                          className={`px-4 py-4 text-center text-xs font-medium ${
                            row.cicdSdk === 'Yes'
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {row.cicdSdk}
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-gray-600">
                          {row.trialPlan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Pricing and feature data as of May 2026. See vendor sites for current terms.
              </p>
            </section>

            {/* Why Testably wins */}
            <section id="testably" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-sparkling-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Section 04
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    Why Testably stands out
                  </h2>
                </div>
              </div>
              <div className="pl-14 space-y-5">
                {testablyAdvantages.map((adv) => (
                  <div key={adv.title}>
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 flex items-center gap-2">
                      <i className="ri-check-double-line text-indigo-500"></i>
                      {adv.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {adv.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Migration */}
            <section id="migration" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-arrow-left-right-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Section 05
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">
                    How to migrate
                  </h2>
                </div>
              </div>
              <div className="pl-14 space-y-4">
                {migrationSteps.map((step, i) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mt-20 scroll-mt-20">
              <FaqSection faqs={faqs} heading="Frequently asked questions" />
            </section>

            {/* Related */}
            {relatedReads && relatedReads.length > 0 && (
              <section className="mt-16 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                  Related resources
                </h3>
                <ul className="space-y-2">
                  {relatedReads.map((r) => (
                    <li key={r.to}>
                      <Link
                        to={r.to}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <i className="ri-arrow-right-line text-xs"></i>
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </article>

        {/* CTA */}
        <section className="py-20 px-4 bg-slate-900">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">{ctaHeading}</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">{ctaSubhead}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-4 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                View Pricing
              </button>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
