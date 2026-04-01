import { jsPDF } from 'jspdf';
import { ExportPDFInput, PdfConfig } from './pdfTypes';
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
  const { default: jsPDFLib } = await import('jspdf');
  const pdf = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const config: PdfConfig = getDefaultConfig();

  // ── Font setup: try NotoSansKR, fallback to helvetica ──
  try {
    const { NotoSansKRRegular } = await import('../../../assets/fonts/NotoSansKR-Regular');
    const { NotoSansKRBold } = await import('../../../assets/fonts/NotoSansKR-Bold');
    if (
      typeof NotoSansKRRegular === 'string' && NotoSansKRRegular.length > 10000 &&
      typeof NotoSansKRBold === 'string' && NotoSansKRBold.length > 10000
    ) {
      pdf.addFileToVFS('NotoSansKR-Regular.ttf', NotoSansKRRegular);
      pdf.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
      pdf.addFileToVFS('NotoSansKR-Bold.ttf', NotoSansKRBold);
      pdf.addFont('NotoSansKR-Bold.ttf', 'NotoSansKR', 'bold');
      // Verify font integrity
      pdf.setFont('NotoSansKR', 'normal');
      pdf.splitTextToSize('font-verify', 50);
      config.font = 'NotoSansKR';
    }
  } catch (fontErr) {
    console.warn('[PDF] Font load failed, using helvetica:', fontErr);
    config.font = 'helvetica';
  }

  const tierLevel = input.tierLevel || 1;
  const data = await preparePdfData(
    input.project,
    input.testCaseCount,
    input.milestones,
    input.allRunsRaw,
    input.rawTestResults,
    input.supabase,
    input.projectPassRateData,
  );

  // Determine total pages (P6, P7 require Professional+)
  let totalPages = 8;
  if (tierLevel < 3) totalPages = 6;
  data.totalPages = totalPages;

  const pageDrawers = [
    drawPage1Cover,
    drawPage2Scorecard,
    drawPage3Trends,
    drawPage4Execution,
    drawPage5Milestone,
    drawPage6Risk,
    drawPage7Team,
    drawPage8Appendix,
  ];

  let pageNum = 1;
  for (let i = 0; i < pageDrawers.length; i++) {
    // Skip P6 (index 5) and P7 (index 6) for non-Professional tiers
    if (tierLevel < 3 && (i === 5 || i === 6)) continue;

    if (pageNum > 1) pdf.addPage();

    try {
      await pageDrawers[i]({ pdf, config, data, tierLevel, pageNum, totalPages });
    } catch (err) {
      console.error(`[PDF] Error drawing page ${pageNum} (drawer index ${i}):`, err);
      // Continue to next page rather than aborting
    }

    pageNum++;
  }

  const safeName = String(input.project?.name || 'project')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  pdf.save(`${safeName}-quality-report-${new Date().toISOString().split('T')[0]}.pdf`);
}
