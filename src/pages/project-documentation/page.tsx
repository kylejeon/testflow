import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AddLinkModal from './components/AddLinkModal';
import UploadFileModal from './components/UploadFileModal';

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
  2: { name: 'Professional', color: 'bg-teal-50 text-teal-700 border-teal-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectDocumentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'link' | 'file'>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; subscription_tier: number } | null>(null);

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
          .select('full_name, email, subscription_tier')
          .eq('id', user.id)
          .maybeSingle();
        
        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: profile?.email || user.email || '',
          subscription_tier: profile?.subscription_tier || 1
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
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('문서 삭제에 실패했습니다.');
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
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                    <i className="ri-test-tube-line text-xl text-white"></i>
                  </div>
                  <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                    TestFlow
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
                  {userProfile?.full_name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">문서를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <i className="ri-test-tube-line text-xl text-white"></i>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                  TestFlow
                </span>
              </Link>
              
              <div className="text-gray-300 text-xl mx-2">/</div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-folder-line text-white text-sm"></i>
                </div>
                <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                <Link 
                  to={`/projects/${id}`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Overview
                </Link>
                <Link 
                  to={`/projects/${id}/milestones`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Milestones
                </Link>
                <Link 
                  to={`/projects/${id}/documentation`}
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
                >
                  Documentation
                </Link>
                <Link 
                  to={`/projects/${id}/testcases`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Test Cases
                </Link>
                <Link 
                  to={`/projects/${id}/runs`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Runs & Results
                </Link>
                <Link 
                  to={`/projects/${id}/sessions`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Sessions
                </Link>
              </nav>
              
              <div className="flex items-center gap-3 relative">
                <div 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {userProfile?.full_name?.charAt(0) || 'U'}
                  </div>
                </div>
                
                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowProfileMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500">{userProfile?.email}</p>
                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded-full border ${tierInfo.color}`}>
                          <i className={`${tierInfo.icon} text-sm`}></i>
                          {tierInfo.name}
                        </div>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>Log out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-file-text-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
                  <p className="text-sm text-gray-500">{project?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddLinkModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-link text-lg w-5 h-5 flex items-center justify-center"></i>
                  링크 추가
                </button>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-upload-2-line text-lg w-5 h-5 flex items-center justify-center"></i>
                  파일 업로드
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'all'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    전체 ({documents.length})
                  </button>
                  <button
                    onClick={() => setFilterType('link')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'link'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    링크 ({documents.filter(d => d.type === 'link').length})
                  </button>
                  <button
                    onClick={() => setFilterType('file')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'file'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    파일 ({documents.filter(d => d.type === 'file').length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-file-text-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">문서가 없습니다</h3>
                    <p className="text-gray-500 mb-6">링크를 추가하거나 파일을 업로드하여 시작하세요.</p>
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setShowAddLinkModal(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        링크 추가
                      </button>
                      <button 
                        onClick={() => setShowUploadModal(true)}
                        className="px-4 py-2 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        파일 업로드
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-500 hover:bg-gray-50/50 transition-all group"
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
                              className="px-3 py-2 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap text-sm font-medium"
                            >
                              열기
                            </a>
                          )}
                          {doc.type === 'file' && doc.file_url && (
                            <a
                              href={doc.file_url}
                              download={doc.file_name}
                              className="px-3 py-2 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap text-sm font-medium"
                            >
                              다운로드
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
