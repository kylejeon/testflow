/**
 * /compare/:a-vs-:b — vs-matrix landing page.
 *
 * 7-section layout (design spec §1.2):
 *   A. VsHero (slate-900, two competitor cards + intro paragraph)
 *   B. 3-way Feature Matrix (white)
 *   C. 3-way Pricing Matrix (gray-50)
 *   D. Both Have Limitations (white, light KeyDifference cards labelled by side)
 *   E. Why Testably Wins (slate-900, dark KeyDifference cards)
 *   F. FAQ (white, JSON-LD FAQPage injected)
 *   G. BottomCTASection (slate-900)
 *
 * Slug resolution:
 *   - Already handled upstream in compare/page.tsx — vs-matrix.tsx is only
 *     rendered after the page detects "-vs-" in the slug, validated alphabetical
 *     ordering (or 301-redirected), and looked up VS_MATRIX[slug].
 */

import { Link } from 'react-router-dom';
import MarketingHeader from '../../components/marketing/MarketingHeader';
import MarketingFooter from '../../components/marketing/MarketingFooter';
import SEOHead from '../../components/SEOHead';
import VsHero from '../../components/seo/VsHero';
import ComparisonTable from '../../components/seo/ComparisonTable';
import KeyDifferenceCard from '../../components/seo/KeyDifferenceCard';
import FaqSection from '../../components/seo/FaqSection';
import BottomCTASection from '../../components/seo/BottomCTASection';
import type { VsMatrixData, CompetitorData } from '../../data/competitors/types';

export interface VsMatrixPageProps {
  data: VsMatrixData;
  /** Competitor A's full record (for name, pricing label, bullets). */
  competitorA: CompetitorData;
  /** Competitor B's full record. */
  competitorB: CompetitorData;
}

