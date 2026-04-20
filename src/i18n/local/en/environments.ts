export const environments = {
  sectionTitle: 'Environments',
  sectionDesc: 'Define OS/Browser/Device combinations to run your test suites against.',
  addButton: 'Add Environment',

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

  deleteConfirm: 'This will permanently remove the environment. Runs using it will be unlinked. Continue?',

  dropdown: {
    select: 'Select environment',
    addNew: 'Add new…',
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
    empty: 'No runs assigned to this plan yet.',
    emptyLegacyOnly: 'All runs in this plan use legacy text-only environments. The matrix cannot be rendered.',
    loadFailed: 'Failed to load environment coverage data.',
  },
};

export default environments;
