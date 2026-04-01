import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, getPriorityColor, getPriorityAbbr } from './pdfHelpers';

export async function drawPage6Risk(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Risk Assessment', config);

  let y = 18;

  // ── Top 10 Failed TCs ──
  drawSectionTitle(pdf, 'Top Failed Test Cases', margin, y, config);
  y += 5;

  const failColWidths = [8, 18, 65, 22, 16, 41];
  const failHeaders = ['#', 'TC ID', 'Title', 'Priority', 'Fails', 'Last Failed'];
  const failTotalW = failColWidths.reduce((a, b) => a + b, 0);

  pdf.setFillColor(...config.primaryColor);
  pdf.rect(margin, y, failTotalW, 7, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  let fhx = margin;
  failHeaders.forEach((h, i) => {
    pdf.text(h, fhx + 1.5, y + 5);
    fhx += failColWidths[i];
  });
  y += 7;

  data.failedTCs.slice(0, 10).forEach((tc, i) => {
    const rowY = y + i * 8;
    if (i % 2 === 0) {
      pdf.setFillColor(...config.bgLight);
      pdf.rect(margin, rowY, failTotalW, 8, 'F');
    }
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.2);
    pdf.line(margin, rowY + 8, margin + failTotalW, rowY + 8);

    const priColor = getPriorityColor(tc.priority, config);
    const failCountColor: [number,number,number] = tc.failCount >= 5 ? config.failureColor : tc.failCount >= 3 ? config.warningColor : config.textDark;
    const titleText = tc.title.length > 32 ? tc.title.slice(0, 29) + '...' : tc.title;
    const idText = (tc.id || '').slice(0, 10);

    let fcx = margin;
    pdf.setFont(font, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...config.textLight);
    pdf.text(String(i + 1), fcx + 1.5, rowY + 5.5); fcx += failColWidths[0];
    pdf.setTextColor(...config.textDark);
    pdf.text(idText, fcx + 1.5, rowY + 5.5); fcx += failColWidths[1];
    pdf.text(titleText, fcx + 1.5, rowY + 5.5); fcx += failColWidths[2];

    // Priority circle + abbr
    pdf.setFillColor(...priColor);
    pdf.circle(fcx + 2.5, rowY + 4, 1.5, 'F');
    pdf.setTextColor(...priColor);
    pdf.text(getPriorityAbbr(tc.priority), fcx + 6, rowY + 5.5); fcx += failColWidths[3];

    pdf.setFont(font, 'bold');
    pdf.setTextColor(...failCountColor);
    pdf.text(String(tc.failCount), fcx + 1.5, rowY + 5.5); fcx += failColWidths[4];

    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(tc.lastFailedRelative, fcx + 1.5, rowY + 5.5);
  });
  y += Math.min(data.failedTCs.length, 10) * 8 + 8;

  // ── Flaky TCs ──
  if (y < 200 && data.flakyTCs.length > 0) {
    drawSectionTitle(pdf, 'Flaky Test Cases', margin, y, config);
    y += 5;

    const flakyColWidths = [18, 55, 60, 37];
    const flakyHeaders = ['TC ID', 'Title', 'Last 10 Results', 'Score'];
    const flakyTotalW = flakyColWidths.reduce((a, b) => a + b, 0);

    pdf.setFillColor(...config.primaryColor);
    pdf.rect(margin, y, flakyTotalW, 7, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    let hhx = margin;
    flakyHeaders.forEach((h, i) => {
      pdf.text(h, hhx + 1.5, y + 5);
      hhx += flakyColWidths[i];
    });
    y += 7;

    data.flakyTCs.slice(0, 5).forEach((tc, i) => {
      const rowY = y + i * 10;
      if (i % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, rowY, flakyTotalW, 10, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, rowY + 10, margin + flakyTotalW, rowY + 10);

      const idText = (tc.id || '').slice(0, 10);
      const titleText = tc.title.length > 26 ? tc.title.slice(0, 23) + '...' : tc.title;
      const scoreColor: [number,number,number] = tc.flakyScore >= 70 ? config.failureColor : tc.flakyScore >= 50 ? config.warningColor : config.textDark;

      let flcx = margin;
      pdf.setFont(font, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...config.textLight);
      pdf.text(idText, flcx + 1.5, rowY + 6); flcx += flakyColWidths[0];
      pdf.setTextColor(...config.textDark);
      pdf.text(titleText, flcx + 1.5, rowY + 6); flcx += flakyColWidths[1];

      // Sequence circles (10 dots)
      const seqStartX = flcx + 2;
      tc.lastTenResults.forEach((result, j) => {
        const cx = seqStartX + j * 5.5;
        if (result === 'passed') {
          pdf.setFillColor(16, 163, 127);
          pdf.circle(cx, rowY + 5, 1.8, 'F');
        } else {
          pdf.setDrawColor(239, 68, 68);
          pdf.setLineWidth(0.5);
          pdf.circle(cx, rowY + 5, 1.8, 'D');
        }
      });
      flcx += flakyColWidths[2];

      pdf.setFont(font, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...scoreColor);
      pdf.text(`${tc.flakyScore}% (${tc.frequency})`, flcx + 1.5, rowY + 6);
    });
    y += Math.min(data.flakyTCs.length, 5) * 10 + 8;
  }

  // ── Coverage Gaps ──
  if (y < 250 && data.coverageGaps.length > 0) {
    drawSectionTitle(pdf, 'Coverage Gaps', margin, y, config);
    y += 5;

    const gapColWidths = [45, 30, 30, 65];
    const gapHeaders = ['Module', 'Untested TCs', '% of Module', 'Risk'];
    const gapTotalW = gapColWidths.reduce((a, b) => a + b, 0);

    pdf.setFillColor(...config.primaryColor);
    pdf.rect(margin, y, gapTotalW, 7, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    let ghx2 = margin;
    gapHeaders.forEach((h, i) => {
      pdf.text(h, ghx2 + 1.5, y + 5);
      ghx2 += gapColWidths[i];
    });
    y += 7;

    const riskColors: Record<string, [number,number,number]> = {
      high: config.failureColor,
      medium: config.warningColor,
      low: config.restColor,
    };

    data.coverageGaps.forEach((gap, i) => {
      const rowY = y + i * 7;
      if (i % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, rowY, gapTotalW, 7, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, rowY + 7, margin + gapTotalW, rowY + 7);

      const modName = gap.module.length > 20 ? gap.module.slice(0, 17) + '...' : gap.module;
      const riskColor = riskColors[gap.risk] || riskColors.low;
      const riskLabel = gap.risk.charAt(0).toUpperCase() + gap.risk.slice(1);

      let gcx2 = margin;
      pdf.setFont(font, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...config.textDark);
      pdf.text(modName, gcx2 + 1.5, rowY + 5); gcx2 += gapColWidths[0];
      pdf.setTextColor(...config.textLight);
      pdf.text(String(gap.untestedCount), gcx2 + 1.5, rowY + 5); gcx2 += gapColWidths[1];
      pdf.text(`${gap.percentOfModule.toFixed(1)}%`, gcx2 + 1.5, rowY + 5); gcx2 += gapColWidths[2];

      // Risk badge
      pdf.setFillColor(...riskColor);
      pdf.roundedRect(gcx2 + 1, rowY + 1, 18, 5, 1, 1, 'F');
      pdf.setFont(font, 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(riskLabel, gcx2 + 10, rowY + 4.5, { align: 'center' });
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
