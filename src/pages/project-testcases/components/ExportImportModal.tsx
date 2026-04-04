import { useState, useRef, useEffect, useCallback } from 'react';
import { exportToTestRail } from '../../../utils/testRailExport';
import { parseCSVImport, parseExcelImport, type ImportedTestCase } from '../../../utils/excelImport';
import { supabase } from '../../../lib/supabase';

interface TestCase {
  id: string;
  custom_id?: string;
  title: string;
  description?: string;
  precondition?: string;
  folder?: string;
  priority: string;
  is_automated?: boolean;
  steps?: string;
  expected_result?: string;
  tags?: string;
  assignee?: string;
  status?: string;
}

interface ExportImportModalProps {
  testCases: TestCase[];
  selectedTestCaseIds: Set<string>;
  projectName: string;
  projectId?: string;
  onImport?: (testCases: Partial<TestCase>[]) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onClose: () => void;
}

type ModalTab = 'export' | 'import';
type ExportScope = 'all' | 'selected';

const ALL_COLUMNS = [
  { key: 'ID',                  label: 'ID',                  required: false },
  { key: 'Title',               label: 'Title',               required: true  },
  { key: 'Section',             label: 'Section',             required: false },
  { key: 'Section Description', label: 'Section Description', required: false },
  { key: 'Preconditions',       label: 'Preconditions',       required: false },
  { key: 'Steps',               label: 'Steps',               required: false },
  { key: 'Expected Result',     label: 'Expected Result',     required: false },
  { key: 'Priority',            label: 'Priority',            required: false },
  { key: 'Type',                label: 'Type',                required: false },
  { key: 'Automation Type',     label: 'Automation Type',     required: false },
  { key: 'Tags',                 label: 'Tags',                 required: false },
];

const CHUNK_SIZE = 200;

const PRIORITY_CONFIG = {
  critical: { icon: 'ri-arrow-up-double-line', color: '#DC2626', label: 'Critical' },
  high:     { icon: 'ri-arrow-up-line',        color: '#EA580C', label: 'High'     },
  medium:   { icon: 'ri-equal-line',           color: '#D97706', label: 'Medium'   },
  low:      { icon: 'ri-arrow-down-line',      color: '#16A34A', label: 'Low'      },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase() as keyof typeof PRIORITY_CONFIG]
    ?? { icon: 'ri-equal-line', color: '#94A3B8', label: priority || 'Medium' };
  return (
    <span style={{ color: cfg.color, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <i className={cfg.icon} style={{ fontSize: 11 }} />
      {cfg.label}
    </span>
  );
}

function StatusPill({ status }: { status?: string }) {
  const isDraft = status === 'draft';
  return (
    <span style={{
      background: isDraft ? '#FEF9C3' : '#DCFCE7',
      color:      isDraft ? '#854D0E' : '#166534',
      border:     `1px solid ${isDraft ? '#FDE68A' : '#BBF7D0'}`,
      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999,
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
    }}>
      {isDraft ? 'Draft' : 'Active'}
    </span>
  );
}

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ background: '#FEF08A', padding: '0 2px', borderRadius: 2, color: '#0F172A', fontWeight: 700 }}>
        {text.slice(idx, idx + keyword.length)}
      </strong>
      {text.slice(idx + keyword.length)}
    </>
  );
}

