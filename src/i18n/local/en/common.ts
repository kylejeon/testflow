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
  
  // Time
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: '{{count}} days ago',
  weeksAgo: '{{count}} weeks ago',
  monthsAgo: '{{count}} months ago',

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
    lastSynced: 'Last synced {{time}} ago',
    refreshNow: 'Refresh now',
    refreshSuccess: 'Synced {{count}} issues',
    refreshError: 'Failed to refresh issues',
    metaUnavailable: 'Metadata unavailable',
  },
};

export default common;