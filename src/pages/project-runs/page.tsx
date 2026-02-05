import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TestRun {
  id: string;
  project_id: string;
  milestone_id: string;
  name: string;
  status: 'new' | 'in_progress' | 'under_review' | 'completed';
  progress: number;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  tags: string[];
  assignees: string[];
  test_case_ids: string[];
  executed_at: string;
  created_at: string;
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  progress: number;
  created_at: string;
}

interface TestCase {
  id: string;
  title: string;
  folder?: string;
  priority: string;
  status: string;
  tags?: string[];
  description?: string;
}

interface Contributor {
  id: string;
  name: string;
  email: string;
  color: string;
}

export default function ProjectRunsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRunModal, setShowAddRunModal] = useState(false);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    configuration: '',
    milestone_id: '',
    status: 'new' as 'new' | 'in_progress' | 'under_review' | 'completed',
    issues: '',
    tags: '',
    include_all_cases: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [showSelectCasesModal, setShowSelectCasesModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const handleRunClick = (runId: string) => {
    navigate(`/projects/${id}/runs/${runId}`);
  };

  useEffect(() => {
    fetchData();
  }, [id, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (milestonesError) throw milestonesError;
      
      console.log('=== 전체 마일스톤 데이터 (필터링 전) ===');
      console.log('milestonesData:', milestonesData);
      
      setMilestones(milestonesData || []);

      // Fetch test cases
      const { data: testCasesData, error: testCasesError } = await supabase
        .from('test_cases')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (testCasesError) throw testCasesError;
      setTestCases(testCasesData || []);

      // Fetch test runs
      const { data: testRunsData, error: testRunsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (testRunsError) throw testRunsError;

      console.log('=== 전체 Test Runs 데이터 (DB에서 가져온 직후) ===');
      console.log('testRunsData:', testRunsData);

      // Fetch all test results for these runs
      const { data: testResultsData, error: testResultsError } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status, author')
        .in('run_id', (testRunsData || []).map(r => r.id))
        .order('created_at', { ascending: false });

      if (testResultsError) throw testResultsError;

      // Get unique authors from test results
      const uniqueAuthors = new Set<string>();
      testResultsData?.forEach(result => {
        if (result.author) {
          uniqueAuthors.add(result.author);
        }
      });

      // Fetch profiles for contributors
      if (uniqueAuthors.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', Array.from(uniqueAuthors));

        const colors = [
          'from-blue-400 to-blue-600',
          'from-purple-400 to-purple-600',
          'from-pink-400 to-pink-600',
          'from-green-400 to-green-600',
          'from-orange-400 to-orange-600',
          'from-teal-400 to-teal-600',
          'from-red-400 to-red-600',
          'from-indigo-400 to-indigo-600',
        ];

        const contributorsList: Contributor[] = (profilesData || []).map((profile, index) => ({
          id: profile.id,
          name: profile.name || profile.email?.split('@')[0] || 'Unknown',
          email: profile.email || '',
          color: colors[index % colors.length],
        }));

        setContributors(contributorsList);
      } else {
        setContributors([]);
      }

      // Calculate stats for each run
      const runsWithStats = (testRunsData || []).map(run => {
        // Get latest status for each test case in this run
        const runResults = testResultsData?.filter(r => r.run_id === run.id) || [];
        const statusMap = new Map<string, string>();
        
        runResults.forEach(result => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result.status);
          }
        });

        // Count statuses
        let passed = 0;
        let failed = 0;
        let blocked = 0;
        let retest = 0;
        let untested = 0;

        run.test_case_ids.forEach((tcId: string) => {
          const status = statusMap.get(tcId) || 'untested';
          switch (status) {
            case 'passed':
              passed++;
              break;
            case 'failed':
              failed++;
              break;
            case 'blocked':
              blocked++;
              break;
            case 'retest':
              retest++;
              break;
            default:
              untested++;
          }
        });

        const totalTests = run.test_case_ids.length;
        const completedTests = passed + failed + blocked + retest;
        const progress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

        return {
          ...run,
          passed,
          failed,
          blocked,
          retest,
          untested,
          progress,
        };
      });

      console.log('=== 통계 계산 후 Test Runs ===');
      console.log('runsWithStats:', runsWithStats);
      console.log('각 Run의 상세 정보:');
      runsWithStats.forEach(run => {
        console.log(`- Run "${run.name}": status="${run.status}", milestone_id="${run.milestone_id}"`);
      });

      setTestRuns(runsWithStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Input changed:', name, '=', value, 'Type:', typeof value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRun = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a run name');
      return;
    }

    try {
      setSubmitting(true);

      const testCaseIds = formData.include_all_cases 
        ? testCases.map(tc => tc.id)
        : selectedTestCases;

      if (editingRunId) {
        // Update existing run
        const { error } = await supabase
          .from('test_runs')
          .update({
            name: formData.name,
            milestone_id: formData.milestone_id && formData.milestone_id.trim() !== '' ? formData.milestone_id : null,
            status: formData.status,
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
            test_case_ids: testCaseIds,
          })
          .eq('id', editingRunId);

        if (error) throw error;
      } else {
        // Create new run
        const newRun = {
          project_id: id,
          milestone_id: formData.milestone_id && formData.milestone_id.trim() !== '' ? formData.milestone_id : null,
          name: formData.name,
          status: formData.status,
          progress: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          retest: 0,
          untested: testCaseIds.length,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
          assignees: [],
          test_case_ids: testCaseIds,
          executed_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('test_runs')
          .insert([newRun])
          .select();

        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      
      // Reset form and close modal
      setFormData({
        name: '',
        configuration: '',
        milestone_id: '',
        status: 'new',
        issues: '',
        tags: '',
        include_all_cases: true,
      });
      setSelectedTestCases([]);
      setEditingRunId(null);
      setShowAddRunModal(false);
    } catch (error) {
      console.error('Error saving test run:', error);
      alert('Failed to save test run. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTestCase = (testCaseId: string) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId)
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const toggleAllTestCases = () => {
    if (selectedTestCases.length === testCases.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(testCases.map(tc => tc.id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    const now = new Date();
    const endDate = new Date(milestone.end_date);
    
    if (milestone.status === 'completed') {
      return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
    }
    
    if (endDate < now) {
      return { label: 'Past due', className: 'bg-orange-100 text-orange-700' };
    }
    
    return { label: 'Started', className: 'bg-green-100 text-green-700' };
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      new: { label: 'New', className: 'bg-yellow-100 text-yellow-700' },
      in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-700' },
      under_review: { label: 'Under review', className: 'bg-purple-100 text-purple-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    };
    return badges[status as keyof typeof badges] || badges.new;
  };

  const getRunsByMilestone = (milestoneId: string) => {
    console.log('=== getRunsByMilestone 호출 ===');
    console.log('milestoneId:', milestoneId);
    console.log('activeTab:', activeTab);
    console.log('전체 runs:', testRuns);
    
    const filtered = testRuns.filter(run => {
      const runMilestoneId = run.milestone_id ? String(run.milestone_id).trim() : null;
      const targetMilestoneId = String(milestoneId).trim();
      const milestoneMatch = runMilestoneId === targetMilestoneId;
      
      const statusMatch = activeTab === 'active' 
        ? run.status !== 'completed' 
        : run.status === 'completed';
      
      const finalResult = milestoneMatch && statusMatch;
      
      console.log(`Run ${run.name}:`, {
        run_milestone_id: runMilestoneId,
        target_milestone_id: targetMilestoneId,
        status: run.status,
        activeTab: activeTab,
        milestoneMatch,
        statusMatch,
        finalResult
      });
      
      return finalResult;
    });
    
    console.log('필터링 결과:', filtered);
    return filtered;
  };

  const getRunsWithoutMilestone = () => {
    console.log('=== getRunsWithoutMilestone 호출 ===');
    console.log('activeTab:', activeTab);
    console.log('전체 runs:', testRuns);
    
    const filtered = testRuns.filter(run => {
      const noMilestone = !run.milestone_id;
      const statusMatch = activeTab === 'active' 
        ? run.status !== 'completed' 
        : run.status === 'completed';
      
      const finalResult = noMilestone && statusMatch;
      
      console.log(`Run ${run.name}:`, {
        milestone_id: run.milestone_id,
        status: run.status,
        activeTab: activeTab,
        noMilestone,
        statusMatch,
        finalResult
      });
      
      return finalResult;
    });
    
    console.log('필터링 결과:', filtered);
    return filtered;
  };

  const calculateStats = () => {
    const activeRuns = testRuns.filter(run => run.status !== 'completed').length;
    const totalTests = testRuns.reduce((sum, run) => sum + run.passed + run.failed + run.blocked + run.retest + run.untested, 0);
    const passedTests = testRuns.reduce((sum, run) => sum + run.passed, 0);
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const closedRuns = testRuns.filter(run => run.status === 'completed').length;

    return { activeRuns, successRate, closedRuns };
  };

  const stats = calculateStats();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('이 테스트 런을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('test_runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error deleting test run:', error);
      alert('테스트 런 삭제에 실패했습니다.');
    }
  };

  const handlePauseResumeRun = async (run: TestRun) => {
    const newStatus = run.status === 'in_progress' ? 'new' : 'in_progress';
    
    try {
      const { error } = await supabase
        .from('test_runs')
        .update({ status: newStatus })
        .eq('id', run.id);

      if (error) throw error;

      await fetchData();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error updating test run status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleEditRun = (run: TestRun) => {
    setEditingRunId(run.id);
    setFormData({
      name: run.name,
      configuration: '',
      milestone_id: run.milestone_id || '',
      status: run.status,
      issues: '',
      tags: run.tags ? run.tags.join(', ') : '',
      include_all_cases: run.test_case_ids.length === testCases.length,
    });
    setSelectedTestCases(run.test_case_ids);
    setShowAddRunModal(true);
    setOpenMenuId(null);
  };

  const getFolders = () => {
    const folders = new Map<string, number>();
    testCases.forEach(tc => {
      const folder = tc.folder || 'Uncategorized';
      folders.set(folder, (folders.get(folder) || 0) + 1);
    });
    return Array.from(folders.entries()).map(([name, count]) => ({ name, count }));
  };

  const getTestCasesByFolder = (folderName: string | null) => {
    if (!folderName) return testCases;
    if (folderName === 'Uncategorized') {
      return testCases.filter(tc => !tc.folder);
    }
    return testCases.filter(tc => tc.folder === folderName);
  };

  const folders = getFolders();
  const displayedTestCases = selectedFolder ? getTestCasesByFolder(selectedFolder) : testCases;
  
  // Filter test cases based on search and filters
  const filteredTestCases = testCases.filter(tc => {
    // Search filter
    const matchesSearch = tc.title.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
      (tc.description && tc.description.toLowerCase().includes(caseSearchQuery.toLowerCase()));
    
    // Priority filter - 대소문자 구분 없이 비교
    const matchesPriority = priorityFilters.length === 0 || priorityFilters.some(p => p.toLowerCase() === tc.priority.toLowerCase());
    
    // Tags filter
    const matchesTags = tagFilters.length === 0 || (tc.tags && tagFilters.some(tag => tc.tags.includes(tag)));
    
    return matchesSearch && matchesPriority && matchesTags;
  });

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilters(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleTagFilterChange = (tag: string) => {
    setPriorityFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTagFilterToggle = (tag: string) => {
    setTagFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const removeTagFilter = (tag: string) => {
    setTagFilters(prev => prev.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setSelectedTestCases([]);
    setPriorityFilters([]);
    setTagFilters([]);
    setCaseSearchQuery('');
  };

  const selectedInFolder = filteredTestCases.filter(tc => selectedTestCases.includes(tc.id)).length;

  // Get all unique tags from test cases
  const getAllTags = () => {
    const tagsSet = new Set<string>();
    testCases.forEach(tc => {
      // Handle both string and array formats
      if (tc.tags) {
        if (typeof tc.tags === 'string') {
          // If tags is a string, split by comma
          tc.tags.split(',').forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              tagsSet.add(trimmedTag);
            }
          });
        } else if (Array.isArray(tc.tags)) {
          // If tags is already an array
          tc.tags.forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              tagsSet.add(trimmedTag);
            }
          });
        }
      }
    });
    return Array.from(tagsSet).sort();
  };

  const allTags = getAllTags();

  console.log('=== Tags Debug ===');
  console.log('testCases:', testCases);
  console.log('testCases with tags:', testCases.filter(tc => tc.tags));
  console.log('allTags:', allTags);

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
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
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
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
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
              
              <div className="flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                  >
                    JK
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('로그아웃되었습니다.');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Runs & Results</h1>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setEditingRunId(null);
                      setFormData({
                        name: '',
                        configuration: '',
                        milestone_id: '',
                        status: 'new',
                        issues: '',
                        tags: '',
                        include_all_cases: true,
                      });
                      setSelectedTestCases([]);
                      setShowAddRunModal(true);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line"></i>
                    Run
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Active Runs */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Active Runs</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.activeRuns}</div>
                    </div>
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <i className="ri-play-circle-line text-teal-600 text-xl"></i>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Est. workload</span>
                      <span className="font-semibold text-gray-900">{testRuns.length * 45}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contributors</span>
                      <div className="flex -space-x-2">
                        {contributors.length > 0 ? (
                          <>
                            {contributors.slice(0, 3).map((contributor) => (
                              <div 
                                key={contributor.id}
                                className={`w-6 h-6 bg-gradient-to-br ${contributor.color} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold`}
                                title={contributor.name}
                              >
                                {contributor.name.substring(0, 1).toUpperCase()}
                              </div>
                            ))}
                            {contributors.length > 3 && (
                              <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-gray-600 text-xs font-semibold">
                                +{contributors.length - 3}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">No contributors yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latest Results */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Latest Results</div>
                      <div className="text-3xl font-bold text-green-600">{stats.successRate}%</div>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#e5e7eb"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#10b981"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${stats.successRate * 1.76} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className="ri-check-line text-green-600 text-xl"></i>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    May 1st - May 31st
                  </div>
                </div>

                {/* Recently Closed */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Recently Closed</div>
                      <div className="text-3xl font-bold text-gray-900">{stats.closedRuns}</div>
                    </div>
                    <div className="w-20 h-12">
                      <svg className="w-full h-full" viewBox="0 0 80 48">
                        <polyline
                          points="0,40 20,35 40,30 60,20 80,10"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="0,40 20,35 40,30 60,20 80,10 80,48 0,48"
                          fill="url(#gradient)"
                          opacity="0.2"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 font-semibold">
                    +{Math.floor(stats.closedRuns * 0.15)} this month
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-8 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
                    activeTab === 'active'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active ({testRuns.filter(r => r.status !== 'completed').length})
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap ${
                    activeTab === 'closed'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Closed ({testRuns.filter(r => r.status === 'completed').length})
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search runs..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                <i className="ri-filter-3-line"></i>
                Filter
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Test Runs List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Milestone-based Runs */}
                {milestones.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    {milestones.map((milestone, index) => {
                      const milestoneRuns = getRunsByMilestone(milestone.id);
                      const milestoneStatusInfo = getMilestoneStatus(milestone);
                      
                      console.log(`\n=== 마일스톤 "${milestone.name}" 렌더링 체크 ===`);
                      console.log('milestone.status:', milestone.status);
                      console.log('activeTab:', activeTab);
                      console.log('milestoneRuns.length:', milestoneRuns.length);
                      
                      // 이 마일스톤에 표시할 Runs가 없으면 숨김
                      if (milestoneRuns.length === 0) {
                        console.log('이 마일스톤에 표시할 runs가 없어서 숨김');
                        return null;
                      }
                      
                      console.log('마일스톤 표시함!');
                      
                      return (
                        <div key={milestone.id} className={index !== milestones.length - 1 ? 'border-b border-gray-200' : ''}>
                          <div className="flex items-center justify-between p-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <i className="ri-flag-line text-gray-400"></i>
                              <span className="font-semibold text-gray-900">{milestone.name}</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${milestoneStatusInfo.className}`}>
                                {milestoneStatusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
                              <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <i className="ri-arrow-down-s-line"></i>
                              </button>
                            </div>
                          </div>

                          {/* Test Runs for this Milestone */}
                          <div className="divide-y divide-gray-100">
                            {milestoneRuns.map((run) => (
                              <div 
                                key={run.id} 
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => handleRunClick(run.id)}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i className="ri-play-circle-line text-teal-600"></i>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold text-gray-900 hover:text-teal-600 transition-colors">{run.name}</h3>
                                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(run.status).className}`}>
                                        {getStatusBadge(run.status).label}
                                      </span>
                                      {run.tags && run.tags.map((tag, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>{run.passed} Passed</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>{run.failed} Failed</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                        <span>{run.blocked} Blocked</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span>{run.retest} Retest</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                        <span>{run.untested} Untested</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className="h-full bg-teal-500 rounded-full transition-all"
                                          style={{ width: `${run.progress}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{run.progress}%</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="flex -space-x-2">
                                      {run.assignees && run.assignees.slice(0, 3).map((assignee, idx) => (
                                        <div 
                                          key={idx}
                                          className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                                        >
                                          {assignee.substring(0, 2).toUpperCase()}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="relative" ref={openMenuId === run.id ? menuRef : null}>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(openMenuId === run.id ? null : run.id);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
                                      >
                                        <i className="ri-more-2-fill"></i>
                                      </button>
                                      {openMenuId === run.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditRun(run);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                          >
                                            <i className="ri-edit-line"></i>
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePauseResumeRun(run);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                          >
                                            <i className={run.status === 'in_progress' ? 'ri-pause-line' : 'ri-play-line'}></i>
                                            <span>{run.status === 'in_progress' ? 'Pause' : 'Resume'}</span>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteRun(run.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-200"
                                          >
                                            <i className="ri-delete-bin-line"></i>
                                            <span>Delete</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                )}

                {/* Runs without Milestone */}
                {getRunsWithoutMilestone().length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <i className="ri-inbox-line text-gray-400"></i>
                        <span className="font-semibold text-gray-900">Unassigned Milestones</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                          {getRunsWithoutMilestone().length} runs
                        </span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <i className="ri-arrow-down-s-line"></i>
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {getRunsWithoutMilestone().map((run) => (
                        <div 
                          key={run.id} 
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleRunClick(run.id)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i className="ri-play-circle-line text-gray-600"></i>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 hover:text-gray-600 transition-colors">{run.name}</h3>
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(run.status).className}`}>
                                  {getStatusBadge(run.status).label}
                                </span>
                                {run.tags && run.tags.map((tag, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>{run.passed} Passed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>{run.failed} Failed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span>{run.blocked} Blocked</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span>{run.retest} Retest</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                  <span>{run.untested} Untested</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-gray-500 rounded-full transition-all"
                                    style={{ width: `${run.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{run.progress}%</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="flex -space-x-2">
                                {run.assignees && run.assignees.slice(0, 3).map((assignee, idx) => (
                                  <div 
                                    key={idx}
                                    className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                                  >
                                    {assignee.substring(0, 2).toUpperCase()}
                                  </div>
                                ))}
                              </div>
                              <div className="relative" ref={openMenuId === run.id ? menuRef : null}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === run.id ? null : run.id);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
                                >
                                  <i className="ri-more-2-fill"></i>
                                </button>
                                {openMenuId === run.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRun(run);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                    >
                                      <i className="ri-edit-line"></i>
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePauseResumeRun(run);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                    >
                                      <i className={run.status === 'in_progress' ? 'ri-pause-line' : 'ri-play-line'}></i>
                                      <span>{run.status === 'in_progress' ? 'Pause' : 'Resume'}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRun(run.id);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-gray-200"
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {milestones.filter(m => getRunsByMilestone(m.id).length > 0).length === 0 && getRunsWithoutMilestone().length === 0 && (
                  <div className="text-center py-12">
                    <i className="ri-flag-line text-6xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 text-lg">No {activeTab} test runs</p>
                    <p className="text-gray-400 text-sm mt-2">Create test runs to track your testing progress</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Run Modal */}
      {showAddRunModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingRunId ? 'Edit run' : 'Add run'}</h2>
              <button 
                onClick={() => {
                  setShowAddRunModal(false);
                  setEditingRunId(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6">
                <div className="flex gap-8 border-b border-gray-200 mb-6">
                  <button className="pb-3 px-1 border-b-2 border-teal-500 text-teal-600 font-medium text-sm cursor-pointer whitespace-nowrap">
                    RUN
                  </button>
                  <button className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm cursor-pointer whitespace-nowrap">
                    NOTES
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Run name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  {/* Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Configuration
                      </label>
                      <button className="text-xs text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap">
                        Apply to cases
                      </button>
                    </div>
                    <select 
                      name="configuration"
                      value={formData.configuration}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-500 cursor-pointer"
                    >
                      <option value="">Select configuration</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">The environment or configuration to test against, if any.</p>
                  </div>

                  {/* Milestone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Milestone
                      </label>
                      <button className="text-teal-600 hover:text-teal-700 cursor-pointer">
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                    <select 
                      name="milestone_id"
                      value={formData.milestone_id}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, milestone_id: e.target.value }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                    >
                      <option value="">Select milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Optionally choose a milestone for this run or add a new one.</p>
                  </div>

                  {/* Test Cases Selection */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="include_all_cases"
                          checked={formData.include_all_cases}
                          onChange={() => setFormData(prev => ({ ...prev, include_all_cases: true }))}
                          className="w-4 h-4 text-teal-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">Include all test cases</span>
                        <i className="ri-information-line text-gray-400"></i>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="include_all_cases"
                          checked={!formData.include_all_cases}
                          onChange={() => setFormData(prev => ({ ...prev, include_all_cases: false }))}
                          className="w-4 h-4 text-teal-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">Select cases to include:</span>
                      </label>
                      
                      {!formData.include_all_cases && (
                        <div className="ml-6 mt-3">
                          <button
                            onClick={() => setShowSelectCasesModal(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-2"
                          >
                            <i className="ri-checkbox-multiple-line"></i>
                            Select cases ({selectedTestCases.length} selected)
                          </button>
                          {selectedTestCases.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              {selectedTestCases.length} / {testCases.length} test cases selected
                            </div>
                          )}
                        </div>
                      )}
                      
                      {formData.include_all_cases && (
                        <div className="ml-6 text-sm text-gray-500">
                          All {testCases.length} test cases will be included
                        </div>
                      )}
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                    >
                      <option value="new">🌟 New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* Issues */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Issues
                      </label>
                      <button className="text-teal-600 hover:text-teal-700 text-sm cursor-pointer whitespace-nowrap">
                        + Add
                      </button>
                    </div>
                    <select 
                      name="issues"
                      value={formData.issues}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-500 cursor-pointer"
                    >
                      <option value="">Select issues</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="Enter tags separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can add tags to filter runs.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddRunModal(false);
                  setEditingRunId(null);
                }}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRun}
                disabled={submitting}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (editingRunId ? 'Updating...' : 'Adding...') : (editingRunId ? 'Update run' : 'Add run')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Test Cases Modal */}
      {showSelectCasesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select cases</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setShowSelectCasesModal(false);
                    setCaseSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex h-[calc(90vh-140px)]">
              {/* Left Sidebar - Folders */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Folders</h3>
                  <div className="space-y-1">
                    <div 
                      onClick={() => setSelectedFolder(null)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                        selectedFolder === null 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <i className="ri-folder-line"></i>
                      <span className="font-medium">All Cases</span>
                      <span className={`ml-auto text-xs px-2 py-1 rounded ${
                        selectedFolder === null 
                          ? 'bg-teal-200 text-teal-700' 
                          : 'text-gray-500'
                      }`}>
                        {selectedTestCases.length}/{testCases.length}
                      </span>
                    </div>
                    {folders.map((folder) => (
                      <div 
                        key={folder.name}
                        onClick={() => setSelectedFolder(folder.name)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                          selectedFolder === folder.name 
                            ? 'bg-teal-100 text-teal-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <i className="ri-folder-line"></i>
                        <span>{folder.name}</span>
                        <span className={`ml-auto text-xs px-2 py-1 rounded ${
                          selectedFolder === folder.name 
                            ? 'bg-teal-200 text-teal-700' 
                            : 'text-gray-500'
                        }`}>
                          {getTestCasesByFolder(folder.name).filter(tc => selectedTestCases.includes(tc.id)).length}/{folder.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content - Test Cases */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedFolder || 'All Cases'} ({selectedInFolder}/{filteredTestCases.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                          type="text"
                          placeholder="Search cases..."
                          value={caseSearchQuery}
                          onChange={(e) => setCaseSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Cases List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredTestCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <i className="ri-file-list-3-line text-6xl mb-4"></i>
                      <p className="text-lg">No test cases found</p>
                      <p className="text-sm mt-2">
                        {caseSearchQuery ? 'Try a different search term' : 'Create test cases to add them to your runs'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="w-8 px-4 py-3">
                            <input 
                              type="checkbox" 
                              onChange={() => {
                                const allIds = filteredTestCases.map(tc => tc.id);
                                const allSelected = allIds.every(id => selectedTestCases.includes(id));
                                if (allSelected) {
                                  setSelectedTestCases(prev => prev.filter(id => !allIds.includes(id)));
                                } else {
                                  setSelectedTestCases(prev => [...new Set([...prev, ...allIds])]);
                                }
                              }}
                              checked={filteredTestCases.length > 0 && filteredTestCases.every(tc => selectedTestCases.includes(tc.id))}
                              className="w-4 h-4 text-teal-600 cursor-pointer"
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Case</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredTestCases.map((testCase) => (
                          <tr key={testCase.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedTestCases.includes(testCase.id)}
                                onChange={() => toggleTestCase(testCase.id)}
                                className="w-4 h-4 text-teal-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <i className="ri-file-list-3-line text-gray-400"></i>
                                <span className="text-sm text-teal-600 hover:underline cursor-pointer">
                                  {testCase.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                testCase.priority === 'high' 
                                  ? 'bg-red-100 text-red-700'
                                  : testCase.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {testCase.priority === 'high' ? 'High' : 
                                 testCase.priority === 'medium' ? 'Medium' : 'Low'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedTestCases.length}/{testCases.length} selected
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowSelectCasesModal(false);
                          setCaseSearchQuery('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowSelectCasesModal(false);
                          setCaseSearchQuery('');
                        }}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                      >
                        Select cases
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Filters */}
              <div className="w-64 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                    <button 
                      onClick={clearAllFilters}
                      className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="border-b border-gray-200 pb-3">
                      <div className="font-medium text-gray-700 mb-2">Priority</div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-teal-600 cursor-pointer"
                            checked={priorityFilters.includes('high')}
                            onChange={() => handlePriorityFilterChange('high')}
                          />
                          <span className="text-gray-600">High</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-teal-600 cursor-pointer"
                            checked={priorityFilters.includes('medium')}
                            onChange={() => handlePriorityFilterChange('medium')}
                          />
                          <span className="text-gray-600">Medium</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-teal-600 cursor-pointer"
                            checked={priorityFilters.includes('low')}
                            onChange={() => handlePriorityFilterChange('low')}
                          />
                          <span className="text-gray-600">Low</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-3">
                      <div className="font-medium text-gray-700 mb-2">Tags</div>
                      {allTags.length > 0 ? (
                        <div className="space-y-2">
                          <div className="relative" ref={tagDropdownRef}>
                            <button
                              onClick={() => setShowTagDropdown(!showTagDropdown)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                            >
                              <span>Select tags...</span>
                              <i className={`ri-arrow-${showTagDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                            </button>
                            
                            {showTagDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                {allTags.map((tag) => (
                                  <div
                                    key={tag}
                                    onClick={() => {
                                      handleTagFilterToggle(tag);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                                      tagFilters.includes(tag) ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                                    }`}
                                  >
                                    <span>{tag}</span>
                                    {tagFilters.includes(tag) && (
                                      <i className="ri-check-line text-teal-600"></i>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Selected Tags */}
                          {tagFilters.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {tagFilters.map((tag) => (
                                <div
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs"
                                >
                                  <span>{tag}</span>
                                  <button
                                    onClick={() => removeTagFilter(tag)}
                                    className="hover:bg-teal-200 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                                  >
                                    <i className="ri-close-line text-xs"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {tagFilters.length === 0 && (
                            <div className="text-xs text-gray-500 italic mt-2">No tags selected</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">No tags available</div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={toggleAllTestCases}
                        className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                      >
                        {selectedTestCases.length === testCases.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
