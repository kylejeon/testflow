export const projects = {
  title: 'Projects',
  subtitle: 'Create and manage your test projects',
  createProject: 'Create Project',
  editProject: 'Edit Project',
  deleteProject: 'Delete Project',
  projectName: 'Project Name',
  projectKey: 'Project Key',
  projectDescription: 'Project Description',
  allProjects: 'All Projects',
  myProjects: 'My Projects',
  archivedProjects: 'Archived Projects',
  noProjects: 'No projects found',
  searchPlaceholder: 'Search projects...',
  
  // Project List
  projectList: 'Project List',
  allStatus: 'All Status',
  testRuns: 'Test Runs',
  createdThisMonth: 'Created This Month',
  noSearchResults: 'No search results',
  tryDifferentSearch: 'Try a different search term or filter',
  createFirstProject: 'Create your first test project',
  noDescription: 'No description',
  viewDetails: 'View Details',
  
  // Project Details
  about: 'ABOUT',
  timeline: 'TIMELINE',
  currentMilestones: 'CURRENT MILESTONES',
  testingActivity: 'TESTING ACTIVITY',
  recentActivity: 'RECENT ACTIVITY',
  projectMembers: 'PROJECT MEMBERS',
  
  // Modals
  createProjectTitle: 'Create New Project',
  editProjectTitle: 'Edit Project',
  deleteConfirmTitle: 'Delete Project',
  deleteConfirmMessage: 'Are you sure you want to delete this project? This action cannot be undone.',
  inviteMember: 'Invite Member',
  inviteMemberEmail: 'Email address',
  inviteMemberRole: 'Role',
  
  // Roles
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
  
  // Messages
  projectCreated: 'Project created successfully',
  projectUpdated: 'Project updated successfully',
  projectDeleted: 'Project deleted successfully',
  memberInvited: 'Member invited successfully',

  // f024 — Toast (Dev Spec §6-3 A6)
  toast: {
    membersLoadFailed: 'Failed to load project members.',
  },

  // f001 + f002 — Environment AI Insights plan-detail workflow
  // nested under `plan.env.ai` so callers use `t('projects:plan.env.ai.xxx')`
  plan: {
    env: {
      ai: {
        issueModalTitle: 'Create issue from AI insight',
        issueModalTabJira: 'Jira',
        issueModalTabGithub: 'GitHub',
        issueModalTitleField: 'Title',
        issueModalTitleRequired: 'Title is required',
        issueModalDescriptionField: 'Description',
        issueModalLabelsField: 'Labels (optional)',
        issueModalLabelsPlaceholder: 'Type and press Enter…',
        issueModalPriorityField: 'Priority',
        issueModalPriorityHigh: 'High',
        issueModalPriorityMedium: 'Medium',
        issueModalPriorityLow: 'Low',
        issueModalCreate: 'Create issue',
        issueModalCreating: 'Creating…',
        issueModalCancel: 'Cancel',
        issueModalNoIntegration: 'Connect an issue tracker first',
        issueModalNoIntegrationDetail:
          'Testably needs a Jira or GitHub connection to create issues from AI insights.',
        issueModalGoSettings: 'Open Settings',
        issueModalLoading: 'Loading connection…',
        issueModalProjectKey: 'Jira project key',
        issueModalIssueType: 'Issue type',
        issueModalRepo: 'GitHub repo',
        issueCreated: 'Issue created',
        issueCreatedWithLink: 'Issue created · View',
        issueCreateFailed: 'Failed to create issue: {{detail}}',
        assignRunToast: 'Add a run targeting "{{tc}}" to close the coverage gap.',
        filterActive: 'Showing {{env}}',
        filterClear: 'Clear',
        runsSectionNotFound: 'Runs section not found — navigate to the Runs tab.',
      },
    },
  },
};

export default projects;