/**
 * CloneFromProjectModal
 * Clone test cases from another project, preserving folder (suite → case → step) hierarchy.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ModalShell } from '../../../components/ModalShell';

interface Project {
  id: string;
  name: string;
  prefix?: string;
}

interface SourceTestCase {
  id: string;
  title: string;
  folder?: string;
  priority: string;
  description?: string;
  precondition?: string;
  steps?: string;
  expected_result?: string;
  is_automated?: boolean;
  tags?: string;
  lifecycle_status?: string;
}

interface CloneFromProjectModalProps {
  targetProjectId: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const CHUNK_SIZE = 100;

export default function CloneFromProjectModal({
  targetProjectId,
  onClose,
  onRefresh,
}: CloneFromProjectModalProps) {
  const [targetProjectPrefix, setTargetProjectPrefix] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sourceCases, setSourceCases] = useState<SourceTestCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderFilter, setFolderFilter] = useState<string>('__all__');
  const [searchQuery, setSearchQuery] = useState('');

  const [cloning, setCloning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clonedCount, setClonedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoadingProjects(true);
      const [{ data: target }, { data: list }] = await Promise.all([
        supabase.from('projects').select('prefix').eq('id', targetProjectId).maybeSingle(),
        supabase.from('projects').select('id, name, prefix').neq('id', targetProjectId).order('name'),
      ]);
      setTargetProjectPrefix(target?.prefix || undefined);
      setProjects(list || []);
      setLoadingProjects(false);
    })();
  }, [targetProjectId]);

  useEffect(() => {
    if (!selectedProjectId) { setSourceCases([]); return; }
    (async () => {
      setLoadingCases(true);
      setSelectedIds(new Set());
      setFolderFilter('__all__');
      setSearchQuery('');
      const { data } = await supabase
        .from('test_cases')
        .select('id, title, folder, priority, description, precondition, steps, expected_result, is_automated, tags, lifecycle_status')
        .eq('project_id', selectedProjectId)
        .order('folder', { ascending: true })
        .order('title', { ascending: true });
      setSourceCases(data || []);
      setLoadingCases(false);
    })();
  }, [selectedProjectId]);

  const folders = ['__all__', ...new Set(sourceCases.map(tc => tc.folder || '(No Folder)'))];

  const filtered = sourceCases.filter(tc => {
    const inFolder = folderFilter === '__all__' || (tc.folder || '(No Folder)') === folderFilter;
    const inSearch = !searchQuery || tc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return inFolder && inSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(tc => next.delete(tc.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(tc => next.add(tc.id));
        return next;
      });
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(tc => selectedIds.has(tc.id));

  const handleClone = async () => {
    if (selectedIds.size === 0) return;

    setCloning(true);
    setProgress(0);
    setClonedCount(0);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let maxNum = 0;
      const prefix = targetProjectPrefix;
      if (prefix) {
        const { data: existing } = await supabase
          .from('test_cases')
          .select('custom_id')
          .eq('project_id', targetProjectId)
          .not('custom_id', 'is', null);
        (existing || []).forEach((tc: { custom_id: string | null }) => {
          const m = tc.custom_id?.match(/-(\d+)$/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });
      }

      const toBeCopied = sourceCases.filter(tc => selectedIds.has(tc.id));

      const requiredFolders = [...new Set(toBeCopied.map(tc => tc.folder).filter((f): f is string => !!f && f.trim() !== ''))];
      if (requiredFolders.length > 0) {
        const { data: existingFolders } = await supabase
          .from('folders').select('name').eq('project_id', targetProjectId);
        const existingNames = new Set((existingFolders || []).map((f: { name: string }) => f.name));
        const toCreate = requiredFolders.filter(n => !existingNames.has(n));
        if (toCreate.length > 0) {
          await supabase.from('folders').insert(
            toCreate.map(name => ({ project_id: targetProjectId, name, icon: 'ri-folder-line', color: 'gray' }))
          );
        }
      }

      const chunks: SourceTestCase[][] = [];
      for (let i = 0; i < toBeCopied.length; i += CHUNK_SIZE) {
        chunks.push(toBeCopied.slice(i, i + CHUNK_SIZE));
      }

      let totalCloned = 0;
      let globalIdx = 0;

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const insertData = chunk.map((tc, idx) => ({
          project_id: targetProjectId,
          title: tc.title,
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

        const { data: inserted, error: insertError } = await supabase
          .from('test_cases').insert(insertData).select('id');

        if (insertError) throw insertError;

        totalCloned += inserted?.length ?? chunk.length;
        globalIdx += chunk.length;

        if (inserted && user) {
          await supabase.from('test_case_history').insert(
            inserted.map((tc: { id: string }) => ({
              test_case_id: tc.id,
              user_id: user.id,
              action_type: 'created',
            }))
          );
        }

        setClonedCount(totalCloned);
        setProgress(Math.round(((ci + 1) / chunks.length) * 100));
        await new Promise(r => setTimeout(r, 0));
      }

      setDone(true);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while cloning. Please try again.');
    } finally {
      setCloning(false);
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high':     return 'bg-orange-100 text-orange-700';
      case 'medium':   return 'bg-yellow-100 text-yellow-700';
      default:         return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <i className="ri-file-copy-line text-violet-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Clone from Another Project</h2>
              <p className="text-sm text-gray-500 mt-0.5">Copy test cases while preserving folder structure</p>
            </div>
          </div>
          <button onClick={onClose} disabled={cloning}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer disabled:opacity-40">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {done ? (
            /* Done */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-checkbox-circle-fill text-violet-500 text-4xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clone Complete!</h3>
              <p className="text-gray-600">
                <strong className="text-violet-600">{clonedCount} test cases</strong> have been cloned successfully.
              </p>
              <button onClick={onClose}
                className="mt-6 px-8 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-all font-semibold cursor-pointer">
                Close
              </button>
            </div>
          ) : cloning ? (
            /* In progress */
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-loader-4-line text-violet-500 text-3xl animate-spin"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Cloning in progress...</h3>
                <p className="text-sm text-gray-500">{clonedCount} / {selectedIds.size} completed</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-gray-500">
                  <span>{clonedCount} / {selectedIds.size}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Source project selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Source Project</label>
                {loadingProjects ? (
                  <div className="h-10 animate-pulse-bright rounded-lg" />
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Case list */}
              {selectedProjectId && (
                <>
                  {loadingCases ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 animate-pulse-bright rounded-lg" />
                      ))}
                    </div>
                  ) : sourceCases.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <i className="ri-inbox-line text-4xl mb-2 block"></i>
                      <p className="text-sm">No test cases found in this project.</p>
                    </div>
                  ) : (
                    <>
                      {/* Filter & search */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <i className="ri-search-line text-gray-400 text-sm"></i>
                          <input
                            type="text"
                            placeholder="Search cases..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none text-gray-700"
                          />
                        </div>
                        <select
                          value={folderFilter}
                          onChange={e => setFolderFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white focus:outline-none cursor-pointer"
                        >
                          {folders.map(f => (
                            <option key={f} value={f}>{f === '__all__' ? 'All Folders' : f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select all header */}
                      <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allFilteredSelected ? 'bg-violet-500 border-violet-500' : 'bg-white border-gray-300'}`}>
                            {allFilteredSelected && <i className="ri-check-line text-white text-xs"></i>}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            Select All ({filtered.length})
                          </span>
                        </label>
                        {selectedIds.size > 0 && (
                          <span className="text-sm font-semibold text-violet-600">
                            {selectedIds.size} selected
                          </span>
                        )}
                      </div>

                      {/* Case list */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-400">No results found.</div>
                        ) : (
                          filtered.map(tc => (
                            <div
                              key={tc.id}
                              onClick={() => toggleSelect(tc.id)}
                              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                                selectedIds.has(tc.id) ? 'bg-violet-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                selectedIds.has(tc.id) ? 'bg-violet-500 border-violet-500' : 'bg-white border-gray-300'
                              }`}>
                                {selectedIds.has(tc.id) && <i className="ri-check-line text-white text-xs"></i>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{tc.title}</p>
                                {tc.folder && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                    <i className="ri-folder-line"></i> {tc.folder}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityColor(tc.priority)}`}>
                                {tc.priority?.toUpperCase()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Error */}
                      {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                          <i className="ri-error-warning-line text-red-500 flex-shrink-0 mt-0.5"></i>
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      {/* Clone info */}
                      {selectedIds.size > 0 && (
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-700">
                          <i className="ri-information-line mr-1"></i>
                          <strong>{selectedIds.size} test {selectedIds.size === 1 ? 'case' : 'cases'}</strong> will be cloned into this project.
                          Folder structure will be preserved and cases will be added as <strong>Draft</strong>.
                          {targetProjectPrefix && (
                            <span> IDs will be assigned automatically as <strong>{targetProjectPrefix}-N</strong>.</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && !cloning && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap">
              Cancel
            </button>
            <button
              onClick={handleClone}
              disabled={selectedIds.size === 0}
              className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-all font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-file-copy-line"></i>
              {selectedIds.size > 0 ? `Clone ${selectedIds.size} ${selectedIds.size === 1 ? 'Case' : 'Cases'}` : 'Clone'}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
