import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, drawKpiCard, getPercentageColor } from './pdfHelpers';

export async function drawPage2Scorecard(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Quality Scorecard', config);

  let y = 20;

  // ── Status Distribution Bar (y=20~38mm) ──
  drawSectionTitle(pdf, 'Status Distribution', margin, y, config);
  y += 7;

  const total = data.statusCounts.passed + data.statusCounts.failed + data.statusCounts.blocked
    + data.statusCounts.retest + data.statusCounts.untested;

  const segments = [
    { count: data.statusCounts.passed, color: [16, 163, 127] as [number,number,number], label: 'Passed' },
    { count: data.statusCounts.failed, color: [239, 68, 68] as [number,number,number], label: 'Failed' },
    { count: data.statusCounts.blocked, color: [249, 115, 22] as [number,number,number], label: 'Blocked' },
    { count: data.statusCounts.retest, color: [234, 179, 8] as [number,number,number], label: 'Retest' },
    { count: data.statusCounts.untested, color: [203, 213, 225] as [number,number,number], label: 'Untested' },
  ];

  const barY = y;
  let barX = margin;
  segments.forEach(seg => {
    const w = total > 0 ? (seg.count / total) * contentW : 0;
    if (w > 0) {
      pdf.setFillColor(...seg.color);
      pdf.rect(barX, barY, w, 6, 'F');
      barX += w;
    }
  });
  y += 8;

  // Legend row
  let legX = margin;
  segments.forEach(seg => {
    pdf.setFillColor(...seg.color);
    pdf.rect(legX, y, 2, 2, 'F');
    pdf.setFontSize(7);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(`${seg.label} (${seg.count})`, legX + 3.5, y + 2);
    legX += 34;
  });
  y += 10;

  // ── KPI 6개 2×3 grid ──
  drawSectionTitle(pdf, 'Key Performance Indicators', margin, y, config);
  y += 5;

  const defectRate = data.totalExecuted > 0
    ? ((data.failedCount / data.totalExecuted) * 100).toFixed(1) + '%' : '0%';

  const kpiItems = [
    { label: 'Overall Pass Rate', value: `${data.passRate.toFixed(1)}%`, sub: 'Target: 90%', valueColor: getPercentageColor(data.passRate, config) },
    { label: 'Execution Completion', value: `${data.executionComplete.toFixed(1)}%`, sub: 'Target: 95%', valueColor: getPercentageColor(data.executionComplete, config) },
    { label: 'Defect Discovery Rate', value: defectRate, sub: 'Industry: 5-10%' },
    { label: 'Automation Rate', value: data.automationRate < 0 ? 'N/A' : `${data.automationRate.toFixed(1)}%`, sub: data.automationRate < 0 ? 'No data' : 'Automated TCs' },
    { label: 'Avg Run Pass Rate', value: `${data.avgRunPassRate.toFixed(1)}%`, sub: 'Across all runs', valueColor: getPercentageColor(data.avgRunPassRate, config) },
    { label: 'Open Blockers', value: String(data.openBlockers), sub: data.openBlockers > 0 ? 'Needs attention' : 'All clear', valueColor: data.openBlockers > 0 ? config.failureColor : config.successColor },
  ];

  const kpiW = 53, kpiH = 22, kpiGap = 5.5;
  kpiItems.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (kpiW + kpiGap);
    const cy = y + row * (kpiH + 3);
    drawKpiCard(pdf, x, cy, kpiW, kpiH, card.label, card.value, config, {
      sub: card.sub,
      valueColor: card.valueColor,
    });
  });
  y += 2 * (kpiH + 3) + 8;

  // ── Priority Distribution ──
  drawSectionTitle(pdf, 'Priority Distribution', margin, y, config);
  y += 6;

  const priorities = [
    { label: 'Critical', color: [239, 68, 68] as [number,number,number], count: data.priorityCounts.critical },
    { label: 'High', color: [245, 158, 11] as [number,number,number], count: data.priorityCounts.high },
    { label: 'Medium', color: [99, 102, 241] as [number,number,number], count: data.priorityCounts.medium },
    { label: 'Low', color: [148, 163, 184] as [number,number,number], count: data.priorityCounts.low },
  ];
  const maxCount = Math.max(...priorities.map(p => p.count), 1);

  priorities.forEach((pri, i) => {
    const py = y + i * 14;
    pdf.setFontSize(9);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...pri.color);
    pdf.text(pri.label, margin, py + 5);
    const barW = (pri.count / maxCount) * 120;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin + 25, py, 120, 5, 1, 1, 'F');
    if (barW > 0) {
      pdf.setFillColor(...pri.color);
      pdf.roundedRect(margin + 25, py, barW, 5, 1, 1, 'F');
    }
    const pct = data.totalTCs > 0 ? ((pri.count / data.totalTCs) * 100).toFixed(1) : '0.0';
    pdf.setFontSize(9);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(`${pri.count} (${pct}%)`, margin + 150, py + 4, { align: 'right' });
  });
  y += 4 * 14 + 8;

  // ── Project Information ──
  drawSectionTitle(pdf, 'Project Information', margin, y, config);
  y += 6;

  pdf.setFillColor(...config.bgLight);
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, contentW, 30, 2, 2, 'FD');

  const infoItems = [
    { label: 'Project', value: data.projectName },
    { label: 'Total Runs', value: String(data.totalRuns) },
    { label: 'Total TCs', value: String(data.totalTCs) },
    { label: 'Active Milestones', value: String(data.activeMilestones) },
    { label: 'Total Executed', value: String(data.totalExecuted) },
    { label: 'Report Date', value: data.dateStr },
  ];
  infoItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = margin + 6 + col * (contentW / 2);
    const iy = y + 7 + row * 9;
    pdf.setFontSize(8);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(item.label.toUpperCase(), ix, iy);
    pdf.setFontSize(9);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(String(item.value || '-'), ix, iy + 5);
  });

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
