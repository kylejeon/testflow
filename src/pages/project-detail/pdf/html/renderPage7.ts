import { PdfData } from '../pdfTypes';
import { e, pctColor, fmtDate } from './htmlUtils';

export function renderPage7(data: PdfData, pageNum: number, totalPages: number): string {
  const today = fmtDate();
  const members = data.teamMembers;
  const totalExec = members.reduce((s, m) => s + m.executed, 0) || 1;
  const avgExec = members.length > 0 ? Math.round(totalExec / members.length) : 0;
  const activeToday = members.filter(m => m.executed > 0).length;

  const maxExec = Math.max(...members.map(m => m.executed), 1);

  // Top defect discoverers (by failCount)
  const topDefect = [...members].sort((a, b) => b.failed - a.failed).slice(0, 5);
  const topName = members.length > 0 && members[0].failed > 0
    ? `${members[0].name} found ${((members[0].failed / members.reduce((s, m) => s + m.failed, 0) || 1) * 100).toFixed(1)}% of all defects`
    : 'No defect data available';

  // Contribution bar colors (indigo at different opacities)
  const barOpacities = ['1', '0.8', '0.6', '0.4', '0.25'];

  return `
<div class="pdf-header">
  <span class="logo">Testably</span>
  <span class="page-title">Team Performance</span>
</div>

<div class="pdf-content">
  <div style="background:rgb(248,250,252);border:1px solid rgb(226,232,240);border-radius:8px;padding:8px 16px;margin-bottom:14px;">
    <table style="width:100%;table-layout:fixed;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;vertical-align:middle;padding:4px;">
          <span style="font-size:10px;color:rgb(100,116,139);">Total Members: <strong style="color:rgb(15,23,42);font-size:12px;">${members.length}</strong></span>
        </td>
        <td style="width:1px;vertical-align:middle;">
          <span style="border-left:1px solid rgb(226,232,240);height:28px;display:inline-block;vertical-align:middle;"></span>
        </td>
        <td style="text-align:center;vertical-align:middle;padding:4px;">
          <span style="font-size:10px;color:rgb(100,116,139);">Active Today: <strong style="color:rgb(16,163,127);font-size:12px;">${activeToday}</strong></span>
        </td>
        <td style="width:1px;vertical-align:middle;">
          <span style="border-left:1px solid rgb(226,232,240);height:28px;display:inline-block;vertical-align:middle;"></span>
        </td>
        <td style="text-align:center;vertical-align:middle;padding:4px;">
          <span style="font-size:10px;color:rgb(100,116,139);">Avg Execution/Member: <strong style="color:rgb(15,23,42);font-size:12px;">${avgExec}</strong></span>
        </td>
      </tr>
    </table>
  </div>

  <div class="sec-title">Member Performance</div>
  <table class="pdf-table" style="margin-bottom:14px;font-size:10px;">
    <thead>
      <tr>
        <th style="width:5%;">#</th>
        <th style="width:18%;">Member</th>
        <th style="width:10%;">Executed</th>
        <th style="width:9%;">Passed</th>
        <th style="width:9%;">Failed</th>
        <th style="width:12%;">Pass%</th>
        <th style="width:12%;">Contrib%</th>
        <th style="width:25%;">Bar</th>
      </tr>
    </thead>
    <tbody>
      ${members.map((m, i) => {
        const barW = (m.executed / maxExec) * 100;
        return `
      <tr>
        <td class="c-light">${i + 1}</td>
        <td style="font-weight:600;">${e(m.name || 'No assigned member')}</td>
        <td style="font-weight:600;">${m.executed}</td>
        <td class="c-pass">${m.passed}</td>
        <td class="c-fail">${m.failed}</td>
        <td style="font-weight:600;color:${pctColor(m.passRate)};">${m.passRate.toFixed(1)}%</td>
        <td>${m.contribution.toFixed(1)}%</td>
        <td>
          <div style="width:120px;height:10px;background:rgb(241,245,249);border-radius:3px;overflow:hidden;">
            <div style="width:${barW.toFixed(1)}%;height:100%;background:rgb(99,102,241);border-radius:3px;opacity:${barOpacities[Math.min(i, barOpacities.length - 1)]};"></div>
          </div>
        </td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="sec-title">Contribution Distribution</div>
  <div style="margin-bottom:14px;">
    ${members.slice(0, 5).map((m, i) => `
    <div style="display:table;width:100%;margin-bottom:6px;">
      <div style="display:table-cell;vertical-align:middle;width:70px;">
        <span style="font-size:10px;color:rgb(15,23,42);display:block;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e(m.name || 'No assigned member')}</span>
      </div>
      <div style="display:table-cell;vertical-align:middle;padding-left:8px;">
        <div style="height:12px;background:rgb(241,245,249);border-radius:3px;overflow:hidden;">
          <div style="width:${m.contribution.toFixed(1)}%;height:100%;background:rgb(99,102,241);border-radius:3px;opacity:${barOpacities[i]};"></div>
        </div>
      </div>
      <div style="display:table-cell;vertical-align:middle;width:40px;white-space:nowrap;text-align:right;padding-left:8px;font-size:10px;font-weight:700;color:rgb(15,23,42);">${m.contribution.toFixed(1)}%</div>
    </div>`).join('')}
    ${members.length > 5 ? `
    <div style="display:table;width:100%;">
      <div style="display:table-cell;vertical-align:middle;width:70px;">
        <span style="font-size:10px;color:rgb(100,116,139);display:block;text-align:right;">Others</span>
      </div>
      <div style="display:table-cell;vertical-align:middle;padding-left:8px;">
        <div style="height:12px;background:rgb(241,245,249);border-radius:3px;overflow:hidden;">
          <div style="width:${members.slice(5).reduce((s, m) => s + m.contribution, 0).toFixed(1)}%;height:100%;background:rgb(203,213,225);border-radius:3px;"></div>
        </div>
      </div>
      <div style="display:table-cell;vertical-align:middle;width:40px;white-space:nowrap;text-align:right;padding-left:8px;font-size:10px;font-weight:700;color:rgb(100,116,139);">${members.slice(5).reduce((s, m) => s + m.contribution, 0).toFixed(1)}%</div>
    </div>` : ''}
  </div>

  ${topDefect.length > 0 ? `
  <div class="sec-title">Defect Discovery</div>
  <div style="background:rgb(238,242,255);border-radius:6px;padding:8px 14px;margin-bottom:10px;">
    <span style="font-size:10px;color:rgb(99,102,241);">${e(topName)}</span>
  </div>
  <table class="pdf-table" style="font-size:10px;">
    <thead><tr><th>Member</th><th>Failures Found</th><th>% of Total</th><th>Discovery Rate</th></tr></thead>
    <tbody>
      ${topDefect.map(m => {
        const totalFailed = members.reduce((s, x) => s + x.failed, 0) || 1;
        const pctOfTotal = ((m.failed / totalFailed) * 100).toFixed(1);
        const discRate = m.executed > 0 ? ((m.failed / m.executed) * 100).toFixed(1) : '0.0';
        return `<tr>
          <td style="font-weight:600;">${e(m.name || 'No assigned member')}</td>
          <td style="font-weight:600;">${m.failed}</td>
          <td>${pctOfTotal}%</td>
          <td>${discRate}%</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
</div>

<div class="pdf-footer">
  <span style="position:absolute;left:80px;top:0;height:48px;line-height:48px;">${e(data.projectName)}</span>
  <span style="position:absolute;left:0;right:0;top:0;height:48px;line-height:48px;text-align:center;">Generated by Testably — ${today}</span>
  <span style="position:absolute;right:80px;top:0;height:48px;line-height:48px;">Page ${pageNum} of ${totalPages}</span>
</div>`;
}
