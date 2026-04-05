import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import type { Requirement } from '../../types/rtm';

// ── Style tokens ─────────────────────────────────────────────────────────────
const btnSecondary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer`;
const fieldCls = `border border-slate-200 rounded-lg text-xs text-slate-700 px-2.5 py-1.5 bg-white focus:outline-none focus:border-indigo-400 transition-colors`;

// ── Cell status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  passed:   { bg: '#DCFCE7', dot: '#10A37F', label: 'Passed',   icon: '✅' },
  failed:   { bg: '#FEE2E2', dot: '#EF4444', label: 'Failed',   icon: '❌' },
  blocked:  { bg: '#FEF3C7', dot: '#F59E0B', label: 'Blocked',  icon: '🚫' },
  untested: { bg: '#F1F5F9', dot: '#94A3B8', label: 'Untested', icon: '⬜' },
  linked:   { bg: '#F1F5F9', dot: '#CBD5E1', label: 'Linked',   icon: '—'  },
} as const;

type CellStatus = keyof typeof STATUS_CONFIG | null;

interface CellData {
  status: CellStatus;
  result_id: string | null;
  note: string | null;
  executed_at: string | null;
  executor: string | null;
}

// ── Coverage summary card ─────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', minWidth: '9rem' }}>
      <div style={{ fontSize: '1.375rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginTop: '0.25rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>{sub}</div>}
    </div>
  );
}

// ── Cell popover (portal-based, overflow-safe) ────────────────────────────────
const POPOVER_W = 224; // 14rem
const POPOVER_GAP = 6;

function CellPopover({ cell, req, tcTitle, anchorRect, onClose }: {
  cell: CellData;
  req: Requirement;
  tcTitle: string;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  if (!cell.status) return null;
  const cfg = STATUS_CONFIG[cell.status];

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Vertical: prefer below anchor, flip above if too close to bottom
  const showAbove = anchorRect.bottom + POPOVER_GAP + 160 > vh;
  const top = showAbove
    ? anchorRect.top - POPOVER_GAP - 160
    : anchorRect.bottom + POPOVER_GAP;

  // Horizontal: center on anchor, clamp within viewport
  const rawLeft = anchorRect.left + anchorRect.width / 2 - POPOVER_W / 2;
  const left = Math.max(8, Math.min(rawLeft, vw - POPOVER_W - 8));

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        top,
        left,
        width: POPOVER_W,
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '0.625rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        zIndex: 9999,
        padding: '0.875rem',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{cfg.label}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
          <div className="font-medium text-slate-700" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tcTitle}</div>
          <div className="text-slate-400 mt-0.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.custom_id}: {req.title}</div>
        </div>
        {cell.note && (
          <div style={{ fontSize: '0.75rem', color: '#374151', background: '#F8FAFC', borderRadius: '0.375rem', padding: '0.375rem 0.5rem', marginTop: '0.5rem', wordBreak: 'break-word' }}>
            {cell.note}
          </div>
        )}
        {cell.executed_at && (
          <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.375rem' }}>
            {cell.executor && <span>{cell.executor} · </span>}
            {new Date(cell.executed_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

// ── Gap badge ─────────────────────────────────────────────────────────────────
function GapBadge({ type }: { type: 'no_tc' | 'no_exec' | 'fail' }) {
  if (type === 'no_tc') return <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-semibold text-red-600 bg-red-50 border border-red-100 px-1 rounded">🔴 No TC</span>;
  if (type === 'no_exec') return <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1 rounded">🟡 No Run</span>;
  return <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-semibold text-red-600 bg-red-50 border border-red-100 px-1 rounded">🔴 Fail</span>;
}

// ── Tier upgrade prompt ───────────────────────────────────────────────────────
function UpgradePrompt({ tier }: { tier: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <i className="ri-table-line text-3xl text-indigo-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Requirements Traceability Matrix</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          {tier === 1
            ? 'View your full requirements-to-test-case matrix. Available on Starter and above.'
            : 'Read-only matrix view. Upgrade to Professional for full interactive features and export.'}
        </p>
      </div>
      <Link to="/settings?tab=billing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
        <i className="ri-vip-crown-line" />
        {tier === 1 ? 'Upgrade to Starter' : 'Upgrade to Professional'}
      </Link>
    </div>
  );
}

export default function ProjectTraceability() {
  const { id: projectId } = useParams<{ id: string }>();

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [gapOnly, setGapOnly] = useState(false);
  const [popover, setPopover] = useState<{ reqId: string; tcId: string; rect: DOMRect } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Project info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').eq('id', projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  // User tier
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
      return { subscription_tier: data?.subscription_tier || 1 };
    },
    staleTime: 5 * 60_000,
  });

  const tier = userProfile?.subscription_tier || 1;

  // Requirements
  const { data: requirements = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('project_id', projectId!)
        .eq('status', 'active')
        .order('custom_id');
      if (error) throw error;
      return (data || []) as Requirement[];
    },
    enabled: !!projectId && tier >= 2,
    staleTime: 60_000,
  });

  // All links (req → TC)
  const { data: links = [] } = useQuery({
    queryKey: ['allReqLinks', projectId],
    queryFn: async () => {
      if (!requirements.length) return [];
      const { data, error } = await supabase
        .from('requirement_tc_links')
        .select('requirement_id, test_case_id')
        .in('requirement_id', requirements.map((r) => r.id));
      if (error) throw error;
      return data || [];
    },
    enabled: requirements.length > 0,
    staleTime: 30_000,
  });

  // All TCs referenced by any link
  const tcIds = useMemo(() => [...new Set(links.map((l) => l.test_case_id))], [links]);

  const { data: testCases = [] } = useQuery({
    queryKey: ['tcsByIds', tcIds.join(',')],
    queryFn: async () => {
      if (!tcIds.length) return [];
      const { data, error } = await supabase
        .from('test_cases')
        .select('id, custom_id, title, priority, folder')
        .in('id', tcIds)
        .order('custom_id');
      if (error) throw error;
      return data || [];
    },
    enabled: tcIds.length > 0,
    staleTime: 60_000,
  });

  // Latest result per TC
  const { data: resultMap = {} } = useQuery({
    queryKey: ['latestResults', tcIds.join(',')],
    queryFn: async () => {
      if (!tcIds.length) return {};
      const { data, error } = await supabase
        .from('test_results')
        .select('id, test_case_id, status, note, created_at, author')
        .in('test_case_id', tcIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, { id: string; status: string; note: string | null; created_at: string; executor: string | null }> = {};
      for (const r of data || []) {
        if (!map[r.test_case_id]) {
          map[r.test_case_id] = {
            id: r.id,
            status: r.status,
            note: r.note || null,
            created_at: r.created_at,
            executor: r.author || null,
          };
        }
      }
      return map;
    },
    enabled: tcIds.length > 0,
    staleTime: 30_000,
  });

  // Build the link set: reqId → Set<tcId>
  const reqTcMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of links) {
      if (!map.has(l.requirement_id)) map.set(l.requirement_id, new Set());
      map.get(l.requirement_id)!.add(l.test_case_id);
    }
    return map;
  }, [links]);

  // Coverage per requirement
  const coverageMap = useMemo(() => {
    const map: Record<string, { total: number; executed: number; passed: number; failed: number; blocked: number; pct: number }> = {};
    for (const req of requirements) {
      const linked = reqTcMap.get(req.id) || new Set();
      let executed = 0, passed = 0, failed = 0, blocked = 0;
      for (const tcId of linked) {
        const r = resultMap[tcId];
        if (r && r.status !== 'untested') { executed++; }
        if (r?.status === 'passed') passed++;
        if (r?.status === 'failed') failed++;
        if (r?.status === 'blocked') blocked++;
      }
      const total = linked.size;
      map[req.id] = { total, executed, passed, failed, blocked, pct: total === 0 ? 0 : Math.round((executed / total) * 100) };
    }
    return map;
  }, [requirements, reqTcMap, resultMap]);

  // Summary stats
  const summary = useMemo(() => {
    const total = requirements.length;
    const fullyCovered = requirements.filter((r) => {
      const c = coverageMap[r.id];
      return c && c.total > 0 && c.passed === c.total;
    }).length;
    const partial = requirements.filter((r) => {
      const c = coverageMap[r.id];
      return c && c.total > 0 && c.pct < 100 && c.pct > 0;
    }).length;
    const noCoverage = requirements.filter((r) => {
      const c = coverageMap[r.id];
      return !c || c.total === 0;
    }).length;
    const overallPct = total === 0 ? 0 : Math.round(
      requirements.reduce((acc, r) => acc + (coverageMap[r.id]?.pct || 0), 0) / total
    );
    return { total, fullyCovered, partial, noCoverage, overallPct };
  }, [requirements, coverageMap]);

  // Filtered requirements
  const filteredReqs = useMemo(() => {
    return requirements.filter((r) => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (gapOnly) {
        const c = coverageMap[r.id];
        return !c || c.pct < 100;
      }
      return true;
    });
  }, [requirements, priorityFilter, gapOnly, coverageMap]);

  // Cell data helper
  const getCell = (reqId: string, tcId: string): CellData => {
    const linked = reqTcMap.get(reqId)?.has(tcId);
    if (!linked) return { status: null, result_id: null, note: null, executed_at: null, executor: null };
    const r = resultMap[tcId];
    if (!r) return { status: 'untested', result_id: null, note: null, executed_at: null, executor: null };
    return {
      status: r.status as CellStatus,
      result_id: r.id,
      note: r.note,
      executed_at: r.created_at,
      executor: r.executor,
    };
  };

  // Gap type
  const getGapType = (req: Requirement) => {
    const c = coverageMap[req.id];
    if (!c || c.total === 0) return 'no_tc';
    if (c.executed === 0) return 'no_exec';
    if (c.failed > 0 || c.blocked > 0) return 'fail';
    return null;
  };

  // Export CSV — includes summary block + matrix
  const handleExportCSV = () => {
    const tcList = testCases;
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

    const summaryRows = [
      ['=== Traceability Matrix Summary ==='],
      ['Project', q(project?.name || projectId || '')],
      ['Exported', q(new Date().toLocaleString())],
      [],
      ['Overall Coverage', `${summary.overallPct}%`],
      ['Total Requirements', String(summary.total)],
      ['Fully Covered', String(summary.fullyCovered)],
      ['Partial Coverage', String(summary.partial)],
      ['No Coverage', String(summary.noCoverage)],
      [],
    ];

    const header = ['Requirement ID', 'Requirement', 'Priority', 'Status',
      ...tcList.map((tc) => q(`${tc.custom_id}: ${tc.title}`)),
      'Coverage %', 'Passed', 'Failed', 'Blocked', 'Untested'];

    const matrixRows = filteredReqs.map((req) => {
      const cov = coverageMap[req.id] || { total: 0, executed: 0, passed: 0, failed: 0, blocked: 0, pct: 0 };
      const untested = cov.total - cov.executed;
      const cells = tcList.map((tc) => {
        const cell = getCell(req.id, tc.id);
        if (!cell.status) return '';
        if (cell.status === 'passed') return 'Passed';
        if (cell.status === 'failed') return 'Failed';
        if (cell.status === 'blocked') return 'Blocked';
        if (cell.status === 'untested') return 'Untested';
        return 'Linked';
      });
      return [
        req.custom_id,
        q(req.title),
        req.priority,
        req.status,
        ...cells,
        String(cov.pct),
        String(cov.passed),
        String(cov.failed),
        String(cov.blocked),
        String(untested),
      ];
    });

    const allRows = [...summaryRows, header, ...matrixRows];
    const csv = allRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rtm-${project?.name || projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF — builds a standalone HTML page with full matrix text labels
  const handleExportPDF = () => {
    const tcList = testCases;
    const STATUS_LABEL: Record<string, string> = {
      passed: 'Passed', failed: 'Failed', blocked: 'Blocked', untested: 'Untested', linked: 'Linked',
    };
    const STATUS_COLOR: Record<string, string> = {
      passed: '#166534', failed: '#991B1B', blocked: '#92400E', untested: '#475569', linked: '#94A3B8',
    };
    const STATUS_BG: Record<string, string> = {
      passed: '#DCFCE7', failed: '#FEE2E2', blocked: '#FEF3C7', untested: '#F1F5F9', linked: '#F8FAFC',
    };

    const tcHeaders = tcList.map((tc) =>
      `<th style="padding:4px 6px;font-size:10px;font-weight:600;color:#475569;border:1px solid #E2E8F0;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis" title="${tc.title}">${tc.custom_id}</th>`
    ).join('');

    const matrixRows = filteredReqs.map((req) => {
      const cov = coverageMap[req.id] || { total: 0, executed: 0, passed: 0, failed: 0, blocked: 0, pct: 0 };
      const gapType = getGapType(req);
      const gapBadge = gapType === 'no_tc'
        ? '<span style="color:#DC2626;font-size:9px;font-weight:700">🔴 No TC</span>'
        : gapType === 'no_exec'
        ? '<span style="color:#D97706;font-size:9px;font-weight:700">🟡 No Run</span>'
        : gapType === 'fail'
        ? '<span style="color:#DC2626;font-size:9px;font-weight:700">🔴 Fail</span>'
        : '';

      const cells = tcList.map((tc) => {
        const cell = getCell(req.id, tc.id);
        if (!cell.status) return '<td style="border:1px solid #E2E8F0;"></td>';
        const label = STATUS_LABEL[cell.status] || '';
        const color = STATUS_COLOR[cell.status] || '#475569';
        const bg = STATUS_BG[cell.status] || '#fff';
        return `<td style="padding:3px 5px;text-align:center;border:1px solid #E2E8F0;background:${bg}"><span style="font-size:9px;font-weight:600;color:${color}">${label}</span></td>`;
      }).join('');

      const covColor = cov.pct === 100 ? '#166534' : cov.pct >= 50 ? '#1D4ED8' : '#991B1B';

      return `<tr>
        <td style="padding:5px 8px;border:1px solid #E2E8F0;min-width:120px">
          <div style="font-size:10px;font-weight:700;color:#4338CA;font-family:monospace">${req.custom_id} ${gapBadge}</div>
          <div style="font-size:10px;color:#1E293B;margin-top:2px">${req.title}</div>
          <div style="font-size:9px;color:#94A3B8">${req.priority} · ${req.status}</div>
        </td>
        ${cells}
        <td style="padding:5px 8px;border:1px solid #E2E8F0;white-space:nowrap;text-align:right">
          <span style="font-size:11px;font-weight:700;color:${covColor}">${cov.pct}%</span>
          <div style="font-size:9px;color:#94A3B8">${cov.passed}P · ${cov.failed}F · ${cov.total - cov.executed}U</div>
        </td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>RTM – ${project?.name || ''}</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 20px; color: #1E293B; font-size: 12px; }
    @page { size: landscape; margin: 12mm; }
    table { border-collapse: collapse; width: 100%; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .summary { display: flex; gap: 16px; margin: 12px 0 16px; flex-wrap: wrap; }
    .card { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; min-width: 110px; }
    .card-val { font-size: 18px; font-weight: 700; }
    .card-lbl { font-size: 10px; color: #64748B; margin-top: 2px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>Traceability Matrix — ${project?.name || ''}</h1>
  <p style="color:#64748B;font-size:11px;margin:0 0 12px">Exported ${new Date().toLocaleString()} · ${filteredReqs.length} requirements · ${tcList.length} test cases</p>

  <div class="summary">
    <div class="card"><div class="card-val" style="color:${summary.overallPct >= 80 ? '#166534' : summary.overallPct >= 50 ? '#1D4ED8' : '#991B1B'}">${summary.overallPct}%</div><div class="card-lbl">Overall Coverage</div></div>
    <div class="card"><div class="card-val">${summary.total}</div><div class="card-lbl">Total Requirements</div></div>
    <div class="card"><div class="card-val" style="color:#166534">${summary.fullyCovered}</div><div class="card-lbl">Fully Covered</div></div>
    <div class="card"><div class="card-val" style="color:#1D4ED8">${summary.partial}</div><div class="card-lbl">Partial Coverage</div></div>
    <div class="card"><div class="card-val" style="color:#991B1B">${summary.noCoverage}</div><div class="card-lbl">No Coverage</div></div>
  </div>

  <table>
    <thead>
      <tr style="background:#F8FAFC">
        <th style="padding:5px 8px;text-align:left;font-size:10px;font-weight:600;color:#64748B;border:1px solid #E2E8F0;min-width:140px">Requirement</th>
        ${tcHeaders}
        <th style="padding:5px 8px;text-align:right;font-size:10px;font-weight:600;color:#64748B;border:1px solid #E2E8F0;min-width:70px">Coverage</th>
      </tr>
    </thead>
    <tbody>${matrixRows}</tbody>
  </table>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  if (tier < 2) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />
        <UpgradePrompt tier={tier} />
      </div>
    );
  }

  const isLoading = loadingReqs;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />

      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Traceability Matrix</h1>
            <p className="text-xs text-slate-500 mt-0.5">Requirements ↔ Test Cases ↔ Results</p>
          </div>
          <div className="flex items-center gap-2">
            {tier >= 3 && (
              <>
                <button className={btnSecondary} onClick={handleExportCSV}>
                  <i className="ri-file-text-line" />
                  Export CSV
                </button>
                <button className={btnSecondary} onClick={handleExportPDF}>
                  <i className="ri-file-pdf-line" />
                  Export PDF
                </button>
              </>
            )}
            {tier < 3 && (
              <Link to="/settings?tab=billing" className={`${btnSecondary} text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100`}>
                <i className="ri-vip-crown-line" />
                Upgrade for Export
              </Link>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="flex items-stretch gap-3 mb-4 flex-wrap">
          <SummaryCard label="Overall Coverage" value={`${summary.overallPct}%`} color={summary.overallPct === 100 ? '#10A37F' : summary.overallPct >= 80 ? '#6366F1' : summary.overallPct >= 50 ? '#F59E0B' : '#EF4444'} />
          <SummaryCard label="Total Requirements" value={summary.total} color="#0F172A" />
          <SummaryCard label="Fully Covered" value={summary.fullyCovered} sub={summary.total ? `${Math.round(summary.fullyCovered / summary.total * 100)}%` : '—'} color="#10A37F" />
          <SummaryCard label="Partial Coverage" value={summary.partial} sub={summary.total ? `${Math.round(summary.partial / summary.total * 100)}%` : '—'} color="#6366F1" />
          <SummaryCard label="No Coverage" value={summary.noCoverage} sub={summary.noCoverage > 0 ? '⚠️ Critical' : 'None'} color={summary.noCoverage > 0 ? '#EF4444' : '#94A3B8'} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-3">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={fieldCls}>
            <option value="all">All priorities</option>
            <option value="P1">P1 – Critical</option>
            <option value="P2">P2 – High</option>
            <option value="P3">P3 – Medium</option>
            <option value="P4">P4 – Low</option>
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={gapOnly}
              onChange={(e) => setGapOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-indigo-600"
            />
            <span className="text-xs text-slate-600 font-medium">Gaps only</span>
          </label>
          <span className="text-xs text-slate-400 ml-auto">
            {filteredReqs.length} of {requirements.length} requirements · {testCases.length} test cases
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: cfg.bg, border: `1px solid ${cfg.dot}20` }} />
              <span className="text-xs text-slate-500">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#fff', border: '1px solid #E2E8F0' }} />
            <span className="text-xs text-slate-500">Not linked</span>
          </div>
        </div>

        {/* Matrix */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <i className="ri-loader-4-line animate-spin text-lg" />
            Loading matrix...
          </div>
        ) : requirements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-slate-200 rounded-xl">
            <i className="ri-git-branch-line text-4xl text-slate-300" />
            <p className="text-sm text-slate-500">No requirements yet.</p>
            <Link to={`/projects/${projectId}/requirements`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              <i className="ri-add-line" />
              Add Requirements
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'auto', maxHeight: '65vh' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {/* Req column header */}
                  <th style={{
                    padding: '0.625rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                    minWidth: '14rem',
                    maxWidth: '20rem',
                    position: 'sticky',
                    left: 0,
                    background: '#F8FAFC',
                    zIndex: 11,
                    borderRight: '1px solid #E2E8F0',
                  }}>
                    Requirement
                  </th>
                  {/* TC headers */}
                  {testCases.map((tc) => (
                    <th
                      key={tc.id}
                      style={{
                        padding: '0.5rem 0.375rem',
                        textAlign: 'center',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        minWidth: '3.5rem',
                        maxWidth: '5rem',
                        borderRight: '1px solid #F1F5F9',
                      }}
                      title={tc.title}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '4.5rem', margin: '0 auto' }}>
                        {tc.custom_id}
                      </div>
                    </th>
                  ))}
                  {/* Coverage header */}
                  <th style={{
                    padding: '0.625rem 0.875rem',
                    textAlign: 'left',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                    minWidth: '8rem',
                    position: 'sticky',
                    right: 0,
                    background: '#F8FAFC',
                    zIndex: 11,
                    borderLeft: '1px solid #E2E8F0',
                  }}>
                    Coverage
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredReqs.length === 0 ? (
                  <tr>
                    <td colSpan={testCases.length + 2} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '0.875rem' }}>
                      No requirements match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredReqs.map((req, rowIdx) => {
                    const cov = coverageMap[req.id] || { total: 0, executed: 0, passed: 0, failed: 0, blocked: 0, pct: 0 };
                    const gapType = getGapType(req);
                    const covColor = cov.pct === 100 ? '#10A37F' : cov.pct >= 80 ? '#6366F1' : cov.pct >= 50 ? '#F59E0B' : '#EF4444';

                    return (
                      <tr
                        key={req.id}
                        style={{ borderBottom: rowIdx < filteredReqs.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                        className="group hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* Req cell */}
                        <td style={{
                          padding: '0.625rem 1rem',
                          position: 'sticky',
                          left: 0,
                          background: 'inherit',
                          zIndex: 5,
                          borderRight: '1px solid #E2E8F0',
                          minWidth: '14rem',
                          maxWidth: '20rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-xs font-mono font-semibold text-indigo-600 flex-shrink-0">{req.custom_id}</span>
                            {gapType && <GapBadge type={gapType} />}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#374151', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '18rem' }}
                            title={req.title}
                          >
                            {req.title}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.0625rem' }}>
                            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[0.6rem] font-semibold ${
                              req.priority === 'P1' ? 'text-red-600' : req.priority === 'P2' ? 'text-orange-500' : req.priority === 'P3' ? 'text-blue-500' : 'text-slate-400'
                            }`}>{req.priority}</span>
                          </div>
                        </td>

                        {/* TC cells */}
                        {testCases.map((tc) => {
                          const cell = getCell(req.id, tc.id);
                          const isOpen = popover?.reqId === req.id && popover?.tcId === tc.id;

                          if (!cell.status) {
                            return (
                              <td key={tc.id} style={{ padding: '0.25rem', textAlign: 'center', borderRight: '1px solid #F8FAFC' }}>
                                <div style={{ width: '2.25rem', height: '2.25rem', margin: '0 auto', borderRadius: '0.25rem', background: '#fff', border: '1px solid #F1F5F9' }} />
                              </td>
                            );
                          }

                          const cfg = STATUS_CONFIG[cell.status];
                          return (
                            <td key={tc.id} style={{ padding: '0.25rem', textAlign: 'center', borderRight: '1px solid #F8FAFC' }}>
                              <button
                                onClick={(e) => {
                                  if (isOpen) { setPopover(null); }
                                  else { setPopover({ reqId: req.id, tcId: tc.id, rect: e.currentTarget.getBoundingClientRect() }); }
                                }}
                                style={{
                                  width: '2.25rem',
                                  height: '2.25rem',
                                  borderRadius: '0.25rem',
                                  background: cfg.bg,
                                  border: `1px solid ${cfg.dot}40`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                  fontSize: '0.75rem',
                                  transition: 'transform 0.1s',
                                }}
                                title={`${tc.custom_id}: ${tc.title}\n${cfg.label}`}
                                className="hover:scale-110"
                              >
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot }} />
                              </button>

                              {isOpen && popover?.rect && (
                                <CellPopover
                                  cell={cell}
                                  req={req}
                                  tcTitle={tc.title}
                                  anchorRect={popover.rect}
                                  onClose={() => setPopover(null)}
                                />
                              )}
                            </td>
                          );
                        })}

                        {/* Coverage cell */}
                        <td style={{
                          padding: '0.625rem 0.875rem',
                          position: 'sticky',
                          right: 0,
                          background: 'inherit',
                          zIndex: 5,
                          borderLeft: '1px solid #E2E8F0',
                          minWidth: '8rem',
                        }}>
                          {cov.total === 0 ? (
                            <span className="text-xs text-red-500 font-semibold">0% ⚠️</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div style={{ flex: 1, height: '5px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', minWidth: '3rem' }}>
                                  <div style={{ width: `${cov.pct}%`, height: '100%', background: covColor, borderRadius: '9999px', transition: 'width 0.3s' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: covColor, width: '2.5rem', textAlign: 'right', flexShrink: 0 }}>{cov.pct}%</span>
                              </div>
                              <div className="text-[0.6rem] text-slate-400 mt-0.5">
                                {cov.passed}P · {cov.failed}F · {cov.total - cov.executed}U
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Gap summary */}
        {requirements.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              {
                type: 'no_tc' as const,
                label: '🔴 No TC Gap',
                desc: 'Requirements with no linked test cases',
                count: requirements.filter((r) => !coverageMap[r.id] || coverageMap[r.id].total === 0).length,
                color: '#FEE2E2',
                border: '#FECACA',
              },
              {
                type: 'no_exec' as const,
                label: '🟡 No Exec Gap',
                desc: 'TCs linked but never executed',
                count: requirements.filter((r) => { const c = coverageMap[r.id]; return c && c.total > 0 && c.executed === 0; }).length,
                color: '#FEF3C7',
                border: '#FDE68A',
              },
              {
                type: 'fail' as const,
                label: '🔴 Fail Gap',
                desc: 'Requirements with failed/blocked tests',
                count: requirements.filter((r) => { const c = coverageMap[r.id]; return c && (c.failed > 0 || c.blocked > 0); }).length,
                color: '#FEE2E2',
                border: '#FECACA',
              },
            ].map((gap) => (
              <div
                key={gap.type}
                style={{ background: gap.color, border: `1px solid ${gap.border}`, borderRadius: '0.625rem', padding: '0.875rem' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{gap.label}</span>
                  <span className="text-lg font-bold text-slate-800">{gap.count}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{gap.desc}</p>
                {gap.count > 0 && (
                  <button
                    className="mt-2 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
                    onClick={() => { setPriorityFilter('all'); setGapOnly(true); }}
                  >
                    Show gaps only →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
