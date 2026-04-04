import { ReactNode, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import SEOHead from '../SEOHead';
import MarketingHeader from '../marketing/MarketingHeader';
import MarketingFooter from '../marketing/MarketingFooter';

interface DocsLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

interface NavItem {
  label: string;
  to: string;
}

interface NavSection {
  label: string;
  icon: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Using Testably',
    icon: 'ri-layout-grid-line',
    items: [
      { label: 'Test Cases', to: '/docs/test-cases' },
      { label: 'Test Runs', to: '/docs/test-runs' },
      { label: 'Milestones', to: '/docs/milestones' },
      { label: 'Discovery Logs', to: '/docs/discovery-logs' },
      { label: 'Team & Permissions', to: '/docs/team-permissions' },
    ],
  },
  {
    label: 'Integrations & Guides',
    icon: 'ri-plug-line',
    items: [
      { label: 'CI/CD Integration', to: '/docs/cicd' },
      { label: 'Jira Integration', to: '/docs/integrations' },
      { label: 'Webhooks', to: '/docs/webhooks' },
      { label: 'Import / Export', to: '/docs/import-export' },
    ],
  },
  {
    label: 'API Reference',
    icon: 'ri-code-s-slash-line',
    items: [
      { label: 'Overview', to: '/docs/api' },
      { label: 'Authentication', to: '/docs/api/authentication' },
      { label: 'Projects', to: '/docs/api/projects' },
      { label: 'Test Cases', to: '/docs/api/test-cases' },
      { label: 'Test Runs', to: '/docs/api/test-runs' },
      { label: 'Test Results', to: '/docs/api/test-results' },
      { label: 'CI/CD Upload', to: '/docs/api/ci-upload' },
      { label: 'Milestones', to: '/docs/api/milestones' },
      { label: 'Discovery Logs', to: '/docs/api/discovery-logs' },
      { label: 'Members', to: '/docs/api/members' },
    ],
  },
  {
    label: 'Support',
    icon: 'ri-customer-service-2-line',
    items: [
      { label: 'Account & Billing', to: '/docs/account-billing' },
      { label: 'Keyboard Shortcuts', to: '/docs/keyboard-shortcuts' },
      { label: 'FAQ & Troubleshooting', to: '/docs/faq' },
    ],
  },
];

export default function DocsLayout({ children, title, description }: DocsLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((section) => {
      initial[section.label] = true;
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const renderNavLink = (item: NavItem) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={`block pl-9 pr-3 py-1.5 text-sm rounded-md transition-colors ${
          active
            ? 'text-indigo-600 bg-indigo-50 border-l-2 border-indigo-500 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Back to Docs Home */}
      <div className="px-4 py-3 border-b border-gray-100">
        <Link
          to="/docs"
          onClick={() => setMobileOpen(false)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <i className="ri-arrow-left-s-line text-base" />
          Back to Docs Home
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Docs sidebar">
        {/* Getting Started */}
        <Link
          to="/docs/getting-started"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            isActive('/docs/getting-started')
              ? 'text-indigo-600 bg-indigo-50 border-l-2 border-indigo-500 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent'
          }`}
        >
          <i className="ri-rocket-line text-base" />
          Getting Started
        </Link>

        {/* Collapsible sections */}
        {navSections.map((section) => {
          const expanded = expandedSections[section.label];
          const hasActiveChild = section.items.some((item) => isActive(item.to));

          return (
            <div key={section.label} className="pt-3">
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <i className={`${section.icon} text-base ${hasActiveChild ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-600">
                    {section.label}
                  </span>
                </span>
                <i
                  className={`ri-arrow-down-s-line text-sm text-gray-400 transition-transform ${
                    expanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {expanded && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map(renderNavLink)}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] bg-white">
      <SEOHead title={title} description={description} />
      <MarketingHeader />

      <div className="flex-1 flex relative">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors cursor-pointer"
          aria-label="Toggle docs navigation"
        >
          <i className={`${mobileOpen ? 'ri-close-line' : 'ri-menu-line'} text-xl`} />
        </button>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar - mobile */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ top: '64px' }}
        >
          {sidebarContent}
        </aside>

        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 py-10">
            {children}
          </div>
        </main>
      </div>

      <MarketingFooter />
    </div>
  );
}
