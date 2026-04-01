import { PageDrawContext } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle } from './pdfHelpers';

export async function drawPage3Trends(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  drawHeader(pdf, 'Quality Trends', config);

  let y = 20;

  // ── Pass Rate Trend Chart (30 days for Pro+, 7 for Free/Starter) ──
  const daysToShow = tierLevel >= 3 ? 30 : tierLevel >= 2 ? 30 : 7;
  drawSectionTitle(pdf, `Pass Rate Trend (${daysToShow} Days)`, margin, y, config);
  y += 8;

  const chartX = margin;
  const chartY = y;
  const chartW = contentW;
  const chartH = 55;
  const dailyData = tierLevel <= 1
    ? data.dailyTrends.slice(-7)
    : data.dailyTrends;

  // Y-axis grid lines
  [0, 25, 50, 75, 100].forEach(pct => {
    const gy = chartY + chartH - (pct / 100) * chartH;
    pdf.setDrawColor(...config.borderColor);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(chartX, gy, chartX + chartW, gy);
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(7);
    pdf.setTextColor(...config.textLight);
    pdf.setFont(font, 'normal');
    pdf.text(`${pct}%`, chartX - 2, gy + 1, { align: 'right' });
  });

  // Pass Rate line (Indigo solid)
  if (dailyData.length > 1) {
    pdf.setDrawColor(...config.primaryColor);
    pdf.setLineWidth(0.7);
    pdf.setLineDashPattern([], 0);
    let prevX = 0, prevY_line = 0;
    dailyData.forEach((day, i) => {
      const x = chartX + (i / Math.max(dailyData.length - 1, 1)) * chartW;
      const dy = chartY + chartH - (Math.min(day.passRate, 100) / 100) * chartH;
      if (i > 0) pdf.line(prevX, prevY_line, x, dy);
      prevX = x;
      prevY_line = dy;
      pdf.setFillColor(...config.primaryColor);
      pdf.circle(x, dy, 0.8, 'F');
    });
  }

  // X-axis labels (every 7 days)
  pdf.setFontSize(7);
  pdf.setTextColor(...config.textLight);
  dailyData.forEach((day, i) => {
    if (i % 7 === 0 || i === dailyData.length - 1) {
      const x = chartX + (i / Math.max(dailyData.length - 1, 1)) * chartW;
      const labelDate = new Date(day.date);
      const label = `${labelDate.getMonth() + 1}/${labelDate.getDate()}`;
      pdf.text(label, x, chartY + chartH + 5, { align: 'center' });
    }
  });

  // Chart border
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.rect(chartX, chartY, chartW, chartH);

  y += chartH + 12;

  // ── Week-over-Week Comparison Table ──
  drawSectionTitle(pdf, 'Week-over-Week Comparison', margin, y, config);
  y += 6;

  const colWidths = [59, 30, 30, 24, 27];
  const headers = ['Metric', 'This Week', 'Last Week', 'Change', 'Trend'];
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  // Table header
  pdf.setFillColor(...config.primaryColor);
  pdf.rect(margin, y, totalW, 7, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  let hx = margin;
  headers.forEach((h, i) => {
    pdf.text(h, hx + 2, y + 5);
    hx += colWidths[i];
  });
  y += 7;

  // Metrics where decrease is positive (New Failures, Blocked)
  const negativeMetrics = new Set(['New Failures', 'Blocked']);

  const hasLastWeekData = data.weekComparison.some(row => row.lastWeek !== 0);
  if (!hasLastWeekData) {
    pdf.setFont(font, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...config.textLight);
    pdf.text('No previous week data available for comparison.', margin + 2, y + 5);
    y += 12;
  } else {
    data.weekComparison.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(...config.bgLight);
        pdf.rect(margin, y, totalW, 7, 'F');
      }
      pdf.setDrawColor(...config.borderColor);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + 7, margin + totalW, y + 7);

      const changePositive = negativeMetrics.has(row.metric) ? row.change <= 0 : row.change >= 0;
      const changeColor: [number, number, number] = changePositive ? config.successColor : config.failureColor;
      const changeSymbol = row.change > 0 ? '+' : row.change < 0 ? '-' : '—';
      const changeText = row.change === 0 ? '—' : `${changeSymbol} ${Math.abs(row.change).toFixed(1)}`;

      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...config.textDark);
      pdf.text(row.metric, margin + 2, y + 5);
      pdf.text(String(row.thisWeek), margin + colWidths[0] + 2, y + 5);
      pdf.text(String(row.lastWeek), margin + colWidths[0] + colWidths[1] + 2, y + 5);
      pdf.setTextColor(...changeColor);
      pdf.setFont(font, 'bold');
      pdf.text(changeText, margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5);

      // Mini bar
      const barStartX = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2;
      const maxVal = Math.max(row.thisWeek, row.lastWeek, 1);
      const barW = (row.thisWeek / maxVal) * 20;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(barStartX, y + 2, 22, 3, 'F');
      if (barW > 0) {
        pdf.setFillColor(...config.primaryColor);
        pdf.rect(barStartX, y + 2, barW, 3, 'F');
      }

      y += 7;
    });
    y += 8;
  }

  // ── Execution Velocity Bar Chart ──
  drawSectionTitle(pdf, 'Execution Velocity (Daily)', margin, y, config);
  y += 6;

  const velChartH = Math.min(45, 275 - y - 20);
  const velChartW = contentW;
  const velData = data.dailyTrends;
  const maxExec = Math.max(...velData.map(d => d.execCount), 1);
  const barW2 = (velChartW / Math.max(velData.length, 1)) * 0.7;

  // Draw bars
  velData.forEach((day, i) => {
    const bx = margin + (i / velData.length) * velChartW + barW2 * 0.2;
    const bh = (day.execCount / maxExec) * velChartH;
    const by = y + velChartH - bh;
    if (bh > 0) {
      pdf.setFillColor(160, 163, 241); // lighter indigo
      pdf.rect(bx, by, barW2, bh, 'F');
    }
  });

  // 7-day moving average line
  if (velData.length >= 7) {
    pdf.setDrawColor(...config.failureColor);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([], 0);
    let prevMx = 0, prevMy = 0;
    velData.forEach((_, i) => {
      if (i < 6) return;
      const avg = velData.slice(i - 6, i + 1).reduce((sum, d) => sum + d.execCount, 0) / 7;
      const mx = margin + (i / velData.length) * velChartW + barW2 / 2 + barW2 * 0.2;
      const my = y + velChartH - (avg / maxExec) * velChartH;
      if (i > 6) pdf.line(prevMx, prevMy, mx, my);
      prevMx = mx;
      prevMy = my;
    });
  }

  // X-axis labels
  pdf.setFontSize(7);
  pdf.setTextColor(...config.textLight);
  velData.forEach((day, i) => {
    if (i % 7 === 0) {
      const x = margin + (i / velData.length) * velChartW;
      const d = new Date(day.date);
      pdf.text(`${d.getMonth() + 1}/${d.getDate()}`, x, y + velChartH + 4);
    }
  });

  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, y, velChartW, velChartH);

  drawFooter(pdf, pageNum, totalPages, data.projectName, config);
}
