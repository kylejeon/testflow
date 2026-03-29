import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

const sections = [
  {
    icon: 'ri-flag-line',
    title: 'Creating Milestones',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-git-branch-line',
    title: 'Sub-Milestones',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-links-line',
    title: 'Linking Test Runs to Milestones',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Progress Tracking',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Deadlines & Status',
    content: 'Content coming soon — PM is writing this section.',
  },
];

export default function DocsMilestonesPage() {
  return (
    <DocsLayout
      title="Milestones | Testably Docs"
      description="Learn how to create milestones, link test runs, and track release progress in Testably."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Milestones</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Milestones</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Organize your testing around release milestones. Link test runs, track progress, set deadlines, and manage sub-milestones for phased releases.
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
          <Link to="/docs/discovery-logs" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-search-eye-line" /> Discovery Logs →
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
