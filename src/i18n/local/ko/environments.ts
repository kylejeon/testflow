export const environments = {
  sectionTitle: '환경',
  sectionDesc: '테스트를 실행할 OS/브라우저/디바이스 조합을 정의하세요.',
  addButton: '환경 추가',
  editTitle: '환경 수정',

  emptyTitle: '등록된 환경이 없습니다',
  emptyDesc: '환경을 추가하면 Coverage Matrix를 사용할 수 있습니다.',

  form: {
    name: '이름',
    namePlaceholder: '예: Chrome 124 / macOS 14',
    osName: '운영체제',
    osVersion: 'OS 버전',
    browserName: '브라우저',
    browserVersion: '브라우저 버전',
    deviceType: '기기',
    description: '설명 (선택)',
    save: '저장',
    saving: '저장 중...',
    cancel: '취소',
    device: {
      desktop: '데스크톱',
      mobile: '모바일',
      tablet: '태블릿',
    },
  },

  preset: {
    title: '빠른 등록',
    chromeMacos: 'Chrome / macOS',
    chromeWindows: 'Chrome / Windows',
    firefoxUbuntu: 'Firefox / Ubuntu',
    safariIos: 'Safari / iOS',
  },

  table: {
    name: '이름',
    os: 'OS',
    browser: '브라우저',
    device: '기기',
    active: '활성',
    actions: '작업',
  },

  action: {
    edit: '수정',
    deactivate: '비활성화',
    activate: '활성화',
    delete: '완전 삭제',
  },

  deleteConfirmTitle: '환경을 삭제하시겠습니까?',
  deleteConfirm: '환경을 완전히 삭제합니다. 관련 Run의 연결이 해제됩니다. 계속하시겠습니까?',
  deleteLabel: '삭제',
  deletingLabel: '삭제 중…',

  dropdown: {
    select: '환경 선택',
    addNew: '+ 새로 추가…',
    addOne: '추가하기',
    loading: '불러오는 중...',
    inactiveTag: '(비활성)',
    noActive: '활성 환경이 없습니다. 먼저 추가하세요.',
    freeformPlaceholder: '환경 (예: Chrome 124 / macOS 14)',
    manageLink: '환경 관리',
    noEnvsHint: '이 프로젝트에 등록된 환경이 없습니다.',
  },

  limit: {
    banner: '플랜에서 {{used}}/{{max}}개 환경을 사용 중입니다.',
    upgradeCta: '업그레이드',
  },

  error: {
    duplicateName: '같은 이름의 환경이 이미 존재합니다.',
    permission: '환경 관리는 Tester 이상 권한이 필요합니다.',
    deactivatePermission: '환경 비활성화는 Admin 이상만 가능합니다.',
    loadFailed: '환경을 불러오지 못했습니다.',
    retry: '다시 시도',
  },

  toast: {
    created: '환경이 생성되었습니다',
    updated: '환경이 수정되었습니다',
    activated: '환경이 활성화되었습니다',
    deactivated: '환경이 비활성화되었습니다',
    deleted: '환경이 삭제되었습니다',
    presetAdded: '"{{name}}" 추가됨',
  },

  heatmap: {
    title: '환경 커버리지 매트릭스',
    envSummary: '환경 요약',
    legacyWarning: '레거시 환경 텍스트만 있는 Run {{count}}개 (미표시)',
    empty: '이 Plan에 구조화된 환경을 가진 Run이 없습니다.',
    emptyLegacyOnly: '이 Plan의 모든 Run이 레거시 텍스트 환경을 사용 중입니다. 매트릭스를 표시할 수 없습니다.',
    emptyNoTcs: '이 Plan에 테스트 케이스가 없습니다.',
    loadFailed: '환경 커버리지 데이터를 불러오지 못했습니다.',
    tcsByEnvs: 'TC {{tcs}}개 × 환경 {{envs}}개',
    scaleLabel: '기준:',
    scale: {
      perfect: '완벽',
      pass: '통과',
      mixed: '혼합',
      warn: '주의',
      fail: '실패',
      untested: '미실행',
    },
  },
};

export default environments;
