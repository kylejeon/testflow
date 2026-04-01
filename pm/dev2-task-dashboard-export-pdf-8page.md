# Dev2 개발 지시서: Dashboard Export PDF — 8페이지 Executive Report

## 개요
- 현재 3페이지 PDF (`handleExportPDF`, lines 332-660 in `src/pages/project-detail/page.tsx`) → 8페이지 C-Level Executive Quality Report로 전면 리팩토링
- jsPDF 직접 드로잉 (클라이언트 사이드)
- 세션 ID: `local_8d012bfd-eb98-4d10-9e5a-bde32dae0c78`
- 참고: Desi 목업 `desi/dashboard-export-pdf-mockup.html`, 기획안 `pm/pm-plan-dashboard-export-pdf-enhancement.html`

## 선행 작업
- `dev2-task-dashboard-export-fixes.md`의 6건 버그 수정을 먼저 적용 완료

---

## PART 1: 아키텍처 리팩토링

### 1.1 파일 구조
```
src/pages/project-detail/
├── page.tsx
├── pdf/
│   ├── generateExecutiveReport.ts
│   ├── pdfHelpers.ts
│   ├── drawPage1Cover.ts
│   ├── drawPage2Scorecard.ts
│   ├── drawPage3Trends.ts
│   ├── drawPage4Execution.ts
│   ├── drawPage5Milestone.ts
│   ├── drawPage6Risk.ts
│   ├── drawPage7Team.ts
│   ├── drawPage8Appendix.ts
│   ├── pdfDataPrep.ts
│   └── pdfTypes.ts
```

### 1.2 page.tsx handleExportPDF 교체

현재 (lines 332-660, ~330줄) 전체를 다음으로 대체:

```typescript
const handleExportPDF = async () => {
  if (!project || isLoading || !projectData) {
    showExportToast('error', 'Project data is still loading.');
    return;
  }
  
  try {
    setIsExporting(true);
    const { generateExecutiveReport } = await import('./pdf/generateExecutiveReport');
    const pdfPayload = {
      project, testCaseCount, milestones: milestones || [],
      allRunsRaw: allRunsRaw || [], rawTestResults: rawTestResults || [],
      projectPassRateData: projectPassRateData || {}, sessions: sessions || [],
      supabase, tierLevel: tierLevel || 1,
    };
    await generateExecutiveReport(pdfPayload);
    showExportToast('success', 'PDF report exported successfully');
  } catch (err) {
    console.error('[PDF Export Error]', err);
    showExportToast('error', 'Failed to export PDF report');
  } finally {
    setIsExporting(false);
  }
};
```

### 1.3 pdfTypes.ts — 완전한 TypeScript 인터페이스

```typescript
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
  status: 'Active' | 'Completed' | 'Paused' | 'Review';
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
  priority: 'critical' | 'high' | 'medium' | 'low';
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
  icon: string;
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
  status: 'completed' | 'overdue' | 'at-risk' | 'on-track';
  progress: number;
  progressPercent: string;
  dueDate: string;
  daysRemaining: number;
  remainingTCs: number;
  velocity: number;
  estimatedCompletion: Date;
  estimatedDaysToComplete: number;
}

export interface QualityGate {
  name: string;
  threshold: number | string;
  actual: number | string;
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
  passRate: number;
  executionComplete: number;
  defectDiscoveryRate: number;
  automationRate: number;
  avgRunPassRate: number;
  openBlockers: number;
  statusDistribution: {
    passed: number;
    failed: number;
    blocked: number;
    retest: number;
    untested: number;
  };
  priorityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  dailyTrends: DailyTrend[];
  weekComparison: WeekComparison[];
  runResults: RunResult[];
  folderCoverage: FolderCoverage[];
  failedTCs: FailedTC[];
  flakyTCs: FlakyTC[];
  coverageGaps: CoverageGap[];
  teamMembers: TeamMember[];
  milestones: MilestoneCard[];
  riskHighlights: RiskHighlight[];
  releaseReadiness: ReleaseReadiness;
  qualityGates: QualityGate[];
  burndownData: BurndownPoint[];
  projectName: string;
  totalTCs: number;
  activeMilestones: number;
  totalRuns: number;
  generatedAt: Date;
}

export interface PageDrawContext {
  pdf: jsPDF;
  config: PdfConfig;
  data: PdfData;
  tierLevel: number;
  pageNum: number;
  totalPages: number;
}
```

---

## PART 2: pdfHelpers.ts — 공통 유틸리티

주요 함수들:

