export const testcases = {
  title: '테스트 케이스',
  createTestCase: '테스트 케이스 생성',
  editTestCase: '테스트 케이스 수정',
  deleteTestCase: '테스트 케이스 삭제',
  testCaseTitle: '제목',
  testCaseDescription: '설명',
  preconditions: '사전 조건',
  steps: '단계',
  expectedResult: '예상 결과',
  addStep: '단계 추가',
  folder: '폴더',
  allCases: '모든 케이스',
  noTestCases: '테스트 케이스가 없습니다',
  searchPlaceholder: '테스트 케이스 검색...',
  
  // Columns
  id: 'ID',
  title: '제목',
  priority: '우선순위',
  status: '상태',
  assignee: '담당자',
  createdBy: '생성자',
  lastUpdated: '최근 수정',
  
  // Filters
  filterByPriority: '우선순위 필터',
  filterByStatus: '상태 필터',
  filterByFolder: '폴더 필터',
  
  // Actions
  selectCases: '케이스 선택',
  selectedCases: '{{count}}개 선택됨',
  bulkActions: '일괄 작업',
  
  // Messages
  testCaseCreated: '테스트 케이스가 생성되었습니다',
  testCaseUpdated: '테스트 케이스가 수정되었습니다',
  testCaseDeleted: '테스트 케이스가 삭제되었습니다',

  // AI 생성
  aiGenerate: 'AI 생성',
  aiGenerateTitle: 'AI 테스트 케이스 생성',
  aiGenerateSubtitle: 'AI를 활용해 테스트 케이스를 자동으로 생성합니다',
  aiModeText: '텍스트 입력',
  aiModeTextDesc: '기능 설명을 입력하면 AI가 테스트 케이스를 생성합니다.',
  aiModeSession: '세션 기반 생성',
  aiModeSessionDesc: '탐색 테스트 세션 기록을 분석해 자동으로 생성합니다.',
  aiModeTextAvailable: '모든 플랜 사용 가능',
  aiModeSessionLocked: 'Professional 이상 필요',
  aiInputLabel: '기능 설명',
  aiInputPlaceholder: '예: 이메일/비밀번호와 Google OAuth를 지원하는 로그인 기능...',
  aiInputHint: '더 상세하게 설명할수록 더 정확한 테스트 케이스가 생성됩니다.',
  aiSessionLabel: '세션 선택',
  aiNoSessions: '이 프로젝트에 세션이 없습니다.',
  aiGenerateTitles: '제목 목록 생성',
  aiGenerateDetails: '{{count}}개 상세 생성',
  aiSaveCases: '{{count}}개 저장',
  aiSelectAll: '전체 선택',
  aiDeselectAll: '전체 해제',
  aiTitlesHint: '상세 생성할 항목을 선택하세요.',
  aiDetailsHint: '저장할 테스트 케이스를 선택하세요.',
  aiUsage: '이번 달 {{used}} / {{limit}}회',
  aiUnlimited: '무제한',
  aiLimitReached: '이번 달 AI 생성 한도에 도달했습니다. 플랜을 업그레이드하세요.',
  aiGenerating: '생성 중...',
  aiSaving: '저장 중...',
  aiBackToMode: '모드 선택으로',
  aiSelectedCount: '{{count}}개 선택됨',
  aiSessionMode: 'Professional+ 전용',

  // f024 — Toast (Dev Spec §6-3 A17 / A18 / A20)
  toast: {
    attachmentDeleteFailed: '첨부파일 삭제에 실패했어요.',
    generateSaveFailed: '생성된 테스트 케이스 저장에 실패했어요.',
  },
};

export default testcases;