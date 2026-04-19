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
    lastSynced: '{{time}} 전 동기화됨',
    refreshNow: '지금 새로고침',
    refreshSuccess: '{{count}}개 이슈 동기화 완료',
    refreshError: '이슈 새로고침 실패',
    metaUnavailable: '메타데이터 없음',
  },
};

export default common;