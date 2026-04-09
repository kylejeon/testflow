import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

function StepList({ steps }: { steps: { num: number; title: string; desc: string; danger?: boolean }[] }) {
  return (
    <ol className="space-y-4 mt-5">
      {steps.map((step) => (
        <li key={step.num} className="flex items-start gap-4">
          <span className={`flex-shrink-0 w-8 h-8 rounded-full ${step.danger ? 'bg-red-600' : 'bg-indigo-600'} text-white text-sm font-bold flex items-center justify-center mt-0.5`}>
            {step.num}
          </span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
            <p className="text-gray-500 text-sm leading-relaxed mt-0.5">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const plans = [
  { name: 'Free', price: '$0', projects: '1', members: 'Up to 2', ai: '3 / mo', features: 'Basic test management, Jira read-only, 100 TCs/project, 10 runs/mo, community support' },
  { name: 'Hobby', price: '$19 / mo', projects: 'Up to 3', members: 'Up to 5', ai: '15 / mo', features: 'CSV export, full Jira, RTM/Traceability, Steps Library (10), 200 TCs/project, unlimited runs' },
  { name: 'Starter', price: '$49 / mo', projects: 'Up to 10', members: 'Up to 5', ai: '30 / mo', features: 'Jira integration, Slack & Teams, reporting, Export/Import, PDF reports, Steps Library (20)' },
  { name: 'Professional', price: '$99 / mo', projects: 'Unlimited', members: 'Up to 20', ai: '150 / mo', features: 'Advanced reporting, CI/CD integration, priority support, unlimited Steps Library' },
  { name: 'Enterprise S', price: '$249 / mo', projects: 'Unlimited', members: '21–50', ai: 'Unlimited', features: 'Dedicated support, SLA guarantee' },
  { name: 'Enterprise M', price: '$499 / mo', projects: 'Unlimited', members: '51–100', ai: 'Unlimited', features: 'Dedicated support, SLA guarantee' },
  { name: 'Enterprise L', price: 'Custom', projects: 'Unlimited', members: '100+', ai: 'Unlimited', features: 'Custom contract & SLA, dedicated support' },
];

const deleteSteps = [
  { num: 1, title: 'Click "Delete Account"', desc: 'Click the red "Delete Account" button in the Danger Zone section of Settings > Profile.', danger: true },
  { num: 2, title: 'Enter your email address', desc: 'A confirmation modal appears. Enter the exact email address registered to your account. This step prevents accidental deletion.', danger: true },
  { num: 3, title: 'Confirm deletion', desc: 'Once the email matches, the "I understand, delete my account" button becomes active. Click it to permanently delete your account and all associated data.', danger: true },
];

export default function DocsAccountBillingPage() {
  return (
    <DocsLayout
      title="Account & Billing | Testably Docs"
      description="Manage your Testably plan, payment methods, and invoices."
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
        <i className="ri-arrow-right-s-line text-gray-400" />
        <span className="text-gray-900 font-medium">Account &amp; Billing</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Account &amp; Billing</h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-2xl mb-10">
        Manage your profile, subscription plan, payment methods, and billing history. This guide covers everything from account creation to plan upgrades and account deletion.
      </p>

      <div className="space-y-8">
        {/* ── Section 1: Account Creation & Login ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Account Creation &amp; Login</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Testably supports two ways to create an account and sign in.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">How it works</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">Email sign-up</td>
                  <td className="px-4 py-3 text-gray-500">Enter your email address and password. Your account is immediately usable after email verification.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">Google login</td>
                  <td className="px-4 py-3 text-gray-500">Click "Continue with Google" to sign up or log in instantly with your Google account. No separate password required.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Tip</p>
            <p className="text-sm text-blue-800">If you signed up with Google, no separate password is set. Manage your security through Google Account settings instead.</p>
          </div>
        </section>

        {/* ── Section 2: Profile Management ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-settings-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Profile Management</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Update your display name, avatar, and password from <strong>Settings &gt; Profile</strong>.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Display Name</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Navigate to <strong>Settings &gt; Profile</strong> and edit the <strong>Display Name</strong> field. Click <strong>"Save Changes"</strong> to apply. Your name is shown across project member lists, test result authors, and comments.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-6">Avatar</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">Testably supports two avatar types:</p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <i className="ri-emotion-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
              <span><strong>Emoji avatar (default):</strong> A default emoji avatar is set when you create your account. Open the emoji palette in Profile settings to choose a different one.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <i className="ri-image-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
              <span><strong>Photo upload:</strong> Click the avatar area to upload an image. Supported formats: JPEG, PNG, WebP — max 2 MB. An uploaded photo takes priority over the emoji avatar.</span>
            </li>
          </ul>

          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-6">Change Password</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Email-registered users can change their password in the <strong>Change Password</strong> section at the bottom of Settings &gt; Profile. Enter your new password, confirm it, then click <strong>"Update Password"</strong>. Click the eye icon on the right to toggle password visibility.
          </p>

          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Note</p>
            <p className="text-sm text-amber-800">The password change section is not shown for Google login users. Manage your password through Google Account settings.</p>
          </div>
        </section>

        {/* ── Section 3: Subscription Plans ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-bar-chart-box-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Subscription Plans</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Testably offers plans for teams of all sizes. Start free and upgrade as you grow. View your current plan in <strong>Settings &gt; Billing</strong>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">Plan</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">Price</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">Projects</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">Members</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">AI Generation</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700 border-b border-gray-200">Key Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.name} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-semibold text-gray-900">{plan.name}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{plan.price}</td>
                    <td className="px-3 py-3 text-gray-500">{plan.projects}</td>
                    <td className="px-3 py-3 text-gray-500">{plan.members}</td>
                    <td className="px-3 py-3 text-gray-500">{plan.ai}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs leading-relaxed">{plan.features}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Annual Discount</p>
            <p className="text-sm text-green-800">Choose Annual billing and save <strong>15%</strong> compared to monthly. For example, Professional is ~$84/mo (billed $1,009/yr) instead of $99/mo. Toggle between Monthly and Annual when selecting a plan.</p>
          </div>

          <div className="mt-3 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Viewer Free Policy</p>
            <p className="text-sm text-purple-800"><strong>Viewers</strong> do not count toward your seat limit and can be invited for free — unlimited. Seat limits only apply to Admin and Member roles. Use the Viewer role for stakeholders who need read-only access.</p>
          </div>
        </section>

        {/* ── Section 4: Payments & Invoices ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-bank-card-2-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payments &amp; Invoice History</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Testably uses <strong>Paddle</strong> as its payment platform. Paddle handles tax calculation and receipt generation automatically.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-3">Payment Flow</h3>
          <StepList steps={[
            { num: 1, title: 'Click "Upgrade"', desc: 'Click the Upgrade button in Settings > Billing, or select a plan from the plan comparison modal.' },
            { num: 2, title: 'Paddle checkout overlay', desc: 'The Paddle checkout screen appears. Choose your payment method: credit card or PayPal.' },
            { num: 3, title: 'Complete payment', desc: 'Finish checkout on Paddle. Your plan upgrades immediately upon successful payment.' },
            { num: 4, title: 'Confirmation', desc: 'The new plan badge appears in your profile. A receipt is emailed by Paddle.' },
          ]} />

          <h3 className="text-base font-semibold text-gray-900 mb-3 mt-8">Invoice History</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-3">
            Find past billing records in the <strong>Invoice History</strong> section at the bottom of Settings &gt; Billing.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Column</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { col: 'Date', detail: 'Payment date' },
                  { col: 'Description', detail: 'Plan name and billing cycle (e.g. Professional — Monthly)' },
                  { col: 'Amount', detail: 'Amount charged' },
                  { col: 'Status', detail: '"Paid" badge' },
                  { col: 'Download', detail: 'Click the icon to download a PDF receipt' },
                ].map((row) => (
                  <tr key={row.col} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.col}</td>
                    <td className="px-4 py-3 text-gray-500">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Free plan users see: <em>"No invoices yet. Upgrade to a paid plan to see your billing history."</em>
          </p>

          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Trial</p>
            <p className="text-sm text-blue-800">If a free trial is available for a plan, the Current Plan card shows <strong>"Trial ends in X days"</strong>. When the trial expires, the account automatically reverts to the Free plan.</p>
          </div>
        </section>

        {/* ── Section 5: Danger Zone ── */}
        <section className="bg-white border border-red-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <i className="ri-delete-bin-line text-red-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Account Deletion <span className="text-red-600">(Danger Zone)</span></h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            The Danger Zone is at the bottom of <strong>Settings &gt; Profile</strong>. Account deletion is permanent and cannot be undone.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <i className="ri-error-warning-line"></i>
              Warning: Deleting your account permanently removes all your data.
            </p>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-3">Deletion Steps</h3>
          <StepList steps={deleteSteps} />

          <div className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Data removed on deletion</p>
            <p className="text-sm text-red-800">Profile information, owned projects, test cases, test run history, Discovery Log sessions, milestones, and all uploaded attachments are permanently deleted. We strongly recommend exporting your data from <strong>Settings &gt; Data Export</strong> before deleting your account.</p>
          </div>
        </section>
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
