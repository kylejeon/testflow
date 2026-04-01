import { jsPDF } from 'jspdf';

export interface ExportPDFInput {
  project: any;
  testCaseCount: number;
  milestones: any[];
  allRunsRaw: any[];
  rawTestResults: any[];
  projectPassRateData: Record<string, any>;
  sessions: any[];
  supabase: any;
  tierLevel: number;
}

export interface PdfConfig {
  primaryColor: [number, number, number];
  successColor: [number, number, number];
  failureColor: [number, number, number];
  warningColor: [number, number, number];
  restColor: [number, number, number];
  inactiveColor: [number, number, number];
  textDark: [number, number, number];
  textLight: [number, number, number];
  bgLight: [number, number, number];
  borderColor: [number, number, number];
  criticalColor: [number, number, number];
  highColor: [number, number, number];
  mediumColor: [number, number, number];
  lowColor: [number, number, number];
  font: string;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  headerHeight: number;
  footerY: number;
  separatorY: number;
}

export interface DailyTrend {
  date: string;
  passRate: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  execCount: number;
}

export interface WeekComparison {
  metric: string;
  thisWeek: number;
  lastWeek: number;
  change: number;
  changePercent: number;
  bar: number;
}

export interface RunResult {
  runId: string;
  runName: string;
  milestone: string;
  status: string;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  passRate: number;
  total: number;
}

export interface FolderCoverage {
  folder: string;
  totalTCs: number;
  tested: number;
  untested: number;
  passRate: number;
  passCount: number;
  failCount: number;
}

export interface FailedTC {
  id: string;
  title: string;
  priority: string;
  failCount: number;
  lastFailed: Date;
  lastFailedRelative: string;
}

export interface FlakyTC {
  id: string;
  title: string;
  lastTenResults: Array<'passed' | 'failed' | 'blocked'>;
  flakyScore: number;
  frequency: string;
}

export interface CoverageGap {
  module: string;
  untestedCount: number;
  percentOfModule: number;
  risk: 'high' | 'medium' | 'low';
}

export interface RiskHighlight {
  severity: 'critical' | 'high' | 'medium';
  message: string;
}

export interface ReleaseReadiness {
  score: number;
  status: 'RELEASE_READY' | 'CONDITIONAL' | 'NOT_READY';
  scoreBreakdown: {
    passRate: number;
    passRateScore: number;
    critBugResolution: number;
    coverageRate: number;
    coverageScore: number;
    milestoneProgress: number;
  };
}

export interface MilestoneCard {
  id: string;
  name: string;
  status: 'Completed' | 'Overdue' | 'At Risk' | 'On Track';
  progress: number;
  progressColor: [number, number, number];
  dueDate: string;
  daysRemaining: number;
  remainingTCs: number;
  velocity: number;
  estCompletion: string;
  estimatedDaysToComplete: number;
}

export interface QualityGate {
  name: string;
  threshold: string;
  actual: string;
  status: 'pass' | 'fail' | 'warn';
  verdict: 'PASS' | 'FAIL' | 'WARN';
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  isActual: boolean;
  isIdeal: boolean;
}

export interface TeamMember {
  name: string;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  contribution: number;
  discoveryRate: number;
}

export interface PdfData {
  projectName: string;
  dateStr: string;
  totalTCs: number;
  totalRuns: number;
  activeMilestones: number;
  generatedAt: Date;
  totalPages: number;

  passRate: number;
  passRateDelta: number;
  executionComplete: number;
  defectDiscoveryRate: number;
  automationRate: number;
  avgRunPassRate: number;
  openBlockers: number;
  critBugResolution: number;
  coverageRate: number;
  milestoneProgress: number;
  releaseScore: number;
  releaseStatus: 'RELEASE_READY' | 'CONDITIONAL' | 'NOT_READY';

  totalExecuted: number;
  executedDelta: number;
  activeRuns: number;
  failedCount: number;
  failedDelta: number;
  blockedCount: number;
  blockedDelta: number;

  statusCounts: { passed: number; failed: number; blocked: number; retest: number; untested: number };
  priorityCounts: { critical: number; high: number; medium: number; low: number };

  dailyTrends: DailyTrend[];
  weekComparison: WeekComparison[];
  runResults: RunResult[];
  folderCoverage: FolderCoverage[];
  failedTCs: FailedTC[];
  flakyTCs: FlakyTC[];
  coverageGaps: CoverageGap[];
  teamMembers: TeamMember[];
  milestoneCards: MilestoneCard[];
  risks: RiskHighlight[];
  releaseReadiness: ReleaseReadiness;
  qualityGates: QualityGate[];
  burndownData: BurndownPoint[];

  testCases: any[];
}

export interface PageDrawContext {
  pdf: jsPDF;
  config: PdfConfig;
  data: PdfData;
  tierLevel: number;
  pageNum: number;
  totalPages: number;
}
