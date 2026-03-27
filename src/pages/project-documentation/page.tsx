import PageLoader from '../../components/PageLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { Avatar } from '../../components/Avatar';
import { useToast, ToastContainer } from '../../components/Toast';

interface DocumentItem {
  id: string;
  project_id: string;
  type: 'link' | 'file';
  title: string;
  url?: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  // Derived from description JSON parsing:
  category: string;
  descText: string;
  folderParent?: string; // populated for __folder__ items
}

// ── Category helpers ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',          label: 'All Documents',   icon: 'ri-folder-fill', color: '#6366F1' },
  { id: 'requirements', label: 'Requirements',     icon: 'ri-folder-fill', color: '#D97706' },
  { id: 'test-plans',   label: 'Test Plans',       icon: 'ri-folder-fill', color: '#2563EB' },
  { id: 'reports',      label: 'Reports',          icon: 'ri-folder-fill', color: '#7C3AED' },
  { id: 'specs',        label: 'Specs',            icon: 'ri-folder-fill', color: '#16A34A' },
  { id: 'link',         label: 'External Links',   icon: 'ri-folder-fill', color: '#64748B' },
];

const CATEGORY_INFO: Record<string, { bg: string; color: string; icon: string; label: string; badgeBg: string; badgeColor: string }> = {
  requirements: { bg: '#FEF3C7', color: '#D97706', icon: 'ri-file-text-fill',   label: 'Requirement', badgeBg: '#FEF3C7', badgeColor: '#92400E' },
  'test-plans':  { bg: '#DBEAFE', color: '#2563EB', icon: 'ri-route-fill',       label: 'Test Plan',   badgeBg: '#DBEAFE', badgeColor: '#1E40AF' },
  reports:       { bg: '#EDE9FE', color: '#7C3AED', icon: 'ri-bar-chart-fill',   label: 'Report',      badgeBg: '#EDE9FE', badgeColor: '#5B21B6' },
  specs:         { bg: '#F0FDF4', color: '#16A34A', icon: 'ri-code-s-slash-fill',label: 'Spec',        badgeBg: '#F0FDF4', badgeColor: '#166534' },
  link:          { bg: '#F1F5F9', color: '#64748B', icon: 'ri-links-line',       label: 'Link',        badgeBg: '#F1F5F9', badgeColor: '#475569' },
  file:          { bg: '#F1F5F9', color: '#64748B', icon: 'ri-file-fill',        label: 'File',        badgeBg: '#F1F5F9', badgeColor: '#475569' },
};

const parseDescription = (description?: string | null, type?: string): { category: string; text: string; parent?: string } => {
  const defaultCat = type === 'link' ? 'link' : 'file';
  if (!description) return { category: defaultCat, text: '' };
  try {
    const p = JSON.parse(description);
    if (typeof p === 'object' && p !== null && 'cat' in p) {
      return { category: p.cat || defaultCat, text: p.text || '', parent: p.parent };
    }
  } catch {}
  return { category: defaultCat, text: description };
};

const encodeDescription = (category: string, text: string): string => {
  return JSON.stringify({ cat: category, text: text.trim() });
};

const getRelativeDate = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diffMs / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const getFileExt = (doc: DocumentItem): string => {
  if (doc.type === 'link') return '';
  if (doc.file_name) {
    const parts = doc.file_name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toUpperCase() : '';
  }
  return '';
};

