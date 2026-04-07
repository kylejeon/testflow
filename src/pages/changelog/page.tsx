import { useState } from 'react';
import MarketingLayout from '../../components/marketing/MarketingLayout';

const entries = [
  {
    date: 'April 2026',
    title: 'Requirements Traceability Matrix (RTM)',
    category: 'New Feature',
    categoryColor: 'bg-blue-100 text-blue-700',
    description: 'Link requirements to test cases and runs. Get full visibility into coverage status — know exactly which requirements are tested, partially covered, or missing.',
    bullets: [
      'Map requirements to one or multiple test cases',
      'Real-time coverage status per requirement (Covered / Partial / Not Covered)',
      'Starter: 50 requirements · Professional+: Unlimited',
      'Enterprise: Audit trail + Jira two-way sync',
      'Export RTM report as CSV',
    ],
  },
  {
    date: 'April 2026',
    title: 'Shared / Reusable Test Steps',
    category: 'New Feature',
    categoryColor: 'bg-green-100 text-green-700',
    description: 'Create a shared library of test steps that can be reused across multiple test cases. Keep your test suite DRY and maintainable.',
    bullets: [
      'Create named step groups in the Steps Library',
      'Embed shared steps into any test case with one click',
      'Changes to shared steps propagate automatically to all referencing test cases',
      'Starter: 20 shared steps · Professional+: Unlimited',
      'Enterprise: full version history for all shared steps',
    ],
  },
  {
    date: 'April 2026',
    title: 'TC Versioning',
    category: 'New Feature',
    categoryColor: 'bg-teal-100 text-teal-700',
    description: 'Full Major/Minor version management for test cases. Every edit is tracked, diffable, and reversible.',
    bullets: [
      'Major / Minor version bump on every save with author and timestamp',
      'Side-by-side Diff view to compare any two versions',
      'One-click Restore to any previous version',
      'Publish to mark a version as an official release snapshot',
      'Complete audit trail — no history is ever lost',
    ],
  },
  {
    date: 'April 2026',
    title: 'Test Automation Framework SDK',
    category: 'New Feature',
    categoryColor: 'bg-sky-100 text-sky-700',
    description: 'Native reporters for Playwright, Cypress, and Jest. Connect your automation suite to Testably in one npm install.',
    bullets: [
      'npm install @testably.kr/reporter — works out of the box',
      'Playwright, Cypress, and Jest reporters included',
      'Results automatically linked to matching test cases in your runs',
      'Fully compatible with the existing CI/CD REST API and token system',
      'Works with GitHub Actions, GitLab CI, Jenkins, and any other pipeline',
    ],
  },
  {
    date: 'April 2026',
    title: 'Lemon Squeezy Payment Integration',
    category: 'New Feature',
    categoryColor: 'bg-yellow-100 text-yellow-700',
    description: 'Billing powered by Lemon Squeezy alongside the existing Stripe integration. Supports all subscription tiers.',
    bullets: [
      'Lemon Squeezy checkout for Starter, Professional, and Enterprise plans',
      'Annual billing discounts (≈15%) available for all paid tiers',
      'Webhook-driven subscription lifecycle (activate, upgrade, cancel, expire)',
      'Unified plan management in Settings → Billing',
    ],
  },
  {
    date: 'April 2026',
    title: 'AI Assist Enhancements',
    category: 'Improvement',
    categoryColor: 'bg-purple-100 text-purple-700',
    description: 'Three new AI-powered analysis tools added to the project dashboard for deeper quality insights.',
    bullets: [
      'Run Summary: AI-generated executive summary for every completed test run',
      'Flaky Detection AI: automatically identifies unstable tests from historical results',
      'Coverage Gap Analysis: surfaces untested scenarios and suggests new test cases',
      'Available on Professional and Enterprise plans',
    ],
  },
  {
    date: 'April 2026',
    title: 'Dashboard Analytics & Activity Feed',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Real-time project health dashboard with 8 analytics widgets and live activity feed. AI-powered insights via Edge Function.',
    bullets: [
      'Status Distribution, Pass Rate Trend, Execution Velocity, Priority Breakdown',
      'Flaky Test Detection, Milestone Tracker, Coverage Heatmap, AI Insights',
      'Real-time Activity Feed with filtering by action type',
      'Tier-gated: Free basic widgets · Starter 6 widgets · Professional+ all 8 + AI',
    ],
  },
  {
    date: 'April 2026',
    title: 'Executive Report PDF Export',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: '8-page A4 PDF report generated directly in browser via jsPDF. Includes Release Readiness Score, Quality Gates, and Coverage Heatmap.',
    bullets: [
      'Cover, KPI Summary, Test Trends, Run Details, Milestones, Coverage, Team, Recommendations',
      'Release Readiness Score with weighted formula (Pass Rate 40%, Coverage 20%, etc.)',
      'Quality Gates: Pass Rate ≥90%, Critical Failures = 0, Coverage ≥80%',
      'Korean font (NotoSansKR) support · Branded header/footer with page numbers',
    ],
  },
  {
    date: 'April 2026',
    title: 'Milestone Roll-up & Payment Integration',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Parent-Sub milestone auto-aggregation with roll-up stats, and Lemon Squeezy payment integration for tier-based billing.',
    bullets: [
      'Parent milestone auto-calculates progress from all sub-milestones and direct test cases',
      'Auto status determination: all completed → completed, any past_due → past_due',
      'Auto date range: Parent start = min(sub.start), end = max(sub.end)',
      'Lemon Squeezy checkout with tier-based plans (Free / Starter / Professional / Enterprise S/M/L)',
    ],
  },
  {
    date: 'April 2026',
    title: 'Export & Reporting Improvements',
    category: 'Improvement',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    description: 'Quality improvements across Run Detail Export and Dashboard Export. 10 fixes for data accuracy, layout consistency, and visual polish.',
    bullets: [
      'Run Detail Export: 4 quality fixes including data formatting and layout',
      'Dashboard Export: 6 bug fixes for chart rendering and data accuracy',
      'PDF visual alignment with designer mockups (18 items addressed)',
    ],
  },
  {
    date: 'Q2 2026',
    title: 'AI Test Case Generation',
    category: 'Coming Soon',
    categoryColor: 'bg-purple-100 text-purple-700',
    description: 'Generate test cases from text, Jira issues, or discovery log sessions using AI. Unique Log-to-TestCase mode. Included in all plans.',
    bullets: [
      '4 generation modes: Text, Jira, Session Log, Edge Cases',
      '2-step review-before-save workflow',
      'Free 5/mo · Starter 30/mo · Professional 150/mo · Enterprise S/M/L unlimited',
    ],
  },
  {
    date: 'March 2026',
    title: 'New Pricing Plans + Enterprise Tier',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Introducing updated pricing with three Enterprise tiers (S/M/L) covering teams of 21 to 100+ members, plus unlimited AI and dedicated support.',
    bullets: [
      'Free $0 (3 members), Starter $49 (5 members), Professional $99 (20 members)',
      'Enterprise S $249 (21–50 members), Enterprise M $499 (51–100 members), Enterprise L (100+ · Contact Sales)',
      'All plans include AI test case generation',
      '14-day free trial on all paid plans',
    ],
  },
  {
    date: 'March 2026',
    title: 'Slack & Microsoft Teams Integration',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Real-time notifications in Slack channels or Microsoft Teams. Configure per-project, per-channel.',
    bullets: [
      'Slack via Incoming Webhooks with Block Kit formatting',
      'Microsoft Teams via Workflow Webhooks',
      'Events: Run Created/Completed, Milestone Started/Completed/Past Due',
      'Per-project webhook routing',
    ],
  },
  {
    date: 'January 2026',
    title: 'CI/CD Pipeline Integration',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Upload automated test results from CI/CD pipelines via REST API.',
    bullets: [
      'REST API with project-specific tokens',
      'GitHub Actions and GitLab CI support',
      'Unified manual + automated results view',
    ],
  },
  {
    date: 'November 2025',
    title: 'Jira Integration',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Connect to Jira Cloud and Data Center. Auto-create issues on test failure.',
    bullets: [
      'Auto issue creation with full context',
      'One-click Jira issue creation from test results',
      'Custom field mapping',
    ],
  },
  {
    date: 'September 2025',
    title: 'Exploratory',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Mission-driven discovery testing with rich-text notes, screenshots, and structured entries.',
    bullets: [
      'Rich-text editor with inline images',
      'Note / Bug / Observation / Step entries',
      'Activity heatmap',
    ],
  },
  {
    date: 'July 2025',
    title: 'Testably Launch',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Testably launches with core test management: test cases, runs, milestones, documentation, notifications.',
    bullets: [
      'Test case management with folders and priorities',
      'Test runs with 5 result statuses',
      'Milestone tracking with hierarchical structure',
      'Role-based collaboration (Admin, Member, Viewer)',
    ],
  },
];

