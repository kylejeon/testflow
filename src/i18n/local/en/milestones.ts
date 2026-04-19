export const milestones = {
  title: 'Milestones',
  createMilestone: 'Create Milestone',
  editMilestone: 'Edit Milestone',
  deleteMilestone: 'Delete Milestone',
  milestoneName: 'Milestone Name',
  milestoneDescription: 'Description',
  noMilestones: 'No milestones found',

  // Milestone Details
  milestoneDetails: 'Milestone Details',
  relatedTestCases: 'Related Test Cases',
  progress: 'Progress',

  // Messages
  milestoneCreated: 'Milestone created successfully',
  milestoneUpdated: 'Milestone updated successfully',
  milestoneDeleted: 'Milestone deleted successfully',

  // Roll-up
  rollup: 'Roll-up',
  rollupMode: 'Roll-up Mode',
  rollupDescription: 'Progress is automatically aggregated from sub milestones',
  rollupTotal: 'Total TCs',
  rollupPassed: 'Passed',
  rollupFailed: 'Failed',
  rollupCoverage: 'Coverage',
  rollupPassRate: 'Pass Rate',
  dateMode: 'Date Mode',
  dateModeAuto: '🔄 Auto (from sub milestones)',
  dateModeManual: '✏️ Manual',
  statusReadOnly: 'Status is automatically determined by sub milestones.',
  subMilestones: 'Sub Milestones',
  noSubMilestones: 'No sub milestones',
  preventThreeLevelNesting: 'Cannot create sub milestone under an existing sub milestone.',
  rollupUpdated: 'Roll-up recalculated',

  // Entry point from list (dev-spec AC-B4)
  openDetailedView: 'Open detailed view →',

  // Detail tab + overview namespace (dev-spec §10 + design-spec §17)
  detail: {
    tabs: {
      overview: 'Overview',
      activity: 'Activity',
      issues: 'Issues',
    },
    overview: {
      burndown: 'Burndown',
      kpi: {
        remaining: 'Remaining',
        executed: 'Executed',
        velocity: 'Velocity',
        passRate: 'Pass Rate',
      },
      intel: {
        failedBlocked: 'Failed & Blocked',
        viewAllInIssues: 'View all in Issues →',
        velocity7d: 'Velocity (last 7 days)',
        topFailTags: 'Top-Fail Tags',
        noFailedTags: 'No tags on failed test cases',
        eta: 'ETA',
        etaOnTrack: 'On track',
        etaBehind: 'Behind',
        aiInsight: 'AI Risk Insight',
        aiOnTrack: 'Progress is on track. Current velocity suggests completion before the deadline.',
        aiBehind: "You're behind the ideal burndown. Consider increasing run frequency or reducing scope.",
        last24h: 'Activity — Last 24h',
        viewFullActivity: 'View full activity →',
        noRecentActivity: 'No activity in the last 24 hours',
        confidenceLabel: 'confidence {{value}}%',
        avgPerDay: '{{value}} avg',
      },
      sections: {
        subMilestones: 'Sub Milestones',
        testPlans: 'Test Plans',
        runs: 'Runs',
        exploratory: 'Exploratory',
        noPlans: 'No test plans linked to this milestone',
        emptyAll: 'No runs or plans yet. Create a plan to start tracking executions.',
        createPlan: '+ Create Plan',
        upgradeToPlan: 'Upgrade to Hobby to create plans',
      },
      runBadge: {
        direct: 'Direct',
        plan: 'Plan',
      },
      contributors: 'Contributors — Top 5',
      chart: {
        range: { '7d': '7d', '30d': '30d', all: 'All' },
        legend: { ideal: 'Ideal', actual: 'Actual', projected: 'Projected' },
        today: 'Today',
        target: 'Target',
        emptyBurndown: 'Start running tests to see burndown',
      },
    },
  },
};

export default milestones;
