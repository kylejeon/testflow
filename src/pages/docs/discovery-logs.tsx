import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

const sections = [
  {
    icon: 'ri-search-eye-line',
    title: 'What are Discovery Logs?',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-play-circle-line',
    title: 'Starting a Discovery Session',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-edit-box-line',
    title: 'Recording Observations',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-screenshot-line',
    title: 'Capturing Screenshots',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-file-transfer-line',
    title: 'Converting to Test Cases',
    content: 'Content coming soon — PM is writing this section.',
  },
  {
    icon: 'ri-bug-line',
    title: 'Linking to Jira Issues',
    content: 'Content coming soon — PM is writing this section.',
  },
];

export default function DocsDiscoveryLogsPage() {
  return (
    <DocsLayout
      title="Discovery Logs | Testably Docs"
      description="Learn how to run exploratory testing sessions and record observations with Discovery Logs."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Discovery Logs</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Discovery Logs</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Run exploratory testing sessions, record observations and screenshots, link bugs to Jira, and convert findings into structured test cases.
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
          <Link to="/docs/test-cases" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-file-list-3-line" /> Test Cases →
          </Link>
          <Link to="/docs/integrations" className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <i className="ri-plug-line" /> Jira Integration →
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
