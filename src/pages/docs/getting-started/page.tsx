import { Link } from 'react-router-dom';
import DocsLayout from '../../../components/docs/DocsLayout';

const signUpSteps = [
  { num: 1, title: 'Visit testably.app', desc: 'Open your browser and navigate to the Testably homepage.' },
  { num: 2, title: 'Click "Get Started Free"', desc: 'Find the call-to-action button on the landing page to begin registration.' },
  { num: 3, title: 'Enter email & password', desc: 'Fill in your email and create a secure password, or click "Continue with Google" for SSO.' },
  { num: 4, title: 'Verify your email', desc: 'Check your inbox for a verification link and click it to activate your account.' },
  { num: 5, title: 'Complete your profile', desc: 'Set your display name and avatar to finish onboarding.' },
];

const createProjectSteps = [
  { num: 1, title: 'Open Dashboard', desc: 'After signing in you will land on the main Dashboard.' },
  { num: 2, title: 'Click "New Project"', desc: 'Use the button in the top-right area of the project list.' },
  { num: 3, title: 'Enter project name', desc: 'Give your project a descriptive name, e.g. "My App".' },
  { num: 4, title: 'Set a prefix', desc: 'Choose a short prefix like APP. This will be used for test case IDs (APP-1, APP-2, etc.).' },
  { num: 5, title: 'Create', desc: 'Click "Create" and your project is ready to go.' },
];

const createTestCaseSteps = [
  { num: 1, title: 'Navigate to Test Cases', desc: 'Open your project and select the Test Cases tab from the sidebar.' },
  { num: 2, title: 'Click "New Test Case"', desc: 'Use the action button at the top of the test case list.' },
  {
    num: 3,
    title: 'Fill in the details',
    desc: 'Enter a Title, set Priority (Critical / High / Medium / Low), choose Type (Manual or Automated), and add a Precondition if needed.',
  },
  { num: 4, title: 'Add steps', desc: 'Define each step the tester should perform. For each step, write the action and the expected result.' },
  { num: 5, title: 'Save', desc: 'Click "Save" to add the test case to your project.' },
];

const executeRunSteps = [
  { num: 1, title: 'Go to Test Runs', desc: 'Navigate to the Test Runs tab in your project.' },
  { num: 2, title: 'Click "Create Run"', desc: 'Open the create run modal and give the run a descriptive name.' },
  { num: 3, title: 'Select test cases', desc: 'Choose which test cases to include in this run.' },
  { num: 4, title: 'Enter Focus Mode', desc: 'Click "Execute" to start running through the cases in Focus Mode.' },
  {
    num: 5,
    title: 'Set results',
    desc: 'For each case, set the status: Passed, Failed, Blocked, Retest, or Not Tested. Add notes for any failures.',
  },
];

const nextSteps = [
  {
    icon: 'ri-team-line',
    title: 'Invite Team Members',
    desc: 'Add your QA team and assign roles.',
    to: '/docs/api/members',
  },
  {
    icon: 'ri-flag-line',
    title: 'Set Up Milestones',
    desc: 'Track progress toward releases.',
    to: '/docs/api/milestones',
  },
  {
    icon: 'ri-terminal-box-line',
    title: 'CI/CD Integration',
    desc: 'Automate test reporting in your pipeline.',
    to: '/docs/cicd',
  },
  {
    icon: 'ri-code-s-slash-line',
    title: 'API Reference',
    desc: 'Full REST API documentation.',
    to: '/docs/api',
  },
];

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

