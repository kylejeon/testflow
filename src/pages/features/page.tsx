import { useNavigate } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';

const features = [
  {
    icon: 'ri-file-list-3-line',
    tag: 'Core',
    tagColor: 'bg-indigo-50 text-indigo-700',
    title: 'Test Case Management',
    headline: 'Build and organize your test library',
    description: 'Create detailed test cases with structured steps, expected results, and preconditions. Organize in folder hierarchies, filter by priority and tags.',
    bullets: [
      'Structured folder hierarchy',
      'Priority levels: Critical, High, Medium, Low',
      'Step-by-step instructions with expected results',
      'Preconditions',
      'Comments, result history, linked issues',
      'Import/Export for migration',
    ],
    color: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    icon: 'ri-play-circle-line',
    tag: 'Core',
    tagColor: 'bg-indigo-50 text-indigo-700',
    title: 'Test Runs & Results',
    headline: 'Execute tests and track results in real time',
    description: 'Create test runs tied to milestones, assign to team members, and track execution live.',
    bullets: [
      'Assign cases to specific members',
      '5 statuses: Passed, Failed, Blocked, Retest, Untested',
      'Real-time progress indicators',
      'Link runs to milestones',
      'Export results for reporting',
    ],
    color: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: 'ri-video-line',
    tag: 'Testing',
    tagColor: 'bg-purple-50 text-purple-700',
    title: 'Discovery Logs',
    headline: 'Capture what scripted tests miss',
    description: 'Run free-form discovery testing with missions, rich-text notes, inline screenshots, and structured entries.',
    bullets: [
      'Mission-driven sessions with goals',
      'Rich-text editor with inline images',
      'Real-time activity log with timestamps',
      'Passed / Failed / Note entry types',
      'Activity heatmap analytics',
      'Session history for retrospectives',
    ],
    color: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    icon: 'ri-sparkling-2-line',
    tag: 'AI',
    tagColor: 'bg-amber-50 text-amber-700',
    title: 'AI Test Case Generation',
    headline: 'Let AI write your test cases',
    description: 'Generate comprehensive test cases from text descriptions, Jira issues, or discovery log sessions. Review and edit before saving.',
    bullets: [
      'Generate from text descriptions',
      'Generate from Jira issues',
      'Convert session logs to test cases (unique to Testably)',
      'AI-powered edge case suggestions',
      'Review-before-save workflow',
      'Free 5/mo · Starter 30/mo · Pro 150/mo · Enterprise unlimited',
    ],
    color: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    icon: 'ri-flag-2-line',
    tag: 'Planning',
    tagColor: 'bg-cyan-50 text-cyan-700',
    title: 'Milestone Tracking',
    headline: 'Plan releases with confidence',
    description: 'Set release goals with hierarchical milestones. Track start dates, due dates, and completion across your team.',
    bullets: [
      'Hierarchical milestones (parent/child)',
      'Start date and due date tracking',
      'Status: Not Started, In Progress, Completed',
      'Link test runs to milestones',
      'Past-due notifications',
    ],
    color: 'bg-cyan-50',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    icon: 'ri-folder-open-line',
    tag: 'Documentation',
    tagColor: 'bg-indigo-50 text-indigo-700',
    title: 'Project Documentation',
    headline: 'Keep everything in one place',
    description: 'Centralize test plans, release notes, and QA guidelines alongside your test data.',
    bullets: [
      'Upload files (PDFs, images, spreadsheets)',
      'Attach external links',
      'Organize per project',
      'Quick access from sidebar',
      'Central knowledge base for onboarding',
    ],
    color: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    icon: 'ri-links-line',
    tag: 'Integration',
    tagColor: 'bg-rose-50 text-rose-700',
    title: 'Jira Integration',
    headline: 'Seamless bug tracking, zero context switching',
    description: 'Connect to Jira Cloud or Data Center. Auto-create issues on test failure with full context.',
    bullets: [
      'Jira Cloud support',
      'Auto issue creation on failure',
      'One-click Jira issue creation',
      'Project-level configuration',
      'API token authentication',
    ],
    color: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    icon: 'ri-notification-3-line',
    tag: 'Integration',
    tagColor: 'bg-rose-50 text-rose-700',
    title: 'Slack & Teams Notifications',
    headline: 'Stay informed where you already work',
    description: 'Real-time notifications in Slack or Microsoft Teams for runs, milestones, and more.',
    bullets: [
      'Slack with rich Block Kit messages',
      'Microsoft Teams via Workflow Webhooks',
      'Configurable events per channel',
      'Direct links back to Testably',
      'Per-project notification routing',
    ],
    color: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    icon: 'ri-terminal-box-line',
    tag: 'Automation',
    tagColor: 'bg-gray-100 text-gray-700',
    title: 'CI/CD Integration',
    headline: 'Automated results from your pipeline',
    description: 'Push automated test results from any CI/CD system via REST API. Supports GitHub Actions, GitLab CI, Jenkins.',
    bullets: [
      'REST API with project tokens',
      'GitHub Actions integration',
      'GitLab CI integration',
      'Jenkins support',
      'Automated result upload',
      'Unified manual + automated view',
    ],
    color: 'bg-gray-50',
    iconBg: 'bg-gray-200',
    iconColor: 'text-gray-600',
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <MarketingLayout
      title="Features | Testably"
      description="Explore Testably's QA features: test case management, runs, discovery logs, AI generation, and more."
      keywords="test case management features, QA tools, Jira integration, CI/CD testing, discovery logs, AI test generation"
    >

        {/* Hero */}
        <header className="py-24 bg-gray-950 text-center relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
          <div className="relative z-10 max-w-3xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-settings-3-line text-indigo-300 text-sm"></i>
              <span className="text-indigo-200 text-sm font-medium">Features</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Everything your QA team needs
            </h1>
            <p className="text-white/50 text-lg mb-10">
              From writing test cases to analyzing results — Testably covers the full testing lifecycle with AI built in.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-400 transition-all cursor-pointer"
            >
              Start for Free
            </button>
          </div>
        </header>

        {/* Feature Cards */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <article key={f.title} className={`rounded-2xl p-7 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all ${f.color}`}>
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${f.iconBg}`}>
                      <i className={`${f.icon} text-2xl ${f.iconColor}`}></i>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.tagColor}`}>{f.tag}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm font-medium text-indigo-700 mb-3">{f.headline}</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{f.description}</p>
                  <ul className="space-y-1.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <div className="w-4 h-4 flex items-center justify-center rounded-full bg-white/70 flex-shrink-0 mt-0.5">
                          <i className={`ri-check-line text-xs ${f.iconColor}`}></i>
                        </div>
                        <span className="text-xs text-gray-600 leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

    </MarketingLayout>
  );
}