/** ISO yyyy-mm-dd → "May 2026" for display. */
function formatLastReviewed(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Pull a short "from $X/user/month"-style label out of competitor data. */
function priceLabelFor(competitor: CompetitorData): string {
  // Prefer the first paid row that has a price label distinct from N/A.
  const firstPaidRow = competitor.pricingRows.find(
    (r) =>
      r.competitor.price &&
      r.competitor.price !== 'N/A' &&
      r.competitor.price !== 'No free tier',
  );
  if (firstPaidRow) {
    return `from ${firstPaidRow.competitor.price}`;
  }
  return competitor.savingsCallout ? '' : '';
}

/** Pull 3 short bullets from competitor data: tagline + first two keyDifferences. */
function bulletsFor(competitor: CompetitorData): string[] {
  const bullets: string[] = [];
  if (competitor.tagline) bullets.push(competitor.tagline);
  for (const diff of competitor.keyDifferences.slice(0, 2)) {
    bullets.push(diff.title);
  }
  return bullets.slice(0, 3);
}

const ICON_BY_SLUG: Record<string, string> = {
  practitest: 'ri-shield-check-line',
  qase: 'ri-questionnaire-line',
  testpad: 'ri-list-check-2',
  testrail: 'ri-flask-line',
  xray: 'ri-bug-line',
  zephyr: 'ri-scales-3-line',
};

export default function VsMatrixPage({ data, competitorA, competitorB }: VsMatrixPageProps) {
  const canonical = `https://testably.app/compare/${data.slug}`;

  // JSON-LD FAQPage. (FaqSection injects this too, but we also pass it to
  // SEOHead so the prerendered HTML carries it without depending on the
  // useEffect roundtrip.)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const limitationsA = data.bothLimitations.filter((l) => l.competitor === 'a');
  const limitationsB = data.bothLimitations.filter((l) => l.competitor === 'b');

  return (
    <>
      <SEOHead
        title={data.metaTitle}
        description={data.metaDescription}
        keywords={data.metaKeywords.join(', ')}
        ogTitle={data.metaTitle}
        ogDescription={data.metaDescription}
        ogUrl={canonical}
        canonical={canonical}
        structuredData={structuredData}
      />
      <div
        className="min-h-screen bg-white"
        style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}
      >
        <MarketingHeader />
        <main id="main-content">

          {/* A. VsHero */}
          <VsHero
            h1={data.h1}
            subhead={data.subhead}
            intro={data.introBody}
            competitorA={{
              name: competitorA.name,
              iconClass: ICON_BY_SLUG[competitorA.slug] ?? 'ri-flask-line',
              priceLabel: priceLabelFor(competitorA),
              bullets: bulletsFor(competitorA),
            }}
            competitorB={{
              name: competitorB.name,
              iconClass: ICON_BY_SLUG[competitorB.slug] ?? 'ri-scales-3-line',
              priceLabel: priceLabelFor(competitorB),
              bullets: bulletsFor(competitorB),
            }}
          />

          {/* B. 3-way Feature Matrix */}
          <section className="py-20 px-4 bg-white">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                At a Glance: Feature Comparison
              </h2>
              <p className="text-center text-gray-500 mb-12">
                Testably vs {competitorA.name} vs {competitorB.name}, side by side.
              </p>
              <ComparisonTable
                variant="three-col"
                headers={{
                  feature: 'Feature',
                  testably: 'Testably',
                  competitorA: competitorA.name,
                  competitorB: competitorB.name,
                }}
                rows={data.featureMatrix}
                caption={`Last updated: ${formatLastReviewed(data.lastReviewed)}. Feature availability may vary by plan.`}
              />
            </div>
          </section>

          {/* C. 3-way Pricing Matrix */}
          <section className="py-20 px-4 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                Pricing at Common Team Sizes
              </h2>
              <p className="text-center text-gray-500 mb-12">
                What each option costs from a small QA team to enterprise scale.
              </p>
              <ComparisonTable
                variant="three-col"
                headers={{
                  feature: 'Plan',
                  testably: 'Testably',
                  competitorA: competitorA.name,
                  competitorB: competitorB.name,
                }}
                rows={data.pricingMatrix.map((row) => ({
                  feature: row.plan,
                  testably: row.testably.price,
                  a: row.a.price,
                  b: row.b.price,
                }))}
                renderCell={(value, column) => {
                  // Find the matching pricing row by price label to recover the detail string.
                  const match = data.pricingMatrix.find(
                    (r) =>
                      (column === 'testably' && r.testably.price === value) ||
                      (column === 'a' && r.a.price === value) ||
                      (column === 'b' && r.b.price === value),
                  );
                  const detail = match
                    ? column === 'testably'
                      ? match.testably.detail
                      : column === 'a'
                        ? match.a.detail
                        : match.b.detail
                    : undefined;
                  return (
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          column === 'testably' ? 'text-indigo-700' : 'text-gray-700'
                        }`}
                      >
                        {value}
                      </p>
                      {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
                    </div>
                  );
                }}
                caption={`Prices as of ${formatLastReviewed(data.lastReviewed)}. See each vendor's official site for the latest pricing.`}
              />
            </div>
          </section>

          {/* D. Both Have Limitations */}
          <section className="py-20 px-4 bg-white">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                Both {competitorA.name} and {competitorB.name} Have Real Gaps
              </h2>
              <p className="text-center text-gray-500 mb-12">
                Where each one falls short — and why teams keep looking for an alternative.
              </p>
              {limitationsA.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <i
                      className={`${ICON_BY_SLUG[competitorA.slug] ?? 'ri-flask-line'} text-indigo-500`}
                      aria-hidden="true"
                    ></i>
                    {competitorA.name}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {limitationsA.map((item) => (
                      <KeyDifferenceCard
                        key={item.title}
                        title={item.title}
                        body={item.body}
                        variant="light"
                      />
                    ))}
                  </div>
                </div>
              )}
              {limitationsB.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <i
                      className={`${ICON_BY_SLUG[competitorB.slug] ?? 'ri-scales-3-line'} text-indigo-500`}
                      aria-hidden="true"
                    ></i>
                    {competitorB.name}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {limitationsB.map((item) => (
                      <KeyDifferenceCard
                        key={item.title}
                        title={item.title}
                        body={item.body}
                        variant="light"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* E. Why Testably Wins */}
          {data.testablyWins.length > 0 && (
            <section className="relative py-20 px-4 bg-slate-900 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px]"></div>
              </div>
              <div className="relative z-10 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  Why Teams Skip Both and Pick Testably
                </h2>
                <p className="text-center text-slate-400 mb-12">
                  The third option most QA teams end up choosing.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                  {data.testablyWins.map((item, i) => (
                    <KeyDifferenceCard
                      key={item.title}
                      number={String(i + 1).padStart(2, '0')}
                      title={item.title}
                      body={item.body}
                      variant="dark"
                    />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to={`/compare/${competitorA.slug}`}
                    className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/80 hover:border-white/20 hover:text-white font-medium px-5 py-2.5 rounded-full backdrop-blur-sm text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Compare Testably to {competitorA.name}
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </Link>
                  <Link
                    to={`/compare/${competitorB.slug}`}
                    className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/80 hover:border-white/20 hover:text-white font-medium px-5 py-2.5 rounded-full backdrop-blur-sm text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Compare Testably to {competitorB.name}
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* F. FAQ */}
          {data.faqs.length > 0 && (
            <section className="py-20 px-4 bg-white">
              <FaqSection faqs={data.faqs} />
            </section>
          )}

          {/* G. Bottom CTA */}
          <BottomCTASection
            heading="Don't pick between two compromises"
            subhead={`Start Testably free. Migrate from ${competitorA.name} or ${competitorB.name} in under an hour.`}
            primaryCta={{ label: 'Start Testably free', href: 'https://app.testably.io/signup' }}
            secondaryCta={{ label: 'See all comparisons', to: '/compare' }}
          />

        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
