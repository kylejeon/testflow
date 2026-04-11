import { useNavigate } from 'react-router-dom';
import Logo from '../Logo';

const footerLinks = {
  Product: [
    { label: 'Features', to: '/features' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Changelog', to: '/changelog' },
    { label: 'Roadmap', to: '/roadmap' },
  ],
  'Use Cases': [
    { label: 'Test Case Management', to: '/use-cases/test-case-management' },
    { label: 'Test Management Tool', to: '/use-cases/test-management-tool' },
    { label: 'Blog', to: '/blog/choosing-test-management-tool' },
  ],
  Compare: [
    { label: 'vs TestRail', to: '/compare/testrail' },
    { label: 'vs Qase', to: '/compare/qase' },
    { label: 'vs Zephyr', to: '/compare/zephyr' },
  ],
  Resources: [
    { label: 'Documentation', to: '/docs' },
    { label: 'API Reference', to: '/docs/api' },
    { label: 'Contact', to: '/contact' },
    { label: 'About', to: '/about' },
  ],
  Legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Refund Policy', to: '/refund' },
    { label: 'Cookie Policy', to: '/cookies' },
  ],
};

export default function MarketingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="bg-gray-50 border-t border-gray-100" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 4-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                {col}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.to}>
                    <button
                      onClick={() => navigate(link.to)}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="cursor-pointer">
            <Logo variant="light" className="h-7" />
          </button>
          <p className="text-gray-400 text-xs text-center sm:text-right">
            © {new Date().getFullYear()} Testably. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/GetTestably"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Twitter / X"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
