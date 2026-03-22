import { Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';

const comparisons = [
  {
    name: 'TestRail',
    path: '/compare/testrail',
    tagline: 'Enterprise test management at 87% less cost',
    description: 'TestRail charges $38–69/user/month with no free tier. Testably offers flat-rate plans starting at $0.',
    highlight: 'Save up to $8,700/year',
  },
  {
    name: 'Zephyr Scale',
    path: '/compare/zephyr',
    tagline: 'Break free from Jira-only testing',
    description: 'Zephyr Scale bills every Jira user, not just testers. Testably is a standalone platform with optional Jira integration.',
    highlight: 'No Jira required',
  },
  {
    name: 'Qase',
    path: '/compare/qase',
    tagline: 'AI-powered testing without hidden credit costs',
    description: 'Qase charges extra for AI generation as an add-on. Testably includes AI test case generation on all paid plans.',
    highlight: 'AI included, no add-ons',
  },
];

export default function CompareIndexPage() {
  return (
    <>
      <SEOHead
        title="Testably vs Alternatives (2026) | Compare Test Management Tools"
        description="Compare Testably against TestRail, Zephyr Scale, and Qase. See feature-by-feature breakdowns, pricing comparisons, and find out why teams are switching."
        keywords="testably alternatives, testrail alternative, zephyr scale alternative, qase alternative, test management comparison"
      />

      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest mb-4">Comparisons</p>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Compare Testably with<br />Other Tools
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            See how Testably stacks up against the most popular test management platforms — feature by feature, price by price.
          </p>
        </div>
      </section>

      {/* Comparison cards */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {comparisons.map((c) => (
              <div key={c.name} className="flex flex-col rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-1">Testably vs</p>
                  <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
                  <p className="text-sm text-gray-600 mt-2 leading-snug">{c.tagline}</p>
                </div>
                <div className="px-6 py-5 flex flex-col flex-1">
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {c.highlight}
                    </span>
                    <Link
                      to={c.path}
                      className="text-teal-600 hover:text-teal-700 font-semibold text-sm transition-colors"
                    >
                      Compare →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to make the switch?</h2>
          <p className="text-gray-400 mb-8">Start free — no credit card required. Free plan includes 3 projects and 3 team members forever.</p>
          <a
            href="https://app.testably.io/signup"
            className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-semibold px-10 py-3 rounded-lg transition-colors"
          >
            Start for free
          </a>
        </div>
      </section>
    </>
  );
}
