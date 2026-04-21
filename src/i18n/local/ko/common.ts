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
  unknownError: '알 수 없는 오류',

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
    // f024 — 공용 내보내기 실패 (Dev Spec §6-3 A4, Design Spec §4-1)
    exportFailed: '보고서 내보내기에 실패했어요. 다시 시도해주세요.',
    // f024 — getApiErrorMessage(code) 매핑 (Design Spec §5)
    apiErrors: {
      recordNotFound: '데이터를 찾을 수 없어요.',
      permissionDenied: '이 작업을 수행할 권한이 없어요.',
      recordExists: '이미 존재하는 항목이에요.',
      relatedMissing: '관련 항목이 없어서 처리할 수 없어요.',
      insufficientPrivilege: '권한이 부족해요. 플랜이나 역할을 확인해주세요.',
      invalidEmail: '유효하지 않은 이메일 주소예요.',
      userNotFound: '해당 이메일로 가입된 계정이 없어요.',
      wrongPassword: '비밀번호가 일치하지 않아요.',
      sessionExpired: '세션이 만료됐어요. 다시 로그인해주세요.',
      notFound: '요청한 항목을 찾을 수 없어요.',
      conflict: '기존 데이터와 충돌해요. 이미 존재할 수 있어요.',
      rateLimited: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
      serverError: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      networkError: '연결 문제가 발생했어요. 네트워크를 확인하고 다시 시도해주세요.',
      timeout: '요청 시간이 초과됐어요. 다시 시도해주세요.',
      cancelled: '요청이 취소됐어요.',
      generic: '문제가 발생했어요. 다시 시도해주세요.',
    },
  },

  // f024 — ErrorBoundary fallback UI (Design Spec §2 / §3)
  errorBoundary: {
    title: '문제가 발생했어요',
    description: '문제를 확인하고 있어요. 잠시 후 다시 시도하거나 대시보드로 돌아가주세요.',
    reload: '다시 시도',
    goHome: '대시보드로',
    reportId: '문제 보고 번호: {{id}}',
    reportIdMissing: '에러 상세 정보를 수집하지 못했어요.',
    sendReport: '문제 신고 메일 보내기',
    devDetailsSummary: '에러 상세 정보',
    section: {
      title: '"{{sectionName}}" 섹션을 불러오지 못했어요.',
      titleGeneric: '이 섹션을 불러오지 못했어요.',
      hint: '새로고침하거나 문제가 계속되면 지원팀에 문의해주세요.',
      retry: '재시도',
    },
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
