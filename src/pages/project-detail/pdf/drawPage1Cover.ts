import { PageDrawContext } from './pdfTypes';
import { drawCoverHeader, drawFooter, drawSectionTitle, drawKpiCard, safeText } from './pdfHelpers';

export async function drawPage1Cover(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, pageWidth: pageW, font } = config;

  // ── Cover Header (0~40mm) ──
  drawCoverHeader(pdf, data.projectName, config);

  // ── Release Readiness (y=45~88mm) ──
  let y = 45;
  drawSectionTitle(pdf, 'Release Readiness', margin, y, config);
  y += 6;

  const score = data.releaseScore;
  const boxColors = score >= 80
    ? { bg: [236, 253, 245] as [number,number,number], border: [16, 163, 127] as [number,number,number], text: [16, 163, 127] as [number,number,number], label: 'RELEASE READY', msg: 'Project meets quality gates for release' }
    : score >= 60
    ? { bg: [255, 251, 235] as [number,number,number], border: [245, 158, 11] as [number,number,number], text: [245, 158, 11] as [number,number,number], label: 'CONDITIONAL', msg: 'Release possible with known risks — review required' }
    : { bg: [254, 242, 242] as [number,number,number], border: [239, 68, 68] as [number,number,number], text: [239, 68, 68] as [number,number,number], label: 'NOT READY', msg: 'Significant quality gaps — release not recommended' };

  pdf.setFillColor(...boxColors.bg);
  pdf.setDrawColor(...boxColors.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentW, 30, 3, 3, 'FD');

  pdf.setFillColor(...boxColors.border);
  pdf.circle(margin + 8, y + 15, 8, 'F');
  pdf.setFont(config.font, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${Math.round(score)}`, margin + 8, y + 16, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont(font, 'bold');
  pdf.setTextColor(...boxColors.text);
  pdf.text(boxColors.label, margin + 22, y + 11);
  pdf.setFontSize(10);
  pdf.setTextColor(...config.textDark);
  pdf.text(`Score: ${Math.round(score)} / 100`, margin + 22, y + 18);
  pdf.setFontSize(9);
  pdf.setFont(font, 'normal');
  pdf.setTextColor(...config.textLight);
  pdf.text(boxColors.msg, margin + 22, y + 25);
  y += 33;

  // ── Score Breakdown: 4 mini cards ──
  const breakdown = [
    { label: 'Pass Rate (40%)', value: `${data.passRate.toFixed(1)}%` },
    { label: 'Critical Pass (25%)', value: `${data.critBugResolution}%` },
    { label: 'Coverage (20%)', value: `${data.coverageRate.toFixed(0)}%` },
    { label: 'Milestone (15%)', value: `${data.milestoneProgress.toFixed(0)}%` },
  ];
  const miniW = (contentW - 3 * 3) / 4;
  breakdown.forEach((item, i) => {
    const x = margin + i * (miniW + 3);
    pdf.setFillColor(...config.bgLight);
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, miniW, 10, 1.5, 1.5, 'FD');
    pdf.setFontSize(7);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(item.label, x + miniW / 2, y + 3.5, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(item.value, x + miniW / 2, y + 8.5, { align: 'center' });
  });
  y += 14;

  // ── KPI Summary 2×3 ──
  drawSectionTitle(pdf, 'Key Performance Indicators', margin, y, config);
  y += 5;

  const kpiCards = [
    { label: 'Pass Rate', value: `${data.passRate.toFixed(1)}%`, delta: `${data.passRateDelta >= 0 ? '+' : '-'} ${Math.abs(data.passRateDelta).toFixed(1)}%`, deltaPositive: data.passRateDelta >= 0 },
    { label: 'Total Executed', value: data.totalExecuted.toLocaleString(), delta: `+ ${data.executedDelta}`, deltaPositive: true },
    { label: 'Active Runs', value: String(data.activeRuns), sub: `of ${data.totalRuns}` },
    { label: 'Failed TCs', value: String(data.failedCount), delta: data.failedDelta >= 0 ? `- ${data.failedDelta}` : `+ ${Math.abs(data.failedDelta)}`, deltaPositive: data.failedDelta >= 0, valueColor: data.failedCount > 0 ? [239, 68, 68] as [number,number,number] : undefined },
    { label: 'Blocked', value: String(data.blockedCount), delta: data.blockedDelta >= 0 ? `- ${data.blockedDelta}` : `+ ${Math.abs(data.blockedDelta)}`, deltaPositive: data.blockedDelta >= 0, valueColor: data.blockedCount > 0 ? [249, 115, 22] as [number,number,number] : undefined },
    { label: 'Test Cases', value: String(data.totalTCs), sub: 'total' },
  ];

  // Tier gating: Free shows 3 KPIs only
  const visibleKpis = tierLevel <= 1 ? kpiCards.slice(0, 3) : kpiCards;
  const kpiW = tierLevel <= 1 ? (contentW - 2 * 5) / 3 : 53;
  const kpiH = 22;
  const kpiGap = tierLevel <= 1 ? 5 : 5.5;

  visibleKpis.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (kpiW + kpiGap);
    const cy = y + row * (kpiH + 3);
    drawKpiCard(pdf, x, cy, kpiW, kpiH, card.label, card.value, config, {
      delta: card.delta,
      deltaPositive: card.deltaPositive,
      sub: (card as any).sub,
      valueColor: card.valueColor,
    });
  });
  y += (tierLevel <= 1 ? 1 : 2) * (kpiH + 3) + 5;

  // ── Risk Highlights (max 5) ──
  drawSectionTitle(pdf, 'Risk Highlights', margin, y, config);
  y += 6;

  const riskColors: Record<string, [number, number, number]> = {
    critical: [239, 68, 68],
    high: [249, 115, 22],
    medium: [234, 179, 8],
  };

  if (data.risks.length === 0) {
    pdf.setFillColor(...config.successColor);
    pdf.circle(margin + 2, y + 2, 1.5, 'F');
    pdf.setFontSize(9);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textDark);
    pdf.text('No significant risks identified — all quality gates on track', margin + 7, y + 3);
    y += 10;
  } else {
    data.risks.slice(0, 5).forEach(risk => {
      const color = riskColors[risk.severity] || riskColors.medium;
      pdf.setFillColor(...color);
      pdf.circle(margin + 2, y + 2, 1.5, 'F');
      pdf.setFontSize(9);
      pdf.setFont(font, 'normal');
      pdf.setTextColor(...config.textDark);
      const msgLines = pdf.splitTextToSize(risk.message, contentW - 10) || [risk.message];
      pdf.text(msgLines[0], margin + 7, y + 3);
      y += 8;
    });
  }
  y += 4;

  // ── Table of Contents ──
  if (y < 220) {
    drawSectionTitle(pdf, 'Contents', margin, y, config);
    y += 6;

    const allTocItems = [
      { label: 'Executive Summary', minTier: 1 },
      { label: 'Quality Scorecard', minTier: 1 },
      { label: 'Quality Trends', minTier: 1 },
      { label: 'Test Execution Detail', minTier: 1 },
      { label: 'Milestone & Release Readiness', minTier: 1 },
      { label: 'Risk Assessment', minTier: 3 },
      { label: 'Team Performance', minTier: 3 },
      { label: 'Test Case Appendix', minTier: 1 },
    ];
    const tocItems = allTocItems.filter(item => tierLevel >= item.minTier);
    let tocPageNum = 1;
    tocItems.forEach((item) => {
      pdf.setFontSize(9);
      pdf.setFont(font, 'normal');
      pdf.setTextColor(...config.textDark);
      pdf.text(`${tocPageNum}. ${item.label}`, margin, y);
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.setLineDashPattern([0.5, 0.5], 0);
      pdf.line(margin + 72, y - 1, pageW - margin - 10, y - 1);
      pdf.setLineDashPattern([], 0);
      pdf.setTextColor(...config.textLight);
      pdf.text(String(tocPageNum), pageW - margin, y, { align: 'right' });
      tocPageNum++;
      y += 7;
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
