export const onboarding = {
  // 환영 화면
  welcome: {
    greeting: 'Testably에 오신 것을 환영합니다!',
    subtitle: '2분 안에 워크스페이스를 설정해 보세요.',
    roleLabel: '직무',
    teamSizeLabel: '팀 규모',
    workspaceLabel: '어떻게 시작하시겠어요?',
    roles: {
      qa_engineer: 'QA 엔지니어',
      developer: '개발자',
      product_manager: '프로덕트 매니저',
      other: '기타',
    },
    teamSizes: {
      '1': '혼자',
      '2-5': '2–5명',
      '6-10': '6–10명',
      '10+': '10명 이상',
    },
    startFresh: {
      label: '빈 워크스페이스로 시작',
      description: '처음부터 직접 설정합니다',
    },
    trySample: {
      label: '샘플 데이터 사용해보기',
      description: '미리 채워진 프로젝트로 탐색합니다',
    },
    cta: '시작하기',
    loading: '워크스페이스를 설정하는 중…',
    errorMessage: '오류가 발생했습니다. 다시 시도해 주세요.',
  },

  // 온보딩 체크리스트
  checklist: {
    title: '시작 가이드',
    progress: '{{total}}개 중 {{completed}}개 완료',
    dismiss: '닫기',
    steps: {
      createProject: '첫 번째 프로젝트 만들기',
      createTestcase: '첫 번째 테스트케이스 작성하기',
      tryAi: 'AI 테스트케이스 생성 사용해보기',
      runTest: '첫 번째 테스트 실행하기',
      inviteMember: '팀원 초대하기',
      connectJira: 'Jira 연동하기 (선택)',
    },
    completed: '모든 항목 완료! 🎉',
    completedMessage: '온보딩 단계를 모두 완료했습니다.',
  },

  // 빈 상태
  emptyProjects: {
    headline: '첫 번째 프로젝트를 만들어보세요',
    description: '프로젝트는 테스트케이스, 테스트 런, 세션을 체계적으로 관리합니다. 직접 만들거나 샘플 데이터로 시작해보세요.',
    primaryCta: '새 프로젝트',
    secondaryCta: '샘플 데이터 사용해보기',
  },
  emptyTestCases: {
    headline: '테스트케이스가 없습니다',
    description: '테스트케이스는 테스트 항목과 예상 결과를 정의합니다. 직접 작성하거나 AI로 자동 생성해보세요.',
    primaryCta: '테스트케이스 작성',
    secondaryCta: 'AI로 생성하기',
  },
  emptyTestRuns: {
    headline: '테스트 런이 없습니다',
    description: '테스트 런은 테스트케이스를 실행하고 결과를 추적합니다. 첫 번째 런을 만들어 테스트를 시작해보세요.',
    primaryCta: '테스트 런 만들기',
    secondaryCta: '테스트 런 사용 방법',
  },
  emptySessions: {
    headline: '세션이 없습니다',
    description: '세션으로 탐색적 테스트를 기록할 수 있습니다. 세션을 시작하고 테스트케이스로 변환해보세요.',
    primaryCta: '세션 시작',
    secondaryCta: '가이드 보기',
  },
  emptyMilestones: {
    headline: '마일스톤이 없습니다',
    description: '마일스톤은 테스트케이스를 릴리스 목표로 묶어 진행 상황을 추적합니다.',
    primaryCta: '마일스톤 만들기',
  },

  // 샘플 프로젝트
  sampleProject: {
    creating: '샘플 프로젝트를 생성하는 중…',
    success: '샘플 프로젝트가 생성되었습니다! 이동 중…',
    error: '샘플 프로젝트 생성에 실패했습니다. 다시 시도해 주세요.',
  },
};

export default onboarding;
