import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle } from './pdfHelpers';

export async function drawPage5Milestone(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Milestone & Release Readiness', config);

  let y = 20;

  // ── Milestone Cards (2×2 grid, spec: cardW=82, cardH=50, gap=6) ──
  drawSectionTitle(pdf, 'Milestone Overview', margin, y + 2, config);
  y += 7;

  const maxCards = tierLevel <= 1 ? 1 : 4;
  const milestoneCards = data.milestoneCards.slice(0, maxCards);

  const cardW = 82, cardH = 50, cardGap = 6;

  const badgeColors: Record<string, { bg: [number,number,number]; text: [number,number,number] }> = {
    'On Track':  { bg: [236, 253, 245], text: [16, 163, 127] },
    'At Risk':   { bg: [255, 251, 235], text: [245, 158, 11] },
    'Overdue':   { bg: [254, 242, 242], text: [239, 68, 68] },
    'Completed': { bg: [238, 242, 255], text: [99, 102, 241] },
  };

  milestoneCards.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cX = margin + col * (cardW + cardGap);
    const cY = y + row * (cardH + cardGap);

    // Card border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(cX, cY, cardW, cardH, 2, 2, 'FD');

    // Name (spec: x=cX+4, y=cY+8)
    const nameText = m.name.length > 28 ? m.name.slice(0, 25) + '...' : m.name;
    pdf.setFontSize(10);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(nameText, cX + 4, cY + 8);

    // Status badge (spec: dynamic width, right-aligned at cX+78)
    const bc = badgeColors[m.status] || badgeColors['On Track'];
    pdf.setFontSize(7);
    pdf.setFont(font, 'bold');
    const badgeTextW = pdf.getTextWidth(m.status);
    const badgeW = badgeTextW + 6;
    const badgeX = cX + cardW - 4 - badgeW;
    pdf.setFillColor(...bc.bg);
    pdf.roundedRect(badgeX, cY + 3, badgeW, 5, 1.5, 1.5, 'F');
    pdf.setTextColor(...bc.text);
    pdf.text(m.status, badgeX + badgeW / 2, cY + 7, { align: 'center' });

    // Progress label (spec: x=cX+4, y=cY+16)
    pdf.setFontSize(9);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(`Progress: ${m.progress}%`, cX + 4, cY + 16);

    // Progress bar (spec: x=cX+4, y=cY+19, w=74, h=3)
    const barFillW = Math.min((m.progress / 100) * 74, 74);
    pdf.setFillColor(...config.bgLight);
    pdf.roundedRect(cX + 4, cY + 19, 74, 3, 1, 1, 'F');
    if (barFillW > 0) {
      pdf.setFillColor(...m.progressColor);
      pdf.roundedRect(cX + 4, cY + 19, barFillW, 3, 1, 1, 'F');
    }

    // Detail lines (spec: y=cY+26, +31, +36, +41; 8pt normal LIGHT)
    pdf.setFontSize(8);
    pdf.setFont(font, 'normal');
    const dueColor: [number,number,number] = m.status === 'Overdue' ? config.failureColor : config.textLight;
    const dSign = m.daysRemaining >= 0 ? '-' : '+';
    pdf.setTextColor(...dueColor);
    pdf.text(`Due: ${m.dueDate} (D${dSign}${Math.abs(m.daysRemaining)})`, cX + 4, cY + 26);
    pdf.setTextColor(...config.textLight);
    pdf.text(`Remaining: ${m.remainingTCs} TCs`, cX + 4, cY + 31);
    pdf.text(`Velocity: ${m.velocity > 0 ? m.velocity.toFixed(1) : '0.0'} TC/day`, cX + 4, cY + 36);
    pdf.text(`Est. Completion: ${m.velocity > 0 ? m.estCompletion : 'N/A'}`, cX + 4, cY + 41);
  });

  const cardRows = Math.ceil(Math.max(milestoneCards.length, 1) / 2);
  y += cardRows * (cardH + cardGap) + 2;

  // ── Burndown Chart (Professional+ only, spec: chartX=28,chartY=dynY,chartW=154,chartH=70) ──
  if (tierLevel >= 3 && data.burndownData.length > 1 && y < 160) {
    const milestoneName = data.burndownMilestoneName.length > 25
      ? data.burndownMilestoneName.slice(0, 22) + '...'
      : data.burndownMilestoneName;
    drawSectionTitle(pdf, `Burndown — ${milestoneName}`, margin, y, config);
    y += 6;

    const chartX = 28;
    const chartW = 154;
    const chartH = Math.min(70, 270 - y - 40);
    const chartY = y;
    const chartEndX = chartX + chartW;
    const chartEndY = chartY + chartH;
    const totalTCs = data.burndownTotalTCs || 1;
    const pts = data.burndownData;
    const totalDays = pts.length - 1;

    // Chart border
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.3);
    pdf.rect(chartX, chartY, chartW, chartH);

    // Y-axis grid lines (4 horizontal)
    [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
      const gy = chartY + chartH * frac;
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(chartX, gy, chartEndX, gy);
      pdf.setLineDashPattern([], 0);
      // Y-axis label (remaining TCs)
      pdf.setFontSize(7);
      pdf.setFont(font, 'normal');
      pdf.setTextColor(...config.textLight);
      const labelVal = Math.round(totalTCs * (1 - frac));
      pdf.text(String(labelVal), 26, gy + 1, { align: 'right' });
    });

    // X-axis labels (milestone date range, ~5 labels)
    const xLabelInterval = Math.max(1, Math.floor(totalDays / 4));
    pdf.setFontSize(7);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pts.forEach((pt, i) => {
      if (i % xLabelInterval === 0 || i === totalDays) {
        const px = chartX + (i / Math.max(totalDays, 1)) * chartW;
        const d = new Date(pt.date);
        const lbl = `${d.getMonth() + 1}/${d.getDate()}`;
        pdf.text(lbl, px, chartEndY + 4, { align: 'center' });
      }
    });

    // Ideal line (spec: LIGHT dashed [3,2], from (chartX,chartY) to (chartEndX,chartEndY))
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.5 * 0.3528);
    pdf.setLineDashPattern([3, 2], 0);
    pdf.line(chartX, chartY, chartEndX, chartEndY);
    pdf.setLineDashPattern([], 0);

    // Actual line (spec: PRIMARY solid 0.7pt, data points circle r=0.8)
    const today = new Date().toISOString().split('T')[0];
    let todayX = chartEndX;
    pdf.setDrawColor(...config.primaryColor);
    pdf.setLineWidth(0.7 * 0.3528);
    let prevPx = 0, prevPy = 0;
    pts.forEach((pt, i) => {
      const px = chartX + (i / Math.max(totalDays, 1)) * chartW;
      const py = chartY + chartH * (pt.remaining / totalTCs);
      if (i > 0) pdf.line(prevPx, prevPy, px, py);
      pdf.setFillColor(...config.primaryColor);
      pdf.circle(px, py, 0.8, 'F');
      prevPx = px;
      prevPy = py;
      if (pt.date <= today) todayX = px;
    });

    // Today marker (spec: FAIL dashed [2,2] vertical, label "Today" above)
    if (todayX > chartX && todayX < chartEndX) {
      pdf.setDrawColor(...config.failureColor);
      pdf.setLineWidth(0.5 * 0.3528);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(todayX, chartY, todayX, chartEndY);
      pdf.setLineDashPattern([], 0);
      pdf.setFontSize(7);
      pdf.setFont(font, 'normal');
      pdf.setTextColor(...config.failureColor);
      pdf.text('Today', todayX, chartY - 2, { align: 'center' });
    }

    // Legend (spec: y=chartEndY+8)
    const legendY = chartEndY + 8;
    pdf.setFontSize(8);
    pdf.setFont(font, 'normal');
    // Ideal
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([3, 2], 0);
    pdf.line(75, legendY, 83, legendY);
    pdf.setLineDashPattern([], 0);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Ideal', 85, legendY + 1);
    // Actual
    pdf.setDrawColor(...config.primaryColor);
    pdf.setLineWidth(0.7);
    pdf.line(108, legendY, 116, legendY);
    pdf.setTextColor(...config.primaryColor);
    pdf.text('Actual', 118, legendY + 1);

    y += chartH + 14;
  } else if (tierLevel >= 3 && data.burndownData.length <= 1 && y < 160) {
    // Placeholder when no data
    drawSectionTitle(pdf, 'Burndown Chart', margin, y, config);
    y += 6;
    const burnH = Math.min(40, 270 - y - 40);
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, y, contentW, burnH);
    pdf.setFont(font, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...config.textLight);
    pdf.text('No burndown data — milestone requires test run data to generate chart.', 105, y + burnH / 2, { align: 'center' });
    y += burnH + 8;
  }

  // ── Quality Gates Table (spec: 5 cols — Gate/Status/Threshold/Actual/Verdict) ──
  if (data.qualityGates.length > 0) {
    if (y > 235) y = 235;
    drawSectionTitle(pdf, 'Release Quality Gates', margin, y, config);
    y += 5;

    // Spec col widths: Gate=50, Status=18, Threshold=25, Actual=25, Verdict=52 → total=170
    const gateColWidths = [50, 18, 25, 25, 52];
    const gateHeaders = ['Gate', 'Status', 'Threshold', 'Actual', 'Verdict'];
    const gateTotalW = gateColWidths.reduce((a, b) => a + b, 0);

    // Header
    pdf.setFillColor(...config.bgLight);
    pdf.rect(margin, y, gateTotalW, 8, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...config.textDark);
    let ghx = margin;
    gateHeaders.forEach((h, i) => {
      pdf.text(h, ghx + 4, y + 5.5);
      ghx += gateColWidths[i];
    });
    y += 8;

    const statusIcons: Record<string, string> = { pass: '\u2713', warn: '!', fail: '\u2715' };
    const statusCircleColors: Record<string, [number,number,number]> = {
      pass: [16, 163, 127],
      warn: [249, 115, 22],
      fail: [239, 68, 68],
    };
    const verdictColors: Record<string, [number,number,number]> = {
      PASS: [16, 163, 127],
      WARN: [249, 115, 22],
      FAIL: [239, 68, 68],
    };

    data.qualityGates.forEach((gate, i) => {
      const rowY = y + i * 7;
      if (i % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, rowY, gateTotalW, 7, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, rowY + 7, margin + gateTotalW, rowY + 7);

      // Gate name (col 0)
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textDark);
      pdf.text(gate.name, margin + 4, rowY + 5);

      // Status icon circle (col 1, spec: cx=79 absolute = margin+50+9=79)
      const statusColX = margin + gateColWidths[0]; // x=70
      const rowCY = rowY + 3.5;
      const ic = statusCircleColors[gate.status] || statusCircleColors.pass;
      pdf.setFillColor(...ic);
      pdf.circle(statusColX + 9, rowCY, 2.5, 'F'); // cx=79
      pdf.setFont(font, 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.text(statusIcons[gate.status] || '?', statusColX + 9, rowCY + 1, { align: 'center' });

      // Threshold (col 2)
      const threshX = margin + gateColWidths[0] + gateColWidths[1]; // x=88
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textLight);
      pdf.text(gate.threshold, threshX + 4, rowY + 5);

      // Actual (col 3)
      const actualX = threshX + gateColWidths[2]; // x=113
      pdf.text(gate.actual, actualX + 4, rowY + 5);

      // Verdict (col 4, spec: x=142 = margin+122)
      const verdictX = actualX + gateColWidths[3]; // x=138
      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...(verdictColors[gate.verdict] || config.textDark));
      pdf.text(gate.verdict, verdictX + 4, rowY + 5);
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