```typescript
import { jsPDF } from 'jspdf';
import { PdfConfig } from './pdfTypes';

export function drawHeader(pdf: jsPDF, title: string, config: PdfConfig): void {
  pdf.setFillColor(...config.primaryColor);
  pdf.rect(0, 0, config.pageWidth, 14, 'F');
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Testably', 20, 8);
  pdf.setFontSize(9);
  pdf.text(title, config.pageWidth - 20, 8, { align: 'right' });
}

export function drawCoverHeader(pdf: jsPDF, projectName: string, config: PdfConfig): void {
  pdf.setFillColor(...config.primaryColor);
  pdf.rect(0, 0, config.pageWidth, 40, 'F');
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Testably', 20, 8);
  pdf.setFontSize(18);
  pdf.text(projectName, 20, 24, { maxWidth: 150 });
  pdf.setFontSize(11);
  pdf.setFont(config.font, 'normal');
  pdf.text('Quality Executive Report', 20, 32);
  pdf.setFontSize(8);
  const generatedDate = new Date().toISOString().split('T')[0];
  pdf.text(`Report Generated: ${generatedDate}`, config.pageWidth - 20, 8, { align: 'right' });
}

export function drawFooter(pdf: jsPDF, pageNum: number, totalPages: number,
  projectName: string, config: PdfConfig): void {
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.line(config.margin, config.separatorY, config.pageWidth - config.margin, config.separatorY);
  pdf.setFont(config.font, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...config.textLight);
  pdf.text(projectName, config.margin, config.footerY);
  const generatedDate = new Date().toISOString().split('T')[0];
  const generatedText = `Generated by Testably — ${generatedDate}`;
  pdf.text(generatedText, config.pageWidth / 2, config.footerY, { align: 'center' });
  const pageText = `Page ${pageNum} of ${totalPages}`;
  pdf.text(pageText, config.pageWidth - config.margin, config.footerY, { align: 'right' });
}

export function drawKpiCard(pdf: jsPDF, x: number, y: number, width: number,
  height: number, label: string, value: string,
  delta?: { value: number; isPositive: boolean },
  target?: string, config?: PdfConfig): void {
  const cfg = config || getDefaultConfig();
  pdf.setFillColor(...cfg.bgLight);
  pdf.setDrawColor(...cfg.borderColor);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(x, y, width, height, 2, 2, 'FD');
  pdf.setFont(cfg.font, 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...cfg.textLight);
  pdf.text(label, x + 3, y + 5);
  pdf.setFont(cfg.font, 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...cfg.textDark);
  pdf.text(value, x + 3, y + 14);
  if (delta) {
    pdf.setFont(cfg.font, 'normal');
    pdf.setFontSize(8);
    const deltaColor = delta.isPositive ? cfg.successColor : cfg.failureColor;
    pdf.setTextColor(...deltaColor);
    const deltaSymbol = delta.isPositive ? '▲' : '▼';
    const deltaText = `${deltaSymbol} ${Math.abs(delta.value).toFixed(1)}%`;
    pdf.text(deltaText, x + width - 3, y + 5, { align: 'right' });
  }
  if (target) {
    pdf.setFont(cfg.font, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...cfg.textLight);
    pdf.text(target, x + 3, y + height - 2);
  }
}

export function drawSectionTitle(pdf: jsPDF, title: string, x: number, y: number, config: PdfConfig): void {
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...config.textDark);
  pdf.text(title, x, y);
}

export function drawTable(pdf: jsPDF, x: number, y: number, headers: string[],
  rows: (string | number)[][], columnWidths: number[], config: PdfConfig,
  options?: { rowHeight?: number; headerBgColor?: [number, number, number];
    zebra?: boolean; maxRows?: number }): number {
  const opts = { rowHeight: 7, headerBgColor: config.primaryColor, zebra: true,
    maxRows: rows.length, ...options };
  const headerHeight = 7;
  let currentY = y;
  pdf.setFillColor(...opts.headerBgColor);
  pdf.rect(x, currentY, columnWidths.reduce((a, b) => a + b, 0), headerHeight, 'F');
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  let headerX = x;
  headers.forEach((header, i) => {
    pdf.text(header, headerX + 2, currentY + 5, { maxWidth: columnWidths[i] - 4 });
    headerX += columnWidths[i];
  });
  currentY += headerHeight;
  const displayRows = rows.slice(0, opts.maxRows);
  displayRows.forEach((row, rowIndex) => {
    if (opts.zebra && rowIndex % 2 === 0) {
      pdf.setFillColor(...config.bgLight);
      pdf.rect(x, currentY, columnWidths.reduce((a, b) => a + b, 0), opts.rowHeight, 'F');
    }
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.3);
    pdf.rect(x, currentY, columnWidths.reduce((a, b) => a + b, 0), opts.rowHeight);
    pdf.setFont(config.font, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...config.textDark);
    let cellX = x;
    row.forEach((cell, colIndex) => {
      pdf.text(String(cell), cellX + 2, currentY + 4, { maxWidth: columnWidths[colIndex] - 4 });
      cellX += columnWidths[colIndex];
    });
    currentY += opts.rowHeight;
  });
  return currentY;
}

export function drawProgressBar(pdf: jsPDF, x: number, y: number, width: number,
  height: number, percentage: number, fillColor: [number, number, number], config: PdfConfig): void {
  const radius = height / 2;
  pdf.setFillColor(...config.bgLight);
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
  const fillWidth = (percentage / 100) * width;
  if (fillWidth > 0) {
    pdf.setFillColor(...fillColor);
    pdf.setDrawColor('none');
    pdf.roundedRect(x, y, fillWidth, height, radius, radius, 'F');
  }
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...config.textDark);
  const percentText = `${Math.round(percentage)}%`;
  pdf.text(percentText, x + width / 2, y + height / 2 + 1, { align: 'center' });
}

export function drawStackedBar(pdf: jsPDF, x: number, y: number, width: number,
  height: number, segments: Array<{ count: number; color: [number, number, number] }>, config: PdfConfig): void {
  const totalCount = segments.reduce((sum, seg) => sum + seg.count, 0);
  const radius = height / 2;
  let currentX = x;
  segments.forEach((segment, index) => {
    const segmentWidth = (segment.count / totalCount) * width;
    if (segmentWidth > 0) {
      pdf.setFillColor(...segment.color);
      if (index === 0) {
        pdf.roundedRect(currentX, y, segmentWidth, height, radius, 0, 'F');
      } else if (index === segments.length - 1) {
        pdf.roundedRect(currentX, y, segmentWidth, height, 0, radius, 'F');
      } else {
        pdf.rect(currentX, y, segmentWidth, height, 'F');
      }
      currentX += segmentWidth;
    }
  });
}

export function drawRoundedBox(pdf: jsPDF, x: number, y: number, width: number,
  height: number, bgColor: [number, number, number], borderColor: [number, number, number],
  radius: number = 2, lineWidth: number = 0.5): void {
  pdf.setFillColor(...bgColor);
  pdf.setDrawColor(...borderColor);
  pdf.setLineWidth(lineWidth);
  pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const monthShort = date.toLocaleString('en-US', { month: 'short' });
  return `${monthShort} ${date.getDate()}`;
}

export function formatRelativeTime(date: Date | string): string {
  const then = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export function getDefaultConfig(): PdfConfig {
  return {
    primaryColor: [99, 102, 241], successColor: [16, 163, 127], failureColor: [239, 68, 68],
    warningColor: [249, 115, 22], restColor: [234, 179, 8], inactiveColor: [203, 213, 225],
    textDark: [15, 23, 42], textLight: [100, 116, 139], bgLight: [248, 250, 252],
    borderColor: [226, 232, 240], criticalColor: [239, 68, 68], highColor: [245, 158, 11],
    mediumColor: [99, 102, 241], lowColor: [148, 163, 184],
    font: 'Helvetica', pageWidth: 210, pageHeight: 297, margin: 20,
    contentWidth: 170, headerHeight: 14, footerY: 287, separatorY: 285,
  };
}

export function getPercentageColor(percentage: number, config: PdfConfig): [number, number, number] {
  if (percentage >= 90) return config.successColor;
  if (percentage >= 70) return config.warningColor;
  return config.failureColor;
}

export function getPriorityColor(priority: string, config: PdfConfig): [number, number, number] {
  switch (priority.toLowerCase()) {
    case 'critical': return config.criticalColor;
    case 'high': return config.highColor;
    case 'medium': return config.mediumColor;
    default: return config.lowColor;
  }
}

export function getPriorityAbbr(priority: string): string {
  const abbr = priority.charAt(0).toUpperCase();
  return abbr === 'C' ? 'Crit' : abbr === 'H' ? 'High' : abbr === 'M' ? 'Med' : 'Low';
}
```

---

## PART 3: pdfDataPrep.ts — 데이터 집계 함수

주요 함수들:

