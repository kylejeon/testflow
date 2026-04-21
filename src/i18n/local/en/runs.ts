export const runs = {
  title: 'Runs',
  createRun: 'Create Run',
  editRun: 'Edit Run',
  deleteRun: 'Delete Run',
  runName: 'Run Name',
  runDescription: 'Description',
  selectTestCases: 'Select Test Cases',
  noRuns: 'No runs found',
  searchPlaceholder: 'Search runs...',

  // Run Details
  runDetails: 'Run Details',
  testResults: 'Test Results',
  progress: 'Progress',
  totalTests: 'Total Tests',
  passRate: 'Pass Rate',

  // Test Execution
  markAs: 'Mark as',
  addComment: 'Add Comment',
  attachFile: 'Attach File',
  executionHistory: 'Execution History',

  // Messages
  runCreated: 'Run created successfully',
  runUpdated: 'Run updated successfully',
  runDeleted: 'Run deleted successfully',
  resultUpdated: 'Result updated successfully',

  // AI Run Summary panel (dev-spec §10 + design-spec §7.20)
  // NOTE: Only wrapping labels are translated. Claude response body
  // (summary.narrative, cluster.rootCause, recommendations[i], goNoGoCondition)
  // is rendered as-is per AC-9.
  aiSummary: {
    title: 'AI Run Summary',
    analyzing: 'Analyzing…',
    analyzingResultsFor: 'Analyzing {{count}} results for patterns…',
    analyzingHint: 'Usually takes 10-15 seconds',
    tryAgain: 'Try Again',
    staleBanner: 'Test results have been updated since this summary was generated.',
    updating: 'Updating…',
    updateCta: 'Update Summary',
    riskSuffix: '{{level}} RISK',
    creditUsed: '1 AI credit used',
    failurePatterns: 'Failure Patterns',
    noFailurePatterns: 'No failure patterns detected.',
    recommendations: 'Recommendations',
    metric: {
      total: 'Total',
      passed: 'Passed',
      failed: 'Failed',
      blocked: 'Blocked',
      passRate: 'Pass Rate',
      skipped: 'Skipped',
    },
    goNoGo: {
      go: 'GO',
      noGo: 'NO-GO',
      conditional: 'CONDITIONAL GO',
    },
    error: {
      default: "Analysis couldn't be completed",
      monthlyLimit: 'Monthly AI limit reached ({{used}}/{{limit}})',
      tooMany: 'Too many requests. Please wait a moment.',
      tierTooLow: 'AI Summary requires Starter plan',
      noResults: 'No test results to analyze',
      unauthorized: 'Please log in again',
      connection: 'Connection error. Please try again.',
    },
    action: {
      copyMarkdown: 'Copy as Markdown',
      copied: 'Copied!',
      inPdf: 'In PDF ✓',
      includeInPdf: 'Include in PDF',
      share: 'Share…',
      shareSlack: 'Share via Slack',
      shareEmail: 'Share via Email',
      createJira: 'Create Jira Issue',
      createGithub: 'Create GitHub Issue',
      rerunFailed: 'Re-run Failed ({{count}})',
      creating: 'Creating…',
    },
    jira: {
      sectionTitle: 'Creating Jira Issue',
      priorityLabel: 'Priority: {{priority}}',
      labelsPrefix: 'Labels: ai-detected, regression',
      relatedTcs: '{{count}} related TCs · AI run summary included in description',
      createIssue: 'Create Issue',
    },
    github: {
      sectionTitle: 'Create GitHub Issue',
      titleLabel: 'Title',
      bodyLabel: 'Body',
      willBeCreatedIn: 'Will be created in',
      labelsSuffix: 'Labels:',
      createIssue: 'Create Issue',
    },
    slack: {
      sectionTitle: 'Share via Slack',
      selectChannel: 'Select channel',
      unnamedChannel: 'Unnamed channel',
      webhookLabel: 'Slack Webhook URL',
      webhookPlaceholder: 'https://hooks.slack.com/services/...',
      noIntegration: 'No Slack integration found. Connect one in Settings › Integrations, or paste a webhook URL above.',
    },
    email: {
      sectionTitle: 'Share via Email',
      recipientLabel: 'Recipient email',
      recipientPlaceholder: 'teammate@company.com',
    },
    sending: 'Sending…',
    send: 'Send',
    toast: {
      copied: 'Summary copied to clipboard as Markdown',
      copyFailed: 'Failed to copy to clipboard',
      jiraKeyMissing: 'Jira Project Key is not set for this project. Please edit the project settings.',
      jiraCreated: 'Jira issue{{keySuffix}} created',
      jiraFailed: 'Failed to create Jira issue',
      githubCreated: 'GitHub issue #{{number}} created',
      githubFailed: 'Failed to create GitHub issue',
      slackWebhookRequired: 'Please enter a Slack webhook URL',
      slackShared: 'Summary shared to Slack',
      slackFailed: 'Failed to send to Slack',
      emailRequired: 'Please enter an email address',
      emailShared: 'Summary shared to {{email}}',
      emailFailed: 'Failed to send email',
      pdfIncluded: 'AI summary will be included in PDF export',
      pdfRemoved: 'Removed from PDF export',
      rerunFailedEmpty: 'No failed test cases found to re-run',
      rerunCreated_one: 'New run created with {{count}} failed test case',
      rerunCreated_other: 'New run created with {{count}} failed test cases',
      rerunFailed: 'Failed to create re-run',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Run Detail page (Phase 2b — dev-spec-i18n-coverage-phase2-run-detail)
  // NOTE: `common.passed|failed|blocked|retest|untested` are reused for
  // status labels (AC-7, AC-8). PDF export HTML / Jira payload / GitHub
  // payload body are intentionally NOT translated — see .i18nignore for
  // scanner exclusion patterns (AC-9, design-spec §15).
  // ─────────────────────────────────────────────────────────────────────
  detail: {
    page: {
      backToRuns: 'Back to Runs',
      startedPrefix: 'Started {{date}}',
      percentCompletedSuffix: '{{percent}}% completed',
      testCasesCount_one: '{{count}} test case',
      testCasesCount_other: '{{count}} test cases',
      automatedBadge: 'Automated',
      runNameFallback: 'Test Run',
    },
    runStatus: {
      completed: 'Completed',
      inProgress: 'In Progress',
      underReview: 'Under Review',
      paused: 'Paused',
      draft: 'New',
    },
    headerActions: {
      export: 'Export',
      exportTooltip: 'Export PDF / CSV / Excel',
      aiSummary: 'AI Summary',
      aiSummaryNewBadge: 'NEW',
      aiSummaryLockedBadge: 'HOBBY',
      focusMode: 'Focus Mode',
      focusModeTooltip: 'Focus Mode (Cmd+Shift+F)',
    },
    kpi: {
      totalTests: 'Total Tests',
    },
    progress: {
      title: 'Execution Progress',
      tooltipCount: '{{label}}: {{count}}',
    },
    folderSidebar: {
      title: 'Folders',
      allCases: 'All Cases',
      collapseTooltip: 'Collapse',
      expandTooltip: 'Expand',
      empty: 'No folders',
    },
    tcList: {
      filter: {
        searchPlaceholder: 'Search test cases...',
        allStatus: 'All Status',
        allPriority: 'All Priority',
      },
      header: {
        idVer: 'ID / Ver',
        testCase: 'Test Case',
        folder: 'Folder',
      },
      empty: {
        title: 'No test cases',
        hint: 'This run does not include any test cases.',
      },
      assigneeDropdown: {
        unassigned: '— Unassigned —',
      },
      bulk: {
        selected_one: '{{count}} item selected',
        selected_other: '{{count}} items selected',
        assignToLabel: 'Assign to:',
        unassigned: 'Unassigned',
        apply: 'Apply',
        clearSelection: 'Clear selection',
      },
      versionBadge: {
        tcUpdatedClickable: 'TC updated to v{{major}}.{{minor}} — click to review changes',
        locked: 'Locked: test result recorded',
        ssUpdateAvailable: 'Shared step update available (v{{version}})',
      },
    },
    ssBanner: {
      headline_one: 'New version available for {{count}} Shared Step',
      headline_other: 'New version available for {{count}} Shared Steps',
      tcAffected_one: '{{count}} TC affected',
      tcAffected_other: '{{count}} TCs affected',
      untestedUpdatable_one: ', {{count}} untested can be updated',
      untestedUpdatable_other: ', {{count}} untested can be updated',
      updateAll: 'Update all',
      dismiss: 'Dismiss',
    },
    deprecatedBanner: {
      title: 'Some TCs in this run have been deprecated.',
      countSentence_one: "{{count}} test case was deprecated after this run was created. Existing results are preserved. These TCs won't appear in new runs.",
      countSentence_other: "{{count}} test cases were deprecated after this run was created. Existing results are preserved. These TCs won't appear in new runs.",
    },
    addResult: {
      title: 'Add result',
      status: {
        label: 'Status',
      },
      note: {
        label: 'Note',
        toolbar: {
          paragraph: 'Paragraph',
          bold: 'Bold',
          italic: 'Italic',
          underline: 'Underline',
          strikethrough: 'Strikethrough',
          code: 'Code',
          link: 'Link',
          bulletList: 'Bulleted list',
          orderedList: 'Numbered list',
        },
      },
      steps: {
        label: 'Steps',
        sharedBadge: 'Shared',
        sharedUpdateBadgeTitle: 'New version: v{{version}}',
        diffBannerPrefix: 'v{{from}} → v{{to}} Changes',
        updateButton: 'Update',
        lockedBanner: 'Locked to preserve test results',
        diffCurrent: 'Current (v{{version}})',
        diffLatest: 'Latest (v{{version}})',
        diffUnavailable: 'Version history unavailable',
        diffLoading: 'Loading...',
      },
      elapsed: {
        label: 'Elapsed',
      },
      assignee: {
        label: 'Assign to',
        placeholder: 'Select assignee',
        hint: 'Leave empty to keep current assignment.',
      },
      issues: {
        label: 'Linked Issues',
        createJira: 'Create Jira Issue',
        createGithub: 'Create GitHub Issue',
        placeholder: 'Enter issue key (e.g., PROJ-123)',
        hint: 'Enter a Jira issue key and press Enter (e.g., PROJ-123)',
        confirmJiraSetup: 'Jira settings required. Go to Settings?',
      },
      attachments: {
        label: 'Attachments',
        chooseFiles: 'Choose files',
        or: 'or',
        screenshot: 'screenshot',
        dropzoneHint: 'or drag/paste here',
        uploading: 'Uploading...',
      },
      footer: {
        submit: 'Add result',
      },
    },
    jiraIssue: {
      title: 'Create Jira Issue',
      summary: {
        label: 'Summary',
        placeholder: 'Brief description of the issue',
      },
      description: {
        placeholder: 'Detailed description of the issue',
      },
      issueType: {
        label: 'Issue Type',
        option: {
          bug: 'Bug',
          task: 'Task',
          story: 'Story',
          epic: 'Epic',
        },
      },
      priority: {
        option: {
          highest: 'Highest',
          high: 'High',
          medium: 'Medium',
          low: 'Low',
          lowest: 'Lowest',
        },
      },
      labels: {
        label: 'Labels',
        placeholder: 'Enter labels separated by commas (e.g., bug, ui, critical)',
        hint: 'Separate multiple labels with commas',
      },
      assignee: {
        placeholder: 'Jira account ID or email (e.g., user@example.com)',
        hint: 'Leave empty for auto-assignment',
      },
      components: {
        label: 'Components',
        placeholder: 'Comma-separated component names (e.g., Frontend, API, Database)',
        hint: 'Enter component names registered in the Jira project',
      },
      relatedTc: 'Related Test Case',
      footer: {
        submit: 'Create Issue',
        creating: 'Creating...',
      },
    },
    githubIssue: {
      title: 'Create GitHub Issue',
      titleField: {
        label: 'Title',
        placeholder: 'Issue title',
      },
      body: {
        placeholder: 'Describe the issue (Markdown supported)',
      },
      labels: {
        label: 'Labels',
        placeholder: 'Type label, press Enter',
      },
      assignee: {
        placeholder: 'Search collaborator...',
      },
      willBeCreatedInPrefix: 'Will be created in ',
      footer: {
        submit: 'Create Issue',
        creating: 'Creating...',
      },
    },
    tcDiff: {
      comparingPrefix: 'Comparing ',
      columnHeader: {
        current: 'v{{major}}.{{minor}} (current in run)',
        updated: 'v{{major}}.{{minor}} (updated)',
      },
      metadata: {
        title: 'Title',
        tags: 'Tags',
        precondition: 'Precondition',
      },
      steps: {
        sectionTitle: 'Steps',
        noSteps: 'No steps',
      },
      expectedResult: {
        sectionTitle: 'Expected Result',
      },
      loading: 'Loading…',
      footer: {
        updateTo: 'Update to v{{major}}.{{minor}}',
      },
    },
    upgradeModal: {
      title: 'Starter plan required',
      bodyLine1: 'Jira issue creation is available on the <1>Starter plan</1> and above.',
      bodyLine2: 'Upgrade to create and manage Jira issues directly from test results.',
      benefitsTitle: 'Starter plan benefits',
      benefit: {
        projects: 'Up to 10 projects',
        members: 'Up to 5 team members',
        jira: 'Jira Integration',
        reporting: 'Basic reporting',
        exportImport: 'Test Case Export/Import',
      },
      footer: {
        upgrade: 'Upgrade plan',
      },
    },
    upgradeNudge: {
      body: 'Get instant failure pattern analysis, Go/No-Go recommendations, and one-click Jira issue creation.',
      cta: 'Upgrade to Hobby — $19/mo',
      subtitle: '15 AI credits/month · AI Run Summary included',
    },
    jiraSetup: {
      title: 'Jira integration required',
      body: 'To create Jira issues, first connect your Jira account in Settings.',
      footer: {
        connect: 'Connect Jira',
      },
    },
    resultDetail: {
      title: 'Test Result Details',
      cicdBadge: 'CI/CD',
      unknownAuthor: 'Unknown',
      elapsedLabel: 'Elapsed Time',
      stepResultsLabel: 'Step Results',
      stepFallback: 'Step {{index}}',
      attachmentsLabel_one: 'Attachments ({{count}})',
      attachmentsLabel_other: 'Attachments ({{count}})',
      linkedIssues: 'Linked Issues',
      githubIssues: 'GitHub Issues',
    },
    imagePreview: {
      closeA11y: 'Close preview',
    },
    fatalError: {
      userMissing: 'Failed to load user. Please refresh the page.',
      runIdMissing: 'Run ID not found. Please check the URL.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Toast messages emitted from run-detail/page.tsx (Phase 2b, design §12)
  // Pattern: showToast('type', t('runs:toast.xxx'))
  // For interpolated messages: t('runs:toast.xxx', { key: ... })
  // ─────────────────────────────────────────────────────────────────────
  toast: {
    commentSaveFailed: 'Failed to save comment.',
    commentDeleteFailed: 'Failed to delete comment.',
    jiraAutoCreated: 'Jira issue {{key}} created automatically',
    jiraAutoCreateFailed: 'Failed to auto-create Jira issue',
    githubAutoCreated: 'GitHub issue #{{number}} created automatically',
    githubAutoCreateFailed: 'Failed to auto-create GitHub issue',
    statusUpdateFailed: 'Failed to update status.',
    addResultFirstThenLink: 'Add a test result first, then link an issue.',
    runIdNotFound: 'Run ID not found. Please refresh the page.',
    resultSaveFailed: 'Failed to save result.',
    ssVersionUpdated: "Shared Step '{{name}}' updated to v{{version}}",
    ssVersionUpdateFailed: 'Failed to update Shared Step version',
    tcVersionUpdated: 'TC updated to v{{major}}.{{minor}}',
    tcVersionUpdateFailed: 'Failed to update TC version',
    uploadFailed: 'Failed to upload file: {{reason}}',
    screenshotUnsupported: 'This browser does not support screenshot capture.',
    screenshotUploadFailed: 'Failed to upload screenshot: {{reason}}',
    screenshotCaptureFailed: 'Failed to capture screenshot.',
    summaryRequired: 'Summary is required.',
    jiraCreated: 'Jira issue {{key}} created',
    jiraCreatedAddResult: 'Jira issue {{key}} created. Log a result via Add Result to link automatically.',
    jiraCreateFailed: 'Failed to create Jira issue: {{reason}}',
    githubCreated: 'GitHub issue #{{number}} created',
    githubCreateFailed: 'Failed to create GitHub issue: {{reason}}',
  },
};

export default runs;
