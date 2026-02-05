import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  parent_milestone_id: string | null;
}

interface MilestoneWithProgress extends Milestone {
  totalTests: number;
  completedTests: number;
  actualProgress: number;
  subMilestones?: MilestoneWithProgress[];
}

export default function ProjectMilestones() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<MilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithProgress | null>(null);
  const [parentMilestoneId, setParentMilestoneId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

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

      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('start_date', { ascending: true });

      if (milestonesError) throw milestonesError;

      // Fetch all test runs for this project
      const { data: allRunsData, error: allRunsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id);

      if (allRunsError) throw allRunsError;

      // Fetch all test results
      const { data: allTestResultsData, error: allTestResultsError } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status')
        .in('run_id', (allRunsData || []).map(r => r.id))
        .order('created_at', { ascending: false });

      if (allTestResultsError) throw allTestResultsError;

      // Calculate progress for each milestone
      const milestonesWithProgress = (milestonesData || []).map((milestone) => {
        // Check if milestone is past due
        let currentStatus = milestone.status;
        if (milestone.end_date && milestone.status !== 'completed') {
          const [year, month, day] = milestone.end_date.split('T')[0].split('-');
          const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (endDate < today) {
            currentStatus = 'past_due';
            supabase
              .from('milestones')
              .update({ status: 'past_due' })
              .eq('id', milestone.id);
          }
        }
        
        const milestoneRuns = allRunsData?.filter(run => run.milestone_id === milestone.id) || [];

        if (milestoneRuns.length === 0) {
          return { 
            ...milestone,
            status: currentStatus,
            totalTests: 0,
            completedTests: 0,
            actualProgress: 0 
          };
        }

        let totalTestsSum = 0;
        let completedTestsSum = 0;

        milestoneRuns.forEach(run => {
          const runResults = allTestResultsData?.filter(r => r.run_id === run.id) || [];
          const statusMap = new Map<string, string>();
          
          runResults.forEach(result => {
            if (!statusMap.has(result.test_case_id)) {
              statusMap.set(result.test_case_id, result.status);
            }
          });

          const totalTests = run.test_case_ids.length;
          totalTestsSum += totalTests;

          if (totalTests === 0) return;

          let completedTests = 0;
          run.test_case_ids.forEach((tcId: string) => {
            const status = statusMap.get(tcId);
            if (status === 'passed' || status === 'failed') {
              completedTests++;
            }
          });

          completedTestsSum += completedTests;
        });

        const averageProgress = totalTestsSum > 0 
          ? Math.round((completedTestsSum / totalTestsSum) * 100)
          : 0;

        return { 
          ...milestone,
          status: currentStatus,
          totalTests: totalTestsSum,
          completedTests: completedTestsSum,
          actualProgress: averageProgress 
        };
      });

      // Organize milestones into parent-child structure
      const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
      const organizedMilestones = parentMilestones.map(parent => ({
        ...parent,
        subMilestones: milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id)
      }));

      // Set all milestones with sub-milestones as expanded by default
      const initialExpanded = new Set<string>();
      organizedMilestones.forEach(milestone => {
        if (milestone.subMilestones && milestone.subMilestones.length > 0) {
          initialExpanded.add(milestone.id);
        }
      });
      setExpandedMilestones(initialExpanded);

      setMilestones(organizedMilestones);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (data: any) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .insert([{
          project_id: id,
          status: 'upcoming',
          progress: 0,
          parent_milestone_id: parentMilestoneId,
          ...data
        }]);

      if (error) throw error;
      
      setShowCreateModal(false);
      setParentMilestoneId(null);
      fetchData();
    } catch (error) {
      console.error('마일스톤 생성 오류:', error);
      alert('마일스톤 생성에 실패했습니다.');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, data: any) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .update(data)
        .eq('id', milestoneId);

      if (error) throw error;
      
      setEditingMilestone(null);
      fetchData();
    } catch (error) {
      console.error('마일스톤 수정 오류:', error);
      alert('마일스톤 수정에 실패했습니다.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('이 마일스톤을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
      
      fetchData();
    } catch (error) {
      console.error('마일스톤 삭제 오류:', error);
      alert('마일스톤 삭제에 실패했습니다.');
    }
  };

  const handleStartMilestone = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'started' });
  };

  const handleMarkAsComplete = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'completed' });
  };

  const toggleExpanded = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatMonthDay = (dateStr: string | null) => {
    if (!dateStr) return { month: '', day: '' };
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = parseInt(day);
    return { month: monthName, day: dayNum };
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-500 text-white' },
      started: { label: 'Started', className: 'bg-green-500 text-white' },
      past_due: { label: 'Past due', className: 'bg-orange-500 text-white' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' }
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const getProgressBarColor = (status: string, progress: number) => {
    if (status === 'completed') return 'bg-gray-400';
    if (status === 'past_due') return 'bg-orange-500';
    if (status === 'started') return 'bg-green-500';
    return 'bg-gray-300';
  };

  const filteredMilestones = activeTab === 'active' 
    ? milestones.filter(m => m.status !== 'completed')
    : milestones.filter(m => m.status === 'completed');

  // Group milestones by month
  const groupedMilestones = filteredMilestones.reduce((acc, milestone) => {
    const endDate = milestone.end_date ? (() => {
      const [year, month, day] = milestone.end_date.split('T')[0].split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    })() : null;
    const monthKey = endDate ? endDate.toLocaleDateString('en-US', { month: 'short' }) : 'No Date';
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(milestone);
    return acc;
  }, {} as Record<string, MilestoneWithProgress[]>);

  const isMonthPastDue = (monthMilestones: MilestoneWithProgress[]) => {
    if (monthMilestones.length === 0) return false;
    const firstMilestone = monthMilestones[0];
    if (!firstMilestone.end_date) return false;
    
    const [year, month, day] = firstMilestone.end_date.split('T')[0].split('-');
    const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return endDate < today;
  };

  const renderMilestone = (milestone: MilestoneWithProgress, isSubMilestone: boolean = false) => {
    const endDateInfo = formatMonthDay(milestone.end_date);
    const badge = getStatusBadge(milestone.status);
    const hasSubMilestones = milestone.subMilestones && milestone.subMilestones.length > 0;
    const isExpanded = expandedMilestones.has(milestone.id);

    return (
      <div key={milestone.id}>
        <Link
          to={`/projects/${id}/milestones/${milestone.id}`}
          className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-500 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              {hasSubMilestones && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpanded(milestone.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line text-lg`}></i>
                </button>
              )}
              <div className={`w-8 h-8 ${isSubMilestone ? 'bg-gray-50' : 'bg-gray-100'} rounded flex items-center justify-center`}>
                <i className={`${isSubMilestone ? 'ri-run-line' : 'ri-flag-line'} text-gray-600`}></i>
              </div>
              <span className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                {milestone.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {formatMonthDay(milestone.start_date).month} {formatMonthDay(milestone.start_date).day} - {endDateInfo.month} {endDateInfo.day}
              </span>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
              {!isSubMilestone && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setParentMilestoneId(milestone.id);
                    setShowCreateModal(true);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <i className="ri-add-line text-base w-4 h-4 flex items-center justify-center"></i>
                  Sub
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingMilestone(milestone);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <i className="ri-edit-line text-base w-4 h-4 flex items-center justify-center"></i>
                Edit
              </button>
              {milestone.status === 'upcoming' ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartMilestone(milestone.id);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Start
                </button>
              ) : milestone.status === 'started' ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkAsComplete(milestone.id);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Complete
                </button>
              ) : milestone.status === 'past_due' ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkAsComplete(milestone.id);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Complete
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressBarColor(milestone.status, milestone.actualProgress)}`}
                style={{ width: `${milestone.actualProgress}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-900 min-w-[50px] text-right">
              {milestone.actualProgress}%
            </span>
          </div>
        </Link>

        {/* Sub Milestones */}
        {hasSubMilestones && isExpanded && (
          <div className="ml-12 mt-4 space-y-4">
            {milestone.subMilestones!.map(subMilestone => (
              <div key={subMilestone.id}>
                {renderMilestone(subMilestone, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
                  JK
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">마일스톤을 불러오는 중...</p>
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
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
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
                  className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                >
                  JK
                </div>
                
                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowProfileMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <Link
                        to="/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('Log out 기능이 실행됩니다.');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg w-5 h-5 flex items-center justify-center"></i>
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
              <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
              <button 
                onClick={() => {
                  setParentMilestoneId(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-add-line text-lg w-5 h-5 flex items-center justify-center"></i>
                Milestone
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-1 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'active'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ACTIVE ({milestones.filter(m => m.status !== 'completed').length})
                  {activeTab === 'active' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-1 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'completed'
                      ? 'text-teal-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  COMPLETED ({milestones.filter(m => m.status === 'completed').length})
                  {activeTab === 'completed' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading milestones...</p>
              </div>
            ) : filteredMilestones.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-flag-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 text-lg">No {activeTab} milestones</p>
                <p className="text-gray-400 text-sm mt-2">Create your first milestone to get started</p>
              </div>
            ) : (
              <div className="space-y-0">
                {Object.entries(groupedMilestones).map(([month, monthMilestones]) => (
                  <div key={month}>
                    {monthMilestones.map((milestone, index) => {
                      const endDateInfo = formatMonthDay(milestone.end_date);
                      const isLastInMonth = index === monthMilestones.length - 1;
                      const isLastOverall = month === Object.keys(groupedMilestones)[Object.keys(groupedMilestones).length - 1] && isLastInMonth;
                      const isPastDue = isMonthPastDue(monthMilestones);
                      
                      return (
                        <div key={milestone.id} className="flex gap-6">
                          {/* Date Column */}
                          <div className="flex flex-col items-center w-16 flex-shrink-0">
                            {index === 0 && (
                              <div className={`${isPastDue ? 'bg-orange-500' : 'bg-gray-400'} text-white text-sm font-bold px-3 py-1.5 rounded mb-2`}>
                                {month}
                              </div>
                            )}
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">{endDateInfo.day}</div>
                            </div>
                          </div>

                          {/* Timeline Line */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-3 h-3 bg-gray-300 rounded-full mt-1"></div>
                            {!isLastOverall && (
                              <div className="w-0.5 bg-gray-300 flex-1 min-h-[80px]"></div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-8">
                            {renderMilestone(milestone)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {parentMilestoneId ? 'Create Sub Milestone' : 'Create New Milestone'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateMilestone({
                  name: formData.get('name'),
                  start_date: formData.get('start_date'),
                  end_date: formData.get('end_date')
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setParentMilestoneId(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Milestone</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateMilestone(editingMilestone.id, {
                  name: formData.get('name'),
                  start_date: formData.get('start_date'),
                  end_date: formData.get('end_date')
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingMilestone.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={editingMilestone.start_date || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={editingMilestone.end_date || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => handleDeleteMilestone(editingMilestone.id)}
                  className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Delete
                </button>
                <div className="flex-1"></div>
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
