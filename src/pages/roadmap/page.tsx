import { useNavigate } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';

const columns = [
  {
    id: 'completed',
    label: 'Completed',
    icon: 'ri-checkbox-circle-fill',
    color: 'text-teal-500',
    headerBg: 'bg-teal-50 border-teal-200',
    cardBorder: 'border-teal-100',
    dotColor: 'bg-teal-500',
    items: [
      {
        title: 'Slack & Teams Integration',
        date: 'Q1 2026',
        desc: 'Real-time notifications in Slack and Microsoft Teams with per-project webhook routing.',
        icon: 'ri-notification-3-line',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
      },
      {
        title: 'CI/CD Pipeline Integration',
        date: 'Q1 2026',
        desc: 'Upload automated test results from any CI/CD system via REST API.',
        icon: 'ri-terminal-box-line',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
      },
      {
        title: 'Jira Integration',
        date: 'Q4 2025',
        desc: 'Connect to Jira Cloud and Data Center. Auto-create issues on test failure.',
        icon: 'ri-links-line',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
      },
      {
        title: 'Exploratory Sessions',
        date: 'Q3 2025',
        desc: 'Mission-driven exploratory testing with rich-text notes and screenshots.',
        icon: 'ri-video-line',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
      },
    ],
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: 'ri-loader-4-line',
    color: 'text-blue-500',
    headerBg: 'bg-blue-50 border-blue-200',
    cardBorder: 'border-blue-100',
    dotColor: 'bg-blue-500',
    items: [
      {
        title: 'AI Test Case Generation',
        date: 'Target: Q2 2026',
        desc: '4 generation modes including unique Session-to-TestCase. Included in all plans.',
        icon: 'ri-sparkling-2-line',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
    ],
  },
  {
    id: 'planned',
    label: 'Planned',
    icon: 'ri-calendar-line',
    color: 'text-amber-500',
    headerBg: 'bg-amber-50 border-amber-200',
    cardBorder: 'border-amber-100',
    dotColor: 'bg-amber-400',
    items: [
      {
        title: 'Dashboard & Analytics',
        date: 'Q3 2026',
        desc: 'Customizable dashboards with test trends, pass/fail rates, and team workload.',
        icon: 'ri-bar-chart-2-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'Test Case Versioning',
        date: 'Q3 2026',
        desc: 'Version history, compare, and restore for compliance and audit.',
        icon: 'ri-git-branch-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'Advanced Integrations',
        date: 'Q3–Q4 2026',
        desc: 'GitHub Issues, GitLab Issues, Azure DevOps, TestNG/JUnit import.',
        icon: 'ri-plug-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
    ],
  },
  {
    id: 'considering',
    label: 'Considering',
    icon: 'ri-lightbulb-line',
    color: 'text-gray-400',
    headerBg: 'bg-gray-50 border-gray-200',
    cardBorder: 'border-gray-100',
    dotColor: 'bg-gray-300',
    items: [
      {
        title: 'Mobile App',
        date: 'TBD',
        desc: 'iOS and Android for reviewing results and push notifications.',
        icon: 'ri-smartphone-line',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-500',
      },
      {
        title: 'API v2 & Webhooks',
        date: 'TBD',
        desc: 'Full public API with webhook support for custom integrations.',
        icon: 'ri-code-line',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-500',
      },
      {
        title: 'Test Automation SDK',
        date: 'TBD',
        desc: 'Open-source SDK for Playwright, Cypress, Selenium.',
        icon: 'ri-robot-line',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-500',
      },
    ],
  },
];

export default function RoadmapPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Roadmap | Testably — What We're Building"
        description="See what the Testably team is working on, what's planned, and what's under consideration. Transparent public roadmap."
        keywords="testably roadmap, product roadmap, upcoming features, QA tool development"
      />
      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="cursor-pointer">
              <img src="/brand/logo-combo-light.svg" alt="Testably" className="h-9" />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/changelog')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">Changelog</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all cursor-pointer">Log in</button>
              <button onClick={() => navigate('/auth')} className="text-sm font-semibold px-5 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all cursor-pointer">Get Started</button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="py-20 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-map-2-line text-teal-300 text-sm"></i>
              <span className="text-teal-200 text-sm font-medium">Roadmap</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">What we're building</h1>
            <p className="text-white/50 text-lg">Our roadmap is public. Your feedback shapes every release.</p>
          </div>
        </header>

        {/* Kanban Board */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {columns.map((col) => (
                <div key={col.id}>
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 ${col.headerBg}`}>
                    <i className={`${col.icon} text-base ${col.color}`}></i>
                    <span className="font-semibold text-gray-800 text-sm">{col.label}</span>
                    <span className="ml-auto text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                      {col.items.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {col.items.map((item) => (
                      <article key={item.title} className={`bg-white rounded-xl p-4 border ${col.cardBorder} hover:shadow-md transition-all`}>
                        <div className="flex items-start gap-3 mb-2">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${item.iconBg}`}>
                            <i className={`${item.icon} text-sm ${item.iconColor}`}></i>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 bg-white text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Have a feature request?</h2>
            <p className="text-gray-500 mb-8">We build what our users need. Reach out and let us know what you'd like to see.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:hello@testably.app"
                className="px-8 py-3.5 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-all cursor-pointer inline-flex items-center gap-2 justify-center"
              >
                <i className="ri-mail-line"></i>
                Send us feedback
              </a>
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-teal-300 hover:text-teal-600 transition-all cursor-pointer"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src="/brand/logo-combo-light.svg" alt="Testably" className="h-7" />
            <p className="text-gray-400 text-xs">© {new Date().getFullYear()} Testably. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
