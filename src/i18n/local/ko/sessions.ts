export const sessions = {
  title: '세션',
  createSession: '세션 생성',
  editSession: '세션 수정',
  deleteSession: '세션 삭제',
  sessionName: '세션 이름',
  sessionNotes: '세션 노트',
  noSessions: '세션이 없습니다',
  searchPlaceholder: '세션 검색...',
  
  // Session Details
  sessionDetails: '세션 상세',
  notes: '노트',
  attachments: '첨부파일',
  relatedTestCases: '관련 테스트 케이스',
  
  // Messages
  sessionCreated: '세션이 생성되었습니다',
  sessionUpdated: '세션이 수정되었습니다',
  sessionDeleted: '세션이 삭제되었습니다',

  // f024 — Toast (Dev Spec §6-3 A7 / A16)
  toast: {
    loadFailed: '세션을 불러오지 못했어요.',
  },

  // f025 — EmptyState 문구
  empty: {
    title: '아직 탐색 로그가 없어요',
    description:
      '탐색 테스트는 자동화 스크립트가 놓치는 부분을 기록해요. 세션을 시작하면 테스트 중 발견한 내용이 바로 저장됩니다.',
    cta: '탐색 로그 시작하기',
    secondaryCta: '탐색 테스트 알아보기',
    illustrationAlt: '돋보기와 겹쳐진 나침반과 주변에 흩어진 탐색 흔적',
  },
  emptyFiltered: {
    title: '필터 조건에 맞는 로그가 없어요',
    description: '검색어나 필터를 조정해 보세요.',
    clearCta: '필터 초기화',
  },
};

export default sessions;