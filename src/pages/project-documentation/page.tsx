import { LogoMark } from '../../components/Logo';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import AddLinkModal from './components/AddLinkModal';
import UploadFileModal from './components/UploadFileModal';
import ProjectHeader from '../../components/ProjectHeader';

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
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectDocumentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('documentation');
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'link' | 'file'>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; subscription_tier: number; avatar_emoji: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        
        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: profile?.email || user.email || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: docsData, error: docsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('삭제 오류:', error);
      alert(t('deleteFailed'));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconForType = (type: string) => {
    if (type === 'link') return 'ri-link';
    return 'ri-file-text-line';
  };

  const filteredDocuments = documents.filter(doc => 
    filterType === 'all' ? true : doc.type === filterType
  );

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];

  if (loading) {
    return (
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHeader projectId={id || ''} projectName="" />
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-[1.75rem]">
            <div className="flex items-center justify-between mb-[1.75rem]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-file-text-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-[1.375rem] font-bold text-gray-900">{t('title')}</h1>
                  <p className="text-[0.8125rem] text-gray-500">{project?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="px-[0.875rem] py-[0.4375rem] bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 text-[0.8125rem]"
                >
                  <i className="ri-link text-lg w-5 h-5 flex items-center justify-center"></i>
                  {t('addLink')}
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-[0.875rem] py-[0.4375rem] bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 text-[0.8125rem]"
                >
                  <i className="ri-upload-2-line text-lg w-5 h-5 flex items-center justify-center"></i>
                  {t('uploadFile')}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-[1.3125rem] border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-[0.875rem] py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('all')} ({documents.length})
                  </button>
                  <button
                    onClick={() => setFilterType('link')}
                    className={`px-[0.875rem] py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'link'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('link')} ({documents.filter(d => d.type === 'link').length})
                  </button>
                  <button
                    onClick={() => setFilterType('file')}
                    className={`px-[0.875rem] py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'file'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('file')} ({documents.filter(d => d.type === 'file').length})
                  </button>
                </div>
              </div>

              <div className="p-[1.3125rem]">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-file-text-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noDocuments')}</h3>
                    <p className="text-gray-500 mb-6">{t('noDocumentsDesc')}</p>
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setShowAddLinkModal(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        {t('addLink')}
                      </button>
                      <button 
                        onClick={() => setShowUploadModal(true)}
                        className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        {t('uploadFile')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-gray-50/50 transition-all group"
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.type === 'link' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <i className={`${getIconForType(doc.type)} text-xl ${
                            doc.type === 'link' ? 'text-blue-600' : 'text-purple-600'
                          }`}></i>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                          {doc.description && (
                            <p className="text-sm text-gray-500 mb-2">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDate(doc.created_at)}</span>
                            {doc.type === 'file' && doc.file_size && (
                              <span>{formatFileSize(doc.file_size)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.type === 'link' && doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap text-sm font-medium"
                            >
                              {t('open')}
                            </a>
                          )}
                          {doc.type === 'file' && doc.file_url && (
                            <a
                              href={doc.file_url}
                              download={doc.file_name}
                              className="px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap text-sm font-medium"
                            >
                              {t('download')}
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAddLinkModal && (
        <AddLinkModal
          projectId={id!}
          onClose={() => setShowAddLinkModal(false)}
          onSuccess={() => {
            setShowAddLinkModal(false);
            fetchData();
          }}
        />
      )}

      {showUploadModal && (
        <UploadFileModal
          projectId={id!}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
