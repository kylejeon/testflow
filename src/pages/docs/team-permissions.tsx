import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

const sections = [
  {
    icon: 'ri-user-add-line',
    title: 'Inviting Team Members',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-shield-user-line',
    title: 'Roles: Admin, Member, Viewer',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-lock-2-line',
    title: 'Permission Matrix',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-user-settings-line',
    title: 'Managing Members',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-mail-send-line',
    title: 'Invitation Flow',
    content: 'Content coming soon — PM is writing this section.',
  },
];

export default function DocsTeamPermissionsPage() {
  return (
    <DocsLayout
      title="Team & Permissions | Testably Docs"
      description="Learn how to invite team members, assign roles, and manage permissions in Testably."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Team & Permissions</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Team & Permissions</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Invite team members, assign roles (Admin, Member, Viewer), and control access to projects and features across your organization.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className={`${section.icon} text-indigo-500`} />
                {section.title}
              </h2>
              <p className="text-gray-400 italic">{section.content}</p>
            </div>
          </section>
        ))}
      </div>

      {/* Next steps */}
      <div className="mt-10 bg-indigo-50 border border-indigo-100 rounded-xl p-6">
        <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/docs/getting-started" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-rocket-line" /> Getting Started →
          </Link>
          <Link to="/docs/integrations" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-plug-line" /> Integrations →
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
