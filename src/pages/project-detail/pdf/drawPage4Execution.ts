import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, getPercentageColor, getPriorityColor, getPriorityAbbr } from './pdfHelpers';

export async function drawPage4Execution(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Test Execution Detail', config);

  let y = 18;

  // ── Run Summary Bar ──
  pdf.setFillColor(...config.bgLight);
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, contentW, 10, 2, 2, 'FD');

  const activeRuns = data.runResults.filter(r => ['active', 'in_progress', 'new'].includes(r.status)).length;
  const completedRuns = data.runResults.filter(r => r.status === 'completed').length;
  const pausedRuns = data.runResults.filter(r => r.status === 'paused').length;
  const reviewRuns = data.runResults.filter(r => r.status === 'review').length;

  const summaryItems = [
    { label: 'Total', value: String(data.totalRuns) },
    { label: 'Active', value: String(activeRuns) },
    { label: 'Completed', value: String(completedRuns) },
    { label: 'Paused', value: String(pausedRuns) },
    { label: 'Review', value: String(reviewRuns) },
  ];
  const itemW = contentW / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const ix = margin + i * itemW;
    pdf.setFontSize(7);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(item.label, ix + itemW / 2, y + 4, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(item.value, ix + itemW / 2, y + 8.5, { align: 'center' });
    if (i < summaryItems.length - 1) {
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.3);
      pdf.line(ix + itemW, y + 2, ix + itemW, y + 8);
    }
  });
  y += 14;

  // ── Run Results Table ──
  drawSectionTitle(pdf, 'Run Results', margin, y, config);
  y += 5;

  const colWidths = [8, 40, 30, 22, 14, 14, 12, 14, 16];
  const headers = ['#', 'Name', 'Milestone', 'Status', 'Pass', 'Fail', 'Blk', 'Total', 'Rate%'];
  const totalTableW = colWidths.reduce((a, b) => a + b, 0);

  // Header row
  pdf.setFillColor(...config.primaryColor);
  pdf.rect(margin, y, totalTableW, 7, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  let hx = margin;
  headers.forEach((h, i) => {
    pdf.text(h, hx + 1.5, y + 5);
    hx += colWidths[i];
  });
  y += 7;

  // Tier limit: Free shows 5 runs, others up to 15
  const maxRuns = tierLevel <= 1 ? 5 : 15;
  const displayRuns = data.runResults.slice(0, maxRuns);

  const statusColors: Record<string, [number, number, number]> = {
    active: [16, 163, 127],
    in_progress: [16, 163, 127],
    new: [16, 163, 127],
    completed: [99, 102, 241],
    paused: [249, 115, 22],
    review: [100, 116, 139],
  };

  displayRuns.forEach((run, i) => {
    const rowY = y + i * 8;
    if (i % 2 === 0) {
      pdf.setFillColor(...config.bgLight);
      pdf.rect(margin, rowY, totalTableW, 8, 'F');
    }
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.2);
    pdf.line(margin, rowY + 8, margin + totalTableW, rowY + 8);

    const runName = run.runName.length > 20 ? run.runName.slice(0, 17) + '...' : run.runName;
    const msName = run.milestone.length > 15 ? run.milestone.slice(0, 12) + '...' : run.milestone;
    const statusColor = statusColors[(run.status || 'active').toLowerCase()] || config.textLight;
    const rateColor = getPercentageColor(run.passRate, config);

    let cx = margin;
    pdf.setFont(font, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...config.textLight);
    pdf.text(String(i + 1), cx + 1.5, rowY + 5.5); cx += colWidths[0];
    pdf.setTextColor(...config.textDark);
    pdf.text(runName, cx + 1.5, rowY + 5.5); cx += colWidths[1];
    pdf.setTextColor(...config.textLight);
    pdf.text(msName, cx + 1.5, rowY + 5.5); cx += colWidths[2];
    pdf.setTextColor(...statusColor);
    pdf.setFont(font, 'bold');
    pdf.text(String(run.status || '-'), cx + 1.5, rowY + 5.5); cx += colWidths[3];
    pdf.setFont(font, 'normal');
    pdf.setTextColor(16, 163, 127);
    pdf.text(String(run.passed), cx + 1.5, rowY + 5.5); cx += colWidths[4];
    pdf.setTextColor(239, 68, 68);
    pdf.text(String(run.failed), cx + 1.5, rowY + 5.5); cx += colWidths[5];
    pdf.setTextColor(249, 115, 22);
    pdf.text(String(run.blocked), cx + 1.5, rowY + 5.5); cx += colWidths[6];
    pdf.setTextColor(...config.textDark);
    pdf.text(String(run.total), cx + 1.5, rowY + 5.5); cx += colWidths[7];
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...rateColor);
    pdf.text(`${run.passRate.toFixed(0)}%`, cx + 1.5, rowY + 5.5);
  });

  const tableEndY = y + displayRuns.length * 8;
  if (data.runResults.length > maxRuns) {
    pdf.setFont(font, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...config.textLight);
    pdf.text(`... and ${data.runResults.length - maxRuns} more runs`, margin + 2, tableEndY + 5);
    y = tableEndY + 12;
  } else {
    y = tableEndY + 8;
  }

  // ── Module Coverage Table ──
  if (y < 200) {
    drawSectionTitle(pdf, 'Module Coverage', margin, y, config);
    y += 5;

    const covColWidths = [40, 16, 18, 20, 18, 58];
    const covHeaders = ['Module', 'TCs', 'Tested', 'Untested', 'Pass%', 'Coverage'];
    const covTotalW = covColWidths.reduce((a, b) => a + b, 0);

    pdf.setFillColor(...config.primaryColor);
    pdf.rect(margin, y, covTotalW, 7, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    let chx = margin;
    covHeaders.forEach((h, i) => {
      pdf.text(h, chx + 1.5, y + 5);
      chx += covColWidths[i];
    });
    y += 7;

    const displayFolders = data.folderCoverage.slice(0, 10);
    displayFolders.forEach((folder, i) => {
      const rowY = y + i * 7;
      if (i % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, rowY, covTotalW, 7, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, rowY + 7, margin + covTotalW, rowY + 7);

      const folderName = folder.folder.length > 18 ? folder.folder.slice(0, 15) + '...' : folder.folder;
      const coveragePct = folder.passRate;
      const passRateColor = getPercentageColor(folder.passRate, config);

      let fcx = margin;
      pdf.setFont(font, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...config.textDark);
      pdf.text(folderName, fcx + 1.5, rowY + 5); fcx += covColWidths[0];
      pdf.setTextColor(...config.textLight);
      pdf.text(String(folder.totalTCs), fcx + 1.5, rowY + 5); fcx += covColWidths[1];
      pdf.text(String(folder.tested), fcx + 1.5, rowY + 5); fcx += covColWidths[2];
      pdf.setTextColor(folder.untested > 0 ? config.warningColor[0] : config.textLight[0], folder.untested > 0 ? config.warningColor[1] : config.textLight[1], folder.untested > 0 ? config.warningColor[2] : config.textLight[2]);
      pdf.text(String(folder.untested), fcx + 1.5, rowY + 5); fcx += covColWidths[3];
      pdf.setFont(font, 'bold');
      pdf.setTextColor(...passRateColor);
      pdf.text(`${folder.passRate.toFixed(0)}%`, fcx + 1.5, rowY + 5); fcx += covColWidths[4];

      // Coverage bar (55mm × 4mm)
      const barMaxW = 55;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(fcx + 1.5, rowY + 1.5, barMaxW, 4, 'F');
      const filledW = (coveragePct / 100) * barMaxW;
      if (filledW > 0) {
        pdf.setFillColor(...config.successColor);
        pdf.rect(fcx + 1.5, rowY + 1.5, filledW, 4, 'F');
      }
      pdf.setFont(font, 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(...config.textLight);
      pdf.text(`${coveragePct.toFixed(0)}%`, fcx + barMaxW + 3, rowY + 5);
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
