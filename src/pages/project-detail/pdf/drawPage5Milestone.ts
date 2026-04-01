import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, drawProgressBar } from './pdfHelpers';

export async function drawPage5Milestone(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Milestone & Release Readiness', config);

  let y = 18;

  // ── Milestone Cards (2×2 grid) ──
  drawSectionTitle(pdf, 'Milestone Status', margin, y, config);
  y += 5;

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
    const x = margin + col * (cardW + cardGap);
    const cy = y + row * (cardH + cardGap);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');

    // Name
    const nameText = m.name.length > 28 ? m.name.slice(0, 25) + '...' : m.name;
    pdf.setFontSize(10);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(nameText, x + 4, cy + 8);

    // Status badge
    const bc = badgeColors[m.status] || badgeColors['On Track'];
    pdf.setFillColor(...bc.bg);
    pdf.roundedRect(x + 53, cy + 3, 26, 6, 1, 1, 'F');
    pdf.setFontSize(7);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...bc.text);
    pdf.text(m.status, x + 66, cy + 7, { align: 'center' });

    // Progress bar
    drawProgressBar(pdf, x + 4, cy + 13, 70, 4, m.progress, m.progressColor, config);

    // Details
    pdf.setFontSize(8);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(`Due: ${m.dueDate}`, x + 4, cy + 25);
    const dSign = m.daysRemaining >= 0 ? '-' : '+';
    pdf.text(`(D${dSign}${Math.abs(m.daysRemaining)})`, x + 35, cy + 25);
    pdf.text(`Remaining: ${m.remainingTCs} TCs`, x + 4, cy + 32);
    pdf.text(`Velocity: ${m.velocity.toFixed(1)} TC/day`, x + 4, cy + 39);
    pdf.text(`Est. Completion: ${m.estCompletion}`, x + 4, cy + 46);
  });

  const cardRows = Math.ceil(milestoneCards.length / 2);
  y += cardRows * (cardH + cardGap) + 4;

  // ── Burndown Chart (Professional+ only) ──
  if (tierLevel >= 3 && data.milestoneCards.length > 0 && y < 175) {
    const activeMilestone = data.milestoneCards.find(m => m.status !== 'Completed' && m.status !== 'Overdue');
    if (activeMilestone) {
      drawSectionTitle(pdf, `Burndown: ${activeMilestone.name}`, margin, y, config);
      y += 6;

      const burnH = Math.min(60, 265 - y);
      const burnW = contentW;

      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, burnW, burnH);

      // Ideal line (dashed)
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.5);
      pdf.setLineDashPattern([3, 2], 0);
      pdf.line(margin, y, margin + burnW, y + burnH);
      pdf.setLineDashPattern([], 0);

      // Actual line placeholder (insufficient burndown data without proper tracking)
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textLight);
      pdf.text('Burndown chart — tracking velocity data', margin + burnW / 2, y + burnH / 2, { align: 'center' });
      pdf.text(`Progress: ${activeMilestone.progress}%`, margin + burnW / 2, y + burnH / 2 + 8, { align: 'center' });

      y += burnH + 8;
    }
  }

  // ── Quality Gates Table ──
  if (data.qualityGates.length > 0) {
    if (y > 235) y = 235;
    drawSectionTitle(pdf, 'Quality Gates', margin, y, config);
    y += 5;

    const gateColWidths = [60, 28, 28, 54];
    const gateHeaders = ['Gate', 'Threshold', 'Actual', 'Verdict'];
    const gateTotalW = gateColWidths.reduce((a, b) => a + b, 0);

    pdf.setFillColor(...config.primaryColor);
    pdf.rect(margin, y, gateTotalW, 7, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    let ghx = margin;
    gateHeaders.forEach((h, i) => {
      pdf.text(h, ghx + 2, y + 5);
      ghx += gateColWidths[i];
    });
    y += 7;

    const verdictColors: Record<string, [number,number,number]> = {
      PASS: [16, 163, 127],
      WARN: [245, 158, 11],
      FAIL: [239, 68, 68],
    };
    const statusIcons: Record<string, string> = { pass: '✓', warn: '!', fail: '✕' };
    const statusCircleColors: Record<string, [number,number,number]> = {
      pass: [16, 163, 127],
      warn: [245, 158, 11],
      fail: [239, 68, 68],
    };

    data.qualityGates.forEach((gate, i) => {
      const rowY = y + i * 8;
      if (i % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, rowY, gateTotalW, 8, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, rowY + 8, margin + gateTotalW, rowY + 8);

      let gcx = margin;
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textDark);
      pdf.text(gate.name, gcx + 2, rowY + 5.5); gcx += gateColWidths[0];
      pdf.setTextColor(...config.textLight);
      pdf.text(gate.threshold, gcx + 2, rowY + 5.5); gcx += gateColWidths[1];
      pdf.text(gate.actual, gcx + 2, rowY + 5.5); gcx += gateColWidths[2];

      // Status icon circle
      const ic = statusCircleColors[gate.status] || statusCircleColors.pass;
      pdf.setFillColor(...ic);
      pdf.circle(gcx + 4, rowY + 4, 3, 'F');
      pdf.setFont(font, 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.text(statusIcons[gate.status] || '?', gcx + 4, rowY + 5.5, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setFont(font, 'bold');
      pdf.setTextColor(...(verdictColors[gate.verdict] || config.textDark));
      pdf.text(gate.verdict, gcx + 10, rowY + 5.5);
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
