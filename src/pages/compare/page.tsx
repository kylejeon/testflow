import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { testrailData } from '../../data/competitors/testrail';
import { zephyrData } from '../../data/competitors/zephyr';
import { qaseData } from '../../data/competitors/qase';
import { CompetitorData } from '../../data/competitors/types';

const COMPETITORS: Record<string, CompetitorData> = {
  testrail: testrailData,
  zephyr: zephyrData,
  qase: qaseData,
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5 text-indigo-500'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5 text-red-400'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <XIcon />;
  return <span className="text-sm text-gray-600">{value}</span>;
}

export default function ComparePage() {
  const { competitor } = useParams<{ competitor: string }>();
  const data = competitor ? COMPETITORS[competitor] : undefined;

  useEffect(() => {
    if (!data) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-structured-data';
    script.text = JSON.stringify({
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
    });
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('faq-structured-data');
      if (el) el.remove();
    };
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h1>
          <p className="text-gray-500 mb-8">This comparison page doesn't exist.</p>
          <Link to="/" className="text-indigo-600 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <MarketingLayout
      title={data.metaTitle}
      description={data.metaDescription}
      keywords={data.metaKeywords.join(', ')}
    >

      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Testably vs {data.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">{data.tagline}</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">{data.description}</p>
          {data.savingsCallout && (
            <div className="inline-block bg-indigo-900/60 border border-indigo-500/40 rounded-xl px-6 py-4 text-indigo-200 text-sm max-w-xl">
              {data.savingsCallout}
            </div>
          )}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://app.testably.io/signup"
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              {data.ctaText}
            </a>
            <Link
              to="/pricing"
              className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Feature Comparison</h2>
          <p className="text-center text-gray-500 mb-12">How Testably stacks up against {data.name}</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/2">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wide">Testably</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center"><FeatureCell value={row.testably} /></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center"><FeatureCell value={row.competitor} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key Differences */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Key Differences</h2>
          <p className="text-center text-gray-500 mb-12">What sets Testably apart from {data.name}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {data.keyDifferences.map((diff) => (
              <div key={diff.title} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{diff.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{diff.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Pricing Comparison</h2>
          <p className="text-center text-gray-500 mb-12">Testably's flat-rate plans vs {data.name}'s pricing</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wide">Testably</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.pricingRows.map((row, i) => (
                  <tr key={row.plan} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{row.plan}</td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-bold text-indigo-700">{row.testably.price}</p>
                      {row.testably.detail && <p className="text-xs text-gray-500 mt-0.5">{row.testably.detail}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-bold text-gray-700">{row.competitor.price}</p>
                      {row.competitor.detail && <p className="text-xs text-gray-500 mt-0.5">{row.competitor.detail}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 bg-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to switch from {data.name}?</h2>
          <p className="text-indigo-100 mb-8">{data.ctaSubtext}</p>
          <a
            href="https://app.testably.io/signup"
            className="inline-block bg-white text-indigo-700 hover:bg-gray-100 font-semibold px-10 py-3 rounded-lg transition-colors"
          >
            {data.ctaText}
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {data.faqs.map((faq) => (
              <div key={faq.question} className="border-b border-gray-200 pb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Start free today</h2>
          <p className="text-gray-400 mb-8">No credit card required. Free plan includes 3 projects and 3 team members.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://app.testably.io/signup"
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Get started free
            </a>
            <Link
              to="/compare"
              className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              See all comparisons
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