```typescript
import { PdfData, DailyTrend, WeekComparison, RunResult, FolderCoverage, FailedTC, FlakyTC, CoverageGap, TeamMember, MilestoneCard, RiskHighlight, ReleaseReadiness, QualityGate, BurndownPoint } from './pdfTypes';

export async function preparePdfData(project: any, testCaseCount: number, milestones: any[], allRunsRaw: any[], rawTestResults: any[], supabase: any, projectPassRateData: any): Promise<PdfData> {
  // Fetch test cases
  const { data: testCases } = await supabase
    .from('test_cases')
    .select('id, title, priority, lifecycle_status, folder, is_automated, created_at')
    .eq('project_id', project.id);

  const testCasesMap = new Map(testCases?.map((tc: any) => [tc.id, tc]) || []);

  // Core metrics
  const statusDist = getStatusDistribution(rawTestResults);
  const passRate = calculatePassRate(statusDist);
  const executionComplete = calculateExecutionCompletion(statusDist, testCaseCount);

  // ... aggregate all data and return PdfData
  return { passRate, executionComplete, /* ... */ };
}

function getStatusDistribution(results: any[]) {
  const dist = { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 };
  results.forEach((r: any) => {
    const status = r.status?.toLowerCase() || 'untested';
    if (status === 'passed') dist.passed++;
    else if (status === 'failed') dist.failed++;
    else if (status === 'blocked') dist.blocked++;
    else if (status === 'retest') dist.retest++;
    else dist.untested++;
  });
  return dist;
}

function calculatePassRate(statusDist: any): number {
  const total = statusDist.passed + statusDist.failed + statusDist.blocked + statusDist.retest;
  return total > 0 ? (statusDist.passed / total) * 100 : 0;
}

function calculateExecutionCompletion(statusDist: any, totalTCs: number): number {
  const tested = statusDist.passed + statusDist.failed + statusDist.blocked + statusDist.retest;
  return totalTCs > 0 ? (tested / totalTCs) * 100 : 0;
}

function prepareDailyTrends(results: any[], days: number): DailyTrend[] {
  const now = new Date();
  const dayMap = new Map<string, { passed: number; failed: number; blocked: number; total: number }>();
  
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { passed: 0, failed: 0, blocked: 0, total: 0 });
  }
  
  results.forEach((r: any) => {
    const key = new Date(r.created_at).toISOString().split('T')[0];
    const day = dayMap.get(key);
    if (day) {
      day.total++;
      const status = r.status?.toLowerCase();
      if (status === 'passed') day.passed++;
      else if (status === 'failed') day.failed++;
      else if (status === 'blocked') day.blocked++;
    }
  });
  
  return Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    passRate: d.total > 0 ? (d.passed / d.total) * 100 : 0,
    executed: d.total,
    passed: d.passed,
    failed: d.failed,
    blocked: d.blocked,
    execCount: d.total,
  }));
}

function prepareRunResults(allRunsRaw: any[], rawTestResults: any[]): RunResult[] {
  return allRunsRaw.map((run: any) => {
    // CRITICAL FIX: Only count results where run_id === run.id
    const runResults = rawTestResults.filter((r: any) => r.run_id === run.id);
    const stats = getStatusDistribution(runResults);
    return {
      runId: run.id,
      runName: run.name,
      milestone: run.milestone?.name || 'Unassigned',
      status: run.status || 'Active',
      passed: stats.passed,
      failed: stats.failed,
      blocked: stats.blocked,
      untested: stats.untested,
      passRate: calculatePassRate(stats),
      total: runResults.length,
    };
  });
}

function calculateReleaseScore(passRate: number, openBlockers: number, executionComplete: number, milestones: MilestoneCard[]): ReleaseReadiness {
  const passRateScore = passRate;
  const critBugResolution = openBlockers === 0 ? 100 : Math.max(0, 100 - openBlockers * 10);
  const coverageScore = executionComplete;
  const milestoneProgress = milestones.length > 0 ? milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length : 100;

  const weightedScore = passRateScore * 0.4 + critBugResolution * 0.25 + coverageScore * 0.2 + milestoneProgress * 0.15;

  let status: 'RELEASE_READY' | 'CONDITIONAL' | 'NOT_READY';
  if (weightedScore >= 80) status = 'RELEASE_READY';
  else if (weightedScore >= 60) status = 'CONDITIONAL';
  else status = 'NOT_READY';

  return {
    score: Math.round(weightedScore),
    status,
    scoreBreakdown: {
      passRate: passRate,
      passRateScore: (passRate / 100) * 40,
      critBugResolution: critBugResolution,
      coverageRate: executionComplete,
      coverageScore: (executionComplete / 100) * 20,
      milestoneProgress: milestoneProgress,
    },
  };
}
```

---

## PART 4: generateExecutiveReport.ts — 메인 엔트리

```typescript
import { jsPDF } from 'jspdf';
import { ExportPDFInput, PdfConfig, PdfData } from './pdfTypes';
import { preparePdfData } from './pdfDataPrep';
import { getDefaultConfig } from './pdfHelpers';
import { drawPage1Cover } from './drawPage1Cover';
import { drawPage2Scorecard } from './drawPage2Scorecard';
import { drawPage3Trends } from './drawPage3Trends';
import { drawPage4Execution } from './drawPage4Execution';
import { drawPage5Milestone } from './drawPage5Milestone';
import { drawPage6Risk } from './drawPage6Risk';
import { drawPage7Team } from './drawPage7Team';
import { drawPage8Appendix } from './drawPage8Appendix';

export async function generateExecutiveReport(input: ExportPDFInput): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const config = getDefaultConfig();

  const data = await preparePdfData(
    input.project, input.testCaseCount, input.milestones,
    input.allRunsRaw, input.rawTestResults, input.supabase, input.projectPassRateData
  );

  let totalPages = 8;
  if (input.tierLevel < 3) totalPages = 6; // Free/Starter: skip P6, P7

  const pageDrawerFunctions = [
    drawPage1Cover, drawPage2Scorecard, drawPage3Trends, drawPage4Execution,
    drawPage5Milestone, drawPage6Risk, drawPage7Team, drawPage8Appendix,
  ];

  let pageNum = 1;
  for (let i = 0; i < pageDrawerFunctions.length; i++) {
    if (input.tierLevel < 3 && (i === 5 || i === 6)) continue; // Skip P6, P7

    if (pageNum > 1) pdf.addPage();

    try {
      await pageDrawerFunctions[i]({
        pdf, config, data, tierLevel: input.tierLevel, pageNum, totalPages,
      });
    } catch (err) {
      console.error(`Error drawing page ${pageNum}:`, err);
    }    pageNum++;
  }

  pdf.save(`${input.project.name}_Quality_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
