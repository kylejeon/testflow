import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

export default function DocsAccountBillingPage() {
  return (
    <DocsLayout
      title="Account & Billing | Testably Docs"
      description="Manage your Testably plan, payment methods, and invoices."
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
        <i className="ri-arrow-right-s-line"></i>
        <span className="text-gray-900 font-medium">Account &amp; Billing</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
          <i className="ri-bank-card-line text-indigo-600 text-xs"></i>
          <span className="text-indigo-700 text-xs font-medium">Account &amp; Billing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Account &amp; Billing</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Manage your subscription plan, payment methods, and billing history.
        </p>
      </div>

      {/* Coming Soon */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="ri-time-line text-amber-600 text-2xl"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Content coming soon</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
          This guide is currently being written by our team. Check back shortly for full documentation on managing your account and billing.
        </p>
      </div>

      {/* Topics Preview */}
      <div className="mt-10 bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Topics covered in this guide</h2>
        <ul className="space-y-3">
          {[
            { icon: 'ri-user-settings-line', text: 'Managing your account profile and settings' },
            { icon: 'ri-exchange-line', text: 'Upgrading or downgrading your subscription plan' },
            { icon: 'ri-bank-card-2-line', text: 'Adding and updating payment methods' },
            { icon: 'ri-file-text-line', text: 'Viewing and downloading invoices' },
            { icon: 'ri-team-line', text: 'Seat management and billing per workspace' },
            { icon: 'ri-close-circle-line', text: 'Cancelling your subscription' },
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
      <div className="mt-10 pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link
          to="/docs/team-permissions"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
          Team &amp; Permissions
        </Link>
        <Link
          to="/docs/keyboard-shortcuts"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          Keyboard Shortcuts
          <i className="ri-arrow-right-s-line"></i>
        </Link>
      </div>
    </DocsLayout>
  );
}
