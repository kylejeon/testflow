export const runs = {
  title: '실행 및 결과',
  createRun: '실행 생성',
  editRun: '실행 수정',
  deleteRun: '실행 삭제',
  runName: '실행 이름',
  runDescription: '설명',
  selectTestCases: '테스트 케이스 선택',
  noRuns: '실행이 없습니다',
  searchPlaceholder: '실행 검색...',

  // Run Details
  runDetails: '실행 상세',
  testResults: '테스트 결과',
  progress: '진행률',
  totalTests: '전체 테스트',
  passRate: '통과율',

  // Test Execution
  markAs: '상태 변경',
  addComment: '댓글 추가',
  attachFile: '파일 첨부',
  executionHistory: '실행 이력',

  // Messages
  runCreated: '실행이 생성되었습니다',
  runUpdated: '실행이 수정되었습니다',
  runDeleted: '실행이 삭제되었습니다',
  resultUpdated: '결과가 업데이트되었습니다',

  // AI Run Summary panel
  // NOTE: Claude 응답 본문은 AC-9 에 따라 번역 대상이 아님.
  aiSummary: {
    title: 'AI 실행 요약',
    analyzing: '분석 중…',
    analyzingResultsFor: '결과 {{count}}건의 패턴을 분석 중입니다…',
    analyzingHint: '보통 10-15초 소요됩니다',
    tryAgain: '다시 시도',
    staleBanner: '이 요약이 생성된 이후 테스트 결과가 변경되었습니다.',
    updating: '갱신 중…',
    updateCta: '요약 갱신',
    riskSuffix: '위험도 {{level}}',
    creditUsed: 'AI 크레딧 1건 사용',
    failurePatterns: '실패 패턴',
    noFailurePatterns: '감지된 실패 패턴이 없습니다.',
    recommendations: '권장 조치',
    metric: {
      total: '전체',
      passed: '통과',
      failed: '실패',
      blocked: '차단',
      passRate: '통과율',
      skipped: '스킵',
    },
    goNoGo: {
      go: 'GO',
      noGo: 'NO-GO',
      conditional: '조건부 GO',
    },
    error: {
      default: '분석을 완료할 수 없습니다',
      monthlyLimit: '월 AI 한도 도달 ({{used}}/{{limit}})',
      tooMany: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      tierTooLow: 'AI 요약은 Starter 플랜부터 사용할 수 있습니다',
      noResults: '분석할 테스트 결과가 없습니다',
      unauthorized: '다시 로그인해 주세요',
      connection: '연결 오류가 발생했습니다. 다시 시도해 주세요.',
    },
    action: {
      copyMarkdown: 'Markdown으로 복사',
      copied: '복사됨!',
      inPdf: 'PDF 포함 ✓',
      includeInPdf: 'PDF에 포함',
      share: '공유…',
      shareSlack: 'Slack으로 공유',
      shareEmail: '이메일로 공유',
      createJira: 'Jira 이슈 생성',
      createGithub: 'GitHub 이슈 생성',
      rerunFailed: '실패 재실행 ({{count}})',
      creating: '생성 중…',
    },
    jira: {
      sectionTitle: 'Jira 이슈 생성 중',
      priorityLabel: '우선순위: {{priority}}',
      labelsPrefix: '라벨: ai-detected, regression',
      relatedTcs: '관련 TC {{count}}건 · 설명에 AI 실행 요약 포함',
      createIssue: '이슈 생성',
    },
    github: {
      sectionTitle: 'GitHub 이슈 생성',
      titleLabel: '제목',
      bodyLabel: '본문',
      willBeCreatedIn: '다음 위치에 생성됩니다:',
      labelsSuffix: '라벨:',
      createIssue: '이슈 생성',
    },
    slack: {
      sectionTitle: 'Slack으로 공유',
      selectChannel: '채널 선택',
      unnamedChannel: '이름 없는 채널',
      webhookLabel: 'Slack Webhook URL',
      webhookPlaceholder: 'https://hooks.slack.com/services/...',
      noIntegration: 'Slack 연동이 없습니다. Settings › Integrations 에서 연동하거나 위에 webhook URL을 입력하세요.',
    },
    email: {
      sectionTitle: '이메일로 공유',
      recipientLabel: '수신자 이메일',
      recipientPlaceholder: 'teammate@company.com',
    },
    sending: '전송 중…',
    send: '전송',
    toast: {
      copied: '요약이 Markdown 형식으로 클립보드에 복사되었습니다',
      copyFailed: '클립보드 복사에 실패했습니다',
      jiraKeyMissing: '이 프로젝트에 Jira Project Key가 설정되어 있지 않습니다. 프로젝트 설정을 수정해 주세요.',
      jiraCreated: 'Jira 이슈{{keySuffix}} 생성됨',
      jiraFailed: 'Jira 이슈 생성에 실패했습니다',
      githubCreated: 'GitHub 이슈 #{{number}} 생성됨',
      githubFailed: 'GitHub 이슈 생성에 실패했습니다',
      slackWebhookRequired: 'Slack webhook URL을 입력해 주세요',
      slackShared: '요약이 Slack으로 공유되었습니다',
      slackFailed: 'Slack 전송에 실패했습니다',
      emailRequired: '이메일 주소를 입력해 주세요',
      emailShared: '요약이 {{email}}으로 공유되었습니다',
      emailFailed: '이메일 전송에 실패했습니다',
      pdfIncluded: 'AI 요약이 PDF 내보내기에 포함됩니다',
      pdfRemoved: 'PDF 내보내기에서 제외됨',
      rerunFailedEmpty: '재실행할 실패 테스트 케이스가 없습니다',
      rerunCreated_one: '실패 테스트 케이스 {{count}}건으로 새 실행 생성됨',
      rerunCreated_other: '실패 테스트 케이스 {{count}}건으로 새 실행 생성됨',
      rerunFailed: '재실행 생성에 실패했습니다',
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Run Detail page (Phase 2b)
  // ─────────────────────────────────────────────────────────────────────
  detail: {
    page: {
      backToRuns: '실행 목록으로',
      startedPrefix: '시작 {{date}}',
      percentCompletedSuffix: '{{percent}}% 완료',
      testCasesCount_one: '테스트 케이스 {{count}}건',
      testCasesCount_other: '테스트 케이스 {{count}}건',
      automatedBadge: '자동화',
      runNameFallback: '테스트 실행',
    },
    runStatus: {
      completed: '완료',
      inProgress: '진행 중',
      underReview: '검토 중',
      paused: '일시중지',
      draft: '신규',
    },
    headerActions: {
      export: '내보내기',
      exportTooltip: 'PDF / CSV / Excel로 내보내기',
      aiSummary: 'AI 요약',
      aiSummaryNewBadge: 'NEW',
      aiSummaryLockedBadge: 'HOBBY',
      focusMode: 'Focus Mode',
      focusModeTooltip: 'Focus Mode (Cmd+Shift+F)',
    },
    kpi: {
      totalTests: '전체 테스트',
    },
    progress: {
      title: '실행 진행률',
      tooltipCount: '{{label}}: {{count}}',
    },
    folderSidebar: {
      title: '폴더',
      allCases: '전체 케이스',
      collapseTooltip: '접기',
      expandTooltip: '펼치기',
      empty: '폴더 없음',
    },
    tcList: {
      filter: {
        searchPlaceholder: '테스트 케이스 검색...',
        allStatus: '전체 상태',
        allPriority: '전체 우선순위',
      },
      header: {
        idVer: 'ID / 버전',
        testCase: '테스트 케이스',
        folder: '폴더',
      },
      empty: {
        title: '테스트 케이스가 없습니다',
        hint: '이 실행에 테스트 케이스가 포함되어 있지 않습니다.',
      },
      assigneeDropdown: {
        unassigned: '— 담당자 없음 —',
      },
      bulk: {
        selected_one: '{{count}}개 선택됨',
        selected_other: '{{count}}개 선택됨',
        assignToLabel: '담당자 지정:',
        unassigned: '담당자 없음',
        apply: '적용',
        clearSelection: '선택 해제',
      },
      versionBadge: {
        tcUpdatedClickable: 'TC가 v{{major}}.{{minor}}로 업데이트됨 — 클릭하여 변경 사항 검토',
        locked: '잠김: 테스트 결과 기록됨',
        ssUpdateAvailable: '공유 스텝 업데이트 가능 (v{{version}})',
      },
    },
    ssBanner: {
      headline_one: '공유 스텝 {{count}}개에 새 버전이 있습니다',
      headline_other: '공유 스텝 {{count}}개에 새 버전이 있습니다',
      tcAffected_one: 'TC {{count}}건 영향',
      tcAffected_other: 'TC {{count}}건 영향',
      untestedUpdatable_one: ', 미수행 {{count}}건 업데이트 가능',
      untestedUpdatable_other: ', 미수행 {{count}}건 업데이트 가능',
      updateAll: '모두 업데이트',
      dismiss: '닫기',
    },
    deprecatedBanner: {
      title: '이 실행의 일부 TC가 폐기되었습니다.',
      countSentence_one: '이 실행이 생성된 이후 테스트 케이스 {{count}}건이 폐기되었습니다. 기존 결과는 유지되며, 이 TC들은 새 실행에 나타나지 않습니다.',
      countSentence_other: '이 실행이 생성된 이후 테스트 케이스 {{count}}건이 폐기되었습니다. 기존 결과는 유지되며, 이 TC들은 새 실행에 나타나지 않습니다.',
    },
    addResult: {
      title: '결과 추가',
      status: {
        label: '상태',
      },
      note: {
        label: '메모',
        toolbar: {
          paragraph: '문단',
          bold: '굵게',
          italic: '기울임',
          underline: '밑줄',
          strikethrough: '취소선',
          code: '코드',
          link: '링크',
          bulletList: '글머리 기호 목록',
          orderedList: '번호 매기기 목록',
        },
      },
      steps: {
        label: '스텝',
        sharedBadge: '공유',
        sharedUpdateBadgeTitle: '새 버전: v{{version}}',
        diffBannerPrefix: 'v{{from}} → v{{to}} 변경 사항',
        updateButton: '업데이트',
        lockedBanner: '테스트 결과 보존을 위해 잠김',
        diffCurrent: '현재 (v{{version}})',
        diffLatest: '최신 (v{{version}})',
        diffUnavailable: '버전 이력을 사용할 수 없습니다',
        diffLoading: '로딩 중...',
      },
      elapsed: {
        label: '소요 시간',
      },
      assignee: {
        label: '담당자 지정',
        placeholder: '담당자 선택',
        hint: '비워두면 현재 담당자가 유지됩니다.',
      },
      issues: {
        label: '연결된 이슈',
        createJira: 'Jira 이슈 생성',
        createGithub: 'GitHub 이슈 생성',
        placeholder: '이슈 키 입력 (예: PROJ-123)',
        hint: 'Jira 이슈 키를 입력하고 Enter 키를 누르세요 (예: PROJ-123)',
        confirmJiraSetup: 'Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?',
      },
      attachments: {
        label: '첨부 파일',
        chooseFiles: '파일 선택',
        or: '또는',
        screenshot: '스크린샷',
        dropzoneHint: '또는 여기에 드래그하거나 붙여넣기',
        uploading: '업로드 중...',
      },
      footer: {
        submit: '결과 추가',
      },
    },
    jiraIssue: {
      title: 'Jira 이슈 생성',
      summary: {
        label: '요약',
        placeholder: '이슈에 대한 간단한 설명',
      },
      description: {
        placeholder: '이슈에 대한 상세 설명',
      },
      issueType: {
        label: '이슈 유형',
        option: {
          bug: '버그',
          task: '작업',
          story: '스토리',
          epic: '에픽',
        },
      },
      priority: {
        option: {
          highest: '최고',
          high: '높음',
          medium: '보통',
          low: '낮음',
          lowest: '최저',
        },
      },
      labels: {
        label: '라벨',
        placeholder: '쉼표로 구분하여 라벨 입력 (예: bug, ui, critical)',
        hint: '쉼표로 구분하여 여러 라벨을 입력하세요',
      },
      assignee: {
        placeholder: 'Jira 계정 ID 또는 이메일 (예: user@example.com)',
        hint: '비워두면 자동 할당됩니다',
      },
      components: {
        label: '컴포넌트',
        placeholder: '컴포넌트 이름을 쉼표로 구분 (예: Frontend, API, Database)',
        hint: 'Jira 프로젝트에 등록된 컴포넌트 이름을 입력하세요',
      },
      relatedTc: '관련 테스트 케이스',
      footer: {
        submit: '이슈 생성',
        creating: '생성 중...',
      },
    },
    githubIssue: {
      title: 'GitHub 이슈 생성',
      titleField: {
        label: '제목',
        placeholder: '이슈 제목',
      },
      body: {
        placeholder: '이슈 설명 (Markdown 지원)',
      },
      labels: {
        label: '라벨',
        placeholder: '라벨 입력 후 Enter 키',
      },
      assignee: {
        placeholder: '기여자 검색...',
      },
      willBeCreatedInPrefix: '다음 위치에 생성됩니다: ',
      footer: {
        submit: '이슈 생성',
        creating: '생성 중...',
      },
    },
    tcDiff: {
      comparingPrefix: '비교: ',
      columnHeader: {
        current: 'v{{major}}.{{minor}} (실행 내 현재)',
        updated: 'v{{major}}.{{minor}} (업데이트됨)',
      },
      metadata: {
        title: '제목',
        tags: '태그',
        precondition: '사전 조건',
      },
      steps: {
        sectionTitle: '스텝',
        noSteps: '스텝 없음',
      },
      expectedResult: {
        sectionTitle: '예상 결과',
      },
      loading: '로딩 중…',
      footer: {
        updateTo: 'v{{major}}.{{minor}}로 업데이트',
      },
    },
    upgradeModal: {
      title: 'Starter 플랜이 필요합니다',
      bodyLine1: 'Jira 이슈 생성 기능은 <1>Starter 플랜</1> 이상에서 사용할 수 있습니다.',
      bodyLine2: '업그레이드하면 테스트 결과에서 바로 Jira 이슈를 생성하고 관리할 수 있습니다.',
      benefitsTitle: 'Starter 플랜 혜택',
      benefit: {
        projects: '프로젝트 10개까지',
        members: '팀 멤버 5명까지',
        jira: 'Jira 연동',
        reporting: '기본 리포팅',
        exportImport: '테스트 케이스 내보내기/가져오기',
      },
      footer: {
        upgrade: '플랜 업그레이드',
      },
    },
    upgradeNudge: {
      body: '즉각적인 실패 패턴 분석, Go/No-Go 추천, 원클릭 Jira 이슈 생성을 받아보세요.',
      cta: 'Hobby로 업그레이드 — $19/mo',
      subtitle: '월 AI 크레딧 15개 · AI 실행 요약 포함',
    },
    jiraSetup: {
      title: 'Jira 연동이 필요합니다',
      body: 'Jira 이슈를 생성하려면 먼저 Settings에서 Jira 계정을 연결해 주세요.',
      footer: {
        connect: 'Jira 연결',
      },
    },
    resultDetail: {
      title: '테스트 결과 상세',
      cicdBadge: 'CI/CD',
      unknownAuthor: '알 수 없음',
      elapsedLabel: '소요 시간',
      stepResultsLabel: '스텝 결과',
      stepFallback: '스텝 {{index}}',
      attachmentsLabel_one: '첨부 파일 ({{count}})',
      attachmentsLabel_other: '첨부 파일 ({{count}})',
      linkedIssues: '연결된 이슈',
      githubIssues: 'GitHub 이슈',
    },
    imagePreview: {
      closeA11y: '미리보기 닫기',
    },
    fatalError: {
      userMissing: '사용자 정보를 불러올 수 없습니다. 페이지를 새로고침해 주세요.',
      runIdMissing: 'Run ID가 없습니다. URL을 확인해 주세요.',
    },

    // ─────────────────────────────────────────────────────────────────────
    // Phase 3 — FocusMode 풀스크린 실행 UI
    // (design-spec-i18n-coverage-phase3-shared-components §5-2, §11)
    //
    // 상태 라벨 (통과/실패/차단됨/재테스트/미테스트) 은 common.* 재사용 (AC-10).
    // 단축키 문자(P/F/B/R/S/C/H/N/[/]) 는 영문 고정, 설명 문장만 번역
    // (AC-12 / AC-15). `{{shortcut}}` interpolation 은 openTooltip 에만.
    // ─────────────────────────────────────────────────────────────────────
    focusMode: {
      header: {
        exit: '나가기',
      },
      kbdHint: {
        comments: '댓글',
        history: '이력',
        note: '메모',
        sidebar: '사이드바',
        search: '검색',
      },
      sidebar: {
        progress: '진행률',
        completed: '{{total}}개 중 <hl>{{count}}</hl>개 완료',
        searchPlaceholder: 'TC 검색…',
        empty: '일치하는 테스트 케이스 없음',
        openTooltip: '사이드바 열기 ({{shortcut}})',
      },
      body: {
        previously: '이전 결과: {{status}}',
        precondition: '사전 조건',
        attachmentsHeader: '첨부 ({{count}})',
        testStepsHeader: '테스트 스텝',
        passedSuffix: '{{count}}/{{total}} 통과',
        stepPassTitle: '이 스텝 통과',
        stepFailTitle: '이 스텝 실패',
      },
      ssBanner: {
        newVersionPrefix: "🔄 {{customId}} '{{name}}'의 새 버전 사용 가능 (v{{version}})",
        viewChanges: '변경 보기',
        hideChanges: '변경 숨기기',
        noHistory: '이력 없음',
      },
      comments: {
        header: '댓글',
        empty: '아직 댓글이 없습니다',
      },
      history: {
        header: '실행 이력',
        empty: '실행 이력 없음',
      },
      note: {
        optionalSuffix: '(선택 사항)',
        placeholder: '관찰한 내용을 기록하세요…',
        saveHint: '⌘ + Enter 로 상태와 함께 저장',
      },
      statusButton: {
        skip: '건너뛰기',
      },
      footer: {
        previous: '이전',
        next: '다음',
        lastTestHint: '마지막 테스트 — 상태 키를 눌러 실행을 완료하세요',
      },
      lightbox: {
        alt: '미리보기',
      },
      toast: {
        saveFailed: '결과 저장에 실패했습니다. 다시 시도해 주세요.',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Toast messages emitted from run-detail/page.tsx (Phase 2b)
  // ─────────────────────────────────────────────────────────────────────
  toast: {
    commentSaveFailed: '댓글 저장에 실패했습니다.',
    commentDeleteFailed: '댓글 삭제에 실패했습니다.',
    jiraAutoCreated: 'Jira 이슈 {{key}}가 자동 생성되었습니다',
    jiraAutoCreateFailed: 'Jira 이슈 자동 생성에 실패했습니다',
    githubAutoCreated: 'GitHub 이슈 #{{number}}가 자동 생성되었습니다',
    githubAutoCreateFailed: 'GitHub 이슈 자동 생성에 실패했습니다',
    statusUpdateFailed: '상태 업데이트에 실패했습니다.',
    addResultFirstThenLink: '먼저 테스트 결과를 추가한 후 이슈를 연결하세요.',
    runIdNotFound: 'Run ID를 찾을 수 없습니다. 페이지를 새로고침해 주세요.',
    resultSaveFailed: '결과 저장에 실패했습니다.',
    ssVersionUpdated: "공유 스텝 '{{name}}' v{{version}}으로 업데이트됨",
    ssVersionUpdateFailed: '공유 스텝 버전 업데이트에 실패했습니다',
    tcVersionUpdated: 'TC가 v{{major}}.{{minor}}로 업데이트됨',
    tcVersionUpdateFailed: 'TC 버전 업데이트에 실패했습니다',
    uploadFailed: '파일 업로드 실패: {{reason}}',
    screenshotUnsupported: '이 브라우저는 스크린샷 기능을 지원하지 않습니다.',
    screenshotUploadFailed: '스크린샷 업로드 실패: {{reason}}',
    screenshotCaptureFailed: '스크린샷 캡처에 실패했습니다.',
    summaryRequired: '요약은 필수 항목입니다.',
    jiraCreated: 'Jira 이슈 {{key}} 생성됨',
    jiraCreatedAddResult: 'Jira 이슈 {{key}} 생성됨. 결과 추가로 테스트 결과를 기록하면 이슈가 자동으로 연결됩니다.',
    jiraCreateFailed: 'Jira 이슈 생성 실패: {{reason}}',
    githubCreated: 'GitHub 이슈 #{{number}} 생성됨',
    githubCreateFailed: 'GitHub 이슈 생성 실패: {{reason}}',
    // f024 — catch→toast 추가 (Dev Spec §6-3 A8-A14)
    commentsLoadFailed: '코멘트를 불러오지 못했어요.',
    resultsLoadFailed: '결과를 불러오지 못했어요.',
    loadFailed: '실행을 불러오지 못했어요.',
    attachmentDeleteFailed: '첨부파일 삭제에 실패했어요.',
    assigneeUpdateFailed: '담당자 업데이트에 실패했어요.',
    assigneeBulkUpdateFailed: '담당자 일괄 업데이트에 실패했어요.',
  },
};

export default runs;
