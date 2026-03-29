import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

export default function DocsFaqPage() {
  return (
    <DocsLayout
      title="FAQ & Troubleshooting | Testably Docs"
      description="Frequently asked questions and common error resolution for Testably."
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
        <i className="ri-arrow-right-s-line"></i>
        <span className="text-gray-900 font-medium">FAQ &amp; Troubleshooting</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
          <i className="ri-question-line text-indigo-600 text-xs"></i>
          <span className="text-indigo-700 text-xs font-medium">FAQ &amp; Troubleshooting</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">FAQ &amp; Troubleshooting</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Answers to common questions and solutions to frequently encountered issues.
        </p>
      </div>

      {/* Coming Soon */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="ri-time-line text-amber-600 text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Content coming soon</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
          This guide is currently being written by our team. Check back shortly for answers to the most frequently asked questions.
        </p>
      </div>

      {/* Topics Preview */}
      <div className="mt-10 bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Topics covered in this guide</h2>
        <ul className="space-y-3">
          {[
            { icon: 'ri-user-add-line', text: 'Why didn\'t my team invitation email arrive?' },
            { icon: 'ri-refresh-line', text: 'Test results not updating — what to check' },
            { icon: 'ri-ai-generate', text: 'AI test case generation limits and troubleshooting' },
            { icon: 'ri-plug-line', text: 'Integration setup issues (Jira, Slack, CI/CD)' },
            { icon: 'ri-lock-line', text: 'Permission errors and role-based access issues' },
            { icon: 'ri-database-2-line', text: 'Data export, import errors, and format questions' },
            { icon: 'ri-customer-service-2-line', text: 'How to contact support and submit bug reports' },
          ].map((item) => (
            <li key={item.text} className="flex items-center gap-3 text-gray-600">
              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className={`${item.icon} text-indigo-500 text-sm`}></i>
              </div>
              <span className="text-sm">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation */}
      <div className="mt-10 pt-8 border-t border-gray-200 flex items-center justify-start">
        <Link
          to="/docs/keyboard-shortcuts"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
          Keyboard Shortcuts
        </Link>
      </div>
    </DocsLayout>
  );
}
