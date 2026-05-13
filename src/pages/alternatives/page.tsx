/**
 * /alternatives/:competitor — Alternative landing page.
 *
 * 8-section layout (design spec §1.1):
 *   A. AlternativeHero (slate-900)
 *   B. Why Teams Are Leaving {X}  (white, light KeyDifference cards)
 *   C. Why Testably wins          (slate-900, dark KeyDifference cards)
 *   D. Feature Comparison Table   (white)
 *   E. Pricing Comparison Table   (gray-50)
 *   F. Migration Guide            (white)
 *   G. FAQ                        (white, JSON-LD FAQPage injected)
 *   H. BottomCTASection           (slate-900)
 *
 * Slug resolution:
 *   - useParams() → competitor slug
 *   - COMPETITORS[slug] must exist AND data.alternativePageData must exist;
 *     otherwise NotFound (noindex).
 */

import { Link, useParams } from 'react-router-dom';
import MarketingHeader from '../../components/marketing/MarketingHeader';
import MarketingFooter from '../../components/marketing/MarketingFooter';
import SEOHead from '../../components/SEOHead';
import AlternativeHero from '../../components/seo/AlternativeHero';
import KeyDifferenceCard from '../../components/seo/KeyDifferenceCard';
import ComparisonTable from '../../components/seo/ComparisonTable';
import MigrationGuide from '../../components/seo/MigrationGuide';
import FaqSection from '../../components/seo/FaqSection';
import BottomCTASection from '../../components/seo/BottomCTASection';
import { COMPETITORS } from '../../data/competitors';

