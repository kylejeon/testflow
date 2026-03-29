import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocsLayout from '../../../components/docs/DocsLayout';

type SetupTab = 'slack' | 'teams';

const events = [
  {
    category: 'Team',
    items: [
      {
        name: 'invitation_received',
        desc: 'Fired when a new member is invited to the team.',
        payload: `{
  "event": "invitation_received",
  "timestamp": "2026-03-29T09:15:00Z",
  "data": {
    "team_id": "team_abc123",
    "invitee_email": "jane@example.com",
    "invited_by": "John Doe",
    "role": "member"
  }
}`,
      },
      {
        name: 'member_joined',
        desc: 'Fired when an invited member accepts and joins the team.',
        payload: `{
  "event": "member_joined",
  "timestamp": "2026-03-29T10:00:00Z",
  "data": {
    "team_id": "team_abc123",
    "member_id": "usr_xyz789",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "member"
  }
}`,
      },
    ],
  },
  {
    category: 'Test Runs',
    items: [
      {
        name: 'run_created',
        desc: 'Fired when a new test run is created.',
        payload: `{
  "event": "run_created",
  "timestamp": "2026-03-29T11:00:00Z",
  "data": {
    "run_id": "run_abc123",
    "project_id": "proj_def456",
    "title": "Sprint 12 Regression",
    "created_by": "John Doe",
    "total_cases": 47
  }
}`,
      },
      {
        name: 'run_completed',
        desc: 'Fired when all test cases in a run have a result.',
        payload: `{
  "event": "run_completed",
  "timestamp": "2026-03-29T14:30:00Z",
  "data": {
    "run_id": "run_abc123",
    "project_id": "proj_def456",
    "title": "Sprint 12 Regression",
    "passed": 40,
    "failed": 5,
    "blocked": 2,
    "pass_rate": 85.1
  }
}`,
      },
    ],
  },
  {
    category: 'Milestones',
    items: [
      {
        name: 'milestone_started',
        desc: 'Fired when a milestone start date is reached.',
        payload: `{
  "event": "milestone_started",
  "timestamp": "2026-03-29T00:00:00Z",
  "data": {
    "milestone_id": "ms_abc123",
    "project_id": "proj_def456",
    "title": "v2.0 Release",
    "start_date": "2026-03-29",
    "due_date": "2026-04-15"
  }
}`,
      },
      {
        name: 'milestone_completed',
        desc: 'Fired when all linked runs in a milestone are completed.',
        payload: `{
  "event": "milestone_completed",
  "timestamp": "2026-04-14T16:00:00Z",
  "data": {
    "milestone_id": "ms_abc123",
    "project_id": "proj_def456",
    "title": "v2.0 Release",
    "total_runs": 5,
    "overall_pass_rate": 92.3
  }
}`,
      },
      {
        name: 'milestone_past_due',
        desc: 'Fired when a milestone passes its due date with incomplete runs.',
        payload: `{
  "event": "milestone_past_due",
  "timestamp": "2026-04-16T00:00:00Z",
  "data": {
    "milestone_id": "ms_abc123",
    "project_id": "proj_def456",
    "title": "v2.0 Release",
    "due_date": "2026-04-15",
    "incomplete_runs": 2,
    "total_runs": 5
  }
}`,
      },
    ],
  },
];

