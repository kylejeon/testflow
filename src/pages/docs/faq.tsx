'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full text-left px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-start justify-between gap-3"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span className="font-semibold text-gray-900 text-sm leading-relaxed">{item.q}</span>
            <i className={`ri-arrow-${openIndex === i ? 'up' : 'down'}-s-line text-gray-400 flex-shrink-0 mt-0.5`}></i>
          </button>
          {openIndex === i && (
            <div className="px-5 py-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const generalFaqs: FaqItem[] = [
  {
    q: 'Q1. What is Testably?',
    a: 'Testably is a test management platform for software QA teams. You can write test cases, run tests, track milestones, record exploratory testing with Exploratory, integrate with Jira, connect CI/CD pipelines, and automate test case generation with AI — all in one place.',
  },
  {
    q: 'Q2. Can I use Testably for free?',
    a: 'Yes. The Free plan is permanently free and supports 1 project, up to 2 team members, and 3 AI-generated test cases per month. It\'s ideal for small teams or personal projects. Upgrade to Hobby ($19/mo) or higher when you need more.',
  },
  {
    q: 'Q3. How many team members can I invite?',
    a: (
      <>
        It depends on your plan: Free (2), Hobby (5), Starter (5), Professional (20), Enterprise S (50), Enterprise M (100), Enterprise L (100+). These limits apply to <strong>Admin and Member roles only</strong>. <strong>Viewer role members do not count toward the seat limit</strong> and can be invited for free with no cap. Use the Viewer role for stakeholders who need read-only access.
      </>
    ),
  },
  {
    q: 'Q4. Is there a discount for annual billing?',
    a: 'Yes. Choosing Annual billing saves 15% compared to monthly pricing. For example, Professional is ~$84/mo (billed $1,009/yr) instead of $99/mo. You can switch billing cycles in Settings > Billing.',
  },
  {
    q: 'Q5. Can I import data from another test management tool?',
    a: 'Yes. Testably supports importing from TestRail, Zephyr, Qase, and other tools. Click the "Import" button on the Test Cases list page to upload a CSV or XML file. The onboarding banner on your dashboard also includes a one-click "Import from TestRail" option for quick migration.',
  },
];

const accountFaqs: FaqItem[] = [
  {
    q: 'Q6. I forgot my password. How do I reset it?',
    a: 'On the login page, click "Forgot your password?" and enter the email address you registered with. You\'ll receive a reset link by email. Click the link to set a new password. If you signed up with Google, manage your password through Google Account settings instead.',
  },
  {
    q: 'Q7. I signed up with Google. Can I switch to email/password login?',
    a: 'Switching between Google login and email/password login is not currently supported. An account created with Google will continue to use Google authentication. If you need email/password login, create a new account.',
  },
  {
    q: 'Q8. What happens to my data if I delete my account?',
    a: (
      <>
        Account deletion is permanent and cannot be undone. The following data is permanently removed: profile information, owned projects, test cases, test run history, Discovery Log sessions, milestones, and all uploaded attachments. We strongly recommend exporting your data from <strong>Settings &gt; Data Export</strong> (JSON or CSV) before deleting your account.
      </>
    ),
  },
];

const featureFaqs: FaqItem[] = [
  {
    q: 'Q9. How do I use AI test case generation?',
    a: (
      <>
        Click <strong>"AI Generate"</strong> on the Test Cases list page. Choose a mode:
        <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
          <li><strong>Text-based:</strong> Describe a feature in plain text and AI generates test cases.</li>
          <li><strong>Session-based (Professional+):</strong> Select a Discovery Log session and AI generates test cases from your exploratory testing notes.</li>
        </ul>
        <p className="mt-2">Monthly generation limits: Free (5), Starter (30), Professional (150), Enterprise (unlimited).</p>
      </>
    ),
  },
  {
    q: 'Q10. What is Focus Mode?',
    a: (
      <>
        Focus Mode is a dedicated execution UI for rapidly recording test results. Open it from a Test Run detail page by clicking <strong>"Focus Mode"</strong> or pressing <strong>Cmd+Shift+F</strong>. The left panel shows your test case list; the right shows details and result input. Use keyboard shortcuts to record results instantly: <strong>P</strong> = Passed, <strong>F</strong> = Failed, <strong>B</strong> = Blocked, <strong>R</strong> = Retest, <strong>S</strong> = Skip. Each keypress automatically advances to the next test.
      </>
    ),
  },
  {
    q: 'Q11. How do I set up Jira integration?',
    a: (
      <>
        Go to <strong>Settings &gt; Integrations</strong> and find the Jira Integration section. Enter your Jira domain (e.g. <code className="bg-gray-100 px-1 rounded text-xs">yourteam.atlassian.net</code>), email, and API token, then click Connect. After connecting, you can create or link Jira issues directly from test results. Jira integration requires the Starter plan or higher.
      </>
    ),
  },
  {
    q: 'Q12. Can I integrate with CI/CD pipelines?',
    a: 'Yes, on Professional and higher plans. Go to Settings > CI/CD Pipelines to generate an API token. YAML code snippets are provided for GitHub Actions, GitLab CI, and Python scripts so you can automatically report test results from your pipeline.',
  },
];

const troubleshooting: FaqItem[] = [
  {
    q: "T1. I can't log in.",
    a: (
      <div className="space-y-3">
        <p><strong>Email/password login:</strong> Double-check your password and make sure Caps Lock is off. Click "Forgot your password?" to reset if needed.</p>
        <p><strong>Google login:</strong> Make sure you're signed into Google first. Check that your browser's popup blocker isn't blocking the Google authentication window — allow popups for the Testably domain.</p>
        <p><strong>General:</strong> Clear your browser cache and cookies, then try again. Try a different browser. If the problem persists, contact support.</p>
      </div>
    ),
  },
  {
    q: 'T2. I completed payment but my plan was not upgraded.',
    a: (
      <div className="space-y-2">
        <p>Plan upgrades typically apply immediately after a successful Paddle payment, but occasionally a few minutes of network delay can occur.</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-500">
          <li>Refresh the page (F5).</li>
          <li>Log out and log back in.</li>
          <li>If still not reflected after 5 minutes, check the Paddle confirmation email and forward it to <strong>hello@testably.app</strong> for assistance.</li>
        </ol>
      </div>
    ),
  },
  {
    q: 'T3. I accidentally deleted a test case. Can I recover it?',
    a: 'Testably does not currently offer automatic recovery (undo) for deleted test cases. A confirmation modal is shown before deletion — please review carefully before confirming. To protect important data, regularly export backups from Settings > Data Export (JSON or CSV).',
  },
  {
    q: 'T4. Jira integration is not working.',
    a: (
      <div className="space-y-2">
        <p>Check the following:</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-500">
          <li>Jira domain is correct (e.g. <code className="bg-gray-100 px-1 rounded text-xs">yourteam.atlassian.net</code> — no <code className="bg-gray-100 px-1 rounded text-xs">https://</code>).</li>
          <li>Email matches your Atlassian account.</li>
          <li>API token is valid — generate a new one from Atlassian account settings and re-enter it.</li>
          <li>You have access permission to the Jira project.</li>
          <li>You're on the Starter plan or higher (Free only supports Jira Link, not full integration).</li>
        </ol>
        <p>If all checks pass and the issue continues, contact support.</p>
      </div>
    ),
  },
  {
    q: 'T5. Pages are slow or not loading.',
    a: (
      <div className="space-y-2">
        <ol className="list-decimal list-inside space-y-1 text-gray-500">
          <li>Check your internet connection.</li>
          <li>Update your browser to the latest version (Chrome, Firefox, Safari, Edge recommended).</li>
          <li>Clear browser cache (Cmd+Shift+Delete or Ctrl+Shift+Delete).</li>
          <li>Temporarily disable browser extensions, especially ad blockers.</li>
          <li>Try a different browser.</li>
          <li>If the problem persists, open DevTools (F12) &gt; Console tab, capture any error messages, and include them in your support request.</li>
        </ol>
      </div>
    ),
  },
];

export default function DocsFaqPage() {
  return (
    <DocsLayout
      title="FAQ & Troubleshooting | Testably Docs"
      description="Frequently asked questions and common error resolution for Testably."
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
        <i className="ri-arrow-right-s-line text-gray-400" />
        <span className="text-gray-900 font-medium">FAQ &amp; Troubleshooting</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3">FAQ &amp; Troubleshooting</h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-2xl mb-10">
        Have questions or running into an issue? Browse frequently asked questions and common resolutions below. If you can't find what you're looking for, see the support section at the bottom.
      </p>

      <div className="space-y-8">
        {/* ── General ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-information-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">General</h2>
          </div>
          <FaqAccordion items={generalFaqs} />
        </section>

        {/* ── Account & Login ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Account &amp; Login</h2>
          </div>
          <FaqAccordion items={accountFaqs} />
        </section>

        {/* ── Features ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-lightbulb-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Features</h2>
          </div>
          <FaqAccordion items={featureFaqs} />
        </section>

        {/* ── Troubleshooting ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <i className="ri-tools-line text-amber-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Troubleshooting</h2>
          </div>
          <FaqAccordion items={troubleshooting} />
        </section>

        {/* ── Contact Support ── */}
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-customer-service-2-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Contact Support</h2>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-5">
            Couldn't find an answer above? Reach out to the Testably team directly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-indigo-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-mail-line text-indigo-500"></i>
                <span className="font-semibold text-gray-900 text-sm">Email Support</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Email us at <a href="mailto:hello@testably.app" className="text-indigo-600 font-medium hover:underline">hello@testably.app</a>. Include a description of the issue, screenshots or error messages, and the page URL where the problem occurred.
              </p>
            </div>
            <div className="bg-white border border-indigo-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-layout-line text-indigo-500"></i>
                <span className="font-semibold text-gray-900 text-sm">In-App Support</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Use the "Contact" link in the app footer or find the Support section in Settings to submit a request form.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-indigo-100 rounded-lg overflow-hidden">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-indigo-100">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-indigo-100">Support Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-indigo-100">Response Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50 bg-white">
                <tr className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">Free / Starter</td>
                  <td className="px-4 py-3 text-gray-500">Community support</td>
                  <td className="px-4 py-3 text-gray-500">1–3 business days</td>
                </tr>
                <tr className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">Professional</td>
                  <td className="px-4 py-3 text-gray-500">Priority support</td>
                  <td className="px-4 py-3 text-gray-500">Within 24 business hours</td>
                </tr>
                <tr className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">Enterprise</td>
                  <td className="px-4 py-3 text-gray-500">Dedicated support</td>
                  <td className="px-4 py-3 text-gray-500">SLA-guaranteed response</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-white border border-indigo-100 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Tips for a faster resolution</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Include your browser and OS (e.g. Chrome 131, macOS Sonoma), account email, the URL where the issue occurred, reproduction steps, and any error messages or screenshots.
            </p>
          </div>
        </section>
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
