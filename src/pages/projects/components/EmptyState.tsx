interface EmptyStateProps {
  onCreateProject: () => void;
  onTrySample: () => void;
  isSampleLoading?: boolean;
  onImport?: () => void;
}

const steps = [
  {
    icon: 'ri-folder-add-line',
    title: 'Create a project',
    desc: 'Set up your first QA project with a name and description. Takes 10 seconds.',
  },
  {
    icon: 'ri-file-list-3-line',
    title: 'Add test cases',
    desc: 'Write test cases manually or let AI generate them from your requirements.',
  },
  {
    icon: 'ri-play-circle-line',
    title: 'Run your tests',
    desc: 'Execute tests, track results, and share progress with your team.',
  },
];

export default function EmptyState({ onCreateProject, onTrySample, isSampleLoading, onImport }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
      style={{ animation: 'fadeIn 0.5s ease-out' }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' }}
      >
        <i className="ri-folder-add-line text-4xl text-indigo-500"></i>
      </div>

      {/* Title + description */}
      <h3 className="text-xl font-bold text-slate-900 mb-2">No projects yet</h3>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-8">
        Create your first QA project to start managing test cases, running tests,
        and tracking quality across your team.
      </p>

      {/* CTA buttons */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-full text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line text-base"></i>
          Create First Project
        </button>
        <button
          onClick={onTrySample}
          disabled={isSampleLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-full text-sm font-semibold hover:bg-violet-600 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSampleLoading ? (
            <i className="ri-loader-4-line text-base animate-spin"></i>
          ) : (
            <i className="ri-sparkling-line text-base"></i>
          )}
          {isSampleLoading ? 'Creating...' : 'Try Sample Project'}
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-full text-sm font-semibold hover:bg-indigo-50 transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-upload-cloud-line text-base"></i>
          Import from TestRail
        </button>
      </div>

      {/* Getting Started steps */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {steps.map((step, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-md transition-all cursor-default"
            style={{ animation: `fadeInUp 0.4s ease-out ${i * 60}ms backwards` }}
          >
            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center mb-3">
              {i + 1}
            </div>
            <i className={`${step.icon} text-xl text-indigo-500 mb-2 block`}></i>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">{step.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
