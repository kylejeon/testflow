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
  { key: 'References',          label: 'References',          required: false },
];

// 청크 단위 크기 (Supabase 권장 배치 상한)
const CHUNK_SIZE = 200;

export default function ExportImportModal({
  testCases,
  selectedTestCaseIds,
  projectName,
  projectId,
  onRefresh,
  onClose,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('export');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectName || '');

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  // Import 상태
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportedTestCase[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 비동기 청크 처리 상태
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [progress, setProgress] = useState(0); // 0~100
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const cancelRef = useRef(false);

  // 프로젝트 이름 조회
  useEffect(() => {
    const fetchProjectName = async () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (projectId) {
        try {
          const { data } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
          if (data?.name && !uuidRegex.test(data.name.trim())) { setResolvedProjectName(data.name); return; }
        } catch { /* fallthrough */ }
      }
      if (projectName && !uuidRegex.test(projectName.trim())) { setResolvedProjectName(projectName); return; }
      const pathMatch = window.location.pathname.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (pathMatch) {
        try {
          const { data } = await supabase.from('projects').select('name').eq('id', pathMatch[1]).maybeSingle();
          if (data?.name && !uuidRegex.test(data.name.trim())) { setResolvedProjectName(data.name); return; }
        } catch { /* ignore */ }
      }
      setResolvedProjectName('project');
    };
    fetchProjectName();
  }, [projectId, projectName]);

  const exportTargetCases =
    exportScope === 'selected' && selectedTestCaseIds.size > 0
      ? testCases.filter(tc => selectedTestCaseIds.has(tc.id))
      : testCases;

  const toggleColumn = (key: string) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col?.required) return;
    setSelectedColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAllColumns = () => {
    const nonRequired = ALL_COLUMNS.filter(c => !c.required).map(c => c.key);
    const allChecked = nonRequired.every(k => selectedColumns.has(k));
    setSelectedColumns(prev => {
      const next = new Set(prev);
      allChecked ? nonRequired.forEach(k => next.delete(k)) : nonRequired.forEach(k => next.add(k));
      return next;
    });
  };

  const handleExport = () => {
    exportToTestRail(exportTargetCases, resolvedProjectName, selectedColumns);
  };

  // 파일 파싱
  const handleFileSelect = useCallback((file: File) => {
    setImportFile(file);
    setImportPreview(null);
    setImportErrors([]);
    setImportWarnings([]);
    setImportDone(false);
    setProgress(0);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const result = parseExcelImport(buffer);
        setImportErrors(result.errors);
        setImportWarnings(result.warnings);
        setTotalRows(result.totalRows);
        setImportPreview(result.success ? result.data : null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseCSVImport(text);
        setImportErrors(result.errors);
        setImportWarnings(result.warnings);
        setTotalRows(result.totalRows);
        setImportPreview(result.success ? result.data : null);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      handleFileSelect(file);
    } else {
      setImportErrors(['CSV 또는 Excel(.xlsx, .xls) 파일만 지원합니다.']);
    }
  };

  // 청크 기반 비동기 Import
  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.length === 0 || !projectId) return;

    cancelRef.current = false;
    setImporting(true);
    setProgress(0);
    setImportedCount(0);
    setFailedCount(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 프로젝트 prefix 조회
      const { data: projectData } = await supabase
        .from('projects').select('prefix').eq('id', projectId).maybeSingle();
      const prefix = projectData?.prefix as string | null;

      // 현재 최대 번호 조회
      let maxNum = 0;
      if (prefix) {
        const { data: existingCases } = await supabase
          .from('test_cases').select('custom_id').eq('project_id', projectId).not('custom_id', 'is', null);
        (existingCases || []).forEach((tc: { custom_id: string | null }) => {
          const match = tc.custom_id?.match(/-(\d+)$/);
          if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
        });
      }

      // 폴더 자동 생성
      const requiredFolderNames = [...new Set(
        importPreview.map(tc => tc.folder).filter((f): f is string => !!f && f.trim() !== '')
      )];
      if (requiredFolderNames.length > 0) {
        const { data: existingFolders } = await supabase
          .from('folders').select('name').eq('project_id', projectId);
        const existingNames = new Set((existingFolders || []).map((f: { name: string }) => f.name));
        const toCreate = requiredFolderNames.filter(n => !existingNames.has(n));
        if (toCreate.length > 0) {
          await supabase.from('folders').insert(
            toCreate.map(name => ({ project_id: projectId, name, icon: 'ri-folder-line', color: 'gray' }))
          );
        }
      }

      // 청크 분할
      const chunks: ImportedTestCase[][] = [];
      for (let i = 0; i < importPreview.length; i += CHUNK_SIZE) {
        chunks.push(importPreview.slice(i, i + CHUNK_SIZE));
      }
      setTotalChunks(chunks.length);

      let totalInserted = 0;
      let totalFailed = 0;
      let globalIdx = 0;

      for (let ci = 0; ci < chunks.length; ci++) {
        if (cancelRef.current) break;

        setCurrentChunk(ci + 1);

        const chunk = chunks[ci];
        const insertData = chunk.map((tc, idx) => ({
          project_id: projectId,
          title: tc.title || 'Untitled',
          description: tc.description || null,
          precondition: tc.precondition || null,
          priority: tc.priority || 'medium',
          status: 'untested',
          is_automated: tc.is_automated || false,
          folder: tc.folder || null,
          tags: tc.tags || null,
          steps: tc.steps || null,
          expected_result: tc.expected_result || null,
          assignee: null,
          created_by: user?.id || null,
          lifecycle_status: 'draft',
          ...(prefix ? { custom_id: `${prefix}-${maxNum + globalIdx + idx + 1}` } : {}),
        }));

        const { data: inserted, error } = await supabase
          .from('test_cases').insert(insertData).select('id');

        if (error) {
          totalFailed += chunk.length;
        } else {
          totalInserted += inserted?.length ?? chunk.length;
          // 히스토리 기록 (실패해도 무시)
          if (inserted && user) {
            await supabase.from('test_case_history').insert(
              inserted.map((tc: { id: string }) => ({
                test_case_id: tc.id, user_id: user.id, action_type: 'created',
              }))
            ).then(() => {/* fire-and-forget */});
          }
        }

        globalIdx += chunk.length;
        setImportedCount(totalInserted);
        setFailedCount(totalFailed);
        setProgress(Math.round(((ci + 1) / chunks.length) * 100));

        // 다음 청크 전 짧은 양보 (UI 업데이트)
        await new Promise(r => setTimeout(r, 0));
      }

      setImportDone(true);
      // 부모 목록 새로고침
      if (onRefresh) await onRefresh();
    } catch (err) {
      setImportErrors(['Import 중 오류가 발생했습니다. 다시 시도해주세요.']);
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high':     return 'bg-orange-100 text-orange-700';
      case 'medium':   return 'bg-yellow-100 text-yellow-700';
      default:         return 'bg-gray-100 text-gray-700';
    }
  };

  const nonRequiredCount = ALL_COLUMNS.filter(c => !c.required).length;
  const checkedNonRequiredCount = ALL_COLUMNS.filter(c => !c.required && selectedColumns.has(c.key)).length;
  const allNonRequiredChecked = checkedNonRequiredCount === nonRequiredCount;

  const estimatedChunks = importPreview ? Math.ceil(importPreview.length / CHUNK_SIZE) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <i className="ri-file-transfer-line text-indigo-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export / Import</h2>
              <p className="text-sm text-gray-500 mt-0.5">CSV 및 Excel 파일로 테스트 케이스를 내보내고 가져옵니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {(['export', 'import'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { if (!importing) { setActiveTab(tab); setImportDone(false); } }}
              className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <i className={`${tab === 'export' ? 'ri-download-line' : 'ri-upload-line'} mr-2`}></i>
              {tab === 'export' ? 'Export' : 'Import'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── EXPORT TAB ── */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
                <i className="ri-information-line text-indigo-600 text-lg mt-0.5 flex-shrink-0"></i>
                <div>
                  <p className="text-sm font-semibold text-indigo-800 mb-1">CSV로 내보내기</p>
                  <p className="text-sm text-indigo-700">
                    내보낸 CSV는 <strong>Import Cases</strong> 기능으로 다시 가져올 수 있습니다.
                    포함할 컬럼을 선택해주세요.
                  </p>
                </div>
              </div>

              {/* Export Scope */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">내보내기 범위</label>
                <div className="space-y-3">
                  {[
                    { value: 'all' as const, label: '전체 테스트 케이스', desc: `현재 프로젝트의 모든 케이스 (${testCases.length}개)`, count: testCases.length },
                    { value: 'selected' as const, label: '선택된 테스트 케이스', desc: selectedTestCaseIds.size === 0 ? '목록에서 케이스를 먼저 선택해주세요' : `${selectedTestCaseIds.size}개 선택됨`, count: selectedTestCaseIds.size, disabled: selectedTestCaseIds.size === 0 },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                        opt.disabled ? 'opacity-40 cursor-not-allowed border-gray-200' : 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                      style={{
                        borderColor: exportScope === opt.value && !opt.disabled ? '#6366F1' : '#e5e7eb',
                        background: exportScope === opt.value && !opt.disabled ? '#f0fdfa' : '',
                      }}
                    >
                      <input type="radio" name="exportScope" value={opt.value} checked={exportScope === opt.value}
                        onChange={() => setExportScope(opt.value)} disabled={opt.disabled}
                        className="w-4 h-4 text-indigo-600 cursor-pointer" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                      {opt.count > 0 && (
                        <span className="text-sm font-bold text-indigo-600">{opt.count}개</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Columns */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    내보낼 컬럼
                    <span className="ml-2 text-xs font-normal text-gray-400">({selectedColumns.size} / {ALL_COLUMNS.length} 선택)</span>
                  </label>
                  <button onClick={toggleAllColumns}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap transition-colors">
                    {allNonRequiredChecked ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_COLUMNS.map(col => {
                    const checked = selectedColumns.has(col.key);
                    return (
                      <label key={col.key} onClick={() => !col.required && toggleColumn(col.key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all select-none ${
                          col.required ? 'cursor-not-allowed border-indigo-200 bg-indigo-50/60'
                            : checked ? 'cursor-pointer border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50'
                            : 'cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {col.required ? (
                            <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center">
                              <i className="ri-check-line text-white text-xs"></i>
                            </div>
                          ) : (
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'}`}>
                              {checked && <i className="ri-check-line text-white text-xs"></i>}
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium flex-1 ${checked || col.required ? 'text-gray-800' : 'text-gray-400'}`}>{col.label}</span>
                        {col.required && <span className="text-xs text-indigo-500 font-semibold whitespace-nowrap">필수</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">내보내기 요약</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong className="text-indigo-600">{exportTargetCases.length}개 테스트 케이스</strong>
                    {' · '}
                    <strong className="text-indigo-600">{selectedColumns.size}개 컬럼</strong>
                    {' '}CSV 파일로 저장됩니다.
                  </p>
                </div>
                <i className="ri-file-excel-2-line text-4xl text-green-500"></i>
              </div>
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {importDone ? (
                /* ── 완료 화면 ── */
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-checkbox-circle-fill text-indigo-500 text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Import 완료!</h3>
                  <p className="text-gray-600">
                    <strong className="text-indigo-600">{importedCount}개</strong> 테스트 케이스를 성공적으로 가져왔습니다.
                    {failedCount > 0 && (
                      <span className="text-red-600 ml-1">({failedCount}개 실패)</span>
                    )}
                  </p>
                  <button onClick={onClose}
                    className="mt-6 px-8 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap">
                    닫기
                  </button>
                </div>
              ) : importing ? (
                /* ── 진행 중 화면 ── */
                <div className="py-8 space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-loader-4-line text-indigo-500 text-3xl animate-spin"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Import 진행 중...</h3>
                    <p className="text-sm text-gray-500">
                      청크 {currentChunk} / {totalChunks} 처리 중 &nbsp;·&nbsp;
                      {importedCount}개 완료
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span>{importedCount} / {importPreview?.length ?? 0}개</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      대용량 파일은 청크({CHUNK_SIZE}개) 단위로 처리됩니다.
                    </p>
                  </div>

                  <div className="text-center">
                    <button onClick={handleCancel}
                      className="px-5 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all font-medium cursor-pointer text-sm">
                      <i className="ri-stop-circle-line mr-1"></i>
                      중단
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 파일 선택 / 미리보기 ── */
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <i className="ri-information-line text-amber-600 text-lg mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 mb-1">CSV / Excel 파일 Import</p>
                      <p className="text-sm text-amber-700">
                        <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> 파일을 지원합니다.
                        Title, Section, Steps, Expected Result, Priority 필드가 자동으로 매핑됩니다.
                        <br />
                        <span className="text-amber-600 font-medium">10,000개 이상의 대용량 파일도 청크({CHUNK_SIZE}개) 단위로 안정적으로 처리됩니다.</span>
                      </p>
                    </div>
                  </div>

                  {!importFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-upload-line text-3xl text-gray-400"></i>
                      </div>
                      <p className="text-base font-semibold text-gray-700 mb-1">
                        파일을 드래그 & 드롭하거나 클릭하여 선택
                      </p>
                      <p className="text-sm text-gray-500">지원 형식: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong></p>
                      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls"
                        onChange={handleFileInputChange} className="hidden" />
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className={`text-green-600 text-xl ${importFile.name.endsWith('.csv') ? 'ri-file-text-line' : 'ri-file-excel-2-line'}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{importFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(importFile.size / 1024).toFixed(1)} KB
                          {totalRows > 0 && ` · ${totalRows}행`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setImportFile(null); setImportPreview(null);
                          setImportErrors([]); setImportWarnings([]); setTotalRows(0);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer">
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    </div>
                  )}

                  {/* 에러 */}
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
                      {importErrors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <i className="ri-error-warning-line text-red-500 mt-0.5 flex-shrink-0"></i>
                          <p className="text-sm text-red-700">{err}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 경고 */}
                  {importWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">
                        <i className="ri-alert-line mr-1"></i>
                        경고 ({importWarnings.length}개)
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {importWarnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-700">{w}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 미리보기 + 청크 안내 */}
                  {importPreview && importPreview.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-700">
                          미리보기 — <span className="text-indigo-600">{importPreview.length}개 테스트 케이스</span>
                          {estimatedChunks > 1 && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              ({estimatedChunks}개 청크로 처리됨)
                            </span>
                          )}
                        </p>
                        <span className="text-xs text-gray-500">최대 5개 표시</span>
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Section</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Steps</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importPreview.slice(0, 5).map((tc, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{tc.title}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{tc.folder || '-'}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(tc.priority || '')}`}>
                                    {(tc.priority || 'medium').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                                  {tc.steps ? tc.steps.split('\n')[0] : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importPreview.length > 5 && (
                          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                            +{importPreview.length - 5}개 더...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!importDone && !importing && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap">
              취소
            </button>
            {activeTab === 'export' ? (
              <button onClick={handleExport} disabled={selectedColumns.size === 0}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <i className="ri-download-line"></i>
                CSV 다운로드 ({exportTargetCases.length}개)
              </button>
            ) : (
              <button onClick={handleImportConfirm}
                disabled={!importPreview || importPreview.length === 0}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <i className="ri-upload-line"></i>
                {importPreview ? `${importPreview.length}개 Import 시작` : 'Import'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
