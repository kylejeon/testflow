import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

const sections = [
  {
    icon: 'ri-play-circle-line',
    title: 'Creating a Test Run',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-list-check-2',
    title: 'Selecting & Assigning Test Cases',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-focus-3-line',
    title: 'Focus Mode — Executing Tests',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-bar-chart-box-line',
    title: 'Tracking Results & Progress',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-refresh-line',
    title: 'Run Statuses & Lifecycle',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-user-add-line',
    title: 'Assigning Team Members',
    content: 'Content coming soon — PM is writing this section.',
  },
];

export default function DocsTestRunsPage() {
  return (
    <DocsLayout
      title="Test Runs | Testably Docs"
      description="Learn how to create test runs, execute tests in Focus Mode, and track results."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Runs</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Runs</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Create test runs, assign cases to team members, execute tests in Focus Mode, and track pass/fail results in real time.
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
          <Link to="/docs/milestones" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-flag-line" /> Milestones →
          </Link>
          <Link to="/docs/discovery-logs" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-search-eye-line" /> Discovery Logs →
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
