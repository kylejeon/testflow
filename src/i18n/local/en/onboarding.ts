export const onboarding = {
  // Welcome Screen
  welcome: {
    greeting: 'Welcome to Testably!',
    subtitle: "Let's set up your workspace in under 2 minutes.",
    roleLabel: 'Your Role',
    teamSizeLabel: 'Team Size',
    workspaceLabel: 'How would you like to start?',
    roles: {
      qa_engineer: 'QA Engineer',
      developer: 'Developer',
      product_manager: 'Product Manager',
      other: 'Other',
    },
    teamSizes: {
      '1': 'Just me',
      '2-5': '2–5',
      '6-10': '6–10',
      '10+': '10+',
    },
    startFresh: {
      label: 'Start Fresh',
      description: 'Begin with an empty workspace',
    },
    trySample: {
      label: 'Try Sample Data',
      description: 'Explore with a pre-filled project',
    },
    cta: 'Get Started',
    loading: 'Setting up your workspace…',
    errorMessage: 'Something went wrong. Please try again.',
  },

  // Onboarding Checklist
  checklist: {
    title: 'Get Started',
    progress: '{{completed}} of {{total}} complete',
    dismiss: 'Dismiss',
    steps: {
      createProject: 'Create your first project',
      createTestcase: 'Write your first test case',
      tryAi: 'Try AI test generation',
      runTest: 'Run your first test',
      inviteMember: 'Invite a team member',
      connectJira: 'Connect Jira (optional)',
    },
    completed: 'All done! 🎉',
    completedMessage: "You've completed all onboarding steps.",
  },

  // Empty States
  emptyProjects: {
    headline: 'Create your first project',
    description: 'Projects organize your test cases, runs, and sessions. Start fresh or try our sample data.',
    primaryCta: 'New Project',
    secondaryCta: 'Try Sample Data',
  },
  emptyTestCases: {
    headline: 'No test cases yet',
    description: 'Test cases define what to test and expected results. Write one manually or let AI generate them for you.',
    primaryCta: 'Write Test Case',
    secondaryCta: 'Generate with AI',
  },
  emptyTestRuns: {
    headline: 'No test runs yet',
    description: 'Test runs execute your test cases and track results. Create your first run to start testing.',
    primaryCta: 'Create Test Run',
    secondaryCta: 'Learn how runs work',
  },
  emptySessions: {
    headline: 'No sessions yet',
    description: 'Sessions let you record exploratory testing. Start a session to capture actions, then convert them to test cases.',
    primaryCta: 'Start Session',
    secondaryCta: 'View guide',
  },
  emptyMilestones: {
    headline: 'No milestones yet',
    description: 'Milestones group test cases into release targets. Create one to track progress toward your goals.',
    primaryCta: 'Create Milestone',
  },

  // Sample project
  sampleProject: {
    creating: 'Creating sample project…',
    success: 'Sample project created! Redirecting…',
    error: 'Failed to create sample project. Please try again.',
  },
};

export default onboarding;