```

---

## PART 5: 8페이지 상세 레이아웃 (jsPDF 좌표 + 드로잉 코드)

### ═══════════════════════════════════════
### P1: Cover + Executive Summary (drawPage1Cover.ts)
### ═══════════════════════════════════════

**Cover Header (y=0~40mm):**
```typescript
export function drawPage1Cover(pdf: jsPDF, data: PdfData, config: PdfConfig) {
  const { margin, contentW, pageW, font } = config;

  // ── Cover Header (0~40mm) ── Indigo gradient-look
  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 0, 210, 40, 'F');

  // Testably logo text (or addImage if logo base64 available)
  pdf.setFontSize(12); pdf.setFont(font, 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text('Testably', margin, 12);
  // Report date (right-aligned)
  pdf.setFontSize(8); pdf.setFont(font, 'normal'); pdf.setTextColor(255, 255, 255, 0.8);
  pdf.text(`Report Generated: ${data.dateStr}`, pageW - margin, 12, { align: 'right' });
  // Project name
  pdf.setFontSize(18); pdf.setFont(font, 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text(data.projectName, margin, 24);
  // Subtitle
  pdf.setFontSize(11); pdf.setFont(font, 'normal');
  pdf.text('Quality Executive Report', margin, 32);
```

**Release Readiness (y=45~88mm):**
```typescript
  // ── Release Readiness ──
  let y = 45;
  drawSectionTitle(pdf, 'Release Readiness', y, config); y += 5;

  const score = data.releaseScore;
  // 인디케이터 박스 (30mm high, 170mm wide)
  const boxColors = score >= 80
    ? { bg: [236,253,245], border: [16,163,127], text: [16,163,127], label: 'RELEASE READY', msg: 'Project meets quality gates for release' }
    : score >= 60
    ? { bg: [255,251,235], border: [245,158,11], text: [245,158,11], label: 'CONDITIONAL', msg: 'Release possible with known risks — review required' }
    : { bg: [254,242,242], border: [239,68,68], text: [239,68,68], label: 'NOT READY', msg: 'Significant quality gaps — release not recommended' };

  pdf.setFillColor(...boxColors.bg);
  pdf.setDrawColor(...boxColors.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentW, 30, 3, 3, 'FD');

  // Circle icon (x=28, y=y+8, radius 8mm)
  pdf.setFillColor(...boxColors.border);
  pdf.circle(margin + 8, y + 15, 8, 'F');

  // Status label: 14pt Bold
  pdf.setFontSize(14); pdf.setFont(font, 'bold');
  pdf.setTextColor(...boxColors.text);
  pdf.text(boxColors.label, margin + 30, y + 10);
  // Score: 11pt Bold dark
  pdf.setFontSize(11); pdf.setTextColor(15, 23, 42);
  pdf.text(`Score: ${Math.round(score)} / 100`, margin + 30, y + 17);
  // Message: 9pt gray
  pdf.setFontSize(9); pdf.setFont(font, 'normal'); pdf.setTextColor(100, 116, 139);
  pdf.text(boxColors.msg, margin + 30, y + 23);
  y += 33;

  // ── Score Breakdown: 4 mini cards (y=82~88mm) ──
  const breakdownItems = [
    { label: 'Pass Rate (40%)', value: `${data.passRate.toFixed(1)}%` },
    { label: 'Critical Pass (25%)', value: `${data.critBugResolution}%` },
    { label: 'Coverage (20%)', value: `${data.coverageRate.toFixed(0)}%` },
    { label: 'Milestone (15%)', value: `${data.milestoneProgress.toFixed(0)}%` },
  ];
  const miniW = (contentW - 3 * 3.3) / 4; // ~40mm each
  breakdownItems.forEach((item, i) => {
    const x = margin + i * (miniW + 3.3);
    pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, miniW, 10, 1.5, 1.5, 'FD');
    pdf.setFontSize(7); pdf.setFont(font, 'normal'); pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, x + miniW/2, y + 3.5, { align: 'center' });
    pdf.setFontSize(11); pdf.setFont(font, 'bold'); pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, x + miniW/2, y + 8, { align: 'center' });
  });
  y += 13;
```

**KPI Summary (y=93~143mm) — 2×3 그리드, 53mm×22mm 카드:**
```typescript
  // ── KPI Summary 2×3 ──
  drawSectionTitle(pdf, 'Key Performance Indicators', y, config); y += 5;
  const kpiCards = [
    { label: 'Pass Rate', value: `${data.passRate.toFixed(1)}%`, delta: `▲ +${data.passRateDelta}%`, deltaColor: 'green' },
    { label: 'Total Executed', value: data.totalExecuted.toLocaleString(), delta: `▲ +${data.executedDelta}`, deltaColor: 'green' },
    { label: 'Active Runs', value: `${data.activeRuns}`, sub: `of ${data.totalRuns}` },
    { label: 'Failed TCs', value: `${data.failedCount}`, delta: `▼ -${data.failedDelta}`, deltaColor: 'green', valueColor: [239,68,68] },
    { label: 'Blocked', value: `${data.blockedCount}`, delta: `▼ -${data.blockedDelta}`, deltaColor: 'green', valueColor: [249,115,22] },
    { label: 'Test Cases', value: `${data.testCaseCount}`, sub: 'total' },
  ];
  const kpiW = 53, kpiH = 22, kpiGap = 5.5;
  kpiCards.forEach((card, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = margin + col * (kpiW + kpiGap);
    const cy = y + row * (kpiH + 3);
    drawKpiCard(pdf, x, cy, kpiW, kpiH, {
      label: card.label, value: card.value, delta: card.delta,
      deltaColor: card.deltaColor, sub: card.sub, font, valueColor: card.valueColor,
    });
  });
  y += 2 * (kpiH + 3) + 5;
```

**Risk Highlights (y=148~195mm):**
```typescript
  // ── Risk Highlights (max 5, sorted by severity) ──
  drawSectionTitle(pdf, 'Risk Highlights', y, config); y += 5;
  const riskColors = { critical: [239,68,68], high: [249,115,22], medium: [234,179,8] };

  if (data.risks.length === 0) {
    pdf.setFillColor(16, 163, 127);
    pdf.circle(margin + 2, y + 2, 1.5, 'F');
    pdf.setFontSize(9); pdf.setFont(font, 'normal'); pdf.setTextColor(15, 23, 42);
    pdf.text('No significant risks identified — all quality gates on track', margin + 8, y + 3);
    y += 10;
  } else {
    data.risks.slice(0, 5).forEach(risk => {
      const color = riskColors[risk.severity] || riskColors.medium;
      pdf.setFillColor(...color);
      pdf.circle(margin + 2, y + 2, 1.5, 'F');
      pdf.setFontSize(9); pdf.setFont(font, 'normal'); pdf.setTextColor(15, 23, 42);
      pdf.text(risk.message, margin + 8, y + 3);
      y += 8;
    });
  }
  y += 5;