export default function WebhooksPage() {
  const [setupTab, setSetupTab] = useState<SetupTab>('slack');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  return (
    <DocsLayout
      title="Webhooks | Testably Docs"
      description="Set up webhooks to receive real-time notifications in Slack, Microsoft Teams, and custom endpoints."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Webhooks</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Webhooks Guide</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Receive real-time notifications in Slack, Microsoft Teams, or any HTTP endpoint when important events happen in Testably.
        </p>
      </div>

      {/* Setup tabs */}
      <section className="mb-10">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setSetupTab('slack')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
              setupTab === 'slack'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="ri-slack-line text-base" />
            Slack
          </button>
          <button
            onClick={() => setSetupTab('teams')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
              setupTab === 'teams'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="ri-microsoft-line text-base" />
            Microsoft Teams
          </button>
        </div>

        {/* Slack setup */}
        {setupTab === 'slack' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-slack-line text-purple-500" />
              Slack Webhook Setup
            </h2>

            {/* Prerequisites */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Prerequisites</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <i className="ri-alert-line text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p>Create an Incoming Webhook in Slack first:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-amber-700">
                      <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">api.slack.com/apps</a></li>
                      <li>Create a new app (or select existing) &rarr; <span className="font-medium">Incoming Webhooks</span></li>
                      <li>Activate and add a new webhook to a channel</li>
                      <li>Copy the Webhook URL</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {[
                { num: 1, title: 'Open Integrations', desc: 'Go to Settings \u2192 Integrations in your Testably project.' },
                { num: 2, title: 'Add Webhook', desc: 'Click Add and select Slack.' },
                { num: 3, title: 'Paste URL', desc: 'Paste your Slack Incoming Webhook URL.' },
                { num: 4, title: 'Select Events', desc: 'Choose which events should trigger notifications (e.g. run_completed, milestone_past_due).' },
                { num: 5, title: 'Save & Test', desc: 'Click Save, then click Test to send a sample notification to your channel.' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{step.num}</span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{step.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams setup */}
        {setupTab === 'teams' && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-microsoft-line text-blue-600" />
              Microsoft Teams Webhook Setup
            </h2>

            {/* Prerequisites */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Prerequisites</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <i className="ri-alert-line text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p>Create an Incoming Webhook in Microsoft Teams first:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-amber-700">
                      <li>Open the Teams channel where you want notifications</li>
                      <li>Click the <span className="font-medium">...</span> menu &rarr; <span className="font-medium">Connectors</span></li>
                      <li>Find <span className="font-medium">Incoming Webhook</span> and click <span className="font-medium">Configure</span></li>
                      <li>Name your webhook and copy the URL</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {[
                { num: 1, title: 'Open Integrations', desc: 'Go to Settings \u2192 Integrations in your Testably project.' },
                { num: 2, title: 'Add Webhook', desc: 'Click Add and select Microsoft Teams.' },
                { num: 3, title: 'Paste URL', desc: 'Paste your Teams Incoming Webhook URL.' },
                { num: 4, title: 'Select Events', desc: 'Choose which events should trigger notifications.' },
                { num: 5, title: 'Save & Test', desc: 'Click Save, then click Test to send a sample notification to your channel.' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{step.num}</span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{step.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Supported Events */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-notification-3-line text-indigo-500" />
            Supported Events
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Testably can send webhook notifications for the following 7 events. Click an event to see its example payload.
          </p>

          <div className="space-y-6">
            {events.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.category}</h3>
                <div className="space-y-2">
                  {group.items.map((evt) => {
                    const isExpanded = expandedEvent === evt.name;
                    return (
                      <div key={evt.name} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : evt.name)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                              {evt.name}
                            </code>
                            <span className="text-sm text-gray-600">{evt.desc}</span>
                          </div>
                          <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-200">
                            <div className="flex items-center gap-2 bg-gray-900 px-4 py-2">
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">JSON Payload</span>
                            </div>
                            <pre className="bg-gray-900 text-gray-300 p-4 font-mono text-sm overflow-x-auto whitespace-pre">{evt.payload}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Management */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-settings-3-line text-indigo-500" />
            Webhook Management
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            After creating a webhook, you can manage it from <span className="font-medium text-gray-700">Settings &rarr; Integrations</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: 'ri-toggle-line', title: 'Toggle', desc: 'Enable or disable a webhook without deleting it.' },
              { icon: 'ri-edit-line', title: 'Edit', desc: 'Change the URL, events, or display name.' },
              { icon: 'ri-delete-bin-line', title: 'Delete', desc: 'Permanently remove a webhook configuration.' },
              { icon: 'ri-play-line', title: 'Test', desc: 'Send a sample payload to verify your endpoint.' },
            ].map((action) => (
              <div key={action.title} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <i className={`${action.icon} text-indigo-500`} />
                  <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                </div>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <i className="ri-information-line text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700">
                <span className="font-medium">Logs:</span> Each webhook keeps a delivery log showing the last 30 days of events with status codes, timestamps, and response times. Access it via the webhook detail page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Next steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Related Guides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/docs/integrations"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-links-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Jira Integration</p>
              <p className="text-xs text-gray-500">Create Jira issues from test results</p>
            </div>
          </Link>
          <Link
            to="/docs/cicd"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-git-merge-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">CI/CD Integration</p>
              <p className="text-xs text-gray-500">Automate result uploads from pipelines</p>
            </div>
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
