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

const bestPracticeSteps = [
  { num: 1, title: 'Create a milestone per release', desc: 'Name after the version number (e.g. "v2.5.0") so milestones are easy to identify in the list.' },
  { num: 2, title: 'Set realistic dates', desc: 'Align start and end dates with your sprint or release cycle. Overly optimistic dates create noise with overdue notifications.' },
  { num: 3, title: 'Create focused test runs', desc: 'Separate regression, smoke, and feature-specific runs. Link all of them to the same milestone for unified progress tracking.' },
  { num: 4, title: 'Monitor the dashboard daily', desc: 'Check overall progress and triage failed or blocked test cases promptly to avoid last-minute surprises.' },
  { num: 5, title: 'Complete the milestone', desc: "When critical tests pass and you're confident in quality, manually mark the milestone as Completed to finalize the record." },
];

export default function DocsMilestonesPage() {
  return (
    <DocsLayout
      title="Milestones | Testably Docs"
      description="Use milestones to track testing progress toward releases and sprint goals. Link runs, monitor progress, and manage sub-milestones."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Milestones</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Milestones</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Milestones represent release targets or sprint goals. Link test runs to milestones to track testing progress toward a release, and use sub-milestones to break large releases into manageable phases.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- Section 1: Creating a Milestone ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-flag-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Creating a Milestone</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Navigate to the <strong>Milestones</strong> tab in your project and click <strong>"+ New Milestone"</strong>. Fill in the required fields to define your milestone's scope and timeline.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Required Fields</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">Name</code>
                <span className="text-gray-500">Descriptive name for the release or sprint (e.g. "Release v2.5", "Sprint 12", "MVP Launch").</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">Start Date</code>
                <span className="text-gray-500">When testing begins for this milestone.</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">End Date</code>
                <span className="text-gray-500">Target completion date (the release or sprint deadline).</span>
              </div>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Milestone Status Flow</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            A newly created milestone starts as <strong>Upcoming</strong>. Status transitions happen automatically based on dates, except for <strong>Completed</strong> which is set manually.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Trigger</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Upcoming</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">upcoming</code></td>
                  <td className="px-4 py-3 text-gray-500">Start date is in the future.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Blue badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">In Progress</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">started</code></td>
                  <td className="px-4 py-3 text-gray-500">Start date has passed; milestone not yet completed.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Indigo badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Overdue</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">past_due</code></td>
                  <td className="px-4 py-3 text-gray-500">End date has passed but not all tests are complete.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Red badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Completed</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">completed</code></td>
                  <td className="px-4 py-3 text-gray-500">Manually marked as complete by an Admin or Member.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Green badge</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Section 2: Linking Test Runs ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-links-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Linking Test Runs</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Link test runs to a milestone when creating the run, or afterward from the run detail page. Multiple runs can be linked to a single milestone to cover different test types (regression, smoke, feature).
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Progress Calculation</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Milestone progress is calculated as the ratio of test cases with a final result (<strong>passed</strong>, <strong>failed</strong>, or <strong>blocked</strong>) to the total test cases across all linked runs.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Milestone Detail Page</h3>
          <ul className="space-y-2 text-sm text-gray-500 leading-relaxed">
            <li className="flex items-start gap-2">
              <i className="ri-bar-chart-horizontal-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>Overall progress bar with passed/failed/blocked segment breakdown.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-play-circle-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>All linked test runs with their individual progress displayed.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-search-eye-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>Linked discovery sessions for exploratory testing context.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-time-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>Activity timeline showing recent test results, run completions, and status changes.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-error-warning-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>Failed and blocked test cases listed for quick triage, grouped by run.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-bug-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span>Jira issues linked from failed test results (requires Jira integration).</span>
            </li>
          </ul>
        </section>

        {/* ---- Section 3: Sub-Milestones ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-node-tree text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sub-Milestones</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Create sub-milestones to organize large releases into phases. Each sub-milestone has its own test runs and progress tracking, and rolls up into the parent milestone's aggregate progress.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Creating a Sub-Milestone</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            On the Milestones page, click the <strong>"+ Sub"</strong> button on any existing milestone. The new milestone is automatically nested under the parent.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Example Structure</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 mb-4">
            <div className="space-y-1 text-sm font-mono text-gray-700">
              <div className="flex items-center gap-2">
                <i className="ri-flag-fill text-indigo-500"></i>
                <span className="font-semibold">Release v3.0</span>
                <span className="text-gray-400 font-sans text-xs">(parent)</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <i className="ri-corner-down-right-line text-gray-400"></i>
                <i className="ri-flag-line text-indigo-400"></i>
                <span>Phase 1: Core Features</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <i className="ri-corner-down-right-line text-gray-400"></i>
                <i className="ri-flag-line text-indigo-400"></i>
                <span>Phase 2: Integrations</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <i className="ri-corner-down-right-line text-gray-400"></i>
                <i className="ri-flag-line text-indigo-400"></i>
                <span>Phase 3: Performance Testing</span>
              </div>
            </div>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The parent milestone's progress reflects the <strong>aggregate progress</strong> across all sub-milestones. Sub-milestones can be expanded or collapsed in the list view.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Roll-up 자동 집계</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-3">
            Sub milestone이 1개 이상인 parent는 <strong>Roll-up 모드</strong>로 자동 전환됩니다:
          </p>
          <ul className="space-y-1.5 mb-4">
            {[
              '진행률 = (모든 sub TC + parent 직속 TC) 합산으로 자동 계산',
              '상태 = sub들의 상태 조합으로 자동 결정 (수동 변경 불가)',
              '기간 = date_mode="auto"이면 sub의 min(start)~max(end)로 자동 계산',
              '🔄 Roll-up 배지가 parent 카드에 표시됨',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="text-base font-semibold text-gray-900 mb-2">기간 모드 (Date Mode)</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Edit 모달에서 <strong>🔄 Auto</strong> / <strong>✏️ Manual</strong> 토글로 전환할 수 있습니다.
            Manual 모드에서 sub의 기간이 parent 범위를 벗어나면 경고 배지가 표시됩니다.
          </p>
        </section>

        {/* ---- Section 4: Progress Tracking Dashboard ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-dashboard-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Progress Tracking Dashboard</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The Milestone Detail page serves as a comprehensive progress dashboard, combining test results, team activity, and timeline data in one view.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Overall Progress Bar</p>
              <p className="text-sm text-gray-500 leading-relaxed">Visual percentage with color-coded segments: green (passed), red (failed), yellow (blocked).</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Test Summary</p>
              <p className="text-sm text-gray-500 leading-relaxed">Total tests, passed, failed, and blocked counts across all linked runs.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Time Tracking</p>
              <p className="text-sm text-gray-500 leading-relaxed">Days remaining, days elapsed, and an overdue indicator if the end date has passed.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Run Contributors</p>
              <p className="text-sm text-gray-500 leading-relaxed">Avatar stack of all team members who contributed results to linked runs.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Activity Timeline</p>
              <p className="text-sm text-gray-500 leading-relaxed">Most recent test results, run completions, and status changes in chronological order.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Failed &amp; Blocked List</p>
              <p className="text-sm text-gray-500 leading-relaxed">All failed/blocked test cases grouped by run name, with author and timestamp for each.</p>
            </div>
          </div>
        </section>

        {/* ---- Section 5: Best Practices ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-lightbulb-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Release Management Best Practices</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Follow these practices to get the most value from milestones and ensure smooth, well-tracked releases.
          </p>

          <StepList steps={bestPracticeSteps} />

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">Webhook Events</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Overdue milestones automatically change status and trigger notifications. Available webhook events: <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-xs font-mono">milestone_started</code>, <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-xs font-mono">milestone_completed</code>, <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-xs font-mono">milestone_past_due</code>. Configure in <strong>Settings → Integrations</strong> to receive Slack or Teams alerts.
            </p>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">Explore test runs to understand how progress is generated, or learn about exploratory testing with Exploratory.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/test-runs"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-play-circle-line"></i>
              Test Runs →
            </Link>
            <Link
              to="/docs/discovery-logs"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-search-eye-line"></i>
              Exploratory →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
