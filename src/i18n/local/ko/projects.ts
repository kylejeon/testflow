export const projects = {
  title: '프로젝트',
  subtitle: '테스트 프로젝트를 생성하고 관리하세요',
  createProject: '새 프로젝트',
  editProject: '프로젝트 수정',
  deleteProject: '프로젝트 삭제',
  projectName: '프로젝트 이름',
  projectKey: '프로젝트 키',
  projectDescription: '프로젝트 설명',
  allProjects: '전체 프로젝트',
  myProjects: '내 프로젝트',
  archivedProjects: '보관된 프로젝트',
  noProjects: '프로젝트가 없습니다',
  searchPlaceholder: '프로젝트 검색...',
  
  // Project List
  projectList: '프로젝트 목록',
  allStatus: '모든 상태',
  testRuns: '테스트 실행',
  createdThisMonth: '이번 달 생성',
  noSearchResults: '검색 결과가 없습니다',
  tryDifferentSearch: '다른 검색어나 필터를 시도해보세요',
  createFirstProject: '첫 번째 테스트 프로젝트를 생성해보세요',
  noDescription: '설명 없음',
  viewDetails: '상세보기',
  
  // Project Details
  about: '정보',
  timeline: '타임라인',
  currentMilestones: '현재 마일스톤',
  testingActivity: '테스트 활동',
  recentActivity: '최근 활동',
  projectMembers: '프로젝트 멤버',
  
  // Modals
  createProjectTitle: '새 프로젝트 만들기',
  editProjectTitle: '프로젝트 수정',
  deleteConfirmTitle: '프로젝트 삭제',
  deleteConfirmMessage: '이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  inviteMember: '멤버 초대',
  inviteMemberEmail: '이메일 주소',
  inviteMemberRole: '역할',
  
  // Roles
  admin: '관리자',
  member: '멤버',
  viewer: '뷰어',
  
  // Messages
  projectCreated: '프로젝트가 생성되었습니다',
  projectUpdated: '프로젝트가 수정되었습니다',
  projectDeleted: '프로젝트가 삭제되었습니다',
  memberInvited: '멤버가 초대되었습니다',

  // f024 — Toast (Dev Spec §6-3 A6)
  toast: {
    membersLoadFailed: '프로젝트 멤버를 불러오지 못했어요.',
  },

  // f001 + f002 — Environment AI Insights plan-detail 워크플로우
  plan: {
    env: {
      ai: {
        issueModalTitle: 'AI 인사이트로 이슈 생성',
        issueModalTabJira: 'Jira',
        issueModalTabGithub: 'GitHub',
        issueModalTitleField: '제목',
        issueModalTitleRequired: '제목은 필수입니다',
        issueModalDescriptionField: '설명',
        issueModalLabelsField: '라벨 (선택)',
        issueModalLabelsPlaceholder: '입력 후 Enter…',
        issueModalPriorityField: '우선순위',
        issueModalPriorityHigh: '높음',
        issueModalPriorityMedium: '보통',
        issueModalPriorityLow: '낮음',
        issueModalCreate: '이슈 생성',
        issueModalCreating: '생성 중…',
        issueModalCancel: '취소',
        issueModalNoIntegration: '이슈 트래커를 먼저 연결해주세요',
        issueModalNoIntegrationDetail:
          'AI 인사이트로 이슈를 생성하려면 Jira 또는 GitHub 연동이 필요합니다.',
        issueModalGoSettings: '설정 열기',
        issueModalLoading: '연결 정보 불러오는 중…',
        issueModalProjectKey: 'Jira 프로젝트 키',
        issueModalIssueType: '이슈 타입',
        issueModalRepo: 'GitHub 레포',
        issueCreated: '이슈가 생성되었습니다',
        issueCreatedWithLink: '이슈가 생성되었습니다 · 보기',
        issueCreateFailed: '이슈 생성 실패: {{detail}}',
        assignRunToast: '"{{tc}}" 커버리지를 채울 수 있도록 실행을 추가해주세요.',
        filterActive: '{{env}} 필터 중',
        filterClear: '해제',
        runsSectionNotFound: '실행 섹션을 찾을 수 없습니다 — Runs 탭으로 이동해주세요.',
      },
    },
  },
};

export default projects;