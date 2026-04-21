export const common = {
  // Navigation
  overview: '개요',
  milestones: '마일스톤',
  documentation: '문서',
  testCases: '테스트 케이스',
  runsAndResults: '실행 및 결과',
  sessions: '디스커버리 로그',
  settings: '설정',
  projects: '프로젝트',

  // Actions
  create: '생성',
  edit: '수정',
  delete: '삭제',
  save: '저장',
  cancel: '취소',
  confirm: '확인',
  close: '닫기',
  add: '추가',
  remove: '제거',
  search: '검색',
  filter: '필터',
  sort: '정렬',
  export: '내보내기',
  import: '가져오기',
  upload: '업로드',
  download: '다운로드',
  invite: '초대',
  accept: '수락',
  reject: '거부',
  logout: '로그아웃',

  // Status
  active: '활성',
  inactive: '비활성',
  completed: '완료',
  archived: '보관됨',
  upcoming: '예정',
  started: '시작됨',
  pastDue: '기한 초과',
  new: '신규',
  inProgress: '진행 중',

  // Test Status
  passed: '통과',
  failed: '실패',
  blocked: '차단됨',
  retest: '재테스트',
  untested: '미테스트',

  // Priority
  high: '높음',
  medium: '보통',
  low: '낮음',

  // Common Labels
  name: '이름',
  description: '설명',
  status: '상태',
  priority: '우선순위',
  createdAt: '생성일',
  updatedAt: '수정일',
  startDate: '시작일',
  endDate: '종료일',
  dueDate: '마감일',
  assignee: '담당자',
  owner: '소유자',
  members: '멤버',

  // Messages
  loading: 'Loading...',
  noData: '데이터가 없습니다',
  error: '오류가 발생했습니다',
  success: '성공',
  confirmDelete: '정말 삭제하시겠습니까?',

  // Time
  today: '오늘',
  yesterday: '어제',
  daysAgo: '{{count}}일 전',
  weeksAgo: '{{count}}주 전',
  monthsAgo: '{{count}}개월 전',

  // Relative time (new — common.time.*, used by formatRelativeTime helper)
  time: {
    justNow: '방금 전',
    minutesAgo_one: '{{count}}분 전',
    minutesAgo_other: '{{count}}분 전',
    hoursAgo_one: '{{count}}시간 전',
    hoursAgo_other: '{{count}}시간 전',
    daysAgo_one: '{{count}}일 전',
    daysAgo_other: '{{count}}일 전',
    monthsAgo_one: '{{count}}개월 전',
    monthsAgo_other: '{{count}}개월 전',
    yearsAgo_one: '{{count}}년 전',
    yearsAgo_other: '{{count}}년 전',
  },

  // Weekday short labels
  weekday: {
    short: {
      mon: '월',
      tue: '화',
      wed: '수',
      thu: '목',
      fri: '금',
      sat: '토',
      sun: '일',
    },
  },

  // Shared toast messages
  toast: {
    saved: '설정이 저장되었습니다',
    saveFailed: '저장에 실패했습니다',
    networkError: '네트워크 오류. 다시 시도해 주세요.',
    somethingWentWrong: '문제가 발생했습니다.',
  },

  issues: {
    priority: {
      critical: '심각',
      high: '높음',
      medium: '보통',
      low: '낮음',
      none: '—',
    },
    status: {
      open: '오픈',
      inProgress: '진행 중',
      resolved: '해결됨',
      closed: '닫힘',
    },
    assignee: {
      unassigned: '미지정',
    },
    // IssuesList / LastSyncedLabel
    lastSynced: '마지막 동기화 {{time}}',
    notSyncedYet: '아직 동기화 안됨',
    syncing: '동기화 중…',
    refreshNow: '지금 새로고침',
    refreshSuccess: '이슈 {{count}}건 동기화됨',
    refreshError: '이슈 새로고침 실패',
    refreshFailed: '이슈 새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    syncedCount: '이슈 {{count}}건 동기화됨',
    debounceWait: '잠시 후 다시 새로고침해 주세요',
    metaUnavailable: '메타데이터 없음',
    metadataUnavailable: '메타데이터 없음',
    loading: '이슈 불러오는 중…',
    sources: '소스',
    all: '전체',
    jira: 'Jira',
    github: 'GitHub',
    totalIssues: '전체 이슈',
    linkedTcs: '연결된 TC',
    bugReports: '버그 리포트',
    issues: '이슈',
    withIssue: '이슈 연결됨',
    fromRuns_one: '실행 {{count}}건에서',
    fromRuns_other: '실행 {{count}}건에서',
    tcsWithLinkedIssues_one: '연결된 이슈가 있는 TC {{count}}건.',
    tcsWithLinkedIssues_other: '연결된 이슈가 있는 TC {{count}}건.',
    sourceSuffix: {
      jira: 'Jira {{count}}건.',
      github: 'GitHub {{count}}건.',
    },
    sourceLabel: {
      jiraBug: 'Jira · 버그',
      github: 'GitHub',
    },
    empty: {
      title: '연결된 이슈가 없습니다.',
      hint: '실패한 테스트 결과에 Jira 또는 GitHub 이슈를 연결하면 여기에 표시됩니다.',
    },
    rowLabel: 'TC {{tcId}}의 이슈',
    a11y: {
      issueRow: '{{source}} 이슈 {{key}}, 우선순위 {{priority}}, 상태 {{status}}',
      unknownPriority: '알 수 없음',
      unknownStatus: '알 수 없음',
      refresh: '이슈 메타데이터 새로고침',
    },
  },
};

export default common;
