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
      critical: '0–20',
      na: 'N/A',
      r0to20: '0–20',
      r20to40: '20–40',
      r40to60: '40–60',
      r60to75: '60–75',
      r75to95: '75–95',
      r95to100: '95–100',
    },
    scaleLabelV2: 'Pass rate',
    drillHint: '셀 클릭 → TC × 환경 run 상세 보기',
    ai: {
      sectionTitle: 'Coverage Insights',
      patternCount: '패턴 {{count}}개',
      critical: {
        tag: '심각 · 환경',
        envLowTitle: '{{env}} 환경 저성능',
        envLowDetail: '{{env}} 환경의 통과율이 이 Plan에서 {{rate}}%에 불과합니다.',
        browserTitle: '전체 OS에서 {{browser}} 취약',
        browserDetail: '{{browser}}가 {{osCount}}개 OS에서 평균 {{rate}}% 통과율을 보입니다.',
        empty: '심각한 이슈가 감지되지 않았습니다.',
        actionIssue: '이슈 생성',
        actionFilter: '필터 적용',
      },
      gap: {
        tag: '커버리지 공백',
        title: '{{tc}} 미실행 구간 존재',
        detail: '이 테스트 케이스는 {{untested}}/{{total}}개 환경에서 미실행 상태입니다.',
        empty: '커버리지 공백 없음.',
        actionAssign: 'Run 할당',
      },
      baseline: {
        tag: '안정 기준',
        title: '{{env}} = {{rate}}%',
        detail: '디버깅 기준으로 사용할 수 있습니다.',
        empty: '안정 기준이 아직 없습니다.',
      },
      stats: {
        tag: '빠른 통계',
        bestEnv: '최고 환경',
        worstEnv: '최저 환경',
        bestTc: '최고 TC',
        worstTc: '최저 TC',
        noData: '–',
      },
      toast: {
        createIssue: '이슈 생성 기능은 곧 제공됩니다',
        filter: '환경 필터는 곧 제공됩니다',
        assignRun: 'Run 할당은 곧 제공됩니다',
      },
    },
  },

  // Cell drill modal (plan-detail Environments tab) — phase 2a
  drillModal: {
    header: 'TC × 환경',
    noRuns: '이 조합에서 찾은 실행이 없습니다.',
    runStatusSuffix: '실행 {{status}}',
    passedOfExecuted: '{{executed}}개 중 {{passed}}개 통과',
  },
};

export default environments;
