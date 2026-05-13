/**
 * /alternatives — Alternatives index page.
 *
 * Mirrors /compare index card-grid pattern but tuned to the "Switch Made
 * Easy" tone per design spec §1.5:
 *   - H1: "Looking for an Alternative to Your QA Tool?"
 *   - Pill: "Switch Made Easy"
 *   - Card title: "Switch from {Competitor} → Testably"
 *   - Migration callout instead of cross-comparison grid
 *
 * One card per competitor with `alternativePageData`. Cards link to
 * `/alternatives/{slug}`.
 *
 * Companion to:
 *   - /compare (Testably vs Competitor compare-table page)
 *   - /alternatives/{slug} (per-competitor switch landing page)
 */

import { Link } from 'react-router-dom';
import MarketingHeader from '../../components/marketing/MarketingHeader';
import MarketingFooter from '../../components/marketing/MarketingFooter';
import SEOHead from '../../components/SEOHead';
import { COMPETITORS } from '../../data/competitors';

// Visual metadata for each competitor card (icons / colors).
// Kept in lockstep with src/pages/compare/index.tsx so both indexes share
// the same look. Order matches design intent (most-recognized vendors first).
interface CompetitorCardVisual {
  slug: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  /** Short reason teams switch — overrides competitor tagline for this index. */
  switchReason: string;
}

const CARD_VISUALS: CompetitorCardVisual[] = [
  {
    slug: 'testrail',
    icon: 'ri-flask-line',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    switchReason: 'Modern UI, built-in AI, free plan — no per-seat squeeze.',
  },
  {
    slug: 'zephyr',
    icon: 'ri-scales-3-line',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    switchReason: 'Standalone — no Jira license required, transparent pricing.',
  },
  {
    slug: 'qase',
    icon: 'ri-questionnaire-line',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    switchReason: 'AI on every paid plan, Shared Steps version pinning, flat-rate.',
  },
  {
    slug: 'xray',
    icon: 'ri-bug-line',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    switchReason: 'Works without Jira, billed on QA testers only, AI included.',
  },
  {
    slug: 'practitest',
    icon: 'ri-shield-check-line',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    switchReason: 'No 10-seat minimum, free forever plan, AI from $19/month.',
  },
  {
    slug: 'testpad',
    icon: 'ri-list-check-2',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    switchReason: 'Structured Test Cases, Jira sync, AI generation — no trial clock.',
  },
  {
    slug: 'kiwi-tcms',
    icon: 'ri-leaf-line',
    iconBg: 'bg-lime-100',
    iconColor: 'text-lime-600',
    switchReason: 'No self-hosting burden, modern UI, AI built in.',
  },
  {
    slug: 'testmonitor',
    icon: 'ri-line-chart-line',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    switchReason: 'Flat-rate pricing, Jira two-way sync, AI test generation.',
  },
  {
    slug: 'browserstack-tm',
    icon: 'ri-stack-line',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    switchReason: 'Standalone — not bundled, flat-rate, AI on every paid plan.',
  },
  {
    slug: 'testiny',
    icon: 'ri-sparkling-2-line',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    switchReason: 'Deeper features at the same modern UX, flat-rate team plans.',
  },
];

export default function AlternativesIndexPage() {
  // Filter to competitors that actually have an alternativePageData payload
  // — this keeps the index in lockstep with what /alternatives/{slug}
  // actually renders (no broken card links).
  const cards = CARD_VISUALS.filter((v) => {
    const data = COMPETITORS[v.slug];
    return data && data.alternativePageData;
  }).map((v) => ({
    ...v,
    name: COMPETITORS[v.slug].name,
  }));

  const canonical = 'https://testably.app/alternatives';
  const title = 'Test Management Tool Alternatives (2026) | Testably';
  const description =
    "Looking for an alternative to TestRail, Zephyr, Qase, Xray, PractiTest, TestPad, or another QA tool? Compare 10 options and see why teams switch to Testably — modern UI, AI included, flat-rate pricing.";

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        keywords="test management alternative, testrail alternative, zephyr alternative, qase alternative, xray alternative, practitest alternative, testpad alternative, qa tool alternatives, switch test management"
        ogTitle={title}
        ogDescription={description}
        ogUrl={canonical}
        canonical={canonical}
      />
      <div
        className="min-h-screen bg-white"
        style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}
      >
        <MarketingHeader />
        <main id="main-content">

          {/* Hero — slate-900 with indigo glow, per design spec §1.5 tone */}
          <section className="relative bg-gray-950 pt-32 pb-20 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
              <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.07] blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                <i className="ri-refresh-line text-indigo-400 text-sm"></i>
                <span className="text-indigo-300/90 text-sm font-medium">Switch Made Easy</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
                Looking for an Alternative to Your QA Tool?
              </h1>

              <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-10">
                Whatever you&apos;re running today — TestRail, Zephyr, Qase, Xray, PractiTest, or another tool — there&apos;s a smoother way. Free to start, modern UI, AI included.
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

          {/* Cards — "Switch from {X} → Testably" */}
          <section className="py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
                  Alternatives
                </span>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Pick the tool you&apos;re replacing
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                  Detailed switch guides with feature gaps, pricing breakdowns, and a step-by-step migration plan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <Link
                    key={card.slug}
                    to={`/alternatives/${card.slug}`}
                    className="group block rounded-2xl border border-gray-200 bg-white p-7 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
                    style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                        <i className={`${card.icon} ${card.iconColor} text-xl`}></i>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        Switch from {card.name}
                        <span className="text-indigo-500"> → Testably</span>
                      </h3>
                    </div>

                    <p className="text-gray-500 text-sm mb-6">{card.switchReason}</p>

                    <div className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold group-hover:gap-2.5 transition-all">
                      See the switch guide
                      <i className="ri-arrow-right-s-line text-base"></i>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Migration callout — "Migration in 30 minutes" per design spec §1.5 */}
          <section className="py-24 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-10 md:p-14 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <i className="ri-time-line text-indigo-600 text-3xl"></i>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                      Migration in 30 minutes — not weeks
                    </h2>
                    <p className="text-gray-500 leading-relaxed mb-6">
                      Export your test cases as CSV from your current tool, map the fields once, and import into Testably. Most teams are running their first test run the same day they sign up. Every per-competitor switch guide includes a step-by-step migration plan and field mapping table.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href="https://app.testably.io/signup"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold text-sm hover:bg-indigo-500 active:scale-[0.98] cursor-pointer"
                        style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                      >
                        Start your free account
                        <i className="ri-arrow-right-line text-base"></i>
                      </a>
                      <Link
                        to="/compare"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full font-semibold text-sm hover:bg-gray-50 cursor-pointer"
                        style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                      >
                        See cross-comparisons
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA — slate-900 close, per design spec §8 CTA matrix */}
          <section className="py-24 bg-gray-950 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px]"></div>

            <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to switch?
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                Free forever plan. Import your test cases in minutes. No credit card required.
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
                  to="/compare"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] text-white/80 border border-white/[0.1] rounded-full font-semibold text-base hover:bg-white/[0.1] hover:text-white backdrop-blur-sm cursor-pointer"
                  style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  See cross-comparisons
                </Link>
              </div>
            </div>
          </section>

        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
