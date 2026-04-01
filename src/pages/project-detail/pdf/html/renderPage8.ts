import { PdfData } from '../pdfTypes';
import { e, priColor, priAbbr, statusClass } from './htmlUtils';

export function renderPage8(
  data: PdfData,
  pageNum: number,
  totalPages: number,
  tcPageIndex: number,
  tcPerPage: number,
  isFirstPage: boolean,
): string {
  const today = new Date().toISOString().split('T')[0];
  const tcsSlice = data.testCases.slice(tcPageIndex * tcPerPage, (tcPageIndex + 1) * tcPerPage);
  const startRow = tcPageIndex * tcPerPage + 1;
  const isLastPage = (tcPageIndex + 1) * tcPerPage >= data.testCases.length;

  const lifecycleCounts = {
    active: data.testCases.filter(tc => (tc.lifecycle_status || 'active').toLowerCase() === 'active').length,
    draft: data.testCases.filter(tc => (tc.lifecycle_status || '').toLowerCase() === 'draft').length,
    deprecated: data.testCases.filter(tc => (tc.lifecycle_status || '').toLowerCase() === 'deprecated').length,
  };

  const lifecycleDistribution = isFirstPage ? `
  <div class="sec-title" style="margin-top:0;">Lifecycle Distribution</div>
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:8px;padding:10px 18px;display:flex;justify-content:space-around;align-items:center;margin-bottom:14px;">
    <span style="font-size:10px;color:rgb(100,116,139);display:flex;align-items:center;gap:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:rgb(16,163,127);display:inline-block;"></span>
      Active: <strong style="color:rgb(15,23,42);">${lifecycleCounts.active} (${data.testCases.length > 0 ? (lifecycleCounts.active / data.testCases.length * 100).toFixed(1) : 0}%)</strong>
    </span>
    <span style="border-left:1px solid rgb(226,232,240);height:28px;"></span>
    <span style="font-size:10px;color:rgb(100,116,139);display:flex;align-items:center;gap:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:rgb(139,92,246);display:inline-block;"></span>
      Draft: <strong style="color:rgb(15,23,42);">${lifecycleCounts.draft} (${data.testCases.length > 0 ? (lifecycleCounts.draft / data.testCases.length * 100).toFixed(1) : 0}%)</strong>
    </span>
    <span style="border-left:1px solid rgb(226,232,240);height:28px;"></span>
    <span style="font-size:10px;color:rgb(100,116,139);display:flex;align-items:center;gap:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:rgb(203,213,225);display:inline-block;"></span>
      Deprecated: <strong style="color:rgb(15,23,42);">${lifecycleCounts.deprecated} (${data.testCases.length > 0 ? (lifecycleCounts.deprecated / data.testCases.length * 100).toFixed(1) : 0}%)</strong>
    </span>
  </div>
  <div class="sec-title">All Test Cases</div>` : `<div class="sec-title" style="margin-top:0;">All Test Cases (continued)</div>`;

  const lifecycleColor = (status: string): string => {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') return 'rgb(16,163,127)';
    if (s === 'draft') return 'rgb(139,92,246)';
    return 'rgb(203,213,225)';
  };

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Test Case Appendix</span>
</div>

<div class="pdf-content">
  ${lifecycleDistribution}
  <table class="pdf-table" style="font-size:10px;">
    <thead>
      <tr>
        <th style="width:5%;">#</th>
        <th style="width:12%;">ID</th>
        <th style="width:37%;">Title</th>
        <th style="width:13%;">Priority</th>
        <th style="width:12%;">Status</th>
        <th style="width:21%;">Folder</th>
      </tr>
    </thead>
    <tbody>
      ${tcsSlice.map((tc, i) => {
        const rowNum = startRow + i;
        const lifecycle = (tc.lifecycle_status || 'active').toLowerCase();
        const title = (tc.title || `TC-${String(tc.id).slice(0, 8)}`);
        const displayTitle = title.length > 34 ? title.slice(0, 31) + '...' : title;
        const folder = (tc.folder_name || tc.folder || '-');
        const displayFolder = folder.length > 20 ? folder.slice(0, 17) + '...' : folder;
        const statusLabel = (tc.lifecycle_status || 'active');
        const statusCls = lifecycle === 'active' ? 'c-pass' : lifecycle === 'draft' ? 'c-indigo' : 'c-untested';
        return `
      <tr>
        <td class="c-light">${rowNum}</td>
        <td style="font-size:9px;">${e((tc.id || '').slice(0, 12))}</td>
        <td>${e(displayTitle)}</td>
        <td>
          <span class="pri-dot" style="background:${priColor(tc.priority)};"></span>
          <span style="color:${priColor(tc.priority)};">${e(priAbbr(tc.priority))}</span>
        </td>
        <td>
          <span style="color:${lifecycleColor(lifecycle)};font-weight:600;font-size:9px;">${e(statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1))}</span>
        </td>
        <td class="c-light" style="font-size:9px;">${e(displayFolder)}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>

  ${isLastPage ? `
  <div style="text-align:right;font-size:11px;font-weight:700;color:rgb(15,23,42);margin-top:10px;padding-top:8px;border-top:1px dashed rgb(226,232,240);">
    Total: ${data.testCases.length} Test Cases
  </div>` : `
  <div style="text-align:center;font-size:9px;color:rgb(100,116,139);margin-top:8px;padding-top:6px;border-top:1px dashed rgb(226,232,240);">
    Showing ${startRow}–${Math.min(startRow + tcPerPage - 1, data.testCases.length)} of ${data.testCases.length} test cases (continues on next page)
  </div>`}
</div>

<div class="pdf-footer">
  <span>${e(data.projectName)}</span>
  <span>Generated by Testably — ${today}</span>
  <span>Page ${pageNum} of ${totalPages}</span>
</div>`;
}
