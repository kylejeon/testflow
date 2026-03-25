import MarketingLayout from '../../components/marketing/MarketingLayout';

const quickStart = [
  {
    icon: 'ri-play-circle-line',
    title: 'Getting Started',
    desc: 'Create your first project and run your first test in under 5 minutes.',
    href: '#',
  },
  {
    icon: 'ri-file-edit-line',
    title: 'Writing Test Cases',
    desc: 'Learn how to write effective test cases and leverage AI generation.',
    href: '#',
  },
  {
    icon: 'ri-focus-3-line',
    title: 'Running Your First Test',
    desc: 'Create a test run, assign cases, and execute in Focus Mode.',
    href: '#',
  },
];

const categories = [
  { icon: 'ri-rocket-line', title: 'Getting Started', desc: 'Sign up, create projects, invite team, first test' },
  { icon: 'ri-file-list-3-line', title: 'Test Cases', desc: 'Create, edit, folders, tags, priority, bulk ops, AI generation' },
  { icon: 'ri-play-circle-line', title: 'Test Runs', desc: 'Create runs, assign cases, results, Focus Mode, statuses' },
  { icon: 'ri-flag-line', title: 'Milestones', desc: 'Create milestones, link runs, progress tracking, releases' },
  { icon: 'ri-search-eye-line', title: 'Discovery Logs', desc: 'Start sessions, record observations, screenshots, TC conversion' },
  { icon: 'ri-team-line', title: 'Team & Permissions', desc: 'Invite members, roles (Admin/Member/Viewer), access control' },
  { icon: 'ri-plug-line', title: 'Integrations', desc: 'Jira setup, CI/CD API, Slack & Teams notifications' },
  { icon: 'ri-bank-card-line', title: 'Account & Billing', desc: 'Plan changes, payment management, invoices' },
  { icon: 'ri-keyboard-line', title: 'Keyboard Shortcuts', desc: 'Complete shortcut reference, Cmd+K, G-chords, Focus Mode keys' },
  { icon: 'ri-question-line', title: 'FAQ & Troubleshooting', desc: 'Common questions and error resolution' },
];

export default function DocsPage() {
  return (
    <MarketingLayout
      title="Documentation | Testably"
      description="Learn how to use Testably. Guides, tutorials, and best practices."
      keywords="testably documentation, how to use testably, QA guides, tutorials"
    >
      {/* Hero */}
      <header className="py-24 bg-gray-950 text-center relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <i className="ri-book-2-line text-indigo-300 text-sm"></i>
            <span className="text-indigo-200 text-sm font-medium">Documentation</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Testably Documentation
          </h1>
          <p className="text-white/50 text-lg leading-relaxed mb-8">
            Everything you need to get started and master Testably.
          </p>
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />
          </div>
        </div>
      </header>

      {/* Quick Start */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
              <i className="ri-rocket-line text-indigo-600 text-sm"></i>
              <span className="text-indigo-700 text-sm font-medium">Quick Start</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Get up and running</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickStart.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-7 hover:border-indigo-200 hover:shadow-md transition-all block group"
              >
                <i className={`${item.icon} text-3xl text-indigo-500 mb-4 block`}></i>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
              <i className="ri-book-open-line text-indigo-600 text-sm"></i>
              <span className="text-indigo-700 text-sm font-medium">Browse by Category</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Documentation categories</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <a
                key={cat.title}
                href="#"
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className={`${cat.icon} text-indigo-600 text-lg`}></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{cat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{cat.desc}</p>
                </div>
              </a>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8 bg-white border border-gray-100 rounded-xl py-3 px-4">
            <i className="ri-information-line text-indigo-400 mr-1.5"></i>
            Full documentation content is being built. This page serves as the documentation hub.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