```

**Table of Contents (y=200~260mm):**
```typescript
  // ── TOC (8 items, dotted leader) ──
  drawSectionTitle(pdf, 'Contents', y, config); y += 5;
  const tocItems = [
    'Executive Summary', 'Quality Scorecard', 'Quality Trends', 'Test Execution Detail',
    'Milestone & Release Readiness', 'Risk Assessment', 'Team Performance', 'Test Case Appendix'
  ];
  tocItems.forEach((item, i) => {
    pdf.setFontSize(9); pdf.setFont(font, 'normal'); pdf.setTextColor(15, 23, 42);
    pdf.text(`${i + 1}. ${item}`, margin, y);
    // Dotted leader
    pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([0.5, 0.5], 0);
    pdf.line(margin + 60, y - 1, pageW - margin - 10, y - 1);
    pdf.setLineDashPattern([], 0);
    // Page number (right-aligned)
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${i + 1}`, pageW - margin, y, { align: 'right' });
    y += 7;
  });

  drawFooter(pdf, 1, data.totalPages, config);
}
```

### Release Readiness Score 계산:
```typescript
releaseScore = (passRate × 0.40) + (critBugResolution × 0.25) + (coverageRate × 0.20) + (milestoneProgress × 0.15)
```
- passRate = passed / (total - untested) × 100
- critBugResolution = critical failures > 0 ? 0 : 100
- coverageRate = (total - untested) / total × 100
- milestoneProgress = avg milestone progress

### Risk Highlights 자동 생성 규칙:
| 조건 | 심각도 | 메시지 템플릿 |
|------|--------|--------------|
| Critical TC 실패 존재 | critical | "X Critical TC failures in 'Y' module" |
| 마일스톤 At Risk (진행률<80% && D-3 이내) | high | "'Milestone' at risk (X%, D-N)" |
| 모듈 미실행 TC > 10건 | medium | "'Module' has X untested TCs (coverage gap)" |
| Pass Rate 전주 대비 >5% 하락 | high | "Pass Rate dropped X% from last week" |
| 리스크 없음 | — | "✅ No significant risks identified" |

---

### ═══════════════════════════════════════
### P2: Quality Scorecard (drawPage2Scorecard.ts)
### ═══════════════════════════════════════

```typescript
export function drawPage2Scorecard(pdf: jsPDF, data: PdfData, config: PdfConfig) {
  const { margin, contentW, font } = config;
  drawHeader(pdf, 'Quality Scorecard', config);
```

**Status Distribution Bar (y=20~38mm):**
```typescript
  let y = 20;
  drawSectionTitle(pdf, 'Status Distribution', y, config); y += 7;

  // Stacked bar: 170mm × 6mm
  const barY = y, barH = 6;
  const total = data.statusCounts.passed + data.statusCounts.failed + data.statusCounts.blocked + data.statusCounts.retest + data.statusCounts.untested;
  const segments = [
    { count: data.statusCounts.passed, color: [16,163,127], label: 'Passed' },
    { count: data.statusCounts.failed, color: [239,68,68], label: 'Failed' },
    { count: data.statusCounts.blocked, color: [249,115,22], label: 'Blocked' },
    { count: data.statusCounts.retest, color: [234,179,8], label: 'Retest' },
    { count: data.statusCounts.untested, color: [203,213,225], label: 'Untested' },
  ];
  let barX = margin;
  segments.forEach(seg => {
    const w = total > 0 ? (seg.count / total) * contentW : 0;
    if (w > 0) {
      pdf.setFillColor(...seg.color);
      pdf.rect(barX, barY, w, barH, 'F');
      barX += w;
    }
  });
  y += barH + 2;

  // Legend row (7pt): ■ 2×2mm + "Passed(891)", spacing 10mm
  let legX = margin;
  segments.forEach(seg => {
    pdf.setFillColor(...seg.color); pdf.rect(legX, y, 2, 2, 'F');
    pdf.setFontSize(7); pdf.setFont(font, 'normal'); pdf.setTextColor(100, 116, 139);
    pdf.text(`${seg.label} (${seg.count})`, legX + 3.5, y + 1.8);
    legX += 35;
  });
  y += 8;
```

**KPI 6개 (y=40~90mm) — 2×3 그리드, 53mm×22mm 카드:**
```
Row 1: Overall Pass Rate (target 90%), Execution Completion (target 95%), Defect Discovery Rate (Industry ~5-10%)
Row 2: Automation Rate (is_automated count), Avg Run Pass Rate, Open Blockers (🔴 if > 0)
```
- **Execution Completion** = `(total - untested) / total × 100`
- **Defect Discovery Rate** = `failed / (total - untested) × 100`
- **Automation Rate** = `COUNT(is_automated=true) / totalTCs` ← 추가 쿼리 필요: `test_cases.is_automated`
- **Avg Run Pass Rate** = runs의 passRate 평균 (resultsByRun에서 계산)
- **Open Blockers** = `COUNT(status='blocked')`, 값 > 0 이면 Red 텍스트 + "🔴 Needs attention"
- Target 달성: ✅ (Green), 미달: ⚠️ (Orange)

**Priority Distribution (y=95~165mm) — 4개 가로 바:**
```typescript
  // Priority bars: Critical(Red), High(Amber), Medium(Indigo), Low(Gray)
  const priorities = [
    { label: 'Critical', color: [239,68,68], count: data.priorityCounts.critical },
    { label: 'High', color: [245,158,11], count: data.priorityCounts.high },
    { label: 'Medium', color: [99,102,241], count: data.priorityCounts.medium },
    { label: 'Low', color: [148,163,184], count: data.priorityCounts.low },
  ];
  const maxCount = Math.max(...priorities.map(p => p.count));
  priorities.forEach((pri, i) => {
    const py = y + i * 14;
    // Label: 9pt Bold colored
    pdf.setFontSize(9); pdf.setFont(font, 'bold'); pdf.setTextColor(...pri.color);
    pdf.text(pri.label, margin, py + 5);
    // Bar: 120mm × 5mm
    const barW = maxCount > 0 ? (pri.count / maxCount) * 120 : 0;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin + 25, py, 120, 5, 1, 1, 'F');
    if (barW > 0) {
      pdf.setFillColor(...pri.color);
      pdf.roundedRect(margin + 25, py, barW, 5, 1, 1, 'F');
    }
    // Count + %: right
    const pct = data.testCaseCount > 0 ? (pri.count / data.testCaseCount * 100).toFixed(1) : '0';
    pdf.setFontSize(9); pdf.setFont(font, 'normal'); pdf.setTextColor(100, 116, 139);
    pdf.text(`${pri.count} (${pct}%)`, margin + 150, py + 4, { align: 'right' });
  });
```

**Project Information (y=170~195mm) — 2열 테이블:**
```
좌 열: Project / Created / Team Size
우 열: Status / Total Runs / Active Milestones
각 행 7mm, 라벨 8pt gray + 값 9pt dark
```

---

### ═══════════════════════════════════════
### P3: Quality Trends (drawPage3Trends.ts)
### ═══════════════════════════════════════

**Pass Rate Trend Chart (y=20~95mm) — jsPDF 직접 드로잉:**
```typescript
export function drawPage3Trends(pdf: jsPDF, data: PdfData, config: PdfConfig) {
  const { margin, contentW, font } = config;
  drawHeader(pdf, 'Quality Trends', config);

  let y = 20;
  drawSectionTitle(pdf, 'Pass Rate Trend (30 Days)', y, config); y += 7;

  const chartX = margin, chartY = y, chartW = contentW, chartH = 60;

  // Y축 Grid lines (0%, 20%, 40%, 60%, 80%, 100%)
  [0, 20, 40, 60, 80, 100].forEach(pct => {
    const gy = chartY + chartH - (pct / 100) * chartH;
    pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(chartX, gy, chartX + chartW, gy);
    pdf.setFontSize(7); pdf.setTextColor(100, 116, 139); pdf.setFont(font, 'normal');
    pdf.text(`${pct}%`, chartX - 2, gy + 1, { align: 'right' });
  });

  // Pass Rate 라인 (Indigo 실선 0.7pt + 데이터 포인트 원 0.8mm)
  pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.7); pdf.setLineDashPattern([], 0);
  const dailyData = data.dailyTrends; // from pdfDataPrep
  let prevX = 0, prevY = 0;
  dailyData.forEach((day, i) => {
    const x = chartX + (i / Math.max(dailyData.length - 1, 1)) * chartW;
    const dy = chartY + chartH - (day.passRate / 100) * chartH;
    if (i > 0) pdf.line(prevX, prevY, x, dy);
    prevX = x; prevY = dy;
    pdf.setFillColor(99, 102, 241); pdf.circle(x, dy, 0.8, 'F');
  });

  // 보조 라인 (Execution Count, 점선, 우측 Y축)
  pdf.setDrawColor(100, 116, 139); pdf.setLineWidth(0.5);
  pdf.setLineDashPattern([2, 1], 0);
  // ... 동일 패턴으로 day.executed 기준 그리기

  // 범례 (y=chartY+chartH+5)
  const legY = chartY + chartH + 5;
  pdf.setLineDashPattern([], 0); pdf.setDrawColor(99, 102, 241); pdf.setLineWidth(0.7);
  pdf.line(75, legY, 85, legY);
  pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
  pdf.text('Pass Rate', 87, legY + 1);
  pdf.setLineDashPattern([2, 1], 0); pdf.setDrawColor(100, 116, 139);
  pdf.line(115, legY, 125, legY);
  pdf.text('Execution Count', 127, legY + 1);
```

**Week-over-Week Comparison Table (y=100~170mm):**
- 5열: Metric(35%) | This Week(18%) | Last Week(18%) | Change(14%) | Bar(15%)
- 5행: Pass Rate, Executed, New Failures, Blocked, TCs Created
- Change 색상: 긍정 Green ▲, 부정 Red ▼
  - **중요:** New Failures, Blocked 감소 = 긍정(Green), 증가 = 부정(Red)
- Bar 열: 미니 진행바 25mm × 3mm, Indigo 채움

**Execution Velocity Bar Chart (y=175~255mm):**
- chartH=65mm, 30일 일별 바
- 바 너비: `chartW / 30 × 0.7`, 색상 Indigo opacity 0.6 (밝은 Indigo 사용)
- 7일 이동평균 라인: Red RGB(239,68,68) 0.5pt 실선 오버레이
- Y축: 일별 실행 건수, X축: 매 7일 라벨

---

### ═══════════════════════════════════════
### P4: Test Execution Detail (drawPage4Execution.ts)
### ═══════════════════════════════════════

**Run Summary Bar (y=20~30mm):**
```typescript
  // Light Gray bg, 170mm×10mm, roundedRect 2mm
  pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, 20, contentW, 10, 2, 2, 'FD');
  // 5개 항목: "Total: 12 | Active: 4 | Completed: 6 | Paused: 1 | Review: 1"
  // 9pt, 라벨=gray, 값=Bold dark, 구분선=0.3pt vertical
```

**Run Results Table (y=35~155mm) — 9열:**
```
열 너비: #(8) | Name(40) | Milestone(30) | Status(22) | Pass(14) | Fail(14) | Blk(12) | Total(14) | Rate%(16)
```
- Status 색상: Active=Green● / Completed=Indigo / Paused=Orange
- Rate% 색상: ≥90% Green | ≥70% Orange | <70% Red
- Max 15행, 초과: "... and N more runs"
- **버그 수정:** resultsByRun에서 run_id가 없는 결과 제외

**Module Coverage Table (y=160~260mm) — 6열:**
```
열 너비: Module(40) | TCs(16) | Tested(18) | Untested(20) | Pass%(18) | Coverage Bar(58)
```
- Coverage bar: 인라인 55mm×4mm, Green 비율 채움, Light Gray 잔여
- Max 10개 모듈, untested DESC 정렬

---

### ═══════════════════════════════════════
### P5: Milestone & Release Readiness (drawPage5Milestone.ts)
### ═══════════════════════════════════════

**Milestone Cards (y=20~90mm) — 2×2 그리드, 82mm×50mm 카드, 간격 6mm:**
```typescript
  const milestoneCards = data.milestoneCards.slice(0, 4); // max 4
  milestoneCards.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = margin + col * (82 + 6);
    const cy = 25 + row * (50 + 6);

    pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.5);
    pdf.roundedRect(x, cy, 82, 50, 2, 2, 'D');

    // Milestone name: 10pt Bold
    pdf.setFontSize(10); pdf.setFont(font, 'bold'); pdf.setTextColor(15, 23, 42);
    pdf.text(m.name, x + 4, cy + 8);

    // Status badge: On Track(Green bg연)/At Risk(Amber)/Overdue(Red)/Completed(Indigo)
    const badgeColors = {
      'On Track': { bg: [236,253,245], text: [16,163,127] },
      'At Risk': { bg: [255,251,235], text: [245,158,11] },
      'Overdue': { bg: [254,242,242], text: [239,68,68] },
      'Completed': { bg: [238,242,255], text: [99,102,241] },
    };
    const bc = badgeColors[m.status];
    pdf.setFillColor(...bc.bg);
    pdf.roundedRect(x + 55, cy + 3, 24, 6, 1, 1, 'F');
    pdf.setFontSize(7); pdf.setFont(font, 'bold'); pdf.setTextColor(...bc.text);
    pdf.text(m.status, x + 67, cy + 7, { align: 'center' });

    // Progress bar: 70mm×3mm
    drawProgressBar(pdf, x + 4, cy + 18, 70, 3, m.progress, m.progressColor, config);

    // Details: 8pt gray
    pdf.setFontSize(8); pdf.setFont(font, 'normal'); pdf.setTextColor(100, 116, 139);
    pdf.text(`Due: ${m.dueDate} (D${m.daysRemaining >= 0 ? '-' : '+'}${Math.abs(m.daysRemaining)})`, x + 4, cy + 28);
    pdf.text(`Remaining: ${m.remainingTCs} TCs`, x + 4, cy + 34);
    pdf.text(`Velocity: ${m.velocity.toFixed(1)} TC/day`, x + 4, cy + 40);
    pdf.text(`Est. Completion: ${m.estCompletion}`, x + 4, cy + 46);
  });
```

**마일스톤 Status 판정 로직:**
```typescript
if (m.status === 'completed') → 'Completed'
else if (daysRemaining < 0) → 'Overdue'
else if (estimatedDaysToComplete > daysRemaining) → 'At Risk'
else → 'On Track'
```

**Burndown Chart (y=95~180mm) — 170mm×70mm:**
- 가장 큰 활성 마일스톤 자동 선택
- Ideal 라인: dashed gray (3mm dash, 2mm gap), 좌상→우하 대각선
- Actual 라인: solid Indigo 0.7pt + 데이터 포인트 원(0.8mm)
- "Today" 세로선: Red dashed at current date position
- Y축: "Remaining TCs" (0 ~ totalTCs), X축: milestone 기간

**Quality Gates Table (y=185~260mm) — 5열:**
| Gate | Threshold | Calculation | Verdict |
|------|-----------|-------------|---------|
| Pass Rate ≥ 90% | 90% | passed / (total-untested) × 100 | ✅ PASS / ❌ FAIL |
| No Critical Failures | 0 | COUNT(failed + priority=critical) | ✅ / ❌ |
| Coverage ≥ 80% | 80% | (total-untested) / total × 100 | ✅ / ⚠️ WARN(70-80%) / ❌ FAIL(<70%) |
| Blocked ≤ 5% | 5% | blocked / total × 100 | ✅ / ❌ |

- Status 아이콘: ✓ Green 원(4mm) | ✕ Red 원 | ! Orange 원
- Verdict 색상: PASS=Green Bold, FAIL=Red Bold, WARN=Orange Bold

---

### ═══════════════════════════════════════
### P6: Risk Assessment (drawPage6Risk.ts) — Professional+ 전용
### ═══════════════════════════════════════

**Top 10 Failed TCs (y=20~120mm) — 6열 테이블:**
```
열 너비: #(8) | TC ID(18) | Title(65) | Priority(22) | Fails(16) | Last(41)
```
- Priority: 색상 원(2mm) + 약어 (Crit/High/Med/Low)
- Fails: Bold, ≥5 Red | ≥3 Orange | <3 dark
- Last: 상대 시간 ("2h ago", "1d ago")
- 데이터: `prepareTopFailedTCs()` — GROUP BY test_case_id WHERE status='failed', ORDER BY count DESC

**Flaky TCs (y=125~195mm) — 4열:**
```
열 너비: TC ID(18) | Title(55) | Sequence(60) | Score(37)
```
- Sequence: 10개 원 — ● Green 채움(1.5mm, passed) / ○ Red 테두리(1.5mm, failed), 간격 4mm
```typescript
  // Flaky sequence 그리기
  tc.lastTenResults.forEach((result, j) => {
    const cx = seqStartX + j * 4;
    if (result === 'passed') {
      pdf.setFillColor(16, 163, 127);
      pdf.circle(cx, rowY + 3, 1.5, 'F');
    } else {
      pdf.setDrawColor(239, 68, 68); pdf.setLineWidth(0.4);
      pdf.circle(cx, rowY + 3, 1.5, 'D');
    }
  });
```
- Flaky Score = `(상태 전환 횟수) / 9 × 100` — ≥70% Red⚠️ | ≥50% Orange⚠️
- Max 5행

**Coverage Gaps (y=200~260mm) — 4열:**
```
열 너비: Module(45) | Untested TCs(30) | % of Module(30) | Risk(65)
```
- Risk 뱃지: ≥50% 🔴 High(Red) | ≥20% 🟠 Medium(Orange) | <20% 🟡 Low(Yellow)
- 심각도 순 정렬, max 8개 모듈

---

### ═══════════════════════════════════════
### P7: Team Performance (drawPage7Team.ts) — Professional+ 전용
### ═══════════════════════════════════════

**Team Summary Bar (y=20~30mm):**
- P4 Run Summary와 동일 스타일
- "Total Members: N | Active Today: N | Avg Execution/Member: N"

**Member Performance Table (y=35~145mm) — 8열:**
```
열 너비: #(8) | Member(32) | Executed(20) | Passed(18) | Failed(18) | Pass%(18) | Contrib%(20) | Bar(36)
```
- Pass% 색상: ≥90% Green | ≥70% Orange | <70% Red
- Bar: 인라인 35mm×3.5mm, Indigo 농도 차이 (1등 100%, 2등 80%, 3등 60%, 4등 40%, 5등+ 25%)
- Executed DESC 정렬, max 12명

**Contribution Distribution (y=150~210mm):**
- 상위 5명 + "Others"
- 각 행: name(30mm) + bar(110mm×4mm) + %(30mm), 행 높이 9mm
- Indigo 농도: 100%/80%/60%/40%/25%/Gray

**Defect Discovery (y=215~270mm):**
- 하이라이트 박스: bg RGB(238,242,255), 모서리 1.5mm
- "이정현 님이 전체 결함의 19.1%를 발견 — 팀 내 최고 버그 발견율" 9pt Indigo
- 미니 4열 테이블: Member | Failures Found | % of Total | Discovery Rate
- Discovery Rate = Failures / Executed × 100, 상위 5명

---

### ═══════════════════════════════════════
### P8: TC Appendix (drawPage8Appendix.ts) — 동적 멀티페이지
### ═══════════════════════════════════════

**Lifecycle Distribution (첫 페이지만, y=20~35mm):**
- Light Gray bar, 170mm×10mm: "🟢 Active: N (X%) | 🟣 Draft: N (X%) | ⚪ Deprecated: N (X%)"
- 색상 원(2mm): Active=Green(16,163,127) | Draft=Violet(139,92,246) | Deprecated=Gray(148,163,184)

**TC Table — 6열 × 30행/페이지:**
```
열 너비: #(8) | ID(18) | Title(60) | Priority(22) | Status(22) | Folder(40)
```
- Priority: 색상 원 + 약어 (P6과 동일)
- Status: 최신 test_result 상태 색상 (Passed=Green, Failed=Red, Blocked=Orange, Untested=Gray italic)
- 행 높이 7mm

**동적 멀티페이지 로직:**
```typescript
const TC_PER_PAGE = 30;
const tcPages = Math.ceil(tcs.length / TC_PER_PAGE);

for (let p = 0; p < tcPages; p++) {
  if (p > 0) pdf.addPage();
  drawHeader(pdf, 'Test Case Appendix', config);

  let tableY: number;
  if (p === 0) {
    drawLifecycleBar(pdf, data, config); // y=20~35mm
    drawSectionTitle(pdf, 'All Test Cases', 40, config);
    tableY = 45;
  } else {
    tableY = 20;
  }

  drawTableHeader(pdf, tableY, config);
  tableY += 8;

  const pageTCs = tcs.slice(p * TC_PER_PAGE, (p + 1) * TC_PER_PAGE);
  pageTCs.forEach((tc, i) => drawTCRow(pdf, tc, tableY + i * 7, p * TC_PER_PAGE + i, config));

  // 마지막 페이지에만 총 TC 수 표시
  if (p === tcPages - 1) {
    const endY = tableY + pageTCs.length * 7 + 4;
    pdf.setFontSize(9); pdf.setFont(config.font, 'bold'); pdf.setTextColor(15, 23, 42);
    pdf.text(`Total: ${tcs.length} Test Cases`, pageW - margin, endY, { align: 'right' });
  }

  drawFooter(pdf, basePageNum + p, data.totalPages, config);
}
```

**TC 데이터 추가 fetch:**
- `supabase.from('test_cases').select('id, title, priority, lifecycle_status, folder, is_automated').eq('project_id', id)`
- 최신 test_result status per TC: GROUP BY test_case_id, ORDER BY created_at DESC, LIMIT 1

---

## PART 6: 폰트 수정

### 2.1 문제
- `src/assets/fonts/NotoSansKR-Regular.ts`, `NotoSansKR-Bold.ts`의 base64 데이터 손상

### 2.2 수정
1. Google Fonts에서 NotoSansKR TTF 다운로드: https://fonts.google.com/noto/specimen/Noto+Sans+KR
2. TTF → base64 변환:
   ```bash
   base64 -i NotoSansKR-Regular.ttf -o regular.b64
   base64 -i NotoSansKR-Bold.ttf -o bold.b64
   ```
3. 파일 재생성: `src/assets/fonts/NotoSansKR-Regular.ts`, `NotoSansKR-Bold.ts`
4. 로고 추가: `src/assets/images/testably-logo.ts` (base64 PNG)

---

## PART 7: 티어 게이팅

| Page | Free (1) | Starter (2) | Professional+ (3+) |
|------|----------|-------------|-------------------|
| P1   | 3 KPI    | 6 KPI      | 6 KPI + Risk      |
| P2   | Full     | Full       | Full              |
| P3   | 7일      | 30일       | Full              |
| P4   | 5 runs   | Full       | Full              |
| P5   | 1개      | Full       | Full + Burndown   |
| P6   | 🔒       | 🔒         | Full              |
| P7   | 🔒       | 🔒         | Full              |
| P8   | 20 TC    | Full       | Full              |

---

## PART 8: 색상 팔레트

```
Primary (Indigo):      RGB(99, 102, 241)
Success (Green):       RGB(16, 163, 127)
Failure (Red):         RGB(239, 68, 68)
Warning (Orange):      RGB(249, 115, 22)
Rest (Yellow):         RGB(234, 179, 8)
Inactive (Gray):       RGB(203, 213, 225)
Text Dark:             RGB(15, 23, 42)
Text Light:            RGB(100, 116, 139)
BG Light:              RGB(248, 250, 252)
Border:                RGB(226, 232, 240)
Critical:              RGB(239, 68, 68)
High:                  RGB(245, 158, 11)
Medium:                RGB(99, 102, 241)
Low:                   RGB(148, 163, 184)
```

---

## PART 9: 구현 체크리스트

### Phase 1: 핵심 구조 (3-4일)
- [ ] 폰트 수정 (NotoSansKR TTF 재생성)
- [ ] 로고 base64 추가
- [ ] pdf/ 폴더 생성
- [ ] pdfTypes.ts 작성
- [ ] pdfHelpers.ts 작성 (모든 드로잉 함수)
- [ ] pdfDataPrep.ts 작성 (데이터 집계)
- [ ] generateExecutiveReport.ts 작성
- [ ] page.tsx handleExportPDF 교체
- [ ] P1 Cover 구현
- [ ] P2 Scorecard 구현
- [ ] P4 Execution 구현 (버그 수정)

### Phase 2: 차트 + 마일스톤 (2-3일)
- [ ] P3 Trends (라인 차트, WoW 테이블, Velocity)
- [ ] P5 Milestone (카드, 번다운, Quality Gates)

### Phase 3: 리스크 + 팀 + 부록 (2-3일)
- [ ] P6 Risk Assessment
- [ ] P7 Team Performance
- [ ] P8 TC Appendix (멀티페이지)
- [ ] 티어 게이팅 적용
- [ ] 실 데이터 QA

### 예상 공수: 7-10일

---

## PART 10: 주요 버그 수정

### Run Results 중복 카운팅 (P4)
**현재:** `rawTestResults` 전체를 카운트
**수정:** `rawTestResults.filter(r => r.run_id === run.id)`로만 필터링

### Quality Gates 자동 판정 (P5)
- Pass Rate ≥ 90%: PASS, 70-89%: WARN, <70%: FAIL
- No Critical Failures: 0개 = PASS, >0 = FAIL
- Coverage ≥ 80%: PASS, 70-79%: WARN, <70%: FAIL
- Blocked ≤ 5%: PASS, 5-10%: WARN, >10%: FAIL

### Flaky Score 계산 (P6)
- 마지막 10개 결과의 상태 변화 횟수
- Score = (transitions / 9) × 100
- Frequency: >70% High, 50-70% Medium, <50% Low

---

## PART 11: 페이지별 그리기 함수 구조

각 drawPageN.ts 파일은 다음 구조를 따릅니다:

```typescript
import { jsPDF } from 'jspdf';
import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, /* ... */ } from './pdfHelpers';

export async function drawPage1Cover(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const margin = config.margin;

  // Draw header
  drawCoverHeader(pdf, data.projectName, config);

  // Draw content sections
  // ...

  // Draw footer
  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
```

---

## PART 12: 추가 참고사항

### jsPDF 라인 차트 그리기 (P3)
- Grid lines: `pdf.setLineDashPattern([1,1], 0)` + horizontal lines
- Data line: `pdf.line(x1, y1, x2, y2)` with solid pattern
- Data points: `pdf.circle(x, y, 0.8, 'F')`

### 동적 페이지 계산 (P8)
- TC 테이블 30행/페이지
- `Math.ceil(totalTCs / 30)` 추가 페이지 필요
- 각 페이지마다 `pdf.addPage()` 호출

### 에러 핸들링
- `preparePdfData()` 실패 → 폰트/데이터 검증
- 차트 그리기 실패 → 좌표 범위 확인
- 파일 다운로드 실패 → 브라우저 보안 정책 확인

---

**최종 작성 날짜:** 2026-04-01
**총 예상 공수:** 7-10일
**파일 총 라인:** ~1800 lines