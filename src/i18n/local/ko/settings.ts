export const settings = {
  title: '설정',
  
  // Tabs
  profile: '프로필',
  subscription: '구독',
  integrations: '통합',
  cicd: 'CI/CD',
  
  // Profile
  profileSettings: '프로필 설정',
  fullName: '이름',
  email: '이메일',
  avatar: '아바타',
  changePassword: '비밀번호 변경',
  currentPassword: '현재 비밀번호',
  newPassword: '새 비밀번호',
  confirmPassword: '비밀번호 확인',
  
  // Subscription
  currentPlan: '현재 플랜',
  freePlan: '무료 플랜',
  proPlan: '프로 플랜',
  enterprisePlan: '엔터프라이즈 플랜',
  upgradePlan: '플랜 업그레이드',
  billingHistory: '결제 내역',
  
  // Integrations
  jiraIntegration: 'Jira 통합',
  slackIntegration: 'Slack 통합',
  connect: '연결',
  disconnect: '연결 해제',
  connected: '연결됨',
  notConnected: '연결 안 됨',
  
  // CI/CD
  cicdIntegration: 'CI/CD 통합',
  apiTokens: 'API 토큰',
  createToken: '새 토큰 생성',
  tokenName: '토큰 이름',
  tokenCreated: '토큰이 생성되었습니다',
  tokenDeleted: '토큰이 삭제되었습니다',
  copyToken: '토큰 복사',
  deleteToken: '토큰 삭제',
  integrationGuide: '통합 가이드',
  githubActions: 'GitHub Actions',
  gitlabCI: 'GitLab CI',
  
  // Messages
  profileUpdated: '프로필이 업데이트되었습니다',
  passwordChanged: '비밀번호가 변경되었습니다',
  integrationConnected: '통합이 연결되었습니다',
  integrationDisconnected: '통합 연결이 해제되었습니다',

  // f024 — Toast (Dev Spec §6-3 A1 / A2 / A3)
  toast: {
    logoutFailed: '로그아웃에 실패했어요. 다시 시도해주세요.',
  },

  // ── f011 — AI 토큰 예산 모니터링 대시보드 ────────────────────
  // Dev Spec §12 (47 keys) + Design Spec §12 (26 additional) = 73 keys total
  aiUsage: {
    tab: 'AI 사용량',
    title: 'AI 크레딧 사용량',
    titleSelf: '나의 AI 크레딧 사용량',
    subtitle: {
      team: '이번 기간 동안 팀의 AI 크레딧 사용 현황을 확인하세요.',
      self: '이번 기간의 개인 AI 크레딧 사용 현황을 확인하세요.',
    },
    burnRate: {
      title: '월간 소진율',
      used: '{{used}} / {{limit}} 크레딧 사용',
      unlimited: '무제한 ({{used}} 사용)',
      daysLeft: '청구 주기 {{n}}일 남음',
      estimatedDepletion: '예상 소진일: {{date}}',
      onTrack: '정상 페이스',
      warning: '사용량이 플랜을 초과할 추세입니다',
      perDay: '하루 {{n}} 크레딧',
    },
    period: {
      label: '기간',
      triggerAria: '기간 선택',
      thisMonth: '이번 달',
      '30d': '최근 30일',
      '90d': '최근 90일',
      '6m': '최근 6개월',
      '12m': '최근 12개월',
      upgradeTooltip: '{{tier}} 플랜으로 업그레이드하여 더 긴 기록 보기',
    },
    chart: {
      title: '일별 사용량',
      yAxis: '크레딧',
      ariaLabel: '일별 AI 크레딧 사용량 누적 막대 차트',
      period: '{{from}} — {{to}} · UTC',
      total: '합계',
      srTableCaption: '기능별 일일 AI 크레딧 사용량',
      srColDate: '날짜',
      srColFeature: '기능',
      srColCredits: '크레딧',
    },
    mode: {
      text: '테스트 케이스 (텍스트)',
      jira: '테스트 케이스 (Jira)',
      session: '테스트 케이스 (세션)',
      runAnalysis: '런 분석',
      planAssistant: '플랜 어시스턴트',
      riskPredictor: '리스크 예측',
      milestoneRisk: '마일스톤 리스크',
      requirementSuggest: '요구사항 제안',
      envAiInsights: '환경 인사이트',
      other: '기타',
    },
    modeBreakdown: {
      title: '기능별 분해',
      colFeature: '기능',
      colCredits: '크레딧',
      colPercent: '전체 대비 %',
      colCalls: '호출 수',
    },
    memberTable: {
      title: '팀원별 기여도',
      colMember: '팀원',
      colCredits: '사용 크레딧',
      colShare: '비중',
      more: '외 {{n}}명',
    },
    kpi: {
      thisMonthLabel: '이번 달',
      thisMonthSub: '월간 한도의 {{pct}}%',
      burnRateLabel: '소진율',
      modeCountLabel: '사용한 기능',
      modeCountSub: '이번 기간 {{total}}개 중',
      activeMembersLabel: '활성 팀원',
      activeMembersSub: '팀원이 AI를 사용함',
    },
    empty: {
      title: '아직 AI 사용량이 없습니다',
      body: 'AI로 테스트 케이스를 생성하면 이곳에 사용량이 표시됩니다.',
      cta: 'AI 생성 시작하기',
    },
    error: {
      title: 'AI 사용량을 불러오지 못했습니다',
      retry: '다시 시도',
      forbidden: '팀 사용량을 볼 권한이 없습니다',
      chartUnavailable: '차트를 표시할 수 없습니다',
    },
    forbidden: {
      title: '팀 사용량을 볼 권한이 없습니다.',
      body: '예상하지 못한 경우 오너에게 문의하세요.',
      cta: '오너에게 문의',
      selfCta: '내 사용량 보기',
    },
    warning: {
      near: '이번 달 {{limit}} 크레딧 중 {{used}} 크레딧을 사용했습니다. 한도 도달 전에 플랜 업그레이드를 고려하세요.',
      reached: '이번 달 AI 크레딧 {{limit}}개를 모두 사용했습니다. 다음 청구 주기까지 새 AI 생성이 중단됩니다.',
      upgrade: '플랜 업그레이드',
    },
    export: {
      button: 'CSV 내보내기',
      aria: 'AI 사용량을 CSV로 내보내기',
      filename: 'ai-usage-{{date}}.csv',
    },
    offline: '오프라인입니다. 일부 데이터가 최신이 아닐 수 있습니다.',
    refresh: '새로고침',
    viewDetails: '자세히 보기',
    toast: {
      loadFailed: 'AI 사용량을 불러오지 못했습니다.',
      refreshed: 'AI 사용량을 새로고침했습니다.',
      refreshFailed: '새로고침 실패. 다시 시도해주세요.',
      exportStarted: 'CSV 내보내기를 준비 중입니다…',
      exportReady: 'CSV를 다운로드했습니다.',
      exportFailed: '내보내기 실패. 다시 시도해주세요.',
      forbidden: '팀 사용량을 볼 권한이 없습니다.',
    },
  },
};

export default settings;