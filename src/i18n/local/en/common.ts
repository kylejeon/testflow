export const common = {
  // Navigation
  overview: 'Overview',
  milestones: 'Milestones',
  documentation: 'Documentation',
  testCases: 'Test Cases',
  runsAndResults: 'Runs',
  sessions: 'Exploratory',
  settings: 'Settings',
  projects: 'Projects',

  // Actions
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  close: 'Close',
  add: 'Add',
  remove: 'Remove',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  export: 'Export',
  import: 'Import',
  upload: 'Upload',
  download: 'Download',
  invite: 'Invite',
  accept: 'Accept',
  reject: 'Reject',
  logout: 'Log out',

  // Status
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  archived: 'Archived',
  upcoming: 'Upcoming',
  started: 'In Progress',
  pastDue: 'Overdue',
  new: 'New',
  inProgress: 'In progress',

  // Test Status
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  retest: 'Retest',
  untested: 'Untested',

  // Priority
  high: 'High',
  medium: 'Medium',
  low: 'Low',

  // Common Labels
  name: 'Name',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  createdAt: 'Created at',
  updatedAt: 'Updated at',
  startDate: 'Start date',
  endDate: 'End date',
  dueDate: 'Due date',
  assignee: 'Assignee',
  owner: 'Owner',
  members: 'Members',

  // Messages
  loading: 'Loading...',
  noData: 'No data available',
  error: 'An error occurred',
  success: 'Success',
  confirmDelete: 'Are you sure you want to delete this item?',
  unknownError: 'Unknown error',

  // Time
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: '{{count}} days ago',
  weeksAgo: '{{count}} weeks ago',
  monthsAgo: '{{count}} months ago',

  // Relative time (new — common.time.*, used by formatRelativeTime helper)
  time: {
    justNow: 'just now',
    minutesAgo_one: '{{count}}m ago',
    minutesAgo_other: '{{count}}m ago',
    hoursAgo_one: '{{count}}h ago',
    hoursAgo_other: '{{count}}h ago',
    daysAgo_one: '{{count}}d ago',
    daysAgo_other: '{{count}}d ago',
    monthsAgo_one: '{{count}}mo ago',
    monthsAgo_other: '{{count}}mo ago',
    yearsAgo_one: '{{count}}y ago',
    yearsAgo_other: '{{count}}y ago',
  },

  // Weekday short labels (for sparkline/axis)
  weekday: {
    short: {
      mon: 'M',
      tue: 'T',
      wed: 'W',
      thu: 'T',
      fri: 'F',
      sat: 'S',
      sun: 'S',
    },
  },

  // Shared toast messages (new — common.toast.*)
  toast: {
    saved: 'Settings saved',
    saveFailed: 'Failed to save',
    networkError: 'Network error. Please retry.',
    somethingWentWrong: 'Something went wrong.',
    // f024 — generic export failure (Dev Spec §6-3 A4, Design Spec §4-1)
    exportFailed: 'Failed to export report. Please try again.',
    // f024 — getApiErrorMessage(code) mapping (Design Spec §5)
    apiErrors: {
      recordNotFound: 'No data found.',
      permissionDenied: "You don't have permission for this action.",
      recordExists: 'This record already exists.',
      relatedMissing: 'Cannot complete — a related record is missing.',
      insufficientPrivilege: 'Permission denied. Check your plan or role.',
      invalidEmail: 'That email address is invalid.',
      userNotFound: 'No account found with that email.',
      wrongPassword: 'Incorrect password.',
      sessionExpired: 'Session expired. Please log in again.',
      notFound: 'The requested resource was not found.',
      conflict: 'This conflicts with existing data. It may already exist.',
      rateLimited: 'Too many requests. Please wait a moment and try again.',
      serverError: 'Server error. Please try again shortly.',
      networkError: 'Connection issue. Check your network and try again.',
      timeout: 'The request timed out. Please try again.',
      cancelled: 'The request was cancelled.',
      generic: 'Something went wrong. Please try again.',
    },
  },

  // f024 — ErrorBoundary fallback UI (Design Spec §2 / §3)
  errorBoundary: {
    title: 'Something went wrong',
    description: "We've been notified and are looking into it. Try again, or head back to your dashboard.",
    reload: 'Try again',
    goHome: 'Go to dashboard',
    reportId: 'Report ID: {{id}}',
    reportIdMissing: "We couldn't capture error details.",
    copyReportId: 'Copy report ID',
    reportIdCopied: 'Report ID copied',
    sendReport: 'Send an error report',
    devDetailsSummary: 'Error details',
    section: {
      title: '"{{sectionName}}" failed to load.',
      titleGeneric: 'Failed to load this section.',
      hint: 'Please refresh or contact support if the problem persists.',
      retry: 'Retry',
    },
  },

  // Issues (shared across Plan Detail / Milestone Detail Issues tabs)
  issues: {
    priority: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      none: '—',
    },
    status: {
      open: 'Open',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    },
    assignee: {
      unassigned: 'Unassigned',
    },
    // IssuesList / LastSyncedLabel (expanded — design-spec §7.15/7.16)
    lastSynced: 'Last synced {{time}}',
    notSyncedYet: 'Not synced yet',
    syncing: 'Syncing…',
    refreshNow: 'Refresh now',
    refreshSuccess: 'Synced {{count}} issues',
    refreshError: 'Failed to refresh issues',
    refreshFailed: 'Failed to refresh issues. Retry later.',
    syncedCount: 'Synced {{count}} issues',
    debounceWait: 'Please wait before refreshing again',
    metaUnavailable: 'Metadata unavailable',
    metadataUnavailable: 'Metadata unavailable',
    loading: 'Loading issues…',
    sources: 'Sources',
    all: 'All',
    jira: 'Jira',
    github: 'GitHub',
    totalIssues: 'Total Issues',
    linkedTcs: 'Linked TCs',
    bugReports: 'bug reports',
    issues: 'issues',
    withIssue: 'with issue',
    fromRuns_one: 'from {{count}} run',
    fromRuns_other: 'from {{count}} runs',
    tcsWithLinkedIssues_one: '{{count}} TC with linked issues.',
    tcsWithLinkedIssues_other: '{{count}} TCs with linked issues.',
    sourceSuffix: {
      jira: '{{count}} Jira.',
      github: '{{count}} GitHub.',
    },
    sourceLabel: {
      jiraBug: 'Jira · Bug',
      github: 'GitHub',
    },
    empty: {
      title: 'No issues linked yet.',
      hint: 'Issues appear here once you link Jira or GitHub issues from failed test results.',
    },
    rowLabel: 'Issue from TC {{tcId}}',
    a11y: {
      issueRow: '{{source}} issue {{key}}, priority {{priority}}, status {{status}}',
      unknownPriority: 'unknown',
      unknownStatus: 'unknown',
      refresh: 'Refresh issue metadata',
    },
  },
};

export default common;