// Shared checkbox visual
function Checkbox({ checked, indeterminate, disabled }: { checked: boolean; indeterminate?: boolean; disabled?: boolean }) {
  return (
    <div style={{
      width: 16, height: 16, flexShrink: 0,
      border: `1.5px solid ${checked || indeterminate ? '#6366F1' : '#CBD5E1'}`,
      borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: checked || indeterminate ? '#6366F1' : 'white',
      transition: 'all .15s', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.7 : 1,
    }}>
      {indeterminate && <div style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
      {checked && !indeterminate && <i className="ri-check-line" style={{ color: 'white', fontSize: 11 }} />}
    </div>
  );
}

export default function ExportImportModal({
  testCases,
  selectedTestCaseIds,
  projectName,
  projectId,
  onRefresh,
  onClose,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab]       = useState<ModalTab>('export');
  const [exportScope, setExportScope]   = useState<ExportScope>('all');
  const [resolvedProjectName, setResolvedProjectName] = useState(projectName || '');

  // Columns
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  // TC picker
  const [selectedExportTcIds, setSelectedExportTcIds] = useState<Set<string>>(
    new Set(selectedTestCaseIds)
  );
  const [tcSearch, setTcSearch]               = useState('');
  const [tcSectionFilter, setTcSectionFilter] = useState('');
  const [tcPriorityFilter, setTcPriorityFilter] = useState('');
  const [showSectionDd, setShowSectionDd]     = useState(false);
  const [showPriorityDd, setShowPriorityDd]   = useState(false);
  const sectionRef  = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  // Import
  const [importFile, setImportFile]       = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportedTestCase[] | null>(null);
  const [importErrors, setImportErrors]   = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [totalRows, setTotalRows]         = useState(0);
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting]         = useState(false);
  const [importDone, setImportDone]       = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount]     = useState(0);
  const [progress, setProgress]           = useState(0);
  const [currentChunk, setCurrentChunk]   = useState(0);
  const [totalChunks, setTotalChunks]     = useState(0);
  const cancelRef = useRef(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) setShowSectionDd(false);
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriorityDd(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Resolve project name
  useEffect(() => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    (async () => {
      if (projectId) {
        try {
          const { data } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
          if (data?.name && !uuid.test(data.name.trim())) { setResolvedProjectName(data.name); return; }
        } catch { /* ignore */ }
      }
      if (projectName && !uuid.test(projectName.trim())) { setResolvedProjectName(projectName); return; }
      const m = window.location.pathname.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) {
        try {
          const { data } = await supabase.from('projects').select('name').eq('id', m[1]).maybeSingle();
          if (data?.name && !uuid.test(data.name.trim())) { setResolvedProjectName(data.name); return; }
        } catch { /* ignore */ }
      }
      setResolvedProjectName('project');
    })();
  }, [projectId, projectName]);

  // Derived
  const uniqueFolders = [...new Set(testCases.map(tc => tc.folder).filter(Boolean))] as string[];

  const filteredTcs = testCases.filter(tc => {
    if (tcSectionFilter && tc.folder !== tcSectionFilter) return false;
    if (tcPriorityFilter && tc.priority?.toLowerCase() !== tcPriorityFilter) return false;
    if (tcSearch.trim()) {
      const q = tcSearch.toLowerCase();
      if (!tc.custom_id?.toLowerCase().includes(q) && !tc.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const exportTargetCases = exportScope === 'selected'
    ? testCases.filter(tc => selectedExportTcIds.has(tc.id))
    : testCases;

  const hasActiveFilters = !!(tcSearch.trim() || tcSectionFilter || tcPriorityFilter);

  const isAllFilteredSelected = filteredTcs.length > 0 && filteredTcs.every(tc => selectedExportTcIds.has(tc.id));
  const isSomeFilteredSelected = filteredTcs.some(tc => selectedExportTcIds.has(tc.id)) && !isAllFilteredSelected;

  const nonRequired = ALL_COLUMNS.filter(c => !c.required);
  const allNonReqChecked = nonRequired.every(c => selectedColumns.has(c.key));

  const estimatedChunks = importPreview ? Math.ceil(importPreview.length / CHUNK_SIZE) : 0;

  // Summary bar state
  const noTcsSelected = exportScope === 'selected' && selectedExportTcIds.size === 0;
  const exportReady   = exportScope === 'selected' && selectedExportTcIds.size > 0 && !hasActiveFilters;

  // Handlers
  const toggleColumn = (key: string) => {
    if (ALL_COLUMNS.find(c => c.key === key)?.required) return;
    setSelectedColumns(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleAllColumns = () => {
    const keys = nonRequired.map(c => c.key);
    const allOn = keys.every(k => selectedColumns.has(k));
    setSelectedColumns(prev => { const n = new Set(prev); allOn ? keys.forEach(k => n.delete(k)) : keys.forEach(k => n.add(k)); return n; });
  };
  const toggleTc = (id: string) =>
    setSelectedExportTcIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () =>
    setSelectedExportTcIds(prev => { const n = new Set(prev); filteredTcs.forEach(tc => n.add(tc.id)); return n; });
  const clearSelection = () => setSelectedExportTcIds(new Set());
  const clearFilters   = () => { setTcSearch(''); setTcSectionFilter(''); setTcPriorityFilter(''); };

  const handleExport = () => {
    exportToTestRail(exportTargetCases, resolvedProjectName, selectedColumns);
    onClose();
  };

  const handleFileSelect = useCallback((file: File) => {
    setImportFile(file); setImportPreview(null); setImportErrors([]); setImportWarnings([]);
    setImportDone(false); setProgress(0);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const reader = new FileReader();
    if (isExcel) {
      reader.onload = e => {
        const r = parseExcelImport(e.target?.result as ArrayBuffer);
        setImportErrors(r.errors); setImportWarnings(r.warnings); setTotalRows(r.totalRows);
        setImportPreview(r.success ? r.data : null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = e => {
        const r = parseCSVImport(e.target?.result as string);
        setImportErrors(r.errors); setImportWarnings(r.warnings); setTotalRows(r.totalRows);
        setImportPreview(r.success ? r.data : null);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') handleFileSelect(file);
    else setImportErrors(['Only CSV or Excel (.xlsx, .xls) files are supported.']);
  };

  const handleImportConfirm = async () => {
    if (!importPreview || !importPreview.length || !projectId) return;
    cancelRef.current = false;
    setImporting(true); setProgress(0); setImportedCount(0); setFailedCount(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: pd } = await supabase.from('projects').select('prefix').eq('id', projectId).maybeSingle();
      const prefix = pd?.prefix as string | null;
      let maxNum = 0;
      if (prefix) {
        const { data: ex } = await supabase.from('test_cases').select('custom_id').eq('project_id', projectId).not('custom_id', 'is', null);
        (ex || []).forEach((tc: { custom_id: string | null }) => {
          const m = tc.custom_id?.match(/-(\d+)$/); if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });
      }
      // Auto-create folders
      const folderNames = [...new Set(importPreview.map(tc => tc.folder).filter((f): f is string => !!f && f.trim() !== ''))];
      if (folderNames.length) {
        const { data: ef } = await supabase.from('folders').select('name').eq('project_id', projectId);
        const existing = new Set((ef || []).map((f: { name: string }) => f.name));
        const toCreate = folderNames.filter(n => !existing.has(n));
        if (toCreate.length) await supabase.from('folders').insert(toCreate.map(name => ({ project_id: projectId, name, icon: 'ri-folder-line', color: 'gray' })));
      }
      const chunks: ImportedTestCase[][] = [];
      for (let i = 0; i < importPreview.length; i += CHUNK_SIZE) chunks.push(importPreview.slice(i, i + CHUNK_SIZE));
      setTotalChunks(chunks.length);
      let totalIns = 0, totalFail = 0, globalIdx = 0;
      for (let ci = 0; ci < chunks.length; ci++) {
        if (cancelRef.current) break;
        setCurrentChunk(ci + 1);
        const chunk = chunks[ci];
        const rows = chunk.map((tc, idx) => ({
          project_id: projectId, title: tc.title || 'Untitled', description: tc.description || null,
          precondition: tc.precondition || null, priority: tc.priority || 'medium', status: 'untested',
          is_automated: tc.is_automated || false, folder: tc.folder || null, tags: tc.tags || null,
          steps: tc.steps || null, expected_result: tc.expected_result || null, assignee: null,
          created_by: user?.id || null, lifecycle_status: 'draft',
          ...(prefix ? { custom_id: `${prefix}-${maxNum + globalIdx + idx + 1}` } : {}),
        }));
        const { data: ins, error } = await supabase.from('test_cases').insert(rows).select('id');
        if (error) { totalFail += chunk.length; }
        else {
          totalIns += ins?.length ?? chunk.length;
          if (ins && user) await supabase.from('test_case_history').insert(ins.map((tc: { id: string }) => ({ test_case_id: tc.id, user_id: user.id, action_type: 'created' }))).then(() => {});
        }
        globalIdx += chunk.length;
        setImportedCount(totalIns); setFailedCount(totalFail);
        setProgress(Math.round(((ci + 1) / chunks.length) * 100));
        await new Promise(r => setTimeout(r, 0));
      }
      setImportDone(true);
      if (onRefresh) await onRefresh();
    } catch {
      setImportErrors(['An error occurred during import. Please try again.']);
    } finally { setImporting(false); }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const S = {
    label: { fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: 8 },
    section: { padding: '12px 20px', borderBottom: '1px solid #F1F5F9' },
    filterBtn: (active: boolean): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px',
      border: `1px solid ${active ? '#6366F1' : '#E2E8F0'}`, borderRadius: 6, fontSize: 11, fontWeight: 500,
      color: active ? '#6366F1' : '#475569', cursor: 'pointer',
      background: active ? '#EEF2FF' : 'white', fontFamily: 'inherit',
    }),
    dd: { position: 'absolute' as const, top: '100%', left: 0, marginTop: 4, zIndex: 60, background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 140, overflow: 'hidden' },
    ddBtn: (active: boolean): React.CSSProperties => ({ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 12, color: active ? '#6366F1' : '#334155', background: active ? '#EEF2FF' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget && !importing) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Export / Import</h3>
            <button onClick={() => { if (!importing) onClose(); }}
              style={{ background: 'none', border: 'none', cursor: importing ? 'not-allowed' : 'pointer', color: '#94A3B8', fontSize: 18, padding: 4, borderRadius: 6, display: 'flex', opacity: importing ? 0.4 : 1 }}>
              <i className="ri-close-line" />
            </button>
          </div>
          <div style={{ display: 'flex' }}>
            {(['export', 'import'] as const).map(tab => (
              <button key={tab}
                onClick={() => { if (!importing) { setActiveTab(tab); setImportDone(false); } }}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 500, color: activeTab === tab ? '#6366F1' : '#64748B', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#6366F1' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className={`${tab === 'export' ? 'ri-download-2-line' : 'ri-upload-2-line'} mr-1`} />
                {tab === 'export' ? 'Export' : 'Import'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ══ EXPORT TAB ══════════════════════════════════════════════════ */}
          {activeTab === 'export' && (<>

            {/* Title row */}
            <div style={S.section}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Export as CSV</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>CSV / Excel format</span>
              </div>
            </div>

            {/* Export Range */}
            <div style={S.section}>
              <span style={S.label}>Export Range</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'all'      as const, label: 'All Test Cases',      sub: `${testCases.length} test cases` },
                  { value: 'selected' as const, label: 'Selected Test Cases', sub: selectedExportTcIds.size > 0 ? `${selectedExportTcIds.size} selected` : 'Choose specific TCs' },
                ] as const).map(opt => (
                  <div key={opt.value} onClick={() => setExportScope(opt.value)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .15s', border: `1.5px solid ${exportScope === opt.value ? '#6366F1' : '#E2E8F0'}`, background: exportScope === opt.value ? '#EEF2FF' : 'white' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${exportScope === opt.value ? '#6366F1' : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {exportScope === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: exportScope === opt.value ? 600 : 500, color: exportScope === opt.value ? '#6366F1' : '#334155' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: exportScope === opt.value ? '#818CF8' : '#94A3B8', marginTop: 1 }}>{opt.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TC Picker Panel (Selected mode) ────────────────────────── */}
            {exportScope === 'selected' && (
              <div style={{ borderBottom: '1px solid #E2E8F0' }}>

                {/* Toolbar */}
                <div style={{ padding: '10px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: `1px solid ${tcSearch ? '#6366F1' : '#E2E8F0'}`, borderRadius: 6, padding: '5px 10px', boxShadow: tcSearch ? '0 0 0 2px rgba(99,102,241,0.12)' : 'none' }}>
                    <i className="ri-search-line" style={{ color: tcSearch ? '#6366F1' : '#94A3B8', fontSize: 14, flexShrink: 0 }} />
                    <input type="text" value={tcSearch} onChange={e => setTcSearch(e.target.value)}
                      placeholder="Search by ID or title..."
                      style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: '#334155', width: '100%', background: 'transparent' }} />
                    {tcSearch && (
                      <button onClick={() => setTcSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, fontSize: 13, display: 'flex' }}>
                        <i className="ri-close-circle-fill" />
                      </button>
                    )}
                  </div>

                  {/* Section filter */}
                  <div ref={sectionRef} style={{ position: 'relative' }}>
                    <button style={S.filterBtn(!!tcSectionFilter)}
                      onClick={() => { setShowSectionDd(p => !p); setShowPriorityDd(false); }}>
                      <i className="ri-folder-3-line" style={{ fontSize: 12 }} />
                      {tcSectionFilter || 'Section'}
                      {tcSectionFilter
                        ? <i className="ri-close-line" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); setTcSectionFilter(''); }} />
                        : <i className="ri-arrow-down-s-line" style={{ fontSize: 12 }} />}
                    </button>
                    {showSectionDd && uniqueFolders.length > 0 && (
                      <div style={S.dd}>
                        {uniqueFolders.map(f => (
                          <button key={f} style={S.ddBtn(tcSectionFilter === f)}
                            onClick={() => { setTcSectionFilter(f); setShowSectionDd(false); }}>{f}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority filter */}
                  <div ref={priorityRef} style={{ position: 'relative' }}>
                    <button style={S.filterBtn(!!tcPriorityFilter)}
                      onClick={() => { setShowPriorityDd(p => !p); setShowSectionDd(false); }}>
                      <i className="ri-flag-line" style={{ fontSize: 12 }} />
                      {tcPriorityFilter ? tcPriorityFilter.charAt(0).toUpperCase() + tcPriorityFilter.slice(1) : 'Priority'}
                      {tcPriorityFilter
                        ? <i className="ri-close-line" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); setTcPriorityFilter(''); }} />
                        : <i className="ri-arrow-down-s-line" style={{ fontSize: 12 }} />}
                    </button>
                    {showPriorityDd && (
                      <div style={S.dd}>
                        {(['critical', 'high', 'medium', 'low'] as const).map(p => (
                          <button key={p} style={S.ddBtn(tcPriorityFilter === p)}
                            onClick={() => { setTcPriorityFilter(p); setShowPriorityDd(false); }}>
                            <PriorityBadge priority={p} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select All */}
                  <button onClick={selectAllFiltered}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#6366F1', cursor: 'pointer', border: 'none', borderRadius: 6, background: 'transparent', fontFamily: 'inherit' }}>
                    <i className="ri-checkbox-multiple-line" /> Select All
                  </button>
                </div>

                {/* Counter bar */}
                {selectedExportTcIds.size > 0 && (
                  <div style={{ padding: '7px 20px', background: hasActiveFilters ? '#EEF2FF' : '#ECFDF5', borderBottom: `1px solid ${hasActiveFilters ? '#C7D2FE' : '#A7F3D0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: hasActiveFilters ? '#6366F1' : '#065F46' }}>
                    <span>
                      {!hasActiveFilters && <i className="ri-checkbox-circle-fill" style={{ fontSize: 13, verticalAlign: -2, marginRight: 3 }} />}
                      <strong>{selectedExportTcIds.size}</strong>
                      {hasActiveFilters
                        ? ` selected · Showing ${filteredTcs.length} result${filteredTcs.length !== 1 ? 's' : ''}${tcSearch ? ` for "${tcSearch}"` : ''}`
                        : ` test case${selectedExportTcIds.size !== 1 ? 's' : ''} ready to export`}
                    </span>
                    <span onClick={hasActiveFilters ? clearFilters : clearSelection}
                      style={{ fontSize: 11, cursor: 'pointer', opacity: 0.7 }}>
                      {hasActiveFilters ? 'Clear filters' : 'Clear selection'}
                    </span>
                  </div>
                )}

                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 56px 1fr 70px 56px', padding: '5px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', alignItems: 'center' }}>
                  <span>
                    <div onClick={() => isAllFilteredSelected || isSomeFilteredSelected ? clearSelection() : selectAllFiltered()} style={{ cursor: 'pointer' }}>
                      <Checkbox checked={isAllFilteredSelected} indeterminate={isSomeFilteredSelected} />
                    </div>
                  </span>
                  <span>ID</span>
                  <span>Title</span>
                  <span>Priority</span>
                  <span>Status</span>
                </div>

                {/* TC rows */}
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredTcs.length === 0 ? (
                    <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
                      {hasActiveFilters ? 'No test cases match your filters' : 'No test cases found'}
                    </div>
                  ) : filteredTcs.map(tc => {
                    const sel = selectedExportTcIds.has(tc.id);
                    return (
                      <div key={tc.id} onClick={() => toggleTc(tc.id)}
                        style={{ display: 'grid', gridTemplateColumns: '28px 56px 1fr 70px 56px', padding: '7px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center', fontSize: 12, cursor: 'pointer', background: sel ? '#EEF2FF' : 'white', transition: 'background .1s' }}>
                        <Checkbox checked={sel} />
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6366F1', fontWeight: 600 }}>{tc.custom_id || '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: sel ? '#6366F1' : '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                          <HighlightText text={tc.title} keyword={tcSearch} />
                        </span>
                        <PriorityBadge priority={tc.priority} />
                        <StatusPill status={tc.status} />
                      </div>
                    );
                  })}
                  {hasActiveFilters && filteredTcs.length < testCases.length && (
                    <div style={{ padding: '7px 20px', textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
                      Showing {filteredTcs.length} of {testCases.length} · Clear filters to see all
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Columns to Export */}
            <div style={S.section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={S.label}>Columns to Export</span>
                <button onClick={toggleAllColumns}
                  style={{ fontSize: 11, fontWeight: 500, color: '#6366F1', cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontFamily: 'inherit' }}>
                  {allNonReqChecked ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {ALL_COLUMNS.map(col => {
                  const checked = selectedColumns.has(col.key);
                  return (
                    <label key={col.key} onClick={() => !col.required && toggleColumn(col.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, color: checked || col.required ? '#334155' : '#94A3B8', cursor: col.required ? 'default' : 'pointer' }}>
                      <Checkbox checked={checked} disabled={col.required} />
                      <span>
                        {col.label}
                        {col.required && <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600, marginLeft: 4 }}>(Required)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>)}

          {/* ══ IMPORT TAB ══════════════════════════════════════════════════ */}
          {activeTab === 'import' && (
            <div style={{ padding: 20 }}>
              {importDone ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 64, height: 64, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <i className="ri-checkbox-circle-fill" style={{ fontSize: 32, color: '#6366F1' }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Import Complete!</h3>
                  <p style={{ fontSize: 14, color: '#64748B' }}>
                    <strong style={{ color: '#6366F1' }}>{importedCount}</strong> test case{importedCount !== 1 ? 's' : ''} imported successfully.
                    {failedCount > 0 && <span style={{ color: '#EF4444', marginLeft: 4 }}>({failedCount} failed)</span>}
                  </p>
                  <button onClick={onClose} style={{ marginTop: 20, padding: '10px 28px', background: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
                </div>
              ) : importing ? (
                <div style={{ padding: '20px 0' }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <i className="ri-loader-4-line animate-spin" style={{ fontSize: 24, color: '#6366F1' }} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Import in Progress...</h3>
                    <p style={{ fontSize: 13, color: '#64748B' }}>Processing chunk {currentChunk} / {totalChunks} &nbsp;·&nbsp; {importedCount} done</p>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                      <span>{importedCount} / {importPreview?.length ?? 0}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: 8, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#6366F1', borderRadius: 9999, width: `${progress}%`, transition: 'width 300ms' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>Large files are processed in chunks of {CHUNK_SIZE}.</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => { cancelRef.current = true; }}
                      style={{ padding: '6px 16px', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ri-stop-circle-line" /> Stop
                    </button>
                  </div>
                </div>
              ) : (<>
                {/* Title + formats */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>CSV / Excel File Import</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>
                    Supported formats:
                    {['.csv', '.xlsx', '.xls'].map(f => (
                      <span key={f} style={{ padding: '2px 8px', background: '#F1F5F9', borderRadius: 4, fontWeight: 600, fontSize: 10, color: '#64748B' }}>{f}</span>
                    ))}
                  </div>
                  <div>
                    {[
                      { icon: 'ri-magic-line',  text: <><strong>Title</strong>, <strong>Section</strong>, <strong>Steps</strong>, <strong>Expected Result</strong>, and <strong>Priority</strong> fields are auto-mapped</> },
                      { icon: 'ri-stack-line',   text: <>Files with <strong>10,000+ rows</strong> are processed in stable chunks of {CHUNK_SIZE}</> },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                        <i className={item.icon} style={{ fontSize: 14, color: '#6366F1', flexShrink: 0, marginTop: 1 }} />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dropzone / file info */}
                {!importFile ? (
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${dragOver ? '#6366F1' : '#CBD5E1'}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#EEF2FF' : '#F8FAFC', transition: 'all .2s' }}>
                    <i className="ri-upload-cloud-2-line" style={{ fontSize: 32, color: dragOver ? '#6366F1' : '#CBD5E1', display: 'block', marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: '#64748B' }}>
                      Drag &amp; drop or <span style={{ color: '#6366F1', fontWeight: 600 }}>click to select</span> a file
                    </p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} style={{ display: 'none' }} />
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, background: '#DCFCE7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={importFile.name.endsWith('.csv') ? 'ri-file-text-line' : 'ri-file-excel-2-line'} style={{ fontSize: 20, color: '#16A34A' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{importFile.name}</p>
                      <p style={{ fontSize: 11, color: '#64748B' }}>{(importFile.size / 1024).toFixed(1)} KB{totalRows > 0 && ` · ${totalRows} rows`}</p>
                    </div>
                    <button onClick={() => { setImportFile(null); setImportPreview(null); setImportErrors([]); setImportWarnings([]); setTotalRows(0); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }}>
                      <i className="ri-close-line" style={{ fontSize: 18 }} />
                    </button>
                  </div>
                )}

                {/* Errors */}
                {importErrors.length > 0 && (
                  <div style={{ marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 14 }}>
                    {importErrors.map((err, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <i className="ri-error-warning-line" style={{ color: '#EF4444', marginTop: 2, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: '#DC2626' }}>{err}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {importWarnings.length > 0 && (
                  <div style={{ marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
                      <i className="ri-alert-line" style={{ marginRight: 4 }} />Warnings ({importWarnings.length})
                    </p>
                    <div style={{ maxHeight: 96, overflowY: 'auto' }}>
                      {importWarnings.map((w, i) => <p key={i} style={{ fontSize: 11, color: '#B45309' }}>{w}</p>)}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {importPreview && importPreview.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        Preview — <span style={{ color: '#6366F1' }}>{importPreview.length} test case{importPreview.length !== 1 ? 's' : ''}</span>
                        {estimatedChunks > 1 && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 8 }}>(processed in {estimatedChunks} chunks)</span>}
                      </p>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Showing up to 5</span>
                    </div>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <tr>{['Title','Section','Priority','Steps'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(0, 5).map((tc, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0F172A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.title}</td>
                              <td style={{ padding: '8px 12px', color: '#64748B', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.folder || '-'}</td>
                              <td style={{ padding: '8px 12px' }}><PriorityBadge priority={tc.priority || 'medium'} /></td>
                              <td style={{ padding: '8px 12px', color: '#64748B', fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.steps ? tc.steps.split('\n')[0] : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.length > 5 && (
                        <div style={{ padding: '6px 12px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                          +{importPreview.length - 5} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>)}
            </div>
          )}
        </div>

        {/* ── Export Summary bar ──────────────────────────────────────────── */}
        {activeTab === 'export' && !importing && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #E2E8F0', background: noTcsSelected ? 'white' : exportReady ? '#ECFDF5' : '#F8FAFC', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: noTcsSelected ? '#F59E0B' : exportReady ? '#065F46' : '#64748B' }}>
            <i className={noTcsSelected ? 'ri-error-warning-line' : exportReady ? 'ri-checkbox-circle-fill' : 'ri-information-line'}
              style={{ fontSize: 14, color: noTcsSelected ? '#F59E0B' : exportReady ? '#10B981' : '#94A3B8' }} />
            {noTcsSelected
              ? 'No test cases selected — choose at least one TC to export'
              : <span><strong style={{ color: exportReady ? '#065F46' : '#334155' }}>{exportTargetCases.length}</strong> test cases · <strong style={{ color: exportReady ? '#065F46' : '#334155' }}>{selectedColumns.size}</strong> columns will be saved as a CSV file</span>
            }
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!importDone && !importing && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#F8FAFC', gap: 8 }}>
            <button onClick={() => { if (!importing) onClose(); }}
              style={{ padding: '8px 16px', border: '1px solid #E2E8F0', background: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            {activeTab === 'export' ? (
              <button onClick={handleExport}
                disabled={selectedColumns.size === 0 || exportTargetCases.length === 0}
                style={{ padding: '8px 16px', background: '#6366F1', color: 'white', border: '1px solid #6366F1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: exportTargetCases.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: selectedColumns.size === 0 || exportTargetCases.length === 0 ? 0.5 : 1, transition: 'all .15s' }}>
                <i className="ri-download-2-line" style={{ fontSize: 15 }} />
                Download CSV ({exportTargetCases.length})
              </button>
            ) : (
              <button onClick={handleImportConfirm}
                disabled={!importPreview || importPreview.length === 0}
                style={{ padding: '8px 16px', background: '#6366F1', color: 'white', border: '1px solid #6366F1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !importPreview || !importPreview.length ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: !importPreview || !importPreview.length ? 0.5 : 1 }}>
                <i className="ri-upload-2-line" style={{ fontSize: 15 }} />
                {importPreview ? `Start Import (${importPreview.length})` : 'Import'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