// ── Main Component ────────────────────────────────────────────────
export default function ProjectDocumentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();

  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [customFolders, setCustomFolders] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);

  // Tab & folder state
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Selection state
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Modal state
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>('');

  // Upload modal state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('file');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add link modal state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkCategory, setLinkCategory] = useState('link');
  const [linkSaving, setLinkSaving] = useState(false);

  // New folder modal state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('requirements');
  const [folderSaving, setFolderSaving] = useState(false);

  useEffect(() => {
    if (id) { fetchData(); fetchUserProfile(); }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        });
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: projectData, error: projectError } = await supabase.from('projects').select('*').eq('id', id).single();
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: docsData, error: docsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      const allItems = (docsData || []).map(doc => {
        const { category, text, parent: fp } = parseDescription(doc.description, doc.type);
        return { ...doc, category, descText: text, folderParent: fp };
      });

      setCustomFolders(allItems.filter(d => d.category === '__folder__'));
      setDocuments(allItems.filter(d => d.category !== '__folder__'));
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────
  const getTabCount = (tab: string) => {
    if (tab === 'all') return documents.length;
    return documents.filter(d => d.category === tab).length;
  };

  const filteredDocs = documents
    .filter(doc => {
      if (activeTab !== 'all' && doc.category !== activeTab) return false;
      if (selectedFolder !== 'all' && doc.category !== selectedFolder) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || doc.descText.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'name') return a.title.localeCompare(b.title);
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const folderCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all' ? documents.length : documents.filter(d => d.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  // ── Handlers ──────────────────────────────────────────────────────
  const toggleSelect = (docId: string) => {
    const next = new Set(selectedDocs);
    next.has(docId) ? next.delete(docId) : next.add(docId);
    setSelectedDocs(next);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const { error } = await supabase.from('project_documents').delete().eq('id', docId);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDocs(prev => { const n = new Set(prev); n.delete(docId); return n; });
    } catch (e) {
      console.error('삭제 오류:', e);
      showToast('Failed to delete document.', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedDocs.size} selected document(s)?`)) return;
    try {
      const ids = Array.from(selectedDocs);
      const { error } = await supabase.from('project_documents').delete().in('id', ids);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => !selectedDocs.has(d.id)));
      setSelectedDocs(new Set());
      showToast(`${ids.length} document(s) deleted.`, 'success');
    } catch (e) {
      console.error('삭제 오류:', e);
      showToast('Failed to delete documents.', 'error');
    }
  };

  const handleMoveSelected = async () => {
    if (!moveTarget) return;
    try {
      const ids = Array.from(selectedDocs);
      await Promise.all(ids.map(docId => {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return Promise.resolve();
        const newDesc = encodeDescription(moveTarget, doc.descText);
        return supabase.from('project_documents').update({ description: newDesc }).eq('id', docId);
      }));
      setDocuments(prev => prev.map(d =>
        selectedDocs.has(d.id)
          ? { ...d, category: moveTarget, description: encodeDescription(moveTarget, d.descText) }
          : d
      ));
      setSelectedDocs(new Set());
      setShowMoveModal(false);
      setMoveTarget('');
      showToast('Documents moved successfully.', 'success');
    } catch (e) {
      console.error('이동 오류:', e);
      showToast('Failed to move documents.', 'error');
    }
  };

  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) { showToast('Title and URL are required.', 'warning'); return; }
    try {
      setLinkSaving(true);
      const { error } = await supabase.from('project_documents').insert({
        project_id: id,
        type: 'link',
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        description: encodeDescription(linkCategory, ''),
      });
      if (error) throw error;
      setLinkUrl(''); setLinkTitle(''); setLinkCategory('link');
      setShowAddLinkModal(false);
      fetchData();
      showToast('Link added successfully.', 'success');
    } catch (e) {
      console.error('링크 추가 오류:', e);
      showToast('Failed to add link.', 'error');
    } finally {
      setLinkSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) { showToast('Title and file are required.', 'warning'); return; }
    try {
      setUploading(true);
      setUploadProgress(20);
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('project-documents').upload(fileName, uploadFile);
      if (uploadError) throw uploadError;
      setUploadProgress(70);
      const { data: urlData } = supabase.storage.from('project-documents').getPublicUrl(fileName);
      const { error: insertError } = await supabase.from('project_documents').insert({
        project_id: id,
        type: 'file',
        title: uploadTitle.trim(),
        file_name: uploadFile.name,
        file_url: urlData.publicUrl,
        file_size: uploadFile.size,
        description: encodeDescription(uploadCategory, ''),
      });
      if (insertError) throw insertError;
      setUploadProgress(100);
      setUploadFile(null); setUploadTitle(''); setUploadCategory('file');
      setShowUploadModal(false);
      fetchData();
      showToast('File uploaded successfully.', 'success');
    } catch (e) {
      console.error('업로드 오류:', e);
      showToast('Upload failed.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Folders are stored as type:'file' with cat:'__folder__' to avoid DB type constraint
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) { showToast('Folder name is required.', 'warning'); return; }
    if (!newFolderParent) { showToast('Please select a parent folder.', 'warning'); return; }
    try {
      setFolderSaving(true);
      const { error } = await supabase.from('project_documents').insert({
        project_id: id,
        type: 'file',
        title: newFolderName.trim(),
        description: JSON.stringify({ cat: '__folder__', parent: newFolderParent, text: '' }),
      });
      if (error) throw error;
      setNewFolderName(''); setNewFolderParent('requirements');
      setShowNewFolderModal(false);
      fetchData();
      showToast('Folder created successfully.', 'success');
    } catch (e) {
      console.error('폴더 생성 오류:', e);
      showToast('Failed to create folder.', 'error');
    } finally {
      setFolderSaving(false);
    }
  };

  if (loading) return <PageLoader fullScreen />;

  const catInfo = (cat: string) => CATEGORY_INFO[cat] || CATEGORY_INFO['file'];

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />

        {/* ── Subtab Row ── */}
        <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
          {[
            { key: 'all',          label: 'All',          icon: 'ri-file-list-fill', iconColor: '#6366F1' },
            { key: 'requirements', label: 'Requirements', icon: 'ri-alert-fill',     iconColor: '#F59E0B' },
            { key: 'test-plans',   label: 'Test Plans',   icon: 'ri-route-fill',     iconColor: '#3B82F6' },
            { key: 'reports',      label: 'Reports',      icon: 'ri-bar-chart-fill', iconColor: '#8B5CF6' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedFolder(tab.key); }}
              className={`flex items-center gap-[0.3125rem] h-full px-[0.875rem] text-[0.8125rem] font-medium relative border-b-[2.5px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key ? 'text-[#6366F1] border-[#6366F1]' : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
              }`}
            >
              <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold ${
                activeTab === tab.key ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}>{getTabCount(tab.key)}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="flex items-center gap-[0.3125rem] px-[0.75rem] py-[0.3125rem] bg-white border border-[#E2E8F0] text-[#475569] rounded-[0.375rem] text-[0.75rem] font-semibold hover:bg-[#F8FAFC] transition-all cursor-pointer whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <i className="ri-link text-[0.875rem]" />Add Link
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-[0.3125rem] px-[0.75rem] py-[0.3125rem] bg-[#6366F1] text-white rounded-[0.375rem] text-[0.75rem] font-semibold hover:bg-[#4F46E5] transition-colors cursor-pointer whitespace-nowrap shadow-[0_1px_3px_rgba(99,102,241,0.3)]"
            >
              <i className="ri-upload-2-line text-[0.875rem]" />Upload
            </button>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Folder Sidebar */}
          <div className="w-[232px] min-w-[232px] bg-white border-r border-[#E2E8F0] flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-[0.875rem] py-3 border-b border-[#E2E8F0] flex items-center justify-between flex-shrink-0">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8]">Folders</span>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-1 text-[0.6875rem] font-semibold text-[#6366F1] px-2 py-[0.1875rem] rounded hover:bg-[#EEF2FF] transition-colors cursor-pointer border-none bg-none"
              >
                <i className="ri-add-line text-[0.8125rem]" />New Folder
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1.5">
              {CATEGORIES.map(cat => (
                <div key={cat.id}>
                  <button
                    onClick={() => { setSelectedFolder(cat.id); setActiveTab(cat.id === 'link' ? 'all' : cat.id); }}
                    className={`w-full flex items-center gap-1.5 px-[0.875rem] py-[0.4375rem] text-[0.8125rem] rounded-r-md mr-1.5 transition-colors cursor-pointer text-left ${
                      selectedFolder === cat.id
                        ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold'
                        : 'text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className={`${cat.icon} text-base`} style={{ color: selectedFolder === cat.id ? '#6366F1' : cat.color }} />
                    <span className="flex-1 min-w-0 truncate">{cat.label}</span>
                    <span className={`text-[0.6875rem] font-medium ${selectedFolder === cat.id ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>
                      {folderCounts[cat.id] ?? 0}
                    </span>
                  </button>
                  {/* Sub-folders under this category */}
                  {customFolders
                    .filter(f => f.folderParent === cat.id)
                    .map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedFolder(sub.id)}
                        className={`w-full flex items-center gap-1.5 pl-[2rem] pr-[0.875rem] py-[0.375rem] text-[0.75rem] rounded-r-md mr-1.5 transition-colors cursor-pointer text-left ${
                          selectedFolder === sub.id
                            ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold'
                            : 'text-[#475569] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <i className="ri-folder-line text-sm text-[#94A3B8]" />
                        <span className="flex-1 min-w-0 truncate">{sub.title}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Document List Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Toolbar */}
            <div className="px-4 py-[0.625rem] border-b border-[#E2E8F0] flex items-center gap-1.5 bg-white flex-shrink-0">
              <div className="flex-1 flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-[0.625rem] py-[0.3125rem]">
                <i className="ri-search-line text-[0.875rem] text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="border-none bg-transparent outline-none text-[0.8125rem] text-[#1E293B] placeholder-[#94A3B8] flex-1 min-w-0 font-[inherit]"
                />
              </div>
              <button className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.3125rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap">
                <i className="ri-filter-3-line text-[0.8125rem] text-[#94A3B8]" />Filters
              </button>
              <button
                onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : o === 'oldest' ? 'name' : 'newest')}
                className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.3125rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                <i className="ri-sort-desc text-[0.8125rem] text-[#94A3B8]" />
                Sort: {sortOrder === 'newest' ? 'Newest' : sortOrder === 'oldest' ? 'Oldest' : 'Name'}
              </button>
            </div>

            {/* Selection Action Bar */}
            {selectedDocs.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#EEF2FF] border-b border-[#C7D2FE] flex-shrink-0">
                <span className="text-[0.75rem] font-semibold text-[#4338CA]">{selectedDocs.size} selected</span>
                <button
                  onClick={() => setShowMoveModal(true)}
                  className="flex items-center gap-1 text-[0.75rem] font-semibold px-[0.625rem] py-1 rounded-md border border-[#C7D2FE] bg-white text-[#4338CA] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all cursor-pointer"
                >
                  <i className="ri-folder-transfer-line text-[0.8125rem]" />Move to...
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 text-[0.75rem] font-semibold px-[0.625rem] py-1 rounded-md border border-[#FECACA] bg-white text-[#DC2626] hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444] transition-all cursor-pointer"
                >
                  <i className="ri-delete-bin-6-line text-[0.8125rem]" />Delete
                </button>
                <button
                  onClick={() => setSelectedDocs(new Set())}
                  className="ml-auto text-[0.6875rem] font-semibold text-[#6366F1] hover:underline cursor-pointer border-none bg-none"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Document Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredDocs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#94A3B8] py-20">
                  <i className="ri-file-search-line text-[2.5rem] text-[#CBD5E1]" />
                  <p className="text-[0.875rem] text-center">
                    {searchQuery ? 'No documents match your search.' : 'No documents in this folder.'}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-[#F8FAFC] text-center w-9 px-3 py-[0.4375rem] border-b border-[#E2E8F0]">
                        <input
                          type="checkbox"
                          className="w-[0.875rem] h-[0.875rem] cursor-pointer accent-[#6366F1]"
                          checked={filteredDocs.length > 0 && selectedDocs.size === filteredDocs.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="bg-[#F8FAFC] text-left px-3 py-[0.4375rem] text-[0.625rem] font-semibold uppercase tracking-[0.04em] text-[#94A3B8] border-b border-[#E2E8F0] whitespace-nowrap">Name</th>
                      <th className="bg-[#F8FAFC] text-left px-3 py-[0.4375rem] text-[0.625rem] font-semibold uppercase tracking-[0.04em] text-[#94A3B8] border-b border-[#E2E8F0] whitespace-nowrap">Category</th>
                      <th className="bg-[#F8FAFC] text-left px-3 py-[0.4375rem] text-[0.625rem] font-semibold uppercase tracking-[0.04em] text-[#94A3B8] border-b border-[#E2E8F0] whitespace-nowrap">Updated</th>
                      <th className="bg-[#F8FAFC] text-left px-3 py-[0.4375rem] text-[0.625rem] font-semibold uppercase tracking-[0.04em] text-[#94A3B8] border-b border-[#E2E8F0] whitespace-nowrap">Author</th>
                      <th className="bg-[#F8FAFC] w-16 border-b border-[#E2E8F0]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => {
                      const info = catInfo(doc.category);
                      const ext = getFileExt(doc);
                      const isSelected = selectedDocs.has(doc.id);
                      return (
                        <tr
                          key={doc.id}
                          className={`group cursor-pointer transition-colors ${isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#FAFAFF]'}`}
                          onClick={() => {
                            if (doc.type === 'link' && doc.url) window.open(doc.url, '_blank');
                            else if (doc.file_url) window.open(doc.file_url, '_blank');
                          }}
                        >
                          <td className="text-center px-3 py-[0.4375rem] border-b border-[#F1F5F9]" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-[0.875rem] h-[0.875rem] cursor-pointer accent-[#6366F1]"
                              checked={isSelected}
                              onChange={() => toggleSelect(doc.id)}
                            />
                          </td>
                          <td className="px-3 py-[0.4375rem] border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[0.875rem]"
                                style={{ background: info.bg, color: info.color }}>
                                <i className={info.icon} />
                              </div>
                              <span className="text-[0.8125rem] font-medium text-[#1E293B]">{doc.title}</span>
                              {ext && <span className="text-[0.6875rem] text-[#94A3B8]">{ext}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-[0.4375rem] border-b border-[#F1F5F9]">
                            <span
                              className="text-[0.6875rem] font-semibold px-2 py-[0.125rem] rounded-full whitespace-nowrap"
                              style={{ background: info.badgeBg, color: info.badgeColor }}
                            >
                              {info.label}
                            </span>
                          </td>
                          <td className="px-3 py-[0.4375rem] border-b border-[#F1F5F9] text-[0.8125rem] text-[#64748B] whitespace-nowrap">
                            {getRelativeDate(doc.updated_at || doc.created_at)}
                          </td>
                          <td className="px-3 py-[0.4375rem] border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={userProfile?.full_name} size="xs" />
                              <span className="text-[0.75rem] text-[#64748B]">{userProfile?.full_name || 'User'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-[0.4375rem] border-b border-[#F1F5F9]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {doc.type === 'link' && doc.url && (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="w-6 h-6 rounded flex items-center justify-center text-[0.8125rem] text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-all">
                                  <i className="ri-external-link-line" />
                                </a>
                              )}
                              {doc.type === 'file' && doc.file_url && (
                                <a href={doc.file_url} download={doc.file_name}
                                  className="w-6 h-6 rounded flex items-center justify-center text-[0.8125rem] text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-all">
                                  <i className="ri-download-line" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[0.8125rem] text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-all cursor-pointer">
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-96 max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <span className="text-[0.9375rem] font-bold text-[#0F172A]">Add External Link</span>
              <button onClick={() => setShowAddLinkModal(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">URL</label>
                <input type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all placeholder-[#94A3B8] font-[inherit]" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Title</label>
                <input type="text" placeholder="e.g., Confluence — API Design Doc" value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all placeholder-[#94A3B8] font-[inherit]" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Category</label>
                <select value={linkCategory} onChange={e => setLinkCategory(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] cursor-pointer font-[inherit] text-[#1E293B]">
                  <option value="link">External Link</option>
                  <option value="requirements">Requirement</option>
                  <option value="test-plans">Test Plan</option>
                  <option value="reports">Report</option>
                  <option value="specs">Spec</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA]">
              <button onClick={() => setShowAddLinkModal(false)} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer">Cancel</button>
              <button onClick={handleAddLink} disabled={linkSaving} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_1px_3px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50">
                <i className="ri-link mr-1" />{linkSaving ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-96 max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <span className="text-[0.9375rem] font-bold text-[#0F172A]">Upload Document</span>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadTitle(''); }} className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name); } }}
                className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-8 text-center bg-[#FAFAFA] cursor-pointer hover:border-[#6366F1] hover:bg-[#F8F7FF] transition-all"
              >
                <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name); } }} />
                {uploadFile ? (
                  <>
                    <i className="ri-file-line text-[2rem] text-[#6366F1] block mb-2" />
                    <p className="text-[0.8125rem] font-medium text-[#1E293B]">{uploadFile.name}</p>
                    <p className="text-[0.6875rem] text-[#94A3B8] mt-1">
                      {uploadFile.size < 1024*1024 ? (uploadFile.size/1024).toFixed(1)+' KB' : (uploadFile.size/1024/1024).toFixed(1)+' MB'}
                    </p>
                  </>
                ) : (
                  <>
                    <i className="ri-upload-cloud-2-line text-[2rem] text-[#CBD5E1] block mb-2" />
                    <p className="text-[0.8125rem] text-[#64748B] mb-1">Drop files here or <span className="text-[#6366F1] font-semibold">browse</span></p>
                    <p className="text-[0.6875rem] text-[#94A3B8]">PDF, DOCX, MD, TXT — Max 25 MB</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Title</label>
                <input type="text" placeholder="Document title" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all placeholder-[#94A3B8] font-[inherit]" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Upload to Folder</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] cursor-pointer font-[inherit] text-[#1E293B]">
                  <option value="file">All Documents (root)</option>
                  <option value="requirements">Requirements</option>
                  <option value="test-plans">Test Plans</option>
                  <option value="reports">Reports</option>
                  <option value="specs">Specs</option>
                </select>
              </div>
              {uploading && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-[0.75rem] mb-1">
                    <span className="text-[#64748B]">Uploading...</span>
                    <span className="font-semibold text-[#6366F1]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-[#6366F1] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA]">
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadTitle(''); }} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !uploadFile} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_1px_3px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-96 max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <span className="text-[0.9375rem] font-bold text-[#0F172A]">Create New Folder</span>
              <button onClick={() => setShowNewFolderModal(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Folder Name</label>
                <input type="text" placeholder="e.g., Sprint 25 Docs" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all placeholder-[#94A3B8] font-[inherit]" />
              </div>
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#475569] mb-1.5">Parent Folder <span className="text-red-500">*</span></label>
                <select value={newFolderParent} onChange={e => setNewFolderParent(e.target.value)}
                  className="w-full text-[0.8125rem] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] outline-none focus:border-[#6366F1] cursor-pointer font-[inherit] text-[#1E293B]">
                  <option value="requirements">Requirements</option>
                  <option value="test-plans">Test Plans</option>
                  <option value="reports">Reports</option>
                  <option value="specs">Specs</option>
                  <option value="link">External Links</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA]">
              <button onClick={() => setShowNewFolderModal(false)} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer">Cancel</button>
              <button onClick={handleCreateFolder} disabled={folderSaving} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_1px_3px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50">
                {folderSaving ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move To Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-96 max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <span className="text-[0.9375rem] font-bold text-[#0F172A]">Move Documents</span>
              <button onClick={() => { setShowMoveModal(false); setMoveTarget(''); }} className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-[0.75rem] text-[#64748B] mb-3">Select a destination folder:</p>
              <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-md">
                {[
                  { id: 'requirements', label: 'Requirements', color: '#D97706' },
                  { id: 'test-plans',   label: 'Test Plans',   color: '#2563EB' },
                  { id: 'reports',      label: 'Reports',      color: '#7C3AED' },
                  { id: 'specs',        label: 'Specs',        color: '#16A34A' },
                  { id: 'link',         label: 'External Links', color: '#64748B' },
                ].map(cat => (
                  <div key={cat.id}>
                    <button
                      onClick={() => setMoveTarget(cat.id)}
                      className={`w-full flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] text-[#334155] cursor-pointer transition-colors text-left ${
                        moveTarget === cat.id ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <i className="ri-folder-fill text-[0.9375rem]" style={{ color: moveTarget === cat.id ? '#6366F1' : cat.color }} />
                      {cat.label}
                    </button>
                    {customFolders
                      .filter(f => f.folderParent === cat.id)
                      .map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setMoveTarget(sub.id)}
                          className={`w-full flex items-center gap-1.5 pl-7 pr-3 py-[0.375rem] text-[0.75rem] cursor-pointer transition-colors text-left ${
                            moveTarget === sub.id ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold' : 'text-[#475569] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <i className="ri-corner-down-right-line text-[0.75rem] text-[#CBD5E1]" />
                          <i className="ri-folder-line text-[0.875rem]" style={{ color: moveTarget === sub.id ? '#6366F1' : '#94A3B8' }} />
                          {sub.title}
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E2E8F0] bg-[#FAFAFA]">
              <button onClick={() => { setShowMoveModal(false); setMoveTarget(''); }} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] cursor-pointer">Cancel</button>
              <button onClick={handleMoveSelected} disabled={!moveTarget} className="text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_1px_3px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50">
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
