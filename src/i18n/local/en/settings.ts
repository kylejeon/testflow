export const settings = {
  title: 'Settings',
  
  // Tabs
  profile: 'Profile',
  subscription: 'Subscription',
  integrations: 'Integrations',
  cicd: 'CI/CD',
  
  // Profile
  profileSettings: 'Profile Settings',
  fullName: 'Full Name',
  email: 'Email',
  avatar: 'Avatar',
  changePassword: 'Change Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm Password',
  
  // Subscription
  currentPlan: 'Current Plan',
  freePlan: 'Free Plan',
  proPlan: 'Pro Plan',
  enterprisePlan: 'Enterprise Plan',
  upgradePlan: 'Upgrade Plan',
  billingHistory: 'Billing History',
  
  // Integrations
  jiraIntegration: 'Jira Integration',
  slackIntegration: 'Slack Integration',
  connect: 'Connect',
  disconnect: 'Disconnect',
  connected: 'Connected',
  notConnected: 'Not Connected',
  
  // CI/CD
  cicdIntegration: 'CI/CD Integration',
  apiTokens: 'API Tokens',
  createToken: 'Create New Token',
  tokenName: 'Token Name',
  tokenCreated: 'Token created successfully',
  tokenDeleted: 'Token deleted successfully',
  copyToken: 'Copy Token',
  deleteToken: 'Delete Token',
  integrationGuide: 'Integration Guide',
  githubActions: 'GitHub Actions',
  gitlabCI: 'GitLab CI',
  
  // Messages
  profileUpdated: 'Profile updated successfully',
  passwordChanged: 'Password changed successfully',
  integrationConnected: 'Integration connected successfully',
  integrationDisconnected: 'Integration disconnected successfully',

  // f024 — Toast (Dev Spec §6-3 A1 / A2 / A3)
  toast: {
    logoutFailed: 'Failed to log out. Please try again.',
  },

  // ── f011 — AI Token Budget Monitoring Dashboard ──────────────
  // Dev Spec §12 (47 keys) + Design Spec §12 (26 additional) = 73 keys total
  aiUsage: {
    tab: 'AI Usage',
    title: 'AI Credit Usage',
    titleSelf: 'My AI Credit Usage',
    subtitle: {
      team: "See how your team is consuming AI credits this period.",
      self: 'See your personal AI credit consumption this period.',
    },
    burnRate: {
      title: 'Monthly Burn Rate',
      used: '{{used}} / {{limit}} credits used',
      unlimited: 'Unlimited ({{used}} used)',
      daysLeft: '{{n}} days left in billing cycle',
      estimatedDepletion: 'Estimated depletion: {{date}}',
      onTrack: 'On track',
      warning: 'Usage is outpacing plan',
      perDay: '{{n}} credits/day',
    },
    period: {
      label: 'Period',
      triggerAria: 'Select period',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      '6m': 'Last 6 months',
      '12m': 'Last 12 months',
      upgradeTooltip: 'Upgrade to {{tier}} to view longer history',
    },
    chart: {
      title: 'Daily Usage',
      yAxis: 'Credits',
      ariaLabel: 'Daily AI credit usage stacked bar chart',
      period: '{{from}} — {{to}} · UTC',
      total: 'Total',
      srTableCaption: 'Daily AI credit usage by feature',
      srColDate: 'Date',
      srColFeature: 'Feature',
      srColCredits: 'Credits',
    },
    mode: {
      text: 'Test Cases (Text)',
      jira: 'Test Cases (Jira)',
      session: 'Test Cases (Session)',
      runAnalysis: 'Run Analysis',
      planAssistant: 'Plan Assistant',
      riskPredictor: 'Risk Predictor',
      milestoneRisk: 'Milestone Risk',
      requirementSuggest: 'Requirement Suggestions',
      other: 'Other',
    },
    modeBreakdown: {
      title: 'Breakdown by Feature',
      colFeature: 'Feature',
      colCredits: 'Credits',
      colPercent: '% of total',
      colCalls: 'Calls',
    },
    memberTable: {
      title: 'Team Contribution',
      colMember: 'Member',
      colCredits: 'Credits used',
      colShare: 'Share',
      more: 'and {{n}} more',
    },
    kpi: {
      thisMonthLabel: 'THIS MONTH',
      thisMonthSub: '{{pct}}% of monthly quota',
      burnRateLabel: 'BURN RATE',
      modeCountLabel: 'MODES USED',
      modeCountSub: 'of {{total}} modes this period',
      activeMembersLabel: 'ACTIVE MEMBERS',
      activeMembersSub: 'members generated AI',
    },
    empty: {
      title: 'No AI usage yet',
      body: 'Start generating test cases with AI to see usage here.',
      cta: 'Try AI Generation',
    },
    error: {
      title: 'Failed to load AI usage',
      retry: 'Retry',
      forbidden: "You don't have permission to view team usage",
      chartUnavailable: 'Chart unavailable',
    },
    forbidden: {
      title: "You don't have permission to view team usage.",
      body: 'Contact your Owner if this is unexpected.',
      cta: 'Contact Owner',
    },
    warning: {
      near: "You've used {{used}} of {{limit}} AI generations this month. Consider upgrading to avoid hitting the limit mid-cycle.",
      reached: "You've used all {{limit}} AI generations this month. New generations are paused until your next billing cycle.",
      upgrade: 'Upgrade plan',
    },
    export: {
      button: 'Export CSV',
      aria: 'Export AI usage as CSV',
      filename: 'ai-usage-{{date}}.csv',
    },
    offline: "You're offline. Some data may be outdated.",
    refresh: 'Refresh',
    viewDetails: 'View Details',
    toast: {
      loadFailed: 'Failed to load AI usage.',
      refreshed: 'AI usage refreshed.',
      refreshFailed: "Couldn't refresh. Please retry.",
      exportStarted: 'Preparing your CSV export…',
      exportReady: 'CSV downloaded.',
      exportFailed: 'Export failed. Please retry.',
      forbidden: "You don't have permission to view team usage.",
    },
  },
};

export default settings;