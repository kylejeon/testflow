import { useState, useRef, useEffect } from 'react';
import { exportToTestRail, importFromTestRail } from '../../../utils/testRailExport';
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
  onImport: (testCases: Partial<TestCase>[]) => Promise<void>;
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

export default function ExportImportModal({
  testCases,
  selectedTestCaseIds,
  projectName,
  projectId,
  onImport,
  onClose,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('export');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [resolvedProjectName, setResolvedProjectName] = useState<string>(projectName || '');

  // 컬럼 선택 상태 (required 컬럼은 항상 true)
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map(c => c.key))
  );

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<TestCase>[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 마운트 시 DB에서 프로젝트 이름을 직접 조회 (가장 확실한 방법)
  useEffect(() => {
    const fetchProjectName = async () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // projectId가 있으면 DB에서 직접 조회
      if (projectId) {
        try {
          const { data } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .maybeSingle();
          if (data?.name && !uuidRegex.test(data.name.trim())) {
            setResolvedProjectName(data.name);
            return;
          }
        } catch {
          // 조회 실패 시 아래 fallback 사용
        }
      }

      // projectName prop이 유효하면 사용
      if (projectName && !uuidRegex.test(projectName.trim())) {
        setResolvedProjectName(projectName);
        return;
      }

      // 최후 fallback: URL에서 projectId 추출 후 조회
      const pathMatch = window.location.pathname.match(
        /\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      );
      if (pathMatch) {
        try {
          const { data } = await supabase
            .from('projects')
            .select('name')
            .eq('id', pathMatch[1])
            .maybeSingle();
          if (data?.name && !uuidRegex.test(data.name.trim())) {
            setResolvedProjectName(data.name);
            return;
          }
        } catch {
          // ignore
        }
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
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllColumns = () => {
    const nonRequired = ALL_COLUMNS.filter(c => !c.required).map(c => c.key);
    const allChecked = nonRequired.every(k => selectedColumns.has(k));
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (allChecked) {
        nonRequired.forEach(k => next.delete(k));
      } else {
        nonRequired.forEach(k => next.add(k));
      }
      return next;
    });
  };

  const handleExport = () => {
    exportToTestRail(exportTargetCases, resolvedProjectName, selectedColumns);
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setImportPreview(null);
    setImportErrors([]);
    setImportWarnings([]);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = importFromTestRail(text);
      setImportErrors(result.errors);
      setImportWarnings(result.warnings);
      if (result.success) {
        setImportPreview(result.data);
      } else {
        setImportPreview(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      setImportErrors(['Only CSV files are supported.']);
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.length === 0) return;
    try {
      setImporting(true);
      await onImport(importPreview);
      setImportedCount(importPreview.length);
      setImportDone(true);
    } catch (err) {
      setImportErrors(['An error occurred during import. Please try again.']);
    } finally {
      setImporting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const nonRequiredCount = ALL_COLUMNS.filter(c => !c.required).length;
  const checkedNonRequiredCount = ALL_COLUMNS.filter(c => !c.required && selectedColumns.has(c.key)).length;
  const allNonRequiredChecked = checkedNonRequiredCount === nonRequiredCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <i className="ri-file-transfer-line text-teal-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export / Import</h2>
              <p className="text-sm text-gray-500 mt-0.5">Export and import test cases in CSV format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
              activeTab === 'export'
                ? 'text-teal-600 border-teal-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <i className="ri-download-line mr-2"></i>
            Export
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportDone(false); }}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
              activeTab === 'import'
                ? 'text-teal-600 border-teal-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <i className="ri-upload-line mr-2"></i>
            Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── EXPORT TAB ── */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start gap-3">
                <i className="ri-information-line text-teal-600 text-lg mt-0.5 flex-shrink-0"></i>
                <div>
                  <p className="text-sm font-semibold text-teal-800 mb-1">Export as CSV</p>
                  <p className="text-sm text-teal-700">
                    The exported CSV file can be used directly with the <strong>Import Cases</strong> feature.
                    Select the columns you want to include below.
                  </p>
                </div>
              </div>

              {/* Export Scope */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Export Scope</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-teal-300 hover:bg-teal-50/30"
                    style={{ borderColor: exportScope === 'all' ? '#14b8a6' : '#e5e7eb', background: exportScope === 'all' ? '#f0fdfa' : '' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="w-4 h-4 text-teal-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">All Test Cases</p>
                      <p className="text-xs text-gray-500 mt-0.5">All test cases in the current project ({testCases.length} cases)</p>
                    </div>
                    <span className="text-sm font-bold text-teal-600">{testCases.length} cases</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                      selectedTestCaseIds.size === 0
                        ? 'opacity-40 cursor-not-allowed border-gray-200'
                        : 'cursor-pointer hover:border-teal-300 hover:bg-teal-50/30'
                    }`}
                    style={{
                      borderColor: exportScope === 'selected' && selectedTestCaseIds.size > 0 ? '#14b8a6' : '#e5e7eb',
                      background: exportScope === 'selected' && selectedTestCaseIds.size > 0 ? '#f0fdfa' : '',
                    }}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      value="selected"
                      checked={exportScope === 'selected'}
                      onChange={() => setExportScope('selected')}
                      disabled={selectedTestCaseIds.size === 0}
                      className="w-4 h-4 text-teal-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Selected Test Cases Only</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedTestCaseIds.size === 0
                          ? 'Please select test cases from the list first'
                          : `${selectedTestCaseIds.size} selected test cases`}
                      </p>
                    </div>
                    {selectedTestCaseIds.size > 0 && (
                      <span className="text-sm font-bold text-teal-600">{selectedTestCaseIds.size} cases</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Columns to Export */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Columns to Export
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({selectedColumns.size} / {ALL_COLUMNS.length} selected)
                    </span>
                  </label>
                  <button
                    onClick={toggleAllColumns}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    {allNonRequiredChecked ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_COLUMNS.map(col => {
                    const checked = selectedColumns.has(col.key);
                    return (
                      <label
                        key={col.key}
                        onClick={() => !col.required && toggleColumn(col.key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all select-none ${
                          col.required
                            ? 'cursor-not-allowed border-teal-200 bg-teal-50/60'
                            : checked
                            ? 'cursor-pointer border-teal-300 bg-teal-50/40 hover:bg-teal-50'
                            : 'cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {col.required ? (
                            <div className="w-4 h-4 rounded bg-teal-500 flex items-center justify-center">
                              <i className="ri-check-line text-white text-xs"></i>
                            </div>
                          ) : (
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                checked
                                  ? 'bg-teal-500 border-teal-500'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              {checked && <i className="ri-check-line text-white text-xs"></i>}
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium flex-1 ${checked || col.required ? 'text-gray-800' : 'text-gray-400'}`}>
                          {col.label}
                        </span>
                        {col.required && (
                          <span className="text-xs text-teal-500 font-semibold whitespace-nowrap">Required</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Export Summary</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong className="text-teal-600">{exportTargetCases.length} test cases</strong>
                      {' · '}
                      <strong className="text-teal-600">{selectedColumns.size} columns</strong>
                      {' '}will be saved as a CSV file.
                    </p>
                  </div>
                  <i className="ri-file-excel-2-line text-4xl text-green-500"></i>
                </div>
              </div>
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {importDone ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-checkbox-circle-fill text-teal-500 text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
                  <p className="text-gray-600">
                    Successfully imported <strong className="text-teal-600">{importedCount} test cases</strong>.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <i className="ri-information-line text-amber-600 text-lg mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 mb-1">Import CSV File</p>
                      <p className="text-sm text-amber-700">
                        Upload an exported CSV file.
                        Fields such as Title, Section, Steps, Expected Result, and Priority will be mapped automatically.
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
                        dragOver
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-upload-line text-3xl text-gray-400"></i>
                      </div>
                      <p className="text-base font-semibold text-gray-700 mb-1">Drag & drop or click to upload a CSV file</p>
                      <p className="text-sm text-gray-500">Only compatible .csv files are supported</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-file-excel-2-line text-green-600 text-xl"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{importFile.name}</p>
                        <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportPreview(null);
                          setImportErrors([]);
                          setImportWarnings([]);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    </div>
                  )}

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

                  {importWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">
                        <i className="ri-alert-line mr-1"></i>
                        Warnings ({importWarnings.length})
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {importWarnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-700">{w}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {importPreview && importPreview.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-700">
                          Preview — <span className="text-teal-600">{importPreview.length} test cases</span>
                        </p>
                        <span className="text-xs text-gray-500">Showing up to 5</span>
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
                            +{importPreview.length - 5} more...
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
        {!importDone && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            {activeTab === 'export' ? (
              <button
                onClick={handleExport}
                disabled={selectedColumns.size === 0}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ri-download-line"></i>
                Download CSV ({exportTargetCases.length} cases)
              </button>
            ) : (
              <button
                onClick={handleImportConfirm}
                disabled={!importPreview || importPreview.length === 0 || importing}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Importing...
                  </>
                ) : (
                  <>
                    <i className="ri-upload-line"></i>
                    {importPreview ? `Import ${importPreview.length} cases` : 'Import'}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
