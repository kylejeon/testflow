import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, getPercentageColor } from './pdfHelpers';

export async function drawPage7Team(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Team Performance', config);

  let y = 18;

  if (data.teamMembers.length === 0) {
    pdf.setFont(font, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...config.textLight);
    pdf.text('No team performance data available. Test results require author attribution.', margin, y + 20, { maxWidth: contentW });
    drawFooter(pdf, pageNum, totalPages, data.projectName, config);
    return;
  }

  // ── Team Summary Bar ──
  pdf.setFillColor(...config.bgLight);
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, contentW, 10, 2, 2, 'FD');

  const totalMembers = data.teamMembers.length;
  const totalExecAll = data.teamMembers.reduce((sum, m) => sum + m.executed, 0);
  const avgExecPerMember = totalMembers > 0 ? Math.round(totalExecAll / totalMembers) : 0;

  const teamSummaryItems = [
    { label: 'Total Members', value: String(totalMembers) },
    { label: 'Total Executed', value: String(totalExecAll) },
    { label: 'Avg/Member', value: String(avgExecPerMember) },
  ];
  const itemW = contentW / teamSummaryItems.length;
  teamSummaryItems.forEach((item, i) => {
    const ix = margin + i * itemW;
    pdf.setFontSize(7);
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(item.label, ix + itemW / 2, y + 4, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...config.textDark);
    pdf.text(item.value, ix + itemW / 2, y + 8.5, { align: 'center' });
    if (i < teamSummaryItems.length - 1) {
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.3);
      pdf.line(ix + itemW, y + 2, ix + itemW, y + 8);
    }
  });
  y += 14;

  // ── Member Performance Table ──
  drawSectionTitle(pdf, 'Member Performance', margin, y, config);
  y += 5;

  const memColWidths = [8, 32, 20, 18, 18, 18, 20, 36];
  const memHeaders = ['#', 'Member', 'Executed', 'Passed', 'Failed', 'Pass%', 'Contrib%', 'Bar'];
  const memTotalW = memColWidths.reduce((a, b) => a + b, 0);

  pdf.setFillColor(...config.primaryColor);
  pdf.rect(margin, y, memTotalW, 7, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  let mhx = margin;
  memHeaders.forEach((h, i) => {
    pdf.text(h, mhx + 1.5, y + 5);
    mhx += memColWidths[i];
  });
  y += 7;

  const opacityLevels = [1.0, 0.8, 0.6, 0.4, 0.25];
  const indigoBase: [number,number,number] = [99, 102, 241];

  data.teamMembers.slice(0, 12).forEach((member, i) => {
    const rowY = y + i * 8;
    if (i % 2 === 0) {
      pdf.setFillColor(...config.bgLight);
      pdf.rect(margin, rowY, memTotalW, 8, 'F');
    }
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.2);
    pdf.line(margin, rowY + 8, margin + memTotalW, rowY + 8);

    const nameText = member.name.length > 15 ? member.name.slice(0, 12) + '...' : member.name;
    const passRateColor = getPercentageColor(member.passRate, config);
    const opacityIdx = Math.min(i, opacityLevels.length - 1);
    const opacity = opacityLevels[opacityIdx];
    const barColor: [number,number,number] = [
      Math.round(indigoBase[0] + (255 - indigoBase[0]) * (1 - opacity)),
      Math.round(indigoBase[1] + (255 - indigoBase[1]) * (1 - opacity)),
      Math.round(indigoBase[2] + (255 - indigoBase[2]) * (1 - opacity)),
    ];

    let mcx = margin;
    pdf.setFont(font, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...config.textLight);
    pdf.text(String(i + 1), mcx + 1.5, rowY + 5.5); mcx += memColWidths[0];
    pdf.setTextColor(...config.textDark);
    pdf.text(nameText, mcx + 1.5, rowY + 5.5); mcx += memColWidths[1];
    pdf.setTextColor(...config.textLight);
    pdf.text(String(member.executed), mcx + 1.5, rowY + 5.5); mcx += memColWidths[2];
    pdf.setTextColor(16, 163, 127);
    pdf.text(String(member.passed), mcx + 1.5, rowY + 5.5); mcx += memColWidths[3];
    pdf.setTextColor(239, 68, 68);
    pdf.text(String(member.failed), mcx + 1.5, rowY + 5.5); mcx += memColWidths[4];
    pdf.setFont(font, 'bold');
    pdf.setTextColor(...passRateColor);
    pdf.text(`${member.passRate.toFixed(0)}%`, mcx + 1.5, rowY + 5.5); mcx += memColWidths[5];
    pdf.setFont(font, 'normal');
    pdf.setTextColor(...config.textLight);
    pdf.text(`${member.contribution.toFixed(1)}%`, mcx + 1.5, rowY + 5.5); mcx += memColWidths[6];

    // Contribution bar
    const barMaxW = 32;
    const bw = (member.contribution / 100) * barMaxW;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(mcx + 1.5, rowY + 2, barMaxW, 3.5, 'F');
    if (bw > 0) {
      pdf.setFillColor(...barColor);
      pdf.rect(mcx + 1.5, rowY + 2, bw, 3.5, 'F');
    }
  });
  y += Math.min(data.teamMembers.length, 12) * 8 + 8;

  // ── Contribution Distribution ──
  if (y < 240 && data.teamMembers.length > 0) {
    drawSectionTitle(pdf, 'Contribution Distribution', margin, y, config);
    y += 6;

    const top5 = data.teamMembers.slice(0, 5);
    const othersTotal = data.teamMembers.slice(5).reduce((sum, m) => sum + m.contribution, 0);
    const displayMembers = [...top5];
    if (othersTotal > 0) displayMembers.push({ name: 'Others', executed: 0, passed: 0, failed: 0, blocked: 0, passRate: 0, contribution: othersTotal, discoveryRate: 0 });

    displayMembers.forEach((member, i) => {
      const barMaxW = 110;
      const bw = (member.contribution / 100) * barMaxW;
      const rowY = y + i * 9;
      const nameText = member.name.length > 14 ? member.name.slice(0, 11) + '...' : member.name;

      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textDark);
      pdf.text(nameText, margin, rowY + 5);

      const fillColor: [number,number,number] = i < 5 ? indigoBase : config.inactiveColor;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin + 30, rowY + 1, barMaxW, 5, 'F');
      if (bw > 0) {
        pdf.setFillColor(...fillColor);
        pdf.rect(margin + 30, rowY + 1, bw, 5, 'F');
      }
      pdf.setTextColor(...config.textLight);
      pdf.text(`${member.contribution.toFixed(1)}%`, margin + 30 + barMaxW + 5, rowY + 5);
    });
  }

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
