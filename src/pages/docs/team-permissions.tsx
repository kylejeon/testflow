import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

function StepList({ steps }: { steps: { num: number; title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4 mt-5">
      {steps.map((step) => (
        <li key={step.num} className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
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

const inviteSteps = [
  { num: 1, title: 'Click "Invite Member"', desc: 'Opens the invitation modal from Settings → Members or the project detail page.' },
  { num: 2, title: 'Enter email address', desc: "No existing Testably account is needed. A new account will be created automatically when the invitee accepts." },
  { num: 3, title: 'Choose a role', desc: 'Select Admin, Member, or Viewer. Review the permissions table below to choose the right role.' },
  { num: 4, title: 'Send invitation', desc: 'Click "Invite". The person receives an email with a join link that is valid for 7 days.' },
  { num: 5, title: 'Invitation accepted', desc: 'When the invitee clicks the link, they join the project with the assigned role. Their status changes from "Pending" to "Active".' },
];

const teamSetupSteps = [
  { num: 1, title: 'Start with at least 2 Admins', desc: 'This ensures you always have a backup administrator if one person is unavailable.' },
  { num: 2, title: 'Give QA engineers the Member role', desc: 'Members can create test cases, run tests, and record results — everything needed for day-to-day QA work.' },
  { num: 3, title: 'Invite product managers and stakeholders as Viewers', desc: 'Viewers can see all test results and progress without any seat cost. Ideal for keeping stakeholders informed.' },
  { num: 4, title: 'Review roles periodically', desc: "As team responsibilities change, update roles accordingly. An Admin can change any member's role at any time from Settings → Members." },
];

const permissions = [
  { action: 'View test cases, runs, milestones', viewer: true, member: true, admin: true },
  { action: 'View test results & reports', viewer: true, member: true, admin: true },
  { action: 'View discovery sessions', viewer: true, member: true, admin: true },
  { action: 'Create & edit test cases', viewer: false, member: true, admin: true },
  { action: 'Create & execute test runs', viewer: false, member: true, admin: true },
  { action: 'Record test results', viewer: false, member: true, admin: true },
  { action: 'Create discovery sessions', viewer: false, member: true, admin: true },
  { action: 'Create milestones', viewer: false, member: true, admin: true },
  { action: 'Invite new members', viewer: false, member: false, admin: true },
  { action: 'Change member roles', viewer: false, member: false, admin: true },
  { action: 'Remove members', viewer: false, member: false, admin: true },
  { action: 'Manage project settings', viewer: false, member: false, admin: true },
  { action: 'Configure integrations', viewer: false, member: false, admin: true },
  { action: 'Delete project', viewer: false, member: false, admin: true },
];

function Check() {
  return <span className="text-green-600 font-bold">✅</span>;
}
function Cross() {
  return <span className="text-gray-300 font-bold">❌</span>;
}

export default function DocsTeamPermissionsPage() {
  return (
    <DocsLayout
      title="Team & Permissions | Testably Docs"
      description="Invite team members, understand roles (Admin, Member, Viewer), and manage access to your Testably projects."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Team & Permissions</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Team &amp; Permissions</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Collaborate with your team by inviting members to your projects. Testably offers three roles — Admin, Member, and Viewer — to control who can do what. Viewers are always free, making it easy to include stakeholders without increasing costs.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- Section 1: Inviting Team Members ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inviting Team Members</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Invite anyone to your project from <strong>Settings → Members</strong> or from the project detail page. Invitees do not need an existing Testably account.
          </p>
          <StepList steps={inviteSteps} />
        </section>

        {/* ---- Section 2: Roles Comparison ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-shield-user-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Roles Comparison</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Testably has three roles. Each role builds on the permissions of the previous one — Admins have everything Members have, and Members have everything Viewers have.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Permission</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Viewer</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Member</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {permissions.map((row) => (
                  <tr key={row.action} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.action}</td>
                    <td className="px-4 py-3 text-center">{row.viewer ? <Check /> : <Cross />}</td>
                    <td className="px-4 py-3 text-center">{row.member ? <Check /> : <Cross />}</td>
                    <td className="px-4 py-3 text-center">{row.admin ? <Check /> : <Cross />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">Admin</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Full access to all features. Can manage team membership, project settings, integrations, and billing. The project creator is automatically the first Admin.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">Member</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Can create and edit test cases, create and execute test runs, record results, and use all QA features. Cannot manage team membership or project settings. Best for QA engineers and developers.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">Viewer</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Read-only access. Can view all test cases, runs, milestones, and results but cannot create or modify anything. Best for project managers, product owners, and stakeholders. Always free — does not count toward seat limits.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Section 3: Access Control Rules ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-lock-2-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Access Control Rules</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Access in Testably is managed at the project level. The same person can hold different roles in different projects.
          </p>

          <ul className="space-y-3 text-sm text-gray-500 leading-relaxed">
            <li className="flex items-start gap-2">
              <i className="ri-building-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Project-level access:</strong> Members are invited per project. Being an Admin in one project does not grant access to another.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-refresh-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Changing roles:</strong> Admins can change any member's role at any time from the Members section. The change takes effect immediately.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-user-unfollow-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Removing members:</strong> Admins can remove members at any time. Access is revoked immediately. Previously recorded test results are preserved.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-logout-box-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Self-removal:</strong> Any member can leave a project and remove their own access at any time.</span>
            </li>
          </ul>
        </section>

        {/* ---- Section 4: Viewer Free Policy ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-eye-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Viewer Free Policy</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Viewers are <strong>always free</strong> and do not count toward your plan's seat limit. You can invite unlimited stakeholders as Viewers without increasing costs.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">How Seat Counting Works</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Seat Limit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Counts Toward Limit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Free (Unlimited)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Free</td>
                  <td className="px-4 py-3 text-gray-500">1 seat</td>
                  <td className="px-4 py-3 text-gray-500">Admin, Member</td>
                  <td className="px-4 py-3 text-gray-500">Viewer</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Starter</td>
                  <td className="px-4 py-3 text-gray-500">5 seats</td>
                  <td className="px-4 py-3 text-gray-500">Admin, Member</td>
                  <td className="px-4 py-3 text-gray-500">Viewer</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Professional</td>
                  <td className="px-4 py-3 text-gray-500">15 seats</td>
                  <td className="px-4 py-3 text-gray-500">Admin, Member</td>
                  <td className="px-4 py-3 text-gray-500">Viewer</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Enterprise</td>
                  <td className="px-4 py-3 text-gray-500">Unlimited</td>
                  <td className="px-4 py-3 text-gray-500">Admin, Member</td>
                  <td className="px-4 py-3 text-gray-500">Viewer</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-green-800 mb-1">Example</p>
            <p className="text-sm text-green-700 leading-relaxed">
              On the <strong>Starter plan (5 seats)</strong>, you could have: 1 Admin + 4 Members + <strong>unlimited Viewers</strong>. Your entire company — product managers, executives, customers — can observe testing progress at no extra cost.
            </p>
          </div>
        </section>

        {/* ---- Section 5: Managing Your Team ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-team-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Managing Your Team</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The <strong>Members list</strong> (Settings → Members) shows all current and pending members. Each row displays: name/email, role, join date, last active date, and action buttons (change role / remove — visible to Admins only).
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3 mb-5">
            <i className="ri-mail-send-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Pending invitations</strong> appear in the list with a "Pending" badge. Admins can resend the invitation email or cancel the invite from the same row.
            </p>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Tips for Team Setup</h3>
          <StepList steps={teamSetupSteps} />
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">Learn the basics or set up integrations to connect Testably with your existing tools.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/getting-started"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-rocket-line"></i>
              Getting Started →
            </Link>
            <Link
              to="/docs/integrations"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-plug-line"></i>
              Integrations →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