export default function GettingStartedPage() {
  return (
    <DocsLayout
      title="Getting Started | Testably Docs"
      description="Get up and running with Testably in under 5 minutes. Sign up, create your first project, write test cases, and execute your first test run."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
          <i className="ri-rocket-line text-indigo-600 text-sm"></i>
          <span className="text-indigo-700 text-sm font-medium">Quick Start Guide</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Getting Started with Testably</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Follow this step-by-step guide to set up your account, create your first project, write test cases, and execute your first test run — all in under 5 minutes.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- 1. Sign Up ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-add-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">1. Sign Up</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Create your Testably account using <strong>email signup</strong> or <strong>Google SSO</strong>. After registration you will receive a verification email to activate your account.
          </p>

          {/* Tip callout */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3 mb-2">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              <span className="font-semibold">Tip:</span> Google SSO skips the email verification step entirely, so you can start even faster.
            </p>
          </div>

          <StepList steps={signUpSteps} />
        </section>

        {/* ---- 2. Create Your First Project ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-folder-add-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">2. Create Your First Project</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Projects are the top-level container for all your test cases, runs, and milestones. Navigate to the Dashboard and click <strong>"New Project"</strong> to get started.
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3 mb-2">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <div className="text-sm text-indigo-700 leading-relaxed">
              <span className="font-semibold">What is a prefix?</span> The prefix is a short identifier (e.g. <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">APP</code>) used to generate unique test case IDs like <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">APP-1</code>, <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">APP-2</code>, etc.
            </div>
          </div>

          <StepList steps={createProjectSteps} />
        </section>

        {/* ---- 3. Create Your First Test Case ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-file-edit-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">3. Create Your First Test Case</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Test cases capture the steps and expected results for a specific scenario. Navigate to your project, open the <strong>Test Cases</strong> tab, and click <strong>"New Test Case"</strong>.
          </p>

          {/* Field reference */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Key Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Title</code>
                <span className="text-gray-500 ml-2">Short, descriptive name</span>
              </div>
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Priority</code>
                <span className="text-gray-500 ml-2">Critical / High / Medium / Low</span>
              </div>
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Type</code>
                <span className="text-gray-500 ml-2">Manual or Automated</span>
              </div>
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Precondition</code>
                <span className="text-gray-500 ml-2">Setup required before testing</span>
              </div>
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Steps</code>
                <span className="text-gray-500 ml-2">Ordered actions to perform</span>
              </div>
              <div>
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">Expected Result</code>
                <span className="text-gray-500 ml-2">What should happen</span>
              </div>
            </div>
          </div>

          {/* Example test case */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3 mb-2">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <div className="text-sm text-indigo-700 leading-relaxed">
              <span className="font-semibold">Example:</span> A login test case might be titled <em>"Verify successful login with valid credentials"</em>, with steps like: (1) Navigate to login page, (2) Enter valid email, (3) Enter valid password, (4) Click "Sign In" — and an expected result of <em>"User is redirected to the Dashboard"</em>.
            </div>
          </div>

          <StepList steps={createTestCaseSteps} />
        </section>

        {/* ---- 4. Execute Your First Test Run ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-play-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">4. Execute Your First Test Run</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Test Runs let you execute a set of test cases and record results. Go to the <strong>Test Runs</strong> tab, click <strong>"Create Run"</strong>, give it a name, and select the test cases you want to include.
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3 mb-4">
            <i className="ri-focus-3-line text-indigo-500 text-lg mt-0.5"></i>
            <div className="text-sm text-indigo-700 leading-relaxed">
              <span className="font-semibold">Focus Mode:</span> When you click "Execute", Testably opens Focus Mode — a distraction-free interface that lets you navigate through each test case one by one. Set each case's status to <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">Passed</code>, <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">Failed</code>, <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">Blocked</code>, <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">Retest</code>, or <code className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono">Not Tested</code>. Always add a note when marking a case as Failed to help with debugging later.
            </div>
          </div>

          <StepList steps={executeRunSteps} />
        </section>

        {/* ---- 5. Next Steps ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-arrow-right-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">5. Next Steps</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Now that you have the basics down, explore these areas to get the most out of Testably.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nextSteps.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                  <i className={`${item.icon} text-indigo-600 text-lg`}></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-indigo-400 text-lg ml-auto mt-2 transition-colors"></i>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
