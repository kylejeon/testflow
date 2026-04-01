import { jsPDF } from 'jspdf';
import { PageDrawContext, PdfData, PdfConfig } from './pdfTypes';
import { drawHeader, drawFooter, drawSectionTitle, getPriorityColor, getPriorityAbbr, getPercentageColor } from './pdfHelpers';

const TC_PER_PAGE = 30;

export async function drawPage8Appendix(context: PageDrawContext): Promise<void> {
  const { pdf, config, data, tierLevel, pageNum, totalPages } = context;
  const { margin, contentWidth: contentW, font } = config;

  // Tier limit: Free gets 20 TCs, others full
  const maxTCs = tierLevel <= 1 ? 20 : data.testCases.length;
  const tcs = data.testCases.slice(0, maxTCs);

  const tcPages = Math.max(1, Math.ceil(tcs.length / TC_PER_PAGE));

  for (let p = 0; p < tcPages; p++) {
    if (p > 0) pdf.addPage();

    drawHeader(pdf, 'Test Case Appendix', config);

    let tableY: number;

    if (p === 0) {
      // Lifecycle bar
      drawLifecycleBar(pdf, data, config, margin, 18, contentW, font);

      drawSectionTitle(pdf, 'All Test Cases', margin, 38, config);
      tableY = 44;
    } else {
      tableY = 18;
    }

    drawTCTableHeader(pdf, margin, tableY, config, font);
    tableY += 8;

    const pageTCs = tcs.slice(p * TC_PER_PAGE, (p + 1) * TC_PER_PAGE);
    pageTCs.forEach((tc: any, i: number) => {
      drawTCRow(pdf, tc, tableY + i * 7, p * TC_PER_PAGE + i, config, font);
    });

    // Total on last page
    if (p === tcPages - 1) {
      const endY = tableY + pageTCs.length * 7 + 5;
      pdf.setFontSize(9);
      pdf.setFont(font, 'bold');
      pdf.setTextColor(...config.textDark);
      pdf.text(`Total: ${tcs.length} Test Cases`, config.pageWidth - margin, endY, { align: 'right' });
    }

    const currentPage = pageNum + p;
    drawFooter(pdf, currentPage, totalPages + tcPages - 1, data.projectName, config);
  }
}

function drawLifecycleBar(pdf: jsPDF, data: PdfData, config: PdfConfig, margin: number, y: number, contentW: number, font: string): void {
  const tcs = data.testCases;
  const activeCount = tcs.filter((tc: any) => tc.lifecycle_status === 'active' || !tc.lifecycle_status).length;
  const draftCount = tcs.filter((tc: any) => tc.lifecycle_status === 'draft').length;
  const deprecatedCount = tcs.filter((tc: any) => tc.lifecycle_status === 'deprecated').length;

  pdf.setFillColor(...config.bgLight);
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, contentW, 12, 2, 2, 'FD');

  const items = [
    { label: 'Active', count: activeCount, color: [16, 163, 127] as [number,number,number] },
    { label: 'Draft', count: draftCount, color: [139, 92, 246] as [number,number,number] },
    { label: 'Deprecated', count: deprecatedCount, color: [148, 163, 184] as [number,number,number] },
  ];
  const total = tcs.length || 1;
  let lx = margin + 10;
  items.forEach(item => {
    const pct = ((item.count / total) * 100).toFixed(1);
    pdf.setFillColor(...item.color);
    pdf.circle(lx, y + 6, 2.5, 'F');
    pdf.setFont(font, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...config.textDark);
    pdf.text(`${item.label}: ${item.count} (${pct}%)`, lx + 5, y + 7);
    lx += 55;
  });
}

function drawTCTableHeader(pdf: jsPDF, margin: number, y: number, config: PdfConfig, font: string): void {
  const colWidths = [8, 18, 60, 22, 22, 40];
  const headers = ['#', 'ID', 'Title', 'Priority', 'Status', 'Folder'];
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  pdf.setFillColor(...config.primaryColor);
  pdf.rect(margin, y, totalW, 8, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  let hx = margin;
  headers.forEach((h, i) => {
    pdf.text(h, hx + 1.5, y + 5.5);
    hx += colWidths[i];
  });
}

function drawTCRow(pdf: jsPDF, tc: any, rowY: number, index: number, config: PdfConfig, font: string): void {
  const colWidths = [8, 18, 60, 22, 22, 40];
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const margin = config.margin;

  if (index % 2 === 0) {
    pdf.setFillColor(...config.bgLight);
    pdf.rect(margin, rowY, totalW, 7, 'F');
  }
  pdf.setDrawColor(...config.borderColor);
  pdf.setLineWidth(0.2);
  pdf.line(margin, rowY + 7, margin + totalW, rowY + 7);

  const titleText = String(tc.title || '-');
  const displayTitle = titleText.length > 30 ? titleText.slice(0, 27) + '...' : titleText;
  const idText = String(tc.id || '').slice(0, 10);
  const folderText = String(tc.folder || 'Uncategorized');
  const displayFolder = folderText.length > 18 ? folderText.slice(0, 15) + '...' : folderText;
  const priColor = getPriorityColor(tc.priority || 'medium', config);
  const priAbbr = getPriorityAbbr(tc.priority || 'medium');

  const statusColors: Record<string, [number,number,number]> = {
    active: [16, 163, 127],
    draft: [139, 92, 246],
    deprecated: [148, 163, 184],
  };
  const lcStatus = tc.lifecycle_status || 'active';
  const statusColor: [number,number,number] = statusColors[lcStatus] || config.textLight;
  const statusLabel = lcStatus.charAt(0).toUpperCase() + lcStatus.slice(1);

  let cx = margin;
  pdf.setFont(font, 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...config.textLight);
  pdf.text(String(index + 1), cx + 1.5, rowY + 5); cx += colWidths[0];
  pdf.setTextColor(...config.textDark);
  pdf.text(idText, cx + 1.5, rowY + 5); cx += colWidths[1];
  pdf.text(displayTitle, cx + 1.5, rowY + 5); cx += colWidths[2];

  // Priority
  pdf.setFillColor(...priColor);
  pdf.circle(cx + 2.5, rowY + 3.5, 1.5, 'F');
  pdf.setTextColor(...priColor);
  pdf.text(priAbbr, cx + 6, rowY + 5); cx += colWidths[3];

  // Status
  pdf.setTextColor(...statusColor);
  pdf.text(statusLabel, cx + 1.5, rowY + 5); cx += colWidths[4];

  pdf.setTextColor(...config.textLight);
  pdf.text(displayFolder, cx + 1.5, rowY + 5);
}
