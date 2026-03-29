import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

const sections = [
  {
    icon: 'ri-add-circle-line',
    title: 'Creating Test Cases',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-folder-3-line',
    title: 'Organizing with Folders & Tags',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-sparkling-line',
    title: 'AI-Assisted Generation',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-list-check-3',
    title: 'Bulk Operations',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-settings-3-line',
    title: 'Priority, Status & Lifecycle',
    content: 'Content coming soon — PM is writing this section.',
  },
];

export default function DocsTestCasesPage() {
  return (
    <DocsLayout
      title="Test Cases | Testably Docs"
      description="Learn how to create, organize, and manage test cases in Testably."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Cases</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Cases</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Create, organize, and manage your test cases. Use folders, tags, priorities, and AI-assisted generation to build a robust test library.
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
          <Link to="/docs/test-runs" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-play-circle-line" /> Test Runs →
          </Link>
          <Link to="/docs/milestones" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-flag-line" /> Milestones →
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
