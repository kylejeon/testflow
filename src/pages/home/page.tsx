import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import Logo from '../../components/Logo';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    nav: {
      features: 'Features',
      workflow: 'How It Works',
      pricing: 'Pricing',
      testimonials: 'Why Testably',
      faq: 'FAQ',
      login: 'Log in',
      getStarted: 'Get Started',
    },
    hero: {
      badge: 'All-in-one test management platform for QA teams',
      title1: 'Ship quality software',
      title2: 'faster',
      description: 'Testably brings your entire QA workflow together — test cases, runs, milestones, sessions, and team collaboration — all in one place.',
      cta: 'Start for Free',
      demo: 'View Demo',
      sub: 'No credit card required · 14-day free trial · Cancel anytime',
    },
    stats: [
      { value: '10x', label: 'Faster test execution' },
      { value: '<5min', label: 'Setup to first test run' },
      { value: 'Jira', label: 'Two-way sync built-in' },
      { value: 'Free', label: 'Up to 3 projects forever' },
    ],
    featuresSection: {
      badge: 'Core Features',
      title: 'Everything your QA team needs',
      description: 'From writing test cases to analyzing results — Testably covers the full testing lifecycle',
    },
    features: [
      {
        icon: 'ri-file-list-3-line',
        title: 'Test Case Management',
        description: 'Organize thousands of test cases with a structured folder hierarchy. Filter by priority, tags, type, and status to find what you need instantly.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: 'Core',
      },
      {
        icon: 'ri-play-circle-line',
        title: 'Test Run Execution',
        description: 'Plan test runs, assign cases to team members, and track results in real-time. Passed, Failed, Blocked, Retest, and Untested — all at a glance.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: 'Core',
      },
      {
        icon: 'ri-flag-2-line',
        title: 'Milestone Tracking',
        description: 'Set release goals and monitor progress visually. Keep the whole team aligned on timelines and ship with confidence.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Planning',
      },
      {
        icon: 'ri-video-line',
        title: 'Exploratory Sessions',
        description: 'Record exploratory testing sessions with rich text notes, inline screenshots, and real-time log capture. Generate detailed bug reports automatically.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: 'Testing',
      },
      {
        icon: 'ri-team-line',
        title: 'Team Collaboration',
        description: 'Invite team members and set role-based permissions — Admin, Member, or Viewer. Assign specific test cases to individuals for clear ownership.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: 'Team',
      },
      {
        icon: 'ri-links-line',
        title: 'Jira Integration',
        description: 'Automatically create Jira issues when tests fail. Map custom fields, sync status bidirectionally, and keep dev and QA in perfect sync.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Integration',
      },
      {
        icon: 'ri-terminal-box-line',
        title: 'CI/CD Integration',
        description: 'Upload automated test results directly from your CI pipeline via API tokens. Seamlessly connect Testably to GitHub Actions, Jenkins, and more.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: 'Automation',
      },
      {
        icon: 'ri-notification-3-line',
        title: 'Smart Notifications',
        description: 'Get notified on team invitations, run completions, and milestone updates. Stay informed without the noise — configure exactly what you receive.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: 'Productivity',
      },
      {
        icon: 'ri-folder-open-line',
        title: 'Project Documentation',
        description: 'Centralize your test plans, release notes, and QA documents alongside your test data. Upload files and add links — everything in one workspace.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Documentation',
      },
    ],
    workflowSection: {
      badge: 'How It Works',
      title: 'Your QA process in 4 simple steps',
      description: 'Start in minutes — no complex setup required',
    },
    workflowSteps: [
      { step: '01', title: 'Create a Project', description: 'Set up a project for the product or feature you are testing and invite your team members.', icon: 'ri-folder-add-line' },
      { step: '02', title: 'Write Test Cases', description: 'Build a structured library of test cases with folders, priorities, tags, and preconditions.', icon: 'ri-file-list-3-line' },
      { step: '03', title: 'Execute Test Runs', description: 'Create a test run tied to a milestone, assign cases to team members, and track results live.', icon: 'ri-play-circle-line' },
      { step: '04', title: 'Analyze & Ship', description: 'Review real-time dashboards, export reports, and ship with confidence when all tests pass.', icon: 'ri-bar-chart-2-line' },
    ],
    integrationSection: {
      badge: 'Integrations',
      title: 'Works with your existing tools',
      description: 'Connect Testably to the tools your team already uses — no disruption to your workflow.',
      jiraTitle: 'Seamless Jira Integration',
      jiraDescription: 'When a test fails, Testably automatically creates a Jira issue with all the context — steps, screenshots, and environment info. No more copy-paste between tools.',
      jiraTags: ['Auto issue creation', 'Bidirectional sync', 'Custom field mapping', 'Project linking'],
      ciTitle: 'CI/CD Pipeline Ready',
      ciDescription: 'Push automated test results from any CI/CD system via our REST API. Use project-specific tokens to keep your pipelines secure.',
      ciTags: ['GitHub Actions', 'Jenkins', 'GitLab CI', 'REST API'],
    },
    whyCards: [
      {
        icon: 'ri-timer-line',
        title: '5-Minute Setup',
        content: 'Sign up, create a project, write your first test case. No configuration wizards, no onboarding calls.',
      },
      {
        icon: 'ri-puzzle-line',
        title: 'Jira + CI/CD Built-in',
        content: 'Failed test becomes a Jira issue automatically. GitHub Actions and GitLab CI report results back.',
      },
      {
        icon: 'ri-hand-coin-line',
        title: 'Free Forever Plan',
        content: 'Unlimited test cases, 3 projects, 2 team members. No credit card, no trial expiration.',
      },
    ],
    whySection: {
      badge: 'Why Testably',
      title: 'Why Teams Choose Testably',
      description: 'Everything your QA team needs, none of the complexity you don\'t.',
    },
    pricingSection: {
      badge: 'Pricing',
      title: 'Plans that scale with your team',
      description: 'All paid plans include a 14-day free trial',
    },
    pricingPlans: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for small teams getting started',
        features: ['Up to 3 projects', 'Up to 3 members', 'Test case management', 'Jira integration', '5 AI generations / month', 'Community support'],
        cta: 'Get Started Free',
        highlighted: false,
        icon: 'ri-user-line',
        popular: '',
      },
      {
        name: 'Starter',
        price: '$49',
        period: '/ month',
        description: 'For growing teams that need more power',
        features: ['Up to 10 projects', 'Up to 5 members', 'Jira integration', 'Slack & Teams integration', '30 AI generations / month', 'Basic reporting', 'Email support'],
        cta: 'Start Free Trial',
        highlighted: false,
        icon: 'ri-star-line',
        popular: '',
      },
      {
        name: 'Professional',
        price: '$99',
        period: '/ month',
        description: 'Full-featured for professional QA teams',
        features: ['Unlimited projects', 'Up to 20 members', 'Jira integration', 'Slack & Teams integration', '150 AI generations / month', 'Advanced reporting', 'CI/CD Integration', 'Priority support'],
        cta: 'Start Free Trial',
        highlighted: true,
        icon: 'ri-vip-crown-line',
        popular: 'Most popular',
      },
      {
        name: 'Enterprise S',
        price: '$249',
        period: '/ month',
        description: 'For teams scaling beyond 20 members',
        features: ['Unlimited projects', '21–50 team members', 'Unlimited AI generations', 'Jira integration', 'Slack & Teams integration', 'CI/CD Integration', 'Dedicated support', 'SLA guarantee'],
        cta: 'Contact Sales',
        highlighted: false,
        icon: 'ri-building-2-line',
        popular: '',
      },
      {
        name: 'Enterprise M',
        price: '$499',
        period: '/ month',
        description: 'For mid-size organizations',
        features: ['Unlimited projects', '51–100 team members', 'Unlimited AI generations', 'Jira integration', 'Slack & Teams integration', 'CI/CD Integration', 'Dedicated support', 'SLA guarantee'],
        cta: 'Contact Sales',
        highlighted: false,
        icon: 'ri-building-4-line',
        popular: '',
      },
      {
        name: 'Enterprise L',
        price: 'Custom',
        period: '',
        description: 'For large enterprises with 100+ members',
        features: ['Unlimited projects', '100+ team members', 'Unlimited AI generations', 'Jira integration', 'Slack & Teams integration', 'CI/CD Integration', 'Dedicated support', 'Custom contract & SLA'],
        cta: 'Contact Sales',
        highlighted: false,
        icon: 'ri-government-line',
        popular: '',
      },
    ],
    faqSection: {
      badge: 'FAQ',
      title: 'Frequently Asked Questions',
      description: 'Everything you need to know about Testably. Can\'t find the answer? Reach out to our team.',
    },
    faqs: [
      {
        question: 'What are the limits of the Free plan?',
        answer: 'The Free plan lets you create up to 3 projects with up to 3 team members. You get access to core features including test case management, test runs, milestones, and Jira integration, plus 5 AI generations per month. There is no limit on the number of test cases within your projects.',
      },
      {
        question: 'How do I integrate Testably with Jira?',
        answer: 'Go to Project Settings → Jira Integration and enter your Jira domain, email, and API token. Once connected, you can map Testably projects to Jira projects and choose which custom fields to populate. When a test fails during a run, Testably automatically creates a Jira issue with the test steps, environment info, and any screenshots attached.',
      },
      {
        question: 'How does CI/CD pipeline integration work?',
        answer: 'In your project settings, generate a CI token. Then use our REST API endpoint to upload test results directly from your pipeline — GitHub Actions, Jenkins, GitLab CI, or any other system. The results are automatically mapped to your test cases and reflected in the run dashboard.',
      },
      {
        question: 'Can I assign specific test cases to team members?',
        answer: 'Yes. When creating or editing a test run, you can assign individual test cases to specific team members. Assignees can filter the run view to see only their assigned cases, and progress is tracked per assignee in the run dashboard.',
      },
      {
        question: 'What test result statuses does Testably support?',
        answer: 'Testably supports five result statuses: Passed, Failed, Blocked, Retest, and Untested. Each status is color-coded and reflected in real-time progress charts. You can also add comments and screenshots when marking a result.',
      },
      {
        question: 'How do exploratory test sessions work?',
        answer: 'Start a session by setting a goal and time box. During the session, you can log bugs, observations, and notes with inline screenshots directly in the rich text editor. When you end the session, a structured session report is generated automatically that can be shared with the team.',
      },
      {
        question: 'Can I export test results and reports?',
        answer: 'Yes. You can export test cases to CSV/Excel format and export test run results as detailed reports. The export includes all result statuses, assignee info, comments, and timestamps. This is available on all plans including Free.',
      },
      {
        question: 'Can I change or cancel my plan at any time?',
        answer: 'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time from your account settings. If you cancel, your account remains active until the end of your current billing period. No hidden fees or lock-in contracts.',
      },
    ],
    cta: {
      title: 'Ready to level up your QA?',
      description: 'Start for free — no credit card needed. Get your entire QA workflow running in minutes.',
      button: 'Get Started Free',
    },
    newsletter: {
      title: 'Stay in the loop',
      description: 'Get product updates, QA tips, and new features in your inbox',
      placeholder: 'Enter your email',
      button: 'Subscribe',
      success: 'Thanks for subscribing!',
    },
    footer: {
      tagline: 'All-in-one test management platform. Build better software, ship with confidence.',
      product: 'Product',
      productLinks: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
      company: 'Company',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      about: 'About',
      compare: 'Compare',
      compareLinks: ['Testably vs TestRail', 'Testably vs Zephyr', 'Testably vs Qase'],
      copyright: `© ${new Date().getFullYear()} Testably. All rights reserved.`,
    },
    scrollIndicator: 'Scroll',
  },
  ko: {
    nav: {
      features: '기능',
      workflow: '워크플로우',
      pricing: '요금제',
      testimonials: 'Why Testably',
      faq: 'FAQ',
      login: '로그인',
      getStarted: '무료 시작',
    },
    hero: {
      badge: 'QA 팀을 위한 올인원 테스트 관리 플랫폼',
      title1: '더 빠르고 스마트한',
      title2: '테스트 관리',
      description: 'Testably는 테스트 케이스, 실행, 마일스톤, 세션, 팀 협업까지 — QA 워크플로우 전체를 하나의 플랫폼에서 관리합니다.',
      cta: '무료로 시작하기',
      demo: '데모 보기',
      sub: '신용카드 불필요 · 14일 무료 체험 · 언제든 취소 가능',
    },
    stats: [
      { value: '10x', label: '빠른 테스트 실행' },
      { value: '<5min', label: '첫 테스트까지 설정 시간' },
      { value: 'Jira', label: '양방향 동기화 기본 내장' },
      { value: 'Free', label: '프로젝트 3개 영구 무료' },
    ],
    featuresSection: {
      badge: '핵심 기능',
      title: 'QA 팀에 필요한 모든 것',
      description: '테스트 케이스 작성부터 결과 분석까지 — 전체 테스팅 라이프사이클을 지원합니다',
    },
    features: [
      {
        icon: 'ri-file-list-3-line',
        title: '테스트 케이스 관리',
        description: '체계적인 폴더 구조로 수천 개의 테스트 케이스를 관리하세요. 우선순위, 태그, 유형, 상태별 필터링을 지원합니다.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: '핵심',
      },
      {
        icon: 'ri-play-circle-line',
        title: 'Test Run 실행',
        description: '테스트 실행을 계획하고 팀원에게 할당하여 실시간으로 결과를 추적하세요. Passed, Failed, Blocked, Retest, Untested 상태를 한눈에 확인합니다.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: '핵심',
      },
      {
        icon: 'ri-flag-2-line',
        title: '마일스톤 추적',
        description: '릴리즈 목표를 설정하고 진행률을 시각적으로 모니터링하세요. 팀 전체가 일정을 공유하고 자신 있게 배포하세요.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '계획',
      },
      {
        icon: 'ri-video-line',
        title: '탐색적 세션',
        description: '리치 텍스트 메모, 인라인 스크린샷, 실시간 로그 캡처로 탐색적 테스트 세션을 기록하세요. 상세한 버그 리포트를 자동 생성합니다.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: '테스팅',
      },
      {
        icon: 'ri-team-line',
        title: '팀 협업',
        description: '팀원을 초대하고 역할별 권한을 설정하세요. Admin, Member, Viewer 권한과 테스트 케이스별 담당자 지정으로 명확한 책임을 부여합니다.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: '팀',
      },
      {
        icon: 'ri-links-line',
        title: 'Jira 연동',
        description: '테스트가 실패하면 Testably가 자동으로 단계, 스크린샷, 환경 정보를 포함한 Jira 이슈를 생성합니다. 더 이상 도구 간 복사-붙여넣기가 필요 없습니다.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '연동',
      },
      {
        icon: 'ri-terminal-box-line',
        title: 'CI/CD 연동',
        description: 'REST API를 통해 모든 CI/CD 시스템에서 자동 테스트 결과를 업로드하세요. 프로젝트별 토큰으로 파이프라인을 안전하게 유지하세요.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        tag: '자동화',
      },
      {
        icon: 'ri-notification-3-line',
        title: '스마트 알림',
        description: '팀 초대, 테스트 실행 완료, 마일스톤 업데이트 알림을 받으세요. 수신할 알림을 세밀하게 설정하여 중요한 것만 받을 수 있습니다.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: '생산성',
      },
      {
        icon: 'ri-folder-open-line',
        title: '프로젝트 문서',
        description: '테스트 플랜, 릴리즈 노트, QA 문서를 테스트 데이터 옆에 중앙화하세요. 파일 업로드와 링크 추가로 모든 것을 하나의 워크스페이스에서 관리합니다.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '문서',
      },
    ],
    workflowSection: {
      badge: '워크플로우',
      title: '4단계로 완성하는 QA 프로세스',
      description: '복잡한 설정 없이 몇 분 만에 시작하세요',
    },
    workflowSteps: [
      { step: '01', title: '프로젝트 생성', description: '테스트할 제품이나 기능에 맞는 프로젝트를 생성하고 팀원을 초대하세요.', icon: 'ri-folder-add-line' },
      { step: '02', title: '테스트 케이스 작성', description: '폴더, 우선순위, 태그, 전제 조건을 활용해 체계적인 테스트 케이스 라이브러리를 구축하세요.', icon: 'ri-file-list-3-line' },
      { step: '03', title: 'Test Run 실행', description: '마일스톤에 맞춰 테스트 실행을 생성하고 팀원에게 케이스를 할당해 실시간으로 결과를 추적하세요.', icon: 'ri-play-circle-line' },
      { step: '04', title: '분석 & 배포', description: '실시간 대시보드를 검토하고 리포트를 내보내세요. 모든 테스트가 통과되면 자신 있게 배포하세요.', icon: 'ri-bar-chart-2-line' },
    ],
    integrationSection: {
      badge: '연동',
      title: '기존 도구와 완벽하게 작동합니다',
      description: '팀이 이미 사용 중인 도구에 Testably를 연결하세요 — 기존 워크플로우에 방해 없이.',
      jiraTitle: 'Jira와 완벽하게 연동됩니다',
      jiraDescription: '테스트가 실패하면 Testably가 자동으로 단계, 스크린샷, 환경 정보를 포함한 Jira 이슈를 생성합니다. 더 이상 도구 간 복사-붙여넣기가 필요 없습니다.',
      jiraTags: ['자동 이슈 생성', '양방향 동기화', '커스텀 필드 매핑', '프로젝트 연결'],
      ciTitle: 'CI/CD 파이프라인 지원',
      ciDescription: 'REST API를 통해 모든 CI/CD 시스템에서 자동 테스트 결과를 업로드하세요. 프로젝트별 토큰으로 파이프라인을 안전하게 유지하세요.',
      ciTags: ['GitHub Actions', 'Jenkins', 'GitLab CI', 'REST API'],
    },
    whyCards: [
      {
        icon: 'ri-timer-line',
        title: '5분 설정',
        content: '가입하고, 프로젝트를 만들고, 첫 번째 테스트 케이스를 작성하세요. 복잡한 설정 마법사나 온보딩 콜 없이 바로 시작할 수 있습니다.',
      },
      {
        icon: 'ri-puzzle-line',
        title: 'Jira + CI/CD 기본 내장',
        content: '테스트 실패 시 자동으로 Jira 이슈가 생성됩니다. GitHub Actions와 GitLab CI가 결과를 자동으로 보고합니다.',
      },
      {
        icon: 'ri-hand-coin-line',
        title: '영구 무료 플랜',
        content: '무제한 테스트 케이스, 프로젝트 3개, 팀 멤버 2명. 신용카드 없이, 체험 기간 만료 없이 사용하세요.',
      },
    ],
    whySection: {
      badge: 'Why Testably',
      title: '팀들이 Testably를 선택하는 이유',
      description: 'QA 팀에 필요한 모든 것, 불필요한 복잡함은 없습니다.',
    },
    pricingSection: {
      badge: '요금제',
      title: '팀 규모에 맞는 요금제',
      description: '모든 유료 요금제에 14일 무료 체험이 포함됩니다',
    },
    pricingPlans: [
      {
        name: 'Free',
        price: '$0',
        period: '영구 무료',
        description: '소규모 팀을 위한 기본 기능',
        features: ['프로젝트 3개까지', '팀 멤버 3명까지', '기본 테스트 관리', 'Jira 연동', 'AI 생성 5회/월', '커뮤니티 지원'],
        cta: '무료로 시작하기',
        highlighted: false,
        icon: 'ri-user-line',
        popular: '',
      },
      {
        name: 'Starter',
        price: '$49',
        period: '/ 월',
        description: '성장하는 팀을 위한 핵심 기능',
        features: ['프로젝트 10개까지', '팀 멤버 5명까지', 'Jira 연동', 'Slack & Teams 연동', 'AI 생성 30회/월', '기본 리포팅', '이메일 지원'],
        cta: '14일 무료 체험',
        highlighted: false,
        icon: 'ri-star-line',
        popular: '',
      },
      {
        name: 'Professional',
        price: '$99',
        period: '/ 월',
        description: '전문 QA 팀을 위한 완전한 기능',
        features: ['프로젝트 무제한', '팀 멤버 20명까지', 'Jira 연동', 'Slack & Teams 연동', 'AI 생성 150회/월', '고급 리포팅', 'CI/CD 연동', '우선 지원'],
        cta: '14일 무료 체험',
        highlighted: true,
        icon: 'ri-vip-crown-line',
        popular: '가장 인기',
      },
      {
        name: 'Enterprise S',
        price: '$249',
        period: '/ 월',
        description: '20명 초과 팀을 위한 플랜',
        features: ['프로젝트 무제한', '팀 멤버 21-50명', 'AI 생성 무제한', 'Jira 연동', 'Slack & Teams 연동', 'CI/CD 연동', '전담 지원', 'SLA 보장'],
        cta: '문의하기',
        highlighted: false,
        icon: 'ri-building-2-line',
        popular: '',
      },
      {
        name: 'Enterprise M',
        price: '$499',
        period: '/ 월',
        description: '중대형 조직을 위한 플랜',
        features: ['프로젝트 무제한', '팀 멤버 51-100명', 'AI 생성 무제한', 'Jira 연동', 'Slack & Teams 연동', 'CI/CD 연동', '전담 지원', 'SLA 보장'],
        cta: '문의하기',
        highlighted: false,
        icon: 'ri-building-4-line',
        popular: '',
      },
      {
        name: 'Enterprise L',
        price: '문의',
        period: '',
        description: '100명 이상 대규모 기업을 위한 플랜',
        features: ['프로젝트 무제한', '팀 멤버 100명+', 'AI 생성 무제한', 'Jira 연동', 'Slack & Teams 연동', 'CI/CD 연동', '전담 지원', '맞춤 계약 & SLA'],
        cta: '문의하기',
        highlighted: false,
        icon: 'ri-government-line',
        popular: '',
      },
    ],
    faqSection: {
      badge: 'FAQ',
      title: '자주 묻는 질문',
      description: 'Testably에 대해 궁금한 모든 것을 답해드립니다. 원하는 답을 찾지 못하셨나요? 팀에 문의하세요.',
    },
    faqs: [
      {
        question: '무료 플랜의 제한은 무엇인가요?',
        answer: '무료 플랜에서는 최대 3개의 프로젝트를 생성하고, 최대 3명의 팀원을 초대할 수 있습니다. 테스트 케이스 관리, 테스트 실행, 마일스톤, Jira 연동 등 핵심 기능과 AI 생성 월 5회가 포함됩니다. 프로젝트 내 테스트 케이스 수에는 제한이 없습니다.',
      },
      {
        question: 'Jira 연동은 어떻게 하나요?',
        answer: '프로젝트 설정 → Jira 연동으로 이동하여 Jira 도메인, 이메일, API 토큰을 입력하세요. 연동이 완료되면 Testably 프로젝트와 Jira 프로젝트를 연결하고 채울 커스텀 필드를 선택할 수 있습니다. 테스트 실행 중 테스트가 실패하면 Testably가 자동으로 테스트 단계, 환경 정보, 스크린샷이 포함된 Jira 이슈를 생성합니다.',
      },
      {
        question: 'CI/CD 파이프라인 연동은 어떻게 작동하나요?',
        answer: '프로젝트 설정에서 CI 토큰을 생성하세요. 그런 다음 REST API 엔드포인트를 사용해 GitHub Actions, Jenkins, GitLab CI 등 어느 파이프라인에서든 테스트 결과를 직접 업로드할 수 있습니다. 결과는 자동으로 테스트 케이스에 매핑되어 실행 대시보드에 반영됩니다.',
      },
      {
        question: '팀원에게 특정 테스트 케이스를 할당할 수 있나요?',
        answer: '네. 테스트 실행을 생성하거나 편집할 때 개별 테스트 케이스를 특정 팀원에게 할당할 수 있습니다. 담당자는 실행 뷰에서 자신에게 할당된 케이스만 필터링하여 볼 수 있으며, 실행 대시보드에서 담당자별 진행률이 추적됩니다.',
      },
      {
        question: 'Testably는 어떤 테스트 결과 상태를 지원하나요?',
        answer: 'Testably는 Passed, Failed, Blocked, Retest, Untested 5가지 결과 상태를 지원합니다. 각 상태는 색상으로 구분되며 실시간 진행률 차트에 반영됩니다. 결과를 표시할 때 댓글과 스크린샷을 추가할 수도 있습니다.',
      },
      {
        question: '탐색적 테스트 세션은 어떻게 작동하나요?',
        answer: '목표와 시간 박스를 설정하여 세션을 시작하세요. 세션 중에 리치 텍스트 에디터에서 인라인 스크린샷과 함께 버그, 관찰 사항, 메모를 직접 기록할 수 있습니다. 세션이 종료되면 팀과 공유할 수 있는 구조화된 세션 리포트가 자동으로 생성됩니다.',
      },
      {
        question: '테스트 결과와 리포트를 내보낼 수 있나요?',
        answer: '네. 테스트 케이스를 CSV/Excel 형식으로 내보내고 테스트 실행 결과를 상세 리포트로 내보낼 수 있습니다. 내보내기에는 모든 결과 상태, 담당자 정보, 댓글, 타임스탬프가 포함됩니다. 무료 플랜을 포함한 모든 플랜에서 사용 가능합니다.',
      },
      {
        question: '언제든지 플랜을 변경하거나 취소할 수 있나요?',
        answer: '물론입니다. 계정 설정에서 언제든지 구독을 업그레이드, 다운그레이드 또는 취소할 수 있습니다. 취소하면 현재 청구 기간이 끝날 때까지 계정이 활성 상태를 유지합니다. 숨겨진 수수료나 장기 계약은 없습니다.',
      },
    ],
    cta: {
      title: 'QA 레벨업 준비되셨나요?',
      description: '신용카드 없이 무료로 시작하세요. 몇 분 만에 QA 워크플로우 전체를 운영하세요.',
      button: '무료로 시작하기',
    },
    newsletter: {
      title: '최신 소식 받기',
      description: '새로운 기능과 QA 팁을 이메일로 받아보세요',
      placeholder: '이메일 주소 입력',
      button: '구독하기',
      success: '구독해주셔서 감사합니다!',
    },
    footer: {
      tagline: '올인원 테스트 관리 플랫폼. 더 나은 소프트웨어를 만들고 자신 있게 배포하세요.',
      product: '제품',
      productLinks: ['기능 소개', '요금제', '업데이트 노트', '로드맵'],
      company: '회사',
      privacy: '개인정보처리방침',
      terms: '이용약관',
      about: '소개',
      compare: '비교',
      compareLinks: ['Testably vs TestRail', 'Testably vs Zephyr', 'Testably vs Qase'],
      copyright: `© ${new Date().getFullYear()} Testably. All rights reserved.`,
    },
    scrollIndicator: '스크롤',
  },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lang = currentLanguage === 'ko' ? 'ko' : 'en';
  const t = content[lang];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % t.features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [t.features.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langMenuOpen]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const body = new URLSearchParams();
      body.append('email', email);
      await fetch('https://readdy.ai/api/form/d6nnujlv117fnkj2hmc0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      setSubscribed(true);
      setEmail('');
    } catch {
      setSubscribed(true);
    }
  };

  useEffect(() => {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.en.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
    const existingScript = document.getElementById('faq-schema');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.id = 'faq-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => {
      const s = document.getElementById('faq-schema');
      if (s) s.remove();
    };
  }, []);

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.workflow, href: '#workflow' },
    { label: t.nav.pricing, href: '#pricing' },
    { label: t.nav.testimonials, href: '#why-testably' },
    { label: t.nav.faq, href: '#faq' },
  ];

  return (
    <>
      <SEOHead
        title="Testably - QA Test Management Platform | Start for Free"
        description="Faster, smarter QA test management. Manage test cases, runs, milestones, sessions, and team collaboration in one platform. Jira integration, CI/CD support, 14-day free trial."
        keywords="QA test management, test case management, test run, test automation, Jira integration, software testing, quality assurance, QA tools, testing platform"
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Testably',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '127' },
          description: 'All-in-one QA test management platform. Manage test cases, runs, milestones, and team collaboration in one place.',
        }}
      />

      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>

        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/">
              <Logo variant={scrolled ? 'light' : 'dark'} className="h-9" />
            </a>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors cursor-pointer ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${scrolled ? 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white' : 'border-white/30 text-white/80 hover:text-white hover:border-white/60 bg-white/10'}`}
                >
                  <i className="ri-translate-2 text-base"></i>
                  <span>{lang === 'en' ? 'EN' : 'KO'}</span>
                  <i className={`ri-arrow-down-s-line text-sm transition-transform ${langMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                    <button
                      onClick={() => { changeLanguage('en'); setLangMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 ${lang === 'en' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🇬🇧</span>
                        <span>English</span>
                      </div>
                      {lang === 'en' && <i className="ri-check-line text-indigo-600"></i>}
                    </button>
                    <button
                      onClick={() => { changeLanguage('ko'); setLangMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 ${lang === 'ko' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🇰🇷</span>
                        <span>한국어</span>
                      </div>
                      {lang === 'ko' && <i className="ri-check-line text-indigo-600"></i>}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/auth')}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${scrolled ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              >
                {t.nav.login}
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer whitespace-nowrap"
              >
                {t.nav.getStarted}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative min-h-[100dvh] flex items-center overflow-hidden bg-gray-950">

          {/* Background: Mesh Gradient */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
            <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.08] blur-[100px]"></div>
            <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-400/5 blur-[80px]"></div>
            {/* Noise texture */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '128px 128px',
              }}
            ></div>
          </div>

          {/* Content */}
          <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-32 lg:py-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

              {/* LEFT: Text (7 columns) */}
              <div className="lg:col-span-7 text-center lg:text-left">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span className="text-indigo-300/90 text-sm font-medium">Built for QA teams who ship fast</span>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
                  Test management
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                    that just works.
                  </span>
                </h1>

                {/* Subheading */}
                <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-xl mb-10 mx-auto lg:mx-0">
                  From test cases to runs, milestones to sessions — organize your entire QA workflow in one place. Free to start, ready in minutes.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-8">
                  <button
                    onClick={() => navigate('/auth')}
                    className="group flex items-center gap-3 px-8 py-4 bg-indigo-500 text-white rounded-full font-bold text-base hover:bg-indigo-400 active:scale-[0.98] shadow-[0_0_30px_rgba(20,184,166,0.2)] hover:shadow-[0_0_40px_rgba(20,184,166,0.35)] cursor-pointer"
                    style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    Get Started Free
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 group-hover:translate-x-0.5 transition-transform duration-300">
                      <i className="ri-arrow-right-line text-sm"></i>
                    </span>
                  </button>
                  <button
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-2 px-8 py-4 bg-white/[0.06] text-white/80 border border-white/[0.1] rounded-full font-semibold text-base hover:bg-white/[0.1] hover:text-white hover:border-white/20 active:scale-[0.98] backdrop-blur-sm cursor-pointer"
                    style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    <i className="ri-play-circle-line text-lg text-indigo-400"></i>
                    Watch Demo
                  </button>
                </div>

                {/* Trust line */}
                <p className="text-white/30 text-sm">
                  No credit card required &nbsp;&middot;&nbsp; Free plan available &nbsp;&middot;&nbsp; Set up in under 5 minutes
                </p>
              </div>

              {/* RIGHT: Product Screenshot (5 columns) */}
              <div className="lg:col-span-5 relative">
                {/* Glow behind */}
                <div className="absolute -inset-8 bg-indigo-500/10 rounded-3xl blur-3xl"></div>

                {/* Double-Bezel Card */}
                <div className="relative bg-white/[0.04] ring-1 ring-white/[0.08] p-1.5 rounded-[1.5rem] shadow-2xl">
                  <div className="rounded-[calc(1.5rem-0.375rem)] overflow-hidden bg-gray-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900/80 border-b border-white/[0.06]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="bg-white/[0.06] rounded-md px-3 py-1 text-[11px] text-white/30 text-center truncate">
                          testably.app/projects
                        </div>
                      </div>
                    </div>
                    {/* Screenshot */}
                    <img
                      src="/hero-project-overview.png"
                      alt="Testably project dashboard showing test cases, runs, and milestones"
                      className="w-full h-auto"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Floating stat card */}
                <div
                  className="absolute -bottom-4 -left-6 bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl px-5 py-4 shadow-xl hidden sm:block"
                  style={{ animation: 'float 6s ease-in-out infinite' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <i className="ri-check-double-line text-indigo-400 text-lg"></i>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">248 tests passed</div>
                      <div className="text-white/40 text-xs">Sprint 4.2 — 100% pass rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/20 text-xs">
            <span>Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
          </div>
        </header>

        {/* Stats Bar */}
        <section className="py-14 bg-gray-950">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {t.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-black text-indigo-400 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-settings-3-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">{t.featuresSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.featuresSection.title}</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.featuresSection.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {t.features.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                    activeFeature === index
                      ? 'border-indigo-200 scale-[1.02] shadow-md shadow-indigo-50'
                      : 'border-gray-100 hover:border-indigo-100 hover:shadow-sm'
                  } ${feature.color}`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-white shadow-sm">
                      <i className={`${feature.icon} text-xl ${feature.iconColor}`}></i>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 text-gray-500">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-flow-chart text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">{t.workflowSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.workflowSection.title}</h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.workflowSection.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {t.workflowSteps.map((step, index) => (
                <article key={step.step} className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  {index < t.workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 -right-3 w-6 h-px bg-indigo-200 z-10"></div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-black text-indigo-100">{step.step}</span>
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-500 rounded-xl">
                      <i className={`${step.icon} text-white text-lg`}></i>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="py-24 bg-gray-950">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-plug-line text-indigo-300 text-sm"></i>
                <span className="text-indigo-200 text-sm font-medium">{t.integrationSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">{t.integrationSection.title}</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.integrationSection.description}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Jira */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 flex items-center justify-center bg-indigo-500/20 rounded-xl">
                    <i className="ri-links-line text-indigo-400 text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.integrationSection.jiraTitle}</h3>
                    <p className="text-gray-500 text-xs">Jira Cloud &amp; Data Center</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{t.integrationSection.jiraDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {t.integrationSection.jiraTags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-medium">{tag}</span>
                  ))}
                </div>
              </div>

              {/* CI/CD */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 flex items-center justify-center bg-violet-500/20 rounded-xl">
                    <i className="ri-terminal-box-line text-violet-400 text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.integrationSection.ciTitle}</h3>
                    <p className="text-gray-500 text-xs">REST API · Secure Tokens</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{t.integrationSection.ciDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {t.integrationSection.ciTags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teams Choose Testably */}
        <section id="why-testably" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-award-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">{t.whySection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.whySection.title}</h2>
              <p className="text-gray-500 text-lg">{t.whySection.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.whyCards.map((card) => (
                <article key={card.title} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
                    <i className={`${card.icon} text-indigo-600 text-2xl`}></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-price-tag-3-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">{t.pricingSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.pricingSection.title}</h2>
              <p className="text-gray-500 text-lg">{t.pricingSection.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
              {t.pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl p-6 border flex flex-col transition-all ${
                    plan.highlighted
                      ? 'bg-indigo-500 border-indigo-500 shadow-xl shadow-indigo-200 scale-[1.02]'
                      : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-md'
                  }`}
                >
                  <div className="mb-5">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl mb-3 ${plan.highlighted ? 'bg-white/20' : 'bg-indigo-50'}`}>
                      <i className={`${plan.icon} text-xl ${plan.highlighted ? 'text-white' : 'text-indigo-600'}`}></i>
                    </div>
                    {plan.popular && (
                      <div className="inline-flex items-center gap-1 bg-white/25 rounded-full px-3 py-1 mb-2">
                        <i className="ri-star-fill text-white text-xs"></i>
                        <span className="text-white text-xs font-semibold">{plan.popular}</span>
                      </div>
                    )}
                    <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
                  </div>

                  <div className={`mb-5 pb-5 border-b ${plan.highlighted ? 'border-white/20' : 'border-gray-100'}`}>
                    <span className={`text-3xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-xs ml-1.5 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${plan.highlighted ? 'bg-white/25' : 'bg-indigo-100'}`}>
                          <i className={`ri-check-line text-xs ${plan.highlighted ? 'text-white' : 'text-indigo-600'}`}></i>
                        </div>
                        <span className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/90' : 'text-gray-700'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {['Contact Us', '문의하기', 'Contact Sales'].includes(plan.cta) ? (
                    <a
                      href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry"
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap block text-center ${
                        plan.highlighted ? 'bg-white text-indigo-600 hover:bg-gray-50' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate('/auth')}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                        plan.highlighted ? 'bg-white text-indigo-600 hover:bg-gray-50' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-question-answer-line text-indigo-600 text-sm"></i>
                <span className="text-indigo-700 text-sm font-medium">{t.faqSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.faqSection.title}</h2>
              <p className="text-gray-500 text-lg">{t.faqSection.description}</p>
            </div>

            <div className="space-y-3">
              {t.faqs.map((faq, index) => (
                <article key={index} className={`rounded-2xl border transition-all duration-200 overflow-hidden ${openFaq === index ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-white hover:border-indigo-100'}`}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer group"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <h4 className={`text-sm font-semibold leading-snug pr-4 transition-colors ${openFaq === index ? 'text-indigo-700' : 'text-gray-900 group-hover:text-indigo-700'}`}>
                      <a id={`faq-${index}`}>{faq.question}</a>
                    </h4>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 ${openFaq === index ? 'bg-indigo-500 rotate-45' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                      <i className={`ri-add-line text-sm ${openFaq === index ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600'}`}></i>
                    </div>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-5">
                      <div className="h-px bg-indigo-100 mb-4"></div>
                      <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm mb-4">
                {lang === 'en' ? 'Still have questions?' : '아직 궁금한 점이 있으신가요?'}
              </p>
              <a
                href="mailto:hello@testably.app"
                className="inline-flex items-center gap-2 px-6 py-3 border border-indigo-200 text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="ri-mail-line"></i>
                {lang === 'en' ? 'Contact our team' : '팀에 문의하기'}
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15">
            <img
              src="https://readdy.ai/api/search-image?query=abstract%20technology%20network%20dark%20background%20glowing%20teal%20emerald%20nodes%20connections%20digital%20mesh%20futuristic%20minimal&width=1440&height=500&seq=cta-v2&orientation=landscape"
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-rocket-line text-indigo-300 text-sm"></i>
              <span className="text-indigo-200 text-sm font-medium">Testably</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{t.cta.title}</h2>
            <p className="text-white/55 text-lg mb-10">{t.cta.description}</p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-400 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-indigo-500/30 inline-flex items-center gap-3"
            >
              <i className="ri-rocket-line"></i>
              {t.cta.button}
            </button>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-indigo-600">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">{t.newsletter.title}</h3>
            <p className="text-indigo-100 text-sm mb-6">{t.newsletter.description}</p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-white">
                <i className="ri-check-circle-line text-xl"></i>
                <span className="font-semibold">{t.newsletter.success}</span>
              </div>
            ) : (
              <form data-readdy-form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.newsletter.placeholder}
                  className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/20 border border-white/30 text-white placeholder-indigo-200 focus:outline-none focus:bg-white/30"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  {t.newsletter.button}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div>
                <div className="mb-4">
                  <Logo variant="light" className="h-8" />
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{t.footer.tagline}</p>
              </div>
              <nav>
                <h4 className="text-sm font-bold text-gray-900 mb-4">{t.footer.product}</h4>
                <ul className="space-y-2">
                  {t.footer.productLinks.map((item, i) => (
                    <li key={item}>
                      <Link to={['/features', '/pricing', '/changelog', '/roadmap'][i]} className="text-gray-500 text-sm hover:text-gray-900 transition-colors">{item}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav>
                <h4 className="text-sm font-bold text-gray-900 mb-4">{t.footer.company}</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/about" className="text-gray-500 text-sm hover:text-gray-900 transition-colors">{t.footer.about}</Link>
                  </li>
                  <li>
                    <button onClick={() => navigate('/privacy')} className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer">{t.footer.privacy}</button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/terms')} className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer">{t.footer.terms}</button>
                  </li>
                </ul>
              </nav>
              <nav>
                <h4 className="text-sm font-bold text-gray-900 mb-4">{t.footer.compare}</h4>
                <ul className="space-y-2">
                  {t.footer.compareLinks.map((item, i) => (
                    <li key={item}>
                      <Link to={['/compare/testrail', '/compare/zephyr', '/compare/qase'][i]} className="text-gray-500 text-sm hover:text-gray-900 transition-colors">{item}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-xs">{t.footer.copyright}</p>
              <div className="flex items-center gap-4">
                {[
                  { icon: 'ri-twitter-x-line', href: 'https://x.com/testably' },
                  { icon: 'ri-github-line', href: 'https://github.com/testably' },
                  { icon: 'ri-linkedin-box-line', href: 'https://linkedin.com/company/testably' },
                ].map(({ icon, href }) => (
                  <a key={icon} href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                    <i className={`${icon} text-base`}></i>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
