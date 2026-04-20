export const environments = {
  sectionTitle: 'Environments',
  sectionDesc: 'Define OS/Browser/Device combinations to run your test suites against.',
  addButton: 'Add Environment',
  editTitle: 'Edit Environment',

  emptyTitle: 'No environments yet',
  emptyDesc: 'Add one to enable the Environment Coverage Matrix.',

  form: {
    name: 'Name',
    namePlaceholder: 'e.g. Chrome 124 / macOS 14',
    osName: 'OS',
    osVersion: 'OS version',
    browserName: 'Browser',
    browserVersion: 'Browser version',
    deviceType: 'Device',
    description: 'Description (optional)',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    device: {
      desktop: 'Desktop',
      mobile: 'Mobile',
      tablet: 'Tablet',
    },
  },

  preset: {
    title: 'Quick presets',
    chromeMacos: 'Chrome / macOS',
    chromeWindows: 'Chrome / Windows',
    firefoxUbuntu: 'Firefox / Ubuntu',
    safariIos: 'Safari / iOS',
  },

  table: {
    name: 'Name',
    os: 'OS',
    browser: 'Browser',
    device: 'Device',
    active: 'Active',
    actions: 'Actions',
  },

  action: {
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    delete: 'Delete permanently',
  },

  deleteConfirmTitle: 'Delete environment?',
  deleteConfirm: 'This will permanently remove the environment. Runs using it will be unlinked. Continue?',
  deleteLabel: 'Delete',
  deletingLabel: 'Deleting…',

  dropdown: {
    select: 'Select environment',
    addNew: 'Add new…',
    addOne: 'Add one',
    loading: 'Loading...',
    inactiveTag: '(inactive)',
    noActive: 'No active environments. Add one to get started.',
    freeformPlaceholder: 'Environment (e.g. Chrome 124 / macOS 14)',
    manageLink: 'Manage environments',
    noEnvsHint: 'No environments in this project yet.',
  },

  limit: {
    banner: '{{used}}/{{max}} environments used on your plan.',
    upgradeCta: 'Upgrade',
  },

  error: {
    duplicateName: 'An environment with this name already exists.',
    permission: 'You need Tester role or higher to manage environments.',
    deactivatePermission: 'Only Admin or Owner can deactivate environments.',
    loadFailed: 'Failed to load environments.',
    retry: 'Retry',
  },

  toast: {
    created: 'Environment created',
    updated: 'Environment updated',
    activated: 'Environment activated',
    deactivated: 'Environment deactivated',
    deleted: 'Environment deleted',
    presetAdded: 'Added "{{name}}"',
  },

  heatmap: {
    title: 'Environment Coverage Matrix',
    envSummary: 'Env Summary',
    legacyWarning: '{{count}} runs using legacy text-only environment (not shown)',
    empty: 'No runs with structured environments assigned to this plan yet.',
    emptyLegacyOnly: 'All runs in this plan use legacy text-only environments. The matrix cannot be rendered.',
    emptyNoTcs: 'This plan has no test cases yet.',
    loadFailed: 'Failed to load environment coverage data.',
    tcsByEnvs: '{{tcs}} TCs × {{envs}} envs',
    scaleLabel: 'Scale:',
    scale: {
      perfect: 'Perfect',
      pass: 'Pass',
      mixed: 'Mixed',
      warn: 'Warn',
      fail: 'Fail',
      untested: 'Untested',
    },
    ai: {
      sectionTitle: 'Coverage Insights',
      patternCount: '{{count}} patterns',
      critical: {
        tag: 'Critical · env',
        envLowTitle: '{{env}} underperforming',
        envLowDetail: '{{env}} only passes {{rate}}% across this plan.',
        browserTitle: '{{browser}} weak across all OS',
        browserDetail: '{{browser}} averages {{rate}}% across {{osCount}} OS.',
        empty: 'No critical issues detected.',
        actionIssue: 'Create issue',
        actionFilter: 'Filter',
      },
      gap: {
        tag: 'Coverage gap',
        title: '{{tc}} under-tested',
        detail: '{{untested}}/{{total}} environments not executed for this test case.',
        empty: 'Full coverage.',
        actionAssign: 'Assign run',
      },
      baseline: {
        tag: 'Stable baseline',
        title: '{{env}} = {{rate}}%',
        detail: 'Use as debugging baseline.',
        empty: 'No baseline yet.',
      },
      stats: {
        tag: 'Quick stats',
        bestEnv: 'Best env',
        worstEnv: 'Worst env',
        bestTc: 'Best TC',
        worstTc: 'Worst TC',
        noData: '–',
      },
      toast: {
        createIssue: 'Issue creation coming soon',
        filter: 'Environment filter coming soon',
        assignRun: 'Run assignment coming soon',
      },
    },
  },
};

export default environments;
