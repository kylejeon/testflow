import { jsPDF } from 'jspdf';
import { ExportPDFInput } from './pdfTypes';
import { preparePdfData } from './pdfDataPrep';
import { PDF_PAGE_STYLES } from './html/commonStyles';
import { renderPage1 } from './html/renderPage1';
import { renderPage2 } from './html/renderPage2';
import { renderPage3 } from './html/renderPage3';
import { renderPage4 } from './html/renderPage4';
import { renderPage5 } from './html/renderPage5';
import { renderPage6 } from './html/renderPage6';
import { renderPage7 } from './html/renderPage7';
import { renderPage8 } from './html/renderPage8';

const TC_PER_PAGE = 30;

async function capturePageHtml(innerHtml: string): Promise<string> {
  const { toJpeg } = await import('html-to-image');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;';
    // srcdoc isolates the iframe from the parent page's external stylesheets,
    // preventing html-to-image from trying to fetch CORS-blocked CDN CSS files.
    iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${PDF_PAGE_STYLES}
body { margin:0; padding:0; }
</style></head><body><div class="a4-page">${innerHtml}</div></body></html>`;

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 150));
        const pageEl = iframe.contentDocument!.querySelector('.a4-page') as HTMLElement;
        const dataUrl = await toJpeg(pageEl, {
          quality: 0.92,
          width: 794,
          height: 1123,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
        });
        document.body.removeChild(iframe);
        resolve(dataUrl);
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    };

    document.body.appendChild(iframe);
  });
}

export async function generateExecutiveReport(input: ExportPDFInput): Promise<void> {
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

  const maxTCs = tierLevel <= 1 ? 20 : data.testCases.length;
  const tcCount = Math.min(maxTCs, data.testCases.length);
  const appendixPages = Math.max(1, Math.ceil(tcCount / TC_PER_PAGE));
  const basePages = tierLevel < 3 ? 6 : 8;
  const totalPages = basePages - 1 + appendixPages;
  data.totalPages = totalPages;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let pageNum = 1;

  const addPage = async (html: string, isFirst: boolean) => {
    const imgData = await capturePageHtml(html);
    if (!isFirst) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  };

  // P1: Cover
  await addPage(renderPage1(data, pageNum, totalPages, tierLevel), true);
  pageNum++;

  // P2: Scorecard
  await addPage(renderPage2(data, pageNum, totalPages), false);
  pageNum++;

  // P3: Trends
  await addPage(renderPage3(data, pageNum, totalPages), false);
  pageNum++;

  // P4: Execution
  await addPage(renderPage4(data, pageNum, totalPages), false);
  pageNum++;

  // P5: Milestone
  await addPage(renderPage5(data, pageNum, totalPages, tierLevel), false);
  pageNum++;

  if (tierLevel >= 3) {
    // P6: Risk
    await addPage(renderPage6(data, pageNum, totalPages), false);
    pageNum++;

    // P7: Team
    await addPage(renderPage7(data, pageNum, totalPages), false);
    pageNum++;
  }

  // P8+: Appendix (one or more pages)
  for (let i = 0; i < appendixPages; i++) {
    const slicedData = { ...data, testCases: data.testCases.slice(0, tcCount) };
    await addPage(
      renderPage8(slicedData, pageNum, totalPages, i, TC_PER_PAGE, i === 0),
      false,
    );
    pageNum++;
  }

  const safeName = String(input.project?.name || 'project')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  pdf.save(`${safeName}-quality-report-${new Date().toISOString().split('T')[0]}.pdf`);
}
