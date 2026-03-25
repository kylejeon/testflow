import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';

const competitors = [
  {
    slug: 'testrail',
    name: 'TestRail',
    icon: 'ri-flask-line',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    tagline: 'Modern alternative with built-in collaboration',
    highlights: [
      'Free plan available (TestRail: paid only)',
      'Built-in Jira two-way sync',
      'Modern UI — no legacy overhead',
      'Set up in under 5 minutes',
    ],
  },
  {
    slug: 'zephyr',
    name: 'Zephyr Scale',
    icon: 'ri-scales-3-line',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    tagline: 'Standalone platform, no Jira dependency',
    highlights: [
      'Works independently — no Jira license needed',
      'Intuitive UI vs. complex Jira add-on',
      'Faster onboarding for small teams',
      'Transparent, predictable pricing',
    ],
  },
  {
    slug: 'qase',
    name: 'Qase',
    icon: 'ri-questionnaire-line',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    tagline: 'Better collaboration and reporting tools',
    highlights: [
      'Advanced milestone & sprint tracking',
      'Richer reporting and dashboards',
      'CI/CD integration out of the box',
      'Dedicated enterprise support',
    ],
  },
];

type ToolKey = 'testably' | 'testrail' | 'zephyr' | 'qase';

interface FeatureRow {
  feature: string;
  testably: boolean | string;
  testrail: boolean | string;
  zephyr: boolean | string;
  qase: boolean | string;
}

const featureMatrix: FeatureRow[] = [
  { feature: 'Free plan', testably: true, testrail: false, zephyr: false, qase: true },
  { feature: 'Test case management', testably: true, testrail: true, zephyr: true, qase: true },
  { feature: 'Test runs & reporting', testably: true, testrail: true, zephyr: true, qase: true },
  { feature: 'Jira two-way sync', testably: true, testrail: 'Paid add-on', zephyr: 'Native (requires Jira)', qase: true },
  { feature: 'CI/CD integration', testably: true, testrail: true, zephyr: true, qase: true },
  { feature: 'Milestone tracking', testably: true, testrail: true, zephyr: false, qase: true },
  { feature: 'Exploratory testing', testably: true, testrail: false, zephyr: true, qase: true },
  { feature: 'PDF report export', testably: true, testrail: true, zephyr: false, qase: 'Paid' },
  { feature: 'SSO & audit logs', testably: 'Enterprise', testrail: 'Enterprise', zephyr: 'Enterprise', qase: 'Enterprise' },
  { feature: 'Setup time', testably: '< 5 min', testrail: '1–2 hours', zephyr: '30+ min', qase: '10–15 min' },
];

const toolKeys: ToolKey[] = ['testably', 'testrail', 'zephyr', 'qase'];

export default function CompareIndexPage() {
  return (
    <MarketingLayout
      title="Compare Testably vs Competitors | Testably"
      description="See how Testably compares to competitors. Feature comparison, pricing, and migration guide."
      keywords="testably alternatives, testrail alternative, zephyr scale alternative, qase alternative, test management comparison"
    >
      <div>

        {/* Hero */}
        <section className="relative bg-gray-950 pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
            <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.07] blur-[100px]"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
              <i className="ri-arrow-left-right-line text-indigo-400 text-sm"></i>
              <span className="text-indigo-300/90 text-sm font-medium">Alternatives</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              Testably vs. The Rest
            </h1>

            <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-10">
              See how Testably compares to other test management tools.
              Better experience, modern workflow, free to start.
            </p>

            <a
              href="https://app.testably.io/signup"
              className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-500 text-white rounded-full font-bold text-base hover:bg-indigo-400 active:scale-[0.98] shadow-[0_0_30px_rgba(20,184,166,0.2)] hover:shadow-[0_0_40px_rgba(20,184,166,0.35)] cursor-pointer"
              style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              Get Started Free
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20">
                <i className="ri-arrow-right-line text-sm"></i>
              </span>
            </a>
          </div>
        </section>

        {/* Competitor Cards */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
                Comparisons
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Pick your current tool
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Explore detailed, side-by-side comparisons and see why teams are switching to Testably.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {competitors.map((comp) => (
                <Link
                  key={comp.slug}
                  to={`/compare/${comp.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-7 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
                  style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${comp.iconBg} flex items-center justify-center`}>
                      <i className={`${comp.icon} ${comp.iconColor} text-xl`}></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Testably vs. {comp.name}
                    </h3>
                  </div>

                  <p className="text-gray-500 text-sm mb-5">{comp.tagline}</p>

                  <ul className="space-y-2 mb-6">
                    {comp.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold group-hover:gap-2.5 transition-all">
                    See full comparison
                    <i className="ri-arrow-right-s-line text-base"></i>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Matrix */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
                Feature Matrix
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Quick feature comparison
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                At a glance, see which features matter most and where Testably leads.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-5 font-semibold text-gray-500 w-1/5">Feature</th>
                    <th className="text-center py-4 px-4 font-bold text-indigo-700 bg-indigo-50/50 w-1/5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
                          <i className="ri-check-line text-white text-xs"></i>
                        </div>
                        Testably
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600 w-1/5">TestRail</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600 w-1/5">Zephyr Scale</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600 w-1/5">Qase</th>
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      <td className="py-3.5 px-5 font-medium text-gray-700">{row.feature}</td>
                      {toolKeys.map((tool) => (
                        <td
                          key={tool}
                          className={`text-center py-3.5 px-4 ${tool === 'testably' ? 'bg-indigo-50/30' : ''}`}
                        >
                          {row[tool] === true ? (
                            <i className={`ri-check-line text-base ${tool === 'testably' ? 'text-indigo-500' : 'text-gray-400'}`}></i>
                          ) : row[tool] === false ? (
                            <i className="ri-close-line text-base text-gray-300"></i>
                          ) : (
                            <span className={`text-xs font-medium ${tool === 'testably' ? 'text-indigo-600' : 'text-gray-400'}`}>
                              {row[tool]}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center text-gray-400 text-xs mt-4">
              Last updated: March 2026. Feature availability may vary by plan.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 bg-gray-950 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px]"></div>

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to switch?
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
              Import your existing test cases and start running tests in minutes.
              No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://app.testably.io/signup"
                className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-500 text-white rounded-full font-bold text-base hover:bg-indigo-400 active:scale-[0.98] shadow-[0_0_30px_rgba(20,184,166,0.2)] cursor-pointer"
                style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                Get Started Free
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20">
                  <i className="ri-arrow-right-line text-sm"></i>
                </span>
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] text-white/80 border border-white/[0.1] rounded-full font-semibold text-base hover:bg-white/[0.1] hover:text-white backdrop-blur-sm cursor-pointer"
                style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

      </div>
    </MarketingLayout>
  );
}