export default function ChangelogPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const body = new URLSearchParams();
      body.append('email', email);
      await fetch('https://readdy.ai/api/form/d6nnujlv117fnkj2hmc0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch {
      // silent
    }
    setSubscribed(true);
    setEmail('');
  };

  return (
    <MarketingLayout
      title="Changelog | Testably"
      description="See what's new in Testably. Recent updates, improvements, and bug fixes."
      keywords="testably changelog, product updates, release notes, new features"
      showCTA={false}
    >

        {/* Hero */}
        <header className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-history-line text-indigo-300 text-sm"></i>
              <span className="text-indigo-200 text-sm font-medium">Changelog</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Product Updates</h1>
            <p className="text-white/50 text-lg">New features, improvements, and what's coming next.</p>
          </div>
        </header>

        {/* Timeline */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100"></div>

              <div className="space-y-10">
                {entries.map((entry, i) => (
                  <article key={i} className="relative pl-16">
                    {/* Dot */}
                    <div className={`absolute left-3 top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${entry.category === 'Coming Soon' ? 'bg-purple-400' : 'bg-indigo-500'}`}></div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xs font-medium text-gray-400">{entry.date}</span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${entry.categoryColor}`}>{entry.category}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{entry.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4">{entry.description}</p>
                      <ul className="space-y-1.5">
                        {entry.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-indigo-100 flex-shrink-0 mt-0.5">
                              <i className="ri-check-line text-xs text-indigo-600"></i>
                            </div>
                            <span className="text-xs text-gray-600 leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe */}
        <section className="py-16 bg-indigo-600 text-center">
          <div className="max-w-lg mx-auto px-6">
            <h3 className="text-2xl font-bold text-white mb-2">Stay in the loop</h3>
            <p className="text-indigo-100 text-sm mb-6">Get product updates and new features in your inbox</p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-white">
                <i className="ri-check-circle-line text-xl"></i>
                <span className="font-semibold">Thanks for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-3 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/20 border border-white/30 text-white placeholder-indigo-200 focus:outline-none focus:bg-white/30"
                  required
                />
                <button type="submit" className="px-5 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-all cursor-pointer whitespace-nowrap">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </section>

    </MarketingLayout>
  );
}
