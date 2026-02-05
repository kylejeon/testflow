import { useState, useEffect } from 'react';
import { supabase, type TestCase } from '../../../lib/supabase';

export default function TestCaseList() {
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestCases(data || []);
    } catch (error) {
      console.error('테스트 케이스 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const folders = [
    { id: 'all', name: '모든 테스트 케이스', count: testCases.length, icon: 'ri-folder-line' },
    { id: 'ui', name: 'UI 테스트', count: testCases.filter(tc => tc.folder === 'UI').length, icon: 'ri-layout-line' },
    { id: 'api', name: 'API 테스트', count: testCases.filter(tc => tc.folder === 'API').length, icon: 'ri-code-box-line' },
    { id: 'integration', name: '통합 테스트', count: testCases.filter(tc => tc.folder === 'Integration').length, icon: 'ri-links-line' },
    { id: 'security', name: '보안 테스트', count: testCases.filter(tc => tc.folder === 'Security').length, icon: 'ri-shield-check-line' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'ri-checkbox-circle-fill';
      case 'failed':
        return 'ri-close-circle-fill';
      case 'pending':
        return 'ri-time-fill';
      default:
        return 'ri-question-fill';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
        return '통과';
      case 'failed':
        return '실패';
      case 'pending':
        return '대기';
      default:
        return '알 수 없음';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">테스트 케이스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 bg-white border-r border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">폴더</h2>
          <div className="space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedFolder === folder.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className={`${folder.icon} text-lg w-5 h-5 flex items-center justify-center`}></i>
                  <span className="font-medium">{folder.name}</span>
                </div>
                <span className="text-sm font-semibold">{folder.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <button className="w-full px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
            <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
            새 폴더
          </button>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">테스트 케이스</h1>
              <p className="text-gray-600">모든 테스트 케이스를 관리하고 실행하세요</p>
            </div>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              새 테스트 케이스
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="테스트 케이스 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            </div>
            <select className="px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option>모든 상태</option>
              <option>통과</option>
              <option>실패</option>
              <option>대기</option>
            </select>
            <select className="px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option>모든 우선순위</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap">
              <i className="ri-filter-3-line mr-2"></i>
              필터
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          {testCases.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">테스트 케이스가 없습니다</h3>
              <p className="text-gray-600 mb-6">첫 번째 테스트 케이스를 생성해보세요</p>
              <button
                onClick={() => setShowNewCaseModal(true)}
                className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                새 테스트 케이스 만들기
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      테스트 케이스
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      폴더
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      우선순위
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      담당자
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testCases.map((testCase) => (
                    <tr key={testCase.id} className="hover:bg-gray-50 transition-all">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {testCase.is_automated && (
                            <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                              <i className="ri-robot-line text-purple-600 text-sm"></i>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {testCase.title}
                            </div>
                            {testCase.description && (
                              <div className="text-xs text-gray-500">{testCase.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{testCase.folder || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                            testCase.priority
                          )}`}
                        >
                          {testCase.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            testCase.status
                          )}`}
                        >
                          <i className={`${getStatusIcon(testCase.status)} mr-1`}></i>
                          {getStatusText(testCase.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {testCase.assignee ? (
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold cursor-pointer">
                            {testCase.assignee.substring(0, 2).toUpperCase()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(testCase.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                            <i className="ri-play-fill text-lg"></i>
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                            <i className="ri-edit-line text-lg"></i>
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                            <i className="ri-more-2-fill text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">새 테스트 케이스</h2>
                <button
                  onClick={() => setShowNewCaseModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  테스트 케이스 제목
                </label>
                <input
                  type="text"
                  placeholder="예: 사용자 로그인 기능 테스트"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">설명</label>
                <textarea
                  placeholder="테스트 케이스에 대한 상세 설명을 입력하세요"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">폴더</label>
                  <select className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                    <option>UI 테스트</option>
                    <option>API 테스트</option>
                    <option>통합 테스트</option>
                    <option>보안 테스트</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">우선순위</label>
                  <select className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer">
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">담당자</label>
                <input
                  type="text"
                  placeholder="담당자 이름"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="automated" className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
                <label htmlFor="automated" className="text-sm text-gray-700 cursor-pointer">
                  자동화된 테스트
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