function NotFoundScreen() {
  return (
    <>
      <SEOHead
        title="Alternative not found — Testably"
        description="The alternative comparison page you are looking for does not exist."
        noindex
      />
      <div
        className="min-h-screen bg-white flex flex-col"
        style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}
      >
        <MarketingHeader />
        <main id="main-content" className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-20">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h1>
            <p className="text-gray-500 mb-8">
              This alternative comparison page doesn&apos;t exist yet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/" className="text-indigo-600 hover:underline font-semibold">
                Back to home
              </Link>
              <Link to="/compare" className="text-indigo-600 hover:underline font-semibold">
                See all comparisons
              </Link>
            </div>
          </div>
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

export default function AlternativePage() {
  const { competitor } = useParams<{ competitor: string }>();
  const data = competitor ? COMPETITORS[competitor] : undefined;

  // Graceful block — alternativePageData missing means content isn't ready
  // for this competitor; surface NotFound instead of an empty page.
  if (!data || !data.alternativePageData) {
    return <NotFoundScreen />;
  }

  const alt = data.alternativePageData;
  const canonical = `https://testably.app/alternatives/${data.slug}`;
  const faqs = alt.faqs && alt.faqs.length > 0 ? alt.faqs : data.faqs;

  // JSON-LD: FAQPage + SoftwareApplication (Testably).
  // Note: aggregateRating intentionally omitted until real review data exists
  // (dev spec §8-2 warning).
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Testably',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={alt.metaTitle}
        description={alt.metaDescription}
        keywords={data.metaKeywords.join(', ')}
        ogTitle={alt.metaTitle}
        ogDescription={alt.metaDescription}
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

          {/* A. Hero */}
          <AlternativeHero
            h1={alt.h1}
            subhead={alt.subhead}
            savingsCallout={data.savingsCallout}
            primaryCta={{ label: 'Start free trial', href: 'https://app.testably.io/signup' }}
            secondaryCta={{ label: 'Compare pricing', to: '/pricing' }}
          />

          {/* Intro paragraph — unique copy for SEO (5-gram diversity) */}
          {alt.introBody && (
            <section className="bg-white py-16 px-4">
              <div className="max-w-3xl mx-auto">
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  {alt.introBody}
                </p>
              </div>
            </section>
          )}

          {/* B. Why Teams Are Leaving {X} — light KeyDifference cards */}
          {alt.whyLeave && alt.whyLeave.length > 0 && (
            <section className="py-20 px-4 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                  Why Teams Are Leaving {data.name}
                </h2>
                <p className="text-center text-gray-500 mb-12">
                  The pain points that drive QA teams to switch.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {alt.whyLeave.map((item, i) => (
                    <KeyDifferenceCard
                      key={item.title}
                      number={String(i + 1).padStart(2, '0')}
                      title={item.title}
                      body={item.body}
                      variant="light"
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* C. Why Switch to Testably — dark KeyDifference cards */}
          {alt.whySwitch && alt.whySwitch.length > 0 && (
            <section className="relative py-20 px-4 bg-slate-900 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px]"></div>
              </div>
              <div className="relative z-10 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  Why Teams Pick Testably Instead
                </h2>
                <p className="text-center text-slate-400 mb-12">
                  The five things you get when you switch from {data.name}.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {alt.whySwitch.map((item, i) => (
                    <KeyDifferenceCard
                      key={item.title}
                      number={String(i + 1).padStart(2, '0')}
                      title={item.title}
                      body={item.body}
                      variant="dark"
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* D. Feature Comparison Table */}
          <section className="py-20 px-4 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                Feature Comparison
              </h2>
              <p className="text-center text-gray-500 mb-12">
                Testably vs {data.name}, side by side.
              </p>
              <ComparisonTable
                headers={{
                  feature: 'Feature',
                  testably: 'Testably',
                  competitor: data.name,
                }}
                rows={data.features}
                caption={
                  data.lastReviewed
                    ? `Last updated: ${formatLastReviewed(data.lastReviewed)}. Feature availability may vary by plan.`
                    : 'Feature availability may vary by plan.'
                }
              />
            </div>
          </section>

          {/* E. Pricing Comparison Table */}
          <section className="py-20 px-4 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
                Pricing Comparison
              </h2>
              <p className="text-center text-gray-500 mb-12">
                Testably&apos;s flat-rate plans vs {data.name}&apos;s pricing.
              </p>
              <ComparisonTable
                headers={{
                  feature: 'Plan',
                  testably: 'Testably',
                  competitor: data.name,
                }}
                rows={data.pricingRows.map((row) => ({
                  feature: row.plan,
                  testably: row.testably.price,
                  competitor: row.competitor.price,
                }))}
                renderCell={(value, isTestably) => {
                  // For pricing rows we recover the matching pricingRow detail
                  // by string match (price label is unique per row in our data).
                  // This keeps the table cell richer than a single ✓/✗ icon.
                  const match = data.pricingRows.find(
                    (r) => (isTestably ? r.testably.price : r.competitor.price) === value,
                  );
                  const detail = match
                    ? isTestably
                      ? match.testably.detail
                      : match.competitor.detail
                    : undefined;
                  return (
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          isTestably ? 'text-indigo-700' : 'text-gray-700'
                        }`}
                      >
                        {value}
                      </p>
                      {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
                    </div>
                  );
                }}
                caption={
                  data.lastReviewed
                    ? `Prices as of ${formatLastReviewed(data.lastReviewed)}. See ${data.name}'s official site for the latest pricing.`
                    : `See ${data.name}'s official site for the latest pricing.`
                }
              />
            </div>
          </section>

          {/* F. Migration Guide */}
          {data.migrationGuide && (
            <section className="py-20 px-4 bg-white">
              <MigrationGuide
                title={data.migrationGuide.title}
                steps={data.migrationGuide.steps}
                importFormats={data.migrationGuide.importFormats}
                fieldMapping={data.migrationGuide.fieldMapping}
                fromLabel={`${data.name} field`}
              />
            </section>
          )}

          {/* G. FAQ */}
          {faqs.length > 0 && (
            <section className="py-20 px-4 bg-white">
              <FaqSection faqs={faqs} injectStructuredData={false} />
            </section>
          )}

          {/* H. Bottom CTA */}
          <BottomCTASection
            heading={`Ready to leave ${data.name}?`}
            subhead={data.ctaSubtext}
            primaryCta={{ label: 'Get started free', href: 'https://app.testably.io/signup' }}
            secondaryCta={{ label: 'See all comparisons', to: '/compare' }}
          />

        </main>
        <MarketingFooter />
      </div>
    </>
  );
}

/** ISO yyyy-mm-dd → "May 2026" for display. */
function formatLastReviewed(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
