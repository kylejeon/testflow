import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import Logo from '../../components/Logo';
import { useLanguage } from '../../hooks/useLanguage';
import { registerPaddleErrorHandler } from '../../lib/paddle';
import { useToast, ToastContainer } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { getPaymentProvider, openCheckout } from '../../lib/payment';

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
      { value: 'Free', label: 'Up to 1 project forever' },
    ],
    featuresSection: {
      badge: 'Core Features',
      title: 'Everything your QA team needs',
      description: 'From writing test cases to analyzing results — Testably covers the full testing lifecycle',
    },
    differentiators: [
      {
        badge: 'AI-Native',
        badgeIcon: 'ri-sparkling-line',
        title: 'AI Test Generation',
        description: 'Describe what you want to test in plain language. Testably generates structured test cases, steps, and expected results. Convert Exploratory findings to test cases with one click.',
        pills: ['Plain text → test cases', 'Jira issue → test cases', 'Discovery → test cases', 'Edge case suggestions'],
      },
      {
        badge: 'Unique',
        badgeIcon: 'ri-focus-3-line',
        title: 'Focus Mode',
        description: 'Execute test runs in a distraction-free fullscreen. See only the current step, mark results with a single keystroke, and auto-advance. No context switching, no clutter.',
        pills: ['P / F / B / S keystroke', 'Auto-advance 300ms', 'Progress bar', 'Inline notes'],
      },
      {
        badge: 'Power User',
        badgeIcon: 'ri-keyboard-line',
        title: 'Cmd+K Command Palette',
        description: 'Navigate anywhere, create anything, execute any action — all from your keyboard. Vim-inspired G-chord shortcuts let you fly through your QA workflow at terminal speed.',
        pills: ['Cmd+K palette', 'G-chord navigation', 'Cmd+Shift+F Focus Mode', '? shortcut help'],
      },
    ],
    features: [
      {
        icon: 'ri-folder-3-line',
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
        icon: 'ri-flag-line',
        title: 'Milestone Tracking',
        description: 'Set release goals and monitor progress visually. Keep the whole team aligned on timelines and ship with confidence.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Planning',
      },
      {
        icon: 'ri-search-eye-line',
        title: 'Exploratory',
        description: 'Capture exploratory testing insights as you go. Log observations with rich text notes, inline screenshots, and real-time log capture. Auto-convert discoveries into formal test cases.',
        color: 'bg-violet-900/20',
        iconColor: 'text-violet-400',
        tag: 'Testing',
      },
      {
        icon: 'ri-team-line',
        title: 'Team Collaboration',
        description: 'Invite team members and set role-based permissions — Owner, Admin, Member, or Viewer. The project creator is automatically the Owner. Assign test cases to specific team members for clear ownership.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: 'Team',
      },
      {
        icon: 'ri-link',
        title: 'Jira Integration',
        description: 'Create Jira issues directly from failed tests with full context — steps, screenshots, and environment info.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Integration',
      },
      {
        icon: 'ri-git-merge-line',
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
        icon: 'ri-file-text-line',
        title: 'Project Documentation',
        description: 'Centralize your test plans, release notes, and QA documents alongside your test data. Upload files and add links — everything in one workspace.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: 'Documentation',
      },
      {
        icon: 'ri-upload-download-line',
        title: 'Import & Export',
        description: 'Migrate from TestRail, Zephyr, or Qase in minutes. Import test cases via CSV, export to CSV/JSON for backup, and generate PDF reports for stakeholders. Your data, your way.',
        color: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        tag: 'Data',
      },
      {
        icon: 'ri-pie-chart-2-line',
        title: 'Advanced Reporting',
        description: 'Visualize your QA health with 4 built-in dashboards: Pass Rate trends, Active Runs status, Team Activity heatmap, and Test Case Overview. Export any report as PDF.',
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        tag: 'Analytics',
      },
      {
        icon: 'ri-git-branch-line',
        title: 'TC Versioning',
        description: 'Track every change to your test cases with Major/Minor versioning. Browse version history, compare diffs side-by-side, restore any previous version, and publish releases — full audit trail with zero effort.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        tag: 'Versioning',
      },
      {
        icon: 'ri-terminal-box-line',
        title: 'Test Automation SDK',
        description: 'Connect Playwright, Cypress, and Jest to Testably in one command: npm install @testably.kr/reporter. Results flow into your runs automatically — no manual uploads, no config headaches. Fully compatible with the existing CI/CD API.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        tag: 'SDK',
      },
      {
        icon: 'ri-map-2-line',
        title: 'Requirements Traceability Matrix',
        description: 'Link requirements directly to test cases and runs. Get full visibility into coverage status — know exactly which requirements are tested, partially covered, or missing.',
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
        tag: 'Traceability',
      },
      {
        icon: 'ri-recycle-line',
        title: 'Shared / Reusable Test Steps',
        description: 'Build a library of reusable test steps and embed them into any test case. Update once, propagate everywhere — eliminate duplication and keep your test suite maintainable.',
        color: 'bg-green-50',
        iconColor: 'text-green-600',
        tag: 'Efficiency',
      },
    ],
    workflowSection: {
      badge: 'How It Works',
      title: 'Your QA process in 4 simple steps',
      description: 'Start in minutes — no complex setup required',
    },
    workflowSteps: [
      { step: '01', title: 'Create a Project', description: 'Set up a project for the product or feature you are testing and invite your team members.', icon: 'ri-add-circle-line' },
      { step: '02', title: 'Write Test Cases', description: 'Build a structured library of test cases with folders, priorities, tags, and preconditions.', icon: 'ri-edit-2-line' },
      { step: '03', title: 'Execute Test Runs', description: 'Create a test run tied to a milestone, assign cases to team members, and track results live.', icon: 'ri-play-line' },
      { step: '04', title: 'Analyze & Ship', description: 'Review real-time dashboards, export reports, and ship with confidence when all tests pass.', icon: 'ri-bar-chart-box-line' },
    ],
    integrationSection: {
      badge: 'Integrations',
      title: 'Works with your existing tools',
      description: 'Connect Testably to the tools your team already uses — no disruption to your workflow.',
      jiraTitle: 'Seamless Jira Integration',
      jiraDescription: 'When a test fails, Testably automatically creates a Jira issue with all the context — steps, screenshots, and environment info. No more copy-paste between tools.',
      jiraTags: ['Auto issue creation', 'Project linking'],
      ciTitle: 'CI/CD Pipeline Ready',
      ciDescription: 'Push automated test results from any CI/CD system via our REST API. Use project-specific tokens to keep your pipelines secure.',
      ciTags: ['GitHub Actions', 'Jenkins', 'GitLab CI', 'REST API'],
    },
    whyCards: [
      {
        icon: 'ri-timer-flash-line',
        title: '5-Minute Setup',
        content: 'Sign up, create a project, write your first test case. No configuration wizards, no onboarding calls.',
      },
      {
        icon: 'ri-plug-line',
        title: 'Jira + CI/CD Built-in',
        content: 'Failed test becomes a Jira issue automatically. GitHub Actions and GitLab CI report results back.',
      },
      {
        icon: 'ri-gift-line',
        title: 'Free Forever Plan',
        content: '1 project, 2 team members, 100 TCs/project, 3 AI/month. No credit card, no expiration.',
      },
      {
        icon: 'ri-arrow-left-right-line',
        title: 'Switch from TestRail in Minutes',
        content: 'Import your entire test library via CSV. TestRail field mapping is built-in — priority, steps, expected results all transfer automatically.',
      },
    ],
    whySection: {
      badge: 'Why Testably',
      title: 'Why teams choose Testably',
      description: 'Everything your QA team needs, none of the complexity you don\'t.',
    },
    pricingSection: {
      badge: 'Pricing',
      title: 'Plans that scale with your team',
      description: 'Flat-rate pricing — no per-seat charges. Free forever for up to 3 members. 14-day free trial on all paid plans.',
      note: 'Free forever for up to 3 members · 14-day free trial on all paid plans · No per-seat charges',
    },
    pricingPlans: [
      {
        name: 'Free', planColor: '#10B981', price: '$0', period: 'forever',
        users: 'Up to 2 users · forever free',
        description: 'Perfect for small teams getting started',
        basePlan: null,
        features: ['1 project · 2 members', 'Up to 100 TCs / project', 'Test runs (10 / month)', 'TC Versioning', 'Jira (read-only)', '3 AI generations / month'],
        cta: 'Get Started Free', ctaVariant: 'outline', aiFeatureIdx: 5,
        highlighted: false, icon: 'ri-user-line', popular: '',
      },
      {
        name: 'Hobby', planColor: '#10B981', price: '$19', period: '/ month',
        annualMonthly: 16.15, annualTotal: 194,
        users: 'Up to 5 users',
        description: 'For indie devs and small side projects',
        basePlan: 'Free',
        features: ['3 projects · 5 members', 'Up to 200 TCs / project · unlimited runs', 'Export/Import CSV', 'Jira full integration', 'Requirements & Traceability', 'Steps Library (10 steps)', '15 AI generations / month'],
        cta: 'Get Started', ctaVariant: 'outline', aiFeatureIdx: 6,
        highlighted: false, icon: 'ri-seedling-line', popular: '',
      },
      {
        name: 'Starter', planColor: '#818CF8', price: '$49', period: '/ month',
        annualMonthly: 41.58, annualTotal: 499,
        users: 'Up to 5 users',
        description: 'For growing teams that need more power',
        basePlan: 'Hobby',
        features: ['10 projects · 5 members', 'Unlimited test cases', 'Slack & Teams integration', 'Requirements & Traceability · Steps Library (20 steps)', 'AI Run Summary · Flaky Detection AI', 'Coverage Gap Analysis · AI Insights Panel', 'Basic reporting · email support', '30 AI generations / month'],
        cta: 'Start Free Trial', ctaVariant: 'outline', aiFeatureIdx: 7,
        highlighted: false, icon: 'ri-star-line', popular: '',
      },
      {
        name: 'Professional', planColor: '#C084FC', price: '$99', period: '/ month',
        annualMonthly: 84.17, annualTotal: 1010,
        users: 'Up to 20 users',
        description: 'Full-featured for professional QA teams',
        basePlan: 'Starter',
        features: ['Unlimited projects · up to 20 members', 'RTM: Audit Trail + AI Coverage Gap', 'Steps Library (Unlimited)', 'CI/CD Integration', 'Test Automation Framework SDK', 'Advanced reporting · priority support', '150 AI generations / month'],
        cta: 'Get Started', ctaVariant: 'filled', aiFeatureIdx: 5,
        highlighted: true, icon: 'ri-vip-crown-line', popular: 'Most Popular',
      },
      {
        name: 'Enterprise S', planColor: '#FB923C', price: '$249', period: '/ month',
        annualMonthly: 211.67, annualTotal: 2540,
        users: '21–50 users',
        description: 'For teams scaling beyond 20 members',
        basePlan: 'Professional',
        features: ['21–50 members', 'Unlimited AI generations', 'RTM: Audit Trail + Jira sync', 'Dedicated support · SLA guarantee'],
        cta: 'Get Started', ctaVariant: 'outline', aiFeatureIdx: 1,
        highlighted: false, icon: 'ri-building-2-line', popular: '',
      },
      {
        name: 'Enterprise M', planColor: '#F87171', price: '$499', period: '/ month',
        annualMonthly: 424.17, annualTotal: 5090,
        users: '51–100 users',
        description: 'For mid-size organizations',
        basePlan: 'Enterprise S',
        features: ['51–100 members'],
        cta: 'Get Started', ctaVariant: 'outline', aiFeatureIdx: -1,
        highlighted: false, icon: 'ri-building-4-line', popular: '',
      },
      {
        name: 'Enterprise L', planColor: '#94A3B8', price: 'Custom', period: '',
        users: '100+ users · tailored plan',
        description: 'For large enterprises with custom needs',
        basePlan: 'Enterprise M',
        features: ['100+ members', 'Custom contract & SLA', 'Dedicated infrastructure'],
        cta: 'Contact Sales', ctaVariant: 'dark', aiFeatureIdx: -1,
        highlighted: false, icon: 'ri-government-line', popular: '', darkCard: true,
      },
    ],
    viewerBanner: {
      title: 'Viewers are always free',
      description: "Viewer roles don't count toward your plan's seat limit. Invite unlimited stakeholders, managers, and executives to observe testing progress — at no extra cost.",
      example: 'On the Starter plan (5 seats), you could have 1 Owner + 1 Admin + 3 Members + unlimited Viewers.',
      tags: ['View test results', 'Track milestones', 'Read documentation', 'Monitor dashboards'],
      comparison: [
        { name: 'TestRail', detail: 'All users counted', price: '$36/user/month', negative: true },
        { name: 'Qase', detail: 'All users counted', price: 'Per-seat pricing', negative: true },
        { name: 'Testably', detail: 'Flat-rate pricing', price: 'Viewers FREE forever', negative: false },
      ],
    },
    faqSection: {
      badge: 'FAQ',
      title: 'Frequently asked questions',
      description: 'Everything you need to know about Testably. Can\'t find the answer? Reach out to our team.',
    },
    faqs: [
      {
        question: 'What are the limits of the Free plan?',
        answer: 'The Free plan lets you create 1 project with up to 2 team members. You get 100 test cases per project, up to 10 test runs per month, Jira read-only access, and 3 AI generations per month. CSV export and Shared Steps are not available on Free — upgrade to Hobby or higher for those features.',
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
        question: 'How does Exploratory work?',
        answer: 'Start a discovery log by setting a goal and time box. During the session, you can log bugs, observations, and notes with inline screenshots directly in the rich text editor. When you end the session, a structured report is generated automatically that can be shared with the team.',
      },
      {
        question: 'Can I export test results and reports?',
        answer: 'Yes. You can export test cases to CSV/Excel format and export test run results as detailed reports. The export includes all result statuses, assignee info, comments, and timestamps. CSV export is available on Hobby and above — Free plan users cannot export to CSV.',
      },
      {
        question: 'Can I change or cancel my plan at any time?',
        answer: 'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time from your account settings. If you cancel, your account remains active until the end of your current billing period. No hidden fees or lock-in contracts.',
      },
      {
        question: 'Can I import test cases from TestRail or other tools?',
        answer: 'Yes. Testably supports CSV import with built-in TestRail field mapping. Export your test cases from TestRail as CSV, then import them into Testably — priorities, steps, and expected results are automatically mapped. You can also import from Zephyr and Qase.',
      },
      {
        question: 'Do Viewers count toward my plan\'s member limit?',
        answer: 'No. Viewer roles are completely free and excluded from your seat count. On the Starter plan (5 seats), you could have 1 Owner + 1 Admin + 3 Members + unlimited Viewers. This lets your entire organization observe testing progress without extra cost.',
      },
      {
        question: 'Does Testably support webhooks?',
        answer: 'Yes. You can configure webhooks to send real-time event notifications to any HTTP endpoint — including Slack and Microsoft Teams, or your custom automation system. Events include test run completions, test failures, member joins, and more.',
      },
    ],
    testimonialsSection: {
      badge: 'What Teams Say',
      title1: 'Loved by QA teams',
      title2: 'who ship fast',
    },
    testimonials: [
      {
        quote: 'We switched from TestRail and cut our test management time in half. The AI test generation alone saved us 10+ hours per sprint.',
        name: 'Sarah M.',
        role: 'QA Lead, Fintech Startup',
        initials: 'SM',
        color: '#6366F1',
      },
      {
        quote: 'The keyboard shortcuts are a game-changer. I can execute an entire test run without touching my mouse. It\'s like Vim for QA.',
        name: 'James K.',
        role: 'Senior SDET, SaaS Platform',
        initials: 'JK',
        color: '#8B5CF6',
      },
      {
        quote: 'Focus Mode is brilliant. My team stays in the zone during test execution instead of getting lost in cluttered UI. QA productivity went up 40%.',
        name: 'Lisa W.',
        role: 'Engineering Manager, E-commerce',
        initials: 'LW',
        color: '#EC4899',
      },
    ],
    cta: {
      title: 'Ready to level up your QA workflow?',
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
      compare: 'Compare',
      compareLinks: ['vs TestRail', 'vs Qase', 'vs Zephyr'],
      resources: 'Resources',
      legal: 'Legal',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      refund: 'Refund Policy',
      cookies: 'Cookie Policy',
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
      { value: 'Free', label: '프로젝트 1개 영구 무료' },
    ],
    featuresSection: {
      badge: '핵심 기능',
      title: 'QA 팀에 필요한 모든 것',
      description: '테스트 케이스 작성부터 결과 분석까지 — 전체 테스팅 라이프사이클을 지원합니다',
    },
    differentiators: [
      {
        badge: 'AI 네이티브',
        badgeIcon: 'ri-sparkling-line',
        title: 'AI 테스트 생성',
        description: '테스트하고 싶은 것을 일반 언어로 설명하세요. Testably가 구조화된 테스트 케이스, 단계, 예상 결과를 생성합니다. Exploratory 발견 사항을 한 번의 클릭으로 테스트 케이스로 변환하세요.',
        pills: ['텍스트 → 테스트 케이스', 'Jira 이슈 → 테스트 케이스', 'Discovery → 테스트 케이스', '엣지 케이스 제안'],
      },
      {
        badge: '독창적 기능',
        badgeIcon: 'ri-focus-3-line',
        title: 'Focus Mode',
        description: '방해 없는 전체화면에서 테스트를 실행하세요. 현재 단계만 보고, 단일 키 입력으로 결과를 표시하고, 자동으로 다음 단계로 이동합니다.',
        pills: ['P / F / B / S 키 입력', '300ms 자동 진행', '진행률 바', '인라인 메모'],
      },
      {
        badge: '파워 유저',
        badgeIcon: 'ri-keyboard-line',
        title: 'Cmd+K 커맨드 팔레트',
        description: '키보드만으로 어디든 이동하고, 무엇이든 만들고, 모든 작업을 실행하세요. Vim에서 영감받은 G-chord 단축키로 QA 워크플로우를 빠르게 진행하세요.',
        pills: ['Cmd+K 팔레트', 'G-chord 내비게이션', 'Cmd+Shift+F Focus Mode', '? 단축키 도움말'],
      },
    ],
    features: [
      {
        icon: 'ri-folder-3-line',
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
        icon: 'ri-flag-line',
        title: '마일스톤 추적',
        description: '릴리즈 목표를 설정하고 진행률을 시각적으로 모니터링하세요. 팀 전체가 일정을 공유하고 자신 있게 배포하세요.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '계획',
      },
      {
        icon: 'ri-search-eye-line',
        title: 'Exploratory',
        description: '탐색적 테스트 인사이트를 즉시 기록하세요. 리치 텍스트 메모, 인라인 스크린샷, 실시간 로그 캡처로 관찰 사항을 기록하세요. 발견한 내용을 공식 테스트 케이스로 자동 변환합니다.',
        color: 'bg-violet-900/20',
        iconColor: 'text-violet-400',
        tag: '테스팅',
      },
      {
        icon: 'ri-team-line',
        title: '팀 협업',
        description: 'Owner, Admin, Member, Viewer 4단계 역할 권한과 테스트 케이스별 담당자 지정으로 명확한 책임을 부여합니다. 프로젝트 생성자는 자동으로 Owner가 됩니다.',
        color: 'bg-violet-50',
        iconColor: 'text-violet-600',
        tag: '팀',
      },
      {
        icon: 'ri-link',
        title: 'Jira 연동',
        description: '테스트가 실패하면 Testably가 자동으로 단계, 스크린샷, 환경 정보를 포함한 Jira 이슈를 생성합니다. 더 이상 도구 간 복사-붙여넣기가 필요 없습니다.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '연동',
      },
      {
        icon: 'ri-git-merge-line',
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
        icon: 'ri-file-text-line',
        title: '프로젝트 문서',
        description: '테스트 플랜, 릴리즈 노트, QA 문서를 테스트 데이터 옆에 중앙화하세요. 파일 업로드와 링크 추가로 모든 것을 하나의 워크스페이스에서 관리합니다.',
        color: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        tag: '문서',
      },
      {
        icon: 'ri-upload-download-line',
        title: '가져오기 & 내보내기',
        description: 'TestRail, Zephyr, Qase에서 몇 분 안에 마이그레이션합니다. CSV로 테스트 케이스를 가져오고, CSV/JSON으로 내보내거나 PDF 리포트를 생성합니다.',
        color: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        tag: '데이터',
      },
      {
        icon: 'ri-pie-chart-2-line',
        title: '고급 리포팅',
        description: '4가지 대시보드로 QA 현황을 시각화하세요: Pass Rate 추이, Active Runs 상태, 팀 활동 히트맵, 테스트 케이스 개요. 모든 리포트를 PDF로 내보내세요.',
        color: 'bg-rose-50',
        iconColor: 'text-rose-600',
        tag: '분석',
      },
      {
        icon: 'ri-git-branch-line',
        title: 'TC 버전 관리',
        description: 'Major/Minor 버전 관리로 테스트 케이스의 모든 변경 이력을 추적하세요. 버전 히스토리 열람, Diff 비교, 이전 버전 복원, 릴리즈 Publish까지 — 완전한 감사 추적을 자동으로 제공합니다.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        tag: '버전관리',
      },
      {
        icon: 'ri-terminal-box-line',
        title: '자동화 테스트 SDK',
        description: 'npm install @testably.kr/reporter 한 줄로 Playwright, Cypress, Jest를 연결하세요. 결과가 자동으로 Run에 반영되며 기존 CI/CD API와 완전히 호환됩니다.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        tag: 'SDK',
      },
      {
        icon: 'ri-map-2-line',
        title: '요구사항 추적성 매트릭스 (RTM)',
        description: '요구사항을 테스트 케이스 및 실행과 직접 연결하세요. 어떤 요구사항이 테스트되었고, 부분적으로 커버되었는지, 누락되었는지 한눈에 확인합니다.',
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
        tag: '추적성',
      },
      {
        icon: 'ri-recycle-line',
        title: '공유/재사용 테스트 스텝',
        description: '재사용 가능한 테스트 스텝 라이브러리를 구축하고 모든 테스트 케이스에 삽입하세요. 한 번 수정하면 모든 곳에 자동 반영 — 중복을 없애고 테스트 스위트를 유지 가능하게 유지합니다.',
        color: 'bg-green-50',
        iconColor: 'text-green-600',
        tag: '효율성',
      },
    ],
    workflowSection: {
      badge: '워크플로우',
      title: '4단계로 완성하는 QA 프로세스',
      description: '복잡한 설정 없이 몇 분 만에 시작하세요',
    },
    workflowSteps: [
      { step: '01', title: '프로젝트 생성', description: '테스트할 제품이나 기능에 맞는 프로젝트를 생성하고 팀원을 초대하세요.', icon: 'ri-add-circle-line' },
      { step: '02', title: '테스트 케이스 작성', description: '폴더, 우선순위, 태그, 전제 조건을 활용해 체계적인 테스트 케이스 라이브러리를 구축하세요.', icon: 'ri-edit-2-line' },
      { step: '03', title: 'Test Run 실행', description: '마일스톤에 맞춰 테스트 실행을 생성하고 팀원에게 케이스를 할당해 실시간으로 결과를 추적하세요.', icon: 'ri-play-line' },
      { step: '04', title: '분석 & 배포', description: '실시간 대시보드를 검토하고 리포트를 내보내세요. 모든 테스트가 통과되면 자신 있게 배포하세요.', icon: 'ri-bar-chart-box-line' },
    ],
    integrationSection: {
      badge: '연동',
      title: '기존 도구와 완벽하게 작동합니다',
      description: '팀이 이미 사용 중인 도구에 Testably를 연결하세요 — 기존 워크플로우에 방해 없이.',
      jiraTitle: 'Jira와 완벽하게 연동됩니다',
      jiraDescription: '테스트가 실패하면 Testably가 자동으로 단계, 스크린샷, 환경 정보를 포함한 Jira 이슈를 생성합니다. 더 이상 도구 간 복사-붙여넣기가 필요 없습니다.',
      jiraTags: ['자동 이슈 생성', '프로젝트 연결'],
      ciTitle: 'CI/CD 파이프라인 지원',
      ciDescription: 'REST API를 통해 모든 CI/CD 시스템에서 자동 테스트 결과를 업로드하세요. 프로젝트별 토큰으로 파이프라인을 안전하게 유지하세요.',
      ciTags: ['GitHub Actions', 'Jenkins', 'GitLab CI', 'REST API'],
    },
    whyCards: [
      {
        icon: 'ri-timer-flash-line',
        title: '5분 설정',
        content: '가입하고, 프로젝트를 만들고, 첫 번째 테스트 케이스를 작성하세요. 복잡한 설정 마법사나 온보딩 콜 없이 바로 시작할 수 있습니다.',
      },
      {
        icon: 'ri-plug-line',
        title: 'Jira + CI/CD 기본 내장',
        content: '테스트 실패 시 자동으로 Jira 이슈가 생성됩니다. GitHub Actions와 GitLab CI가 결과를 자동으로 보고합니다.',
      },
      {
        icon: 'ri-gift-line',
        title: '영구 무료 플랜',
        content: '프로젝트 1개, 팀 멤버 2명, TC 100개/프로젝트, AI 3회/월. 신용카드 없이, 체험 기간 만료 없이 사용하세요.',
      },
      {
        icon: 'ri-arrow-left-right-line',
        title: 'TestRail에서 몇 분 안에 전환',
        content: 'CSV를 통해 전체 테스트 라이브러리를 가져옵니다. TestRail 필드 매핑이 기본 제공되어 우선순위, 단계, 예상 결과가 자동으로 이전됩니다.',
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
      description: '좌석당 요금 없음 · 멤버 3명까지 영구 무료 · 모든 유료 요금제 14일 무료 체험',
      note: '멤버 3명까지 영구 무료 · 모든 유료 요금제 14일 무료 체험 · 좌석당 요금 없음',
    },
    pricingPlans: [
      {
        name: 'Free', planColor: '#10B981', price: '$0', period: '영구 무료',
        users: '최대 2명 · 영구 무료',
        description: '소규모 팀을 위한 기본 기능',
        basePlan: null,
        features: ['프로젝트 1개 · 멤버 2명', 'TC 최대 100개/프로젝트', '테스트 실행 (월 10회)', 'TC 버전 관리', 'Jira 연동 (읽기 전용)', 'AI 생성 3회/월'],
        cta: '무료로 시작하기', ctaVariant: 'outline', aiFeatureIdx: 5,
        highlighted: false, icon: 'ri-user-line', popular: '',
      },
      {
        name: 'Hobby', planColor: '#10B981', price: '$19', period: '/ 월',
        annualMonthly: 16.15, annualTotal: 194,
        users: '최대 5명',
        description: '개인 개발자 및 소규모 사이드 프로젝트',
        basePlan: 'Free',
        features: ['프로젝트 3개 · 멤버 5명', 'TC 최대 200개/프로젝트 · 실행 무제한', 'CSV 내보내기/가져오기', 'Jira 연동 (전체)', '요구사항 & 추적성 (RTM)', '공유 스텝 (10개)', 'AI 생성 15회/월'],
        cta: '시작하기', ctaVariant: 'outline', aiFeatureIdx: 6,
        highlighted: false, icon: 'ri-seedling-line', popular: '',
      },
      {
        name: 'Starter', planColor: '#818CF8', price: '$49', period: '/ 월',
        annualMonthly: 41.58, annualTotal: 499,
        users: '최대 5명',
        description: '성장하는 팀을 위한 핵심 기능',
        basePlan: 'Hobby',
        features: ['프로젝트 10개 · 멤버 5명', 'TC 무제한', 'Slack & Teams 연동', '요구사항 & 추적성 · 공유 스텝 (20개)', 'AI 실행 요약 · 플레이키 감지 AI', '커버리지 갭 분석 · AI 인사이트', '기본 리포팅 · 이메일 지원', 'AI 생성 30회/월'],
        cta: '14일 무료 체험', ctaVariant: 'outline', aiFeatureIdx: 7,
        highlighted: false, icon: 'ri-star-line', popular: '',
      },
      {
        name: 'Professional', planColor: '#C084FC', price: '$99', period: '/ 월',
        annualMonthly: 84.17, annualTotal: 1010,
        users: '최대 20명',
        description: '전문 QA 팀을 위한 완전한 기능',
        basePlan: 'Starter',
        features: ['프로젝트 무제한 · 멤버 20명', 'RTM: 감사 추적 + AI 커버리지 갭', '공유 스텝 무제한', 'CI/CD 연동', '테스트 자동화 Framework SDK', '고급 리포팅 · 우선 지원', 'AI 생성 150회/월'],
        cta: '시작하기', ctaVariant: 'filled', aiFeatureIdx: 5,
        highlighted: true, icon: 'ri-vip-crown-line', popular: '가장 인기',
      },
      {
        name: 'Enterprise S', planColor: '#FB923C', price: '$249', period: '/ 월',
        annualMonthly: 211.67, annualTotal: 2540,
        users: '21–50명',
        description: '20명 초과 팀을 위한 플랜',
        basePlan: 'Professional',
        features: ['멤버 21–50명', 'AI 생성 무제한', 'RTM: 감사 추적 + Jira 동기화', '전담 지원 · SLA 보장'],
        cta: '시작하기', ctaVariant: 'outline', aiFeatureIdx: 1,
        highlighted: false, icon: 'ri-building-2-line', popular: '',
      },
      {
        name: 'Enterprise M', planColor: '#F87171', price: '$499', period: '/ 월',
        annualMonthly: 424.17, annualTotal: 5090,
        users: '51–100명',
        description: '중대형 조직을 위한 플랜',
        basePlan: 'Enterprise S',
        features: ['멤버 51–100명'],
        cta: '시작하기', ctaVariant: 'outline', aiFeatureIdx: -1,
        highlighted: false, icon: 'ri-building-4-line', popular: '',
      },
      {
        name: 'Enterprise L', planColor: '#94A3B8', price: '문의', period: '',
        users: '100명+ · 맞춤 플랜',
        description: '100명 이상 대규모 기업을 위한 플랜',
        basePlan: 'Enterprise M',
        features: ['멤버 100명+', '맞춤 계약 & SLA', '전용 인프라'],
        cta: '문의하기', ctaVariant: 'dark', aiFeatureIdx: -1,
        highlighted: false, icon: 'ri-government-line', popular: '', darkCard: true,
      },
    ],
    viewerBanner: {
      title: 'Viewer는 항상 무료',
      description: 'Viewer 역할은 요금제의 좌석 수에 포함되지 않습니다. 이해관계자, 매니저, 임원을 무제한으로 초대하여 테스트 진행 상황을 관찰하게 하세요 — 추가 비용 없이.',
      example: 'Starter 요금제(5석) 기준: Owner 1명 + Admin 1명 + Member 3명 + Viewer 무제한.',
      tags: ['테스트 결과 확인', '마일스톤 추적', '문서 열람', '대시보드 모니터링'],
      comparison: [
        { name: 'TestRail', detail: '모든 유저 과금', price: '$36/유저/월', negative: true },
        { name: 'Qase', detail: '모든 유저 과금', price: '좌석당 요금', negative: true },
        { name: 'Testably', detail: '정액 요금제', price: 'Viewer 영구 무료', negative: false },
      ],
    },
    faqSection: {
      badge: 'FAQ',
      title: '자주 묻는 질문',
      description: 'Testably에 대해 궁금한 모든 것을 답해드립니다. 원하는 답을 찾지 못하셨나요? 팀에 문의하세요.',
    },
    faqs: [
      {
        question: '무료 플랜의 제한은 무엇인가요?',
        answer: '무료 플랜에서는 프로젝트 1개, 팀원 최대 2명, 프로젝트당 TC 100개, 월 테스트 실행 10회, Jira 읽기 전용 연동, AI 생성 월 3회가 제공됩니다. CSV 내보내기와 Shared Steps는 무료 플랜에서 사용할 수 없으며, Hobby 이상으로 업그레이드하면 이용 가능합니다.',
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
        question: 'Exploratory는 어떻게 작동하나요?',
        answer: '목표와 시간 박스를 설정하여 Discovery Log를 시작하세요. 세션 중에 리치 텍스트 에디터에서 인라인 스크린샷과 함께 버그, 관찰 사항, 메모를 직접 기록할 수 있습니다. 세션이 종료되면 팀과 공유할 수 있는 구조화된 리포트가 자동으로 생성됩니다. 모든 발견 사항은 한 번의 클릭으로 공식 테스트 케이스로 변환할 수 있습니다.',
      },
      {
        question: '테스트 결과와 리포트를 내보낼 수 있나요?',
        answer: '네. 테스트 케이스를 CSV/Excel 형식으로 내보내고 테스트 실행 결과를 상세 리포트로 내보낼 수 있습니다. 내보내기에는 모든 결과 상태, 담당자 정보, 댓글, 타임스탬프가 포함됩니다. CSV 내보내기는 Hobby 이상 플랜에서 사용 가능합니다 (무료 플랜 미지원).',
      },
      {
        question: '언제든지 플랜을 변경하거나 취소할 수 있나요?',
        answer: '물론입니다. 계정 설정에서 언제든지 구독을 업그레이드, 다운그레이드 또는 취소할 수 있습니다. 취소하면 현재 청구 기간이 끝날 때까지 계정이 활성 상태를 유지합니다. 숨겨진 수수료나 장기 계약은 없습니다.',
      },
      {
        question: 'TestRail이나 다른 도구에서 테스트 케이스를 가져올 수 있나요?',
        answer: '네. Testably는 TestRail 필드 매핑이 내장된 CSV 가져오기를 지원합니다. TestRail에서 CSV로 내보낸 후 Testably로 가져오면 우선순위, 단계, 예상 결과가 자동으로 매핑됩니다. Zephyr와 Qase에서도 가져올 수 있습니다.',
      },
      {
        question: 'Viewer는 플랜의 멤버 제한에 포함되나요?',
        answer: '아니요. Viewer 역할은 완전히 무료이며 좌석 수에서 제외됩니다. Starter 플랜(5석)에서는 Owner 1명 + Admin 1명 + Member 3명 + 무제한 Viewer를 사용할 수 있습니다. 추가 비용 없이 조직 전체가 테스트 진행 상황을 관찰할 수 있습니다.',
      },
      {
        question: 'Testably는 웹훅을 지원하나요?',
        answer: '네. 웹훅을 구성하여 Slack과 Microsoft Teams 또는 사용자 정의 자동화 시스템을 포함한 모든 HTTP 엔드포인트로 실시간 이벤트 알림을 보낼 수 있습니다. 테스트 실행 완료, 테스트 실패, 멤버 참여 등의 이벤트가 포함됩니다.',
      },
    ],
    testimonialsSection: {
      badge: '팀들의 이야기',
      title1: '빠르게 배포하는',
      title2: 'QA 팀들의 선택',
    },
    testimonials: [
      {
        quote: 'TestRail에서 전환한 후 테스트 관리 시간이 절반으로 줄었습니다. AI 테스트 생성만으로도 스프린트당 10시간 이상 절약했어요.',
        name: 'Sarah M.',
        role: 'QA Lead, Fintech Startup',
        initials: 'SM',
        color: '#6366F1',
      },
      {
        quote: '키보드 단축키가 게임 체인저입니다. 마우스 없이 전체 테스트 실행을 할 수 있어요. QA를 위한 Vim 같은 느낌입니다.',
        name: 'James K.',
        role: 'Senior SDET, SaaS Platform',
        initials: 'JK',
        color: '#8B5CF6',
      },
      {
        quote: 'Focus Mode는 정말 탁월합니다. 팀이 테스트 실행 중 복잡한 UI에 빠지지 않고 집중할 수 있어요. QA 생산성이 40% 향상됐습니다.',
        name: 'Lisa W.',
        role: 'Engineering Manager, E-commerce',
        initials: 'LW',
        color: '#EC4899',
      },
    ],
    cta: {
      title: 'QA 워크플로우를 한 단계 업그레이드할 준비가 되셨나요?',
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
      compare: '비교',
      compareLinks: ['vs TestRail', 'vs Qase', 'vs Zephyr'],
      resources: '리소스',
      legal: '법적 정보',
      privacy: '개인정보처리방침',
      terms: '이용약관',
      refund: '환불 정책',
      cookies: '쿠키 정책',
      copyright: `© ${new Date().getFullYear()} Testably. All rights reserved.`,
    },
    scrollIndicator: '스크롤',
  },
};

const FEATURE_ICON_STYLES = [
  { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' },
  { bg: 'rgba(16,185,129,0.12)', color: '#34D399' },
  { bg: 'rgba(245,158,11,0.12)', color: '#FBBF24' },
  { bg: 'rgba(139,92,246,0.12)', color: '#C084FC' },
  { bg: 'rgba(236,72,153,0.12)', color: '#F472B6' },
  { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
  { bg: 'rgba(6,182,212,0.12)', color: '#22D3EE' },
  { bg: 'rgba(251,146,60,0.12)', color: '#FB923C' },
  { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
  { bg: 'rgba(16,185,129,0.12)', color: '#34D399' },
  { bg: 'rgba(244,63,94,0.12)', color: '#FB7185' },
  { bg: 'rgba(20,184,166,0.12)', color: '#2DD4BF' },
  { bg: 'rgba(14,165,233,0.12)', color: '#38BDF8' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lang = currentLanguage === 'ko' ? 'ko' : 'en';
  const t = content[lang];

  const { toasts, showToast, dismiss } = useToast();
  const [userSession, setUserSession] = useState<{ id: string; email: string; payment_provider?: string | null; subscription_tier?: number } | null>(null);

  // Register Paddle error handler so checkout errors surface as toasts
  useEffect(() => {
    registerPaddleErrorHandler((msg) => showToast(msg, 'error'));
  }, [showToast]);

  // Load user session for checkout
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles')
        .select('id, payment_provider, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      setUserSession({
        id: user.id,
        email: user.email || '',
        payment_provider: data?.payment_provider ?? null,
        subscription_tier: data?.subscription_tier ?? 1,
      });
    });
  }, []);

  const handlePlanClick = async (planName: string) => {
    if (planName === 'Free') { navigate('/auth'); return; }
    if (!userSession) { navigate('/auth'); return; }
    const provider = getPaymentProvider(userSession);
    const opened = await openCheckout(planName, 'monthly', provider, userSession.email, userSession.id);
    if (!opened) navigate('/auth');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langMenuOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % t.features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [t.features.length]);


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

      <div className="min-h-screen bg-[#0F172A]" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>
        <style>{`
          @keyframes blobFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(15px,-20px) scale(1.03)} 66%{transform:translate(-10px,15px) scale(0.97)} }
          @keyframes hf { 0%,100%{transform:translateY(0) perspective(1000px) rotateY(-4deg)} 50%{transform:translateY(-12px) perspective(1000px) rotateY(-4deg)} }
          @keyframes fcf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        `}</style>

        {/* Navbar */}
        <nav
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-[#0F172A]/90 backdrop-blur-xl' : 'bg-transparent'}`}
          style={{ padding: '0.875rem 2rem' }}
        >
          {/* Logo */}
          <a href="/" className="flex items-center no-underline flex-shrink-0">
            <Logo variant="dark" className="h-8" />
          </a>

          {/* Nav links + actions */}
          <div className="hidden md:flex items-center" style={{ gap: '1.75rem' }}>
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors cursor-pointer hover:text-white whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {item.label}
              </a>
            ))}

            {/* Language switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 cursor-pointer transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', fontWeight: 500, background: 'none', border: 'none', padding: 0 }}
              >
                <i className="ri-translate-2 text-sm"></i>
                <span>{lang === 'en' ? 'EN' : 'KO'}</span>
                <i className={`ri-arrow-down-s-line text-xs transition-transform ${langMenuOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <button
                    onClick={() => { changeLanguage('en'); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 cursor-pointer transition-colors hover:bg-gray-50 ${lang === 'en' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-gray-700'}`}
                  >
                    <span>🇬🇧</span><span>English</span>
                    {lang === 'en' && <i className="ri-check-line text-indigo-600 ml-auto"></i>}
                  </button>
                  <button
                    onClick={() => { changeLanguage('ko'); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 cursor-pointer transition-colors hover:bg-gray-50 ${lang === 'ko' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-gray-700'}`}
                  >
                    <span>🇰🇷</span><span>한국어</span>
                    {lang === 'ko' && <i className="ri-check-line text-indigo-600 ml-auto"></i>}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/auth')}
              className="transition-colors cursor-pointer hover:text-white whitespace-nowrap bg-transparent border-none"
              style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', fontWeight: 500 }}
            >
              {t.nav.login}
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-white cursor-pointer transition-all whitespace-nowrap"
              style={{ padding: '0.5rem 1.25rem', background: '#6366F1', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600, border: 'none' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(99,102,241,0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#6366F1';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
              }}
            >
              {t.nav.getStarted}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative min-h-[100dvh] flex items-center overflow-hidden bg-[#0F172A]">

          {/* Background: Mesh Gradient */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" style={{ animation: 'blobFloat 8s ease-in-out infinite' }}></div>
            <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.08] blur-[100px]" style={{ animation: 'blobFloat 10s ease-in-out infinite 2s' }}></div>
            <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-400/5 blur-[80px]" style={{ animation: 'blobFloat 7s ease-in-out infinite 1s' }}></div>
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

              {/* LEFT: Text (6 columns) */}
              <div className="lg:col-span-6 text-center lg:text-left">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-6">
                  <div style={{ width: '2rem', height: '1px', background: '#6366F1', flexShrink: 0 }}></div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818CF8' }}>{t.hero.badge}</span>
                </div>

                {/* Heading */}
                <h1 className="text-white mb-6" style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
                  {t.hero.title1}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                    {t.hero.title2}
                  </span>
                </h1>

                {/* Subheading */}
                <p className="text-lg md:text-xl leading-relaxed max-w-xl mb-10 mx-auto lg:mx-0" style={{ color: '#94A3B8' }}>
                  {t.hero.description}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-8">
                  <button
                    onClick={() => navigate('/auth')}
                    className="group flex items-center gap-3 px-8 py-4 bg-indigo-500 text-white rounded-full font-bold text-base hover:bg-indigo-400 active:scale-[0.98] shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.45)] cursor-pointer"
                    style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    {t.hero.cta}
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 group-hover:translate-x-0.5 transition-transform duration-300">
                      <i className="ri-arrow-right-line text-sm"></i>
                    </span>
                  </button>
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2 px-8 py-4 bg-white/[0.06] text-white/80 border border-white/[0.1] rounded-full font-semibold text-base hover:bg-white/[0.1] hover:text-white hover:border-white/20 active:scale-[0.98] backdrop-blur-sm cursor-pointer"
                    style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    <i className="ri-play-circle-line text-lg text-indigo-400"></i>
                    {t.hero.demo}
                  </button>
                </div>

                {/* Trust line */}
                <p className="text-white/30 text-sm mb-6">{t.hero.sub}</p>

                {/* Social proof */}
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981'].map((bg, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-[9px] font-bold" style={{ background: bg, borderColor: '#0F172A', marginLeft: i === 0 ? 0 : '-8px' }}>
                        {['SJ','KM','LW','AP','TR'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-white/40">Trusted by <strong className="text-white/60">50+ teams</strong> worldwide</span>
                </div>
              </div>

              {/* RIGHT: Product Screenshot (6 columns) */}
              <div className="lg:col-span-6 relative">
                {/* Glow behind */}
                <div className="absolute -inset-8 bg-indigo-500/10 rounded-3xl blur-3xl"></div>

                {/* Double-Bezel Card */}
                <div className="relative bg-white/[0.04] ring-1 ring-white/[0.08] p-1.5 rounded-[1.5rem]" style={{ animation: 'hf 6s ease-in-out infinite', boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.08)' }}>
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
                      src="/hero-screenshot.png"
                      alt="Testably project dashboard showing test cases, runs, and milestones"
                      className="w-full h-auto"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Floating chips */}
                <div
                  className="absolute -bottom-4 -left-6 hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-xl"
                  style={{ background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(99,102,241,0.25)', animation: 'fcf 6s ease-in-out infinite' }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-white font-semibold text-sm">87% Pass Rate</span>
                </div>
                <div
                  className="absolute -top-4 -right-4 hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-xl"
                  style={{ background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(99,102,241,0.25)', animation: 'float 6s ease-in-out infinite 3.5s' }}
                >
                  <i className="ri-sparkling-line text-violet-400 text-sm"></i>
                  <span className="text-white font-semibold text-sm">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>

        </header>

        {/* Stats Bar */}
        <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '2.5rem 2rem' }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
              {t.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-black mb-1" style={{ color: '#818CF8' }}>{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-28 bg-[#0F172A] relative overflow-hidden">
          {/* Background blobs */}
          <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 -left-16 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[80px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-3">
                <i className="ri-sparkling-2-line text-indigo-400 text-sm"></i>
                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">{t.featuresSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">{t.featuresSection.title}</h2>
              <p className="text-gray-400 text-lg mx-auto">{t.featuresSection.description}</p>
            </div>

            {/* Differentiator highlight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {t.differentiators.map((diff) => (
                <div
                  key={diff.title}
                  className="relative rounded-2xl p-8 overflow-hidden transition-all hover:-translate-y-1"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"></div>
                  <div className="inline-flex items-center gap-1.5 rounded-full mb-4" style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#C084FC', background: 'rgba(139,92,246,0.12)', padding: '0.25rem 0.625rem' }}>
                    <i className={`${diff.badgeIcon}`} style={{ fontSize: '0.625rem' }}></i>
                    {diff.badge}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2.5">{diff.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{diff.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {diff.pills.map((pill) => (
                      <span key={pill} className="rounded-full" style={{ fontSize: '0.625rem', fontWeight: 500, color: '#818CF8', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)', padding: '0.2rem 0.625rem' }}>{pill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="relative text-center mb-10">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/6"></div>
              <span className="relative bg-[#0F172A] px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Plus everything else you need</span>
            </div>

            {/* 9 feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {t.features.map((feature, index) => {
                const fi = FEATURE_ICON_STYLES[index] ?? FEATURE_ICON_STYLES[0];
                return (
                  <article
                    key={feature.title}
                    className={`rounded-2xl border transition-all duration-300 cursor-pointer group ${
                      activeFeature === index
                        ? 'border-indigo-500/40 scale-[1.02] shadow-lg shadow-indigo-500/10'
                        : 'hover:border-indigo-500/20 hover:shadow-sm hover:shadow-indigo-500/10'
                    }`}
                    style={{ background: 'rgba(255,255,255,0.03)', border: activeFeature === index ? undefined : '1px solid rgba(255,255,255,0.06)', padding: '1.75rem' }}
                    onMouseEnter={() => setActiveFeature(index)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 flex items-center justify-center rounded-xl" style={{ background: fi.bg }}>
                        <i className={`${feature.icon} text-xl`} style={{ color: fi.color }}></i>
                      </div>
                      <span className="text-[0.625rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: fi.bg.replace('0.12', '0.1'), color: fi.color }}>
                        {feature.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2">{feature.title}</h3>
                    <p className="leading-relaxed" style={{ color: '#94A3B8', fontSize: '0.8125rem' }}>{feature.description}</p>
                  </article>
                );
              })}
            </div>

            {/* Keyboard Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-20">
              <div>
                <div className="inline-flex items-center gap-2 mb-4">
                  <i className="ri-keyboard-line text-indigo-400 text-sm"></i>
                  <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">Keyboard-First</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Built for speed.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Zero mouse required.</span></h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">Every action in Testably has a keyboard shortcut. Navigate between projects, create test cases, execute runs — all without leaving your keyboard.</p>
                <button onClick={() => {}} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-full hover:bg-indigo-400 transition-all cursor-pointer">View All Shortcuts <i className="ri-arrow-right-line"></i></button>
              </div>
              <div className="rounded-2xl p-5 space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { keys: ['Ctrl', 'K'], label: 'Command palette' },
                  { keys: ['N'], label: 'New test case' },
                  { keys: ['R'], label: 'Start test run' },
                  { keys: ['F'], label: 'Enter Focus Mode', highlight: true },
                  { keys: ['P', 'F', 'B', 'S'], label: 'Pass / Fail / Block / Skip' },
                  { keys: ['Ctrl', 'Shift', 'J'], label: 'Create Jira issue' },
                  { keys: ['?'], label: 'Show all shortcuts' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${row.highlight ? 'bg-indigo-500/8' : 'bg-white/[0.015] hover:bg-indigo-500/5'}`}
                  >
                    <div className="flex items-center gap-1">
                      {row.keys.map((k) => (
                        <kbd key={k} className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${row.highlight ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/8 border-white/12 text-gray-300'}`} style={{ border: '1px solid' }}>{k}</kbd>
                      ))}
                    </div>
                    <span className={`text-sm flex-1 ${row.highlight ? 'text-violet-300' : 'text-gray-400'}`}>{row.label}</span>
                    {row.highlight && <i className="ri-sparkling-line text-violet-400 text-xs"></i>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 bg-[#0F172A] relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 mb-3" style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818CF8' }}>
                <i className="ri-route-line text-sm"></i>
                <span>{t.workflowSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {lang === 'en' ? <>Your QA process in <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>4 simple steps</span></> : t.workflowSection.title}
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.workflowSection.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {t.workflowSteps.map((step, index) => (
                <div key={step.step} className="relative text-center px-5 py-8">
                  {index < t.workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-[4.25rem] -right-3 w-6 h-0.5 z-10" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(99,102,241,0.05))' }}></div>
                  )}
                  <div className="text-[3.5rem] font-black leading-none mb-3" style={{ color: 'rgba(99,102,241,0.12)' }}>{step.step}</div>
                  <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-4" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <i className={`${step.icon} text-2xl`} style={{ color: '#818CF8' }}></i>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="py-24 bg-[#0F172A]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 mb-3" style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818CF8' }}>
                <i className="ri-plug-line text-sm"></i>
                <span>{t.integrationSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {lang === 'en' ? <>Works with your <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>existing tools</span></> : t.integrationSection.title}
              </h2>
              <p className="text-gray-400 text-lg mx-auto">{t.integrationSection.description}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Jira */}
              <div className="rounded-2xl p-8 hover:border-indigo-500/15 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 flex items-center justify-center rounded-xl mb-5" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <i className="ri-bug-line text-2xl" style={{ color: '#818CF8' }}></i>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t.integrationSection.jiraTitle}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#94A3B8' }}>{t.integrationSection.jiraDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {t.integrationSection.jiraTags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#818CF8' }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* CI/CD */}
              <div className="rounded-2xl p-8 hover:border-indigo-500/15 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 flex items-center justify-center rounded-xl mb-5" style={{ background: 'rgba(6,182,212,0.12)' }}>
                  <i className="ri-git-branch-line text-2xl" style={{ color: '#22D3EE' }}></i>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t.integrationSection.ciTitle}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#94A3B8' }}>{t.integrationSection.ciDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {t.integrationSection.ciTags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#818CF8' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teams Choose Testably */}
        <section id="why-testably" className="py-24 bg-[#0F172A] relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 mb-3" style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818CF8' }}>
                <i className="ri-heart-3-line text-sm"></i>
                <span>{t.whySection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {lang === 'en' ? <>Why teams choose <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>Testably</span></> : t.whySection.title}
              </h2>
              <p className="text-gray-400 text-lg">{t.whySection.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.whyCards.map((card) => (
                <article key={card.title} className="rounded-2xl p-8 transition-all hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <i className={`${card.icon} text-2xl`} style={{ color: '#818CF8' }}></i>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{card.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-[#0F172A] relative overflow-hidden">
          <div className="absolute top-1/3 -left-16 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-4">
                <i className="ri-chat-quote-line text-indigo-400 text-sm"></i>
                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">{t.testimonialsSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white">
                {t.testimonialsSection.title1}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">{t.testimonialsSection.title2}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.testimonials.map((testi) => (
                <article key={testi.name} className="rounded-2xl transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '1.75rem' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div className="flex gap-0.5 mb-4" style={{ letterSpacing: '0.125rem' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className="ri-star-fill" style={{ color: '#F59E0B', fontSize: '0.8125rem' }}></i>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: '#E2E8F0', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '1.25rem' }}>"{testi.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: testi.color }}>
                      {testi.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{testi.name}</div>
                      <div className="text-xs text-gray-500">{testi.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-28 bg-[#0F172A] relative overflow-hidden">
          {/* Background blobs */}
          <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 -left-16 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[80px] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 mb-3" style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#818CF8' }}>
                <i className="ri-price-tag-3-line text-sm"></i>
                <span>{t.pricingSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">{t.pricingSection.title}</h2>
              <p className="text-gray-400 text-lg">{t.pricingSection.description}</p>

            </div>

            {/* Row 1: Free / Starter / Professional */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {t.pricingPlans.slice(0, 3).map((plan) => (
                <article
                  key={plan.name}
                  className="rounded-2xl flex flex-col relative transition-all hover:-translate-y-1"
                  style={plan.highlighted ? {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(99,102,241,0.3)',
                    padding: '1.75rem',
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '1.75rem',
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2" style={{ zIndex: 1 }}>
                      <div style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.25rem 0.875rem', borderRadius: 9999, whiteSpace: 'nowrap' }}>
                        {plan.popular}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: plan.planColor, marginBottom: '0.375rem' }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    {!['Custom', '문의', '$0'].includes(plan.price) && <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>$</span>}
                    {plan.price === '$0' && <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>$</span>}
                    <span style={{ fontSize: ['Custom', '문의'].includes(plan.price) ? '2rem' : '2.75rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      {['Custom', '문의'].includes(plan.price) ? plan.price : plan.price.replace('$', '')}
                    </span>
                    {plan.period && <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>{plan.period}</span>}
                  </div>
                  {plan.price !== '$0' && plan.annualTotal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#A5B4FC', letterSpacing: '-0.01em' }}>
                        {lang === 'en' ? `$${plan.annualTotal.toLocaleString()}/yr` : `연 $${plan.annualTotal.toLocaleString()}`}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 800, color: '#34D399', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))', border: '1px solid rgba(16,185,129,0.35)', padding: '0.3rem 0.875rem', borderRadius: 9999, letterSpacing: '0.02em', boxShadow: '0 0 20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                        <i className="ri-discount-percent-line" style={{ fontSize: '0.625rem' }}></i>
                        {lang === 'en' ? 'Save 15%' : '15% 할인'}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>{plan.users}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>{plan.description}</div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' }}></div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {plan.basePlan && (
                      <li style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                        Everything in {plan.basePlan}, plus:
                      </li>
                    )}
                    {plan.features.map((f, fi) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <i className={fi === plan.aiFeatureIdx ? 'ri-sparkling-line' : 'ri-check-line'} style={{ fontSize: '0.875rem', marginTop: '0.125rem', flexShrink: 0, color: fi === plan.aiFeatureIdx ? '#C084FC' : '#6366F1' }}></i>
                        <span style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: fi === plan.aiFeatureIdx ? '#C084FC' : '#94A3B8' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.ctaVariant === 'dark' ? (
                    <a href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry" style={{ marginTop: '1.5rem', display: 'block', textAlign: 'center', padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: '#1E1B4B', color: '#C084FC', border: '1px solid rgba(139,92,246,0.25)' }}>
                      {plan.cta}
                    </a>
                  ) : plan.ctaVariant === 'filled' ? (
                    <button onClick={() => handlePlanClick(plan.name)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: '#6366F1', color: '#fff', border: 'none' }}>
                      {plan.cta}
                    </button>
                  ) : (
                    <button onClick={() => handlePlanClick(plan.name)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
            </div>

            {/* Row 2: Enterprise S / M / L */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {t.pricingPlans.slice(3).map((plan) => (
                <article
                  key={plan.name}
                  className="rounded-2xl flex flex-col relative transition-all hover:-translate-y-1"
                  style={plan.darkCard ? {
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,27,75,0.4))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.75rem',
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: plan.planColor, marginBottom: '0.375rem' }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    {!['Custom', '문의'].includes(plan.price) && <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>$</span>}
                    <span style={{ fontSize: ['Custom', '문의'].includes(plan.price) ? '2rem' : '2.75rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      {['Custom', '문의'].includes(plan.price)
                        ? plan.price
                        : plan.price.replace('$', '')}
                    </span>
                    {plan.period && <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>{plan.period}</span>}
                  </div>
                  {plan.annualTotal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '0.5rem' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#A5B4FC', letterSpacing: '-0.01em' }}>
                        {lang === 'en' ? `$${plan.annualTotal.toLocaleString()}/yr` : `연 $${plan.annualTotal.toLocaleString()}`}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 800, color: '#34D399', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))', border: '1px solid rgba(16,185,129,0.35)', padding: '0.3rem 0.875rem', borderRadius: 9999, letterSpacing: '0.02em', boxShadow: '0 0 20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                        <i className="ri-discount-percent-line" style={{ fontSize: '0.625rem' }}></i>
                        {lang === 'en' ? 'Save 15%' : '15% 할인'}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>{plan.users}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>{plan.description}</div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' }}></div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {plan.basePlan && (
                      <li style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                        Everything in {plan.basePlan}, plus:
                      </li>
                    )}
                    {plan.features.map((f, fi) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <i className={fi === plan.aiFeatureIdx ? 'ri-sparkling-line' : 'ri-check-line'} style={{ fontSize: '0.875rem', marginTop: '0.125rem', flexShrink: 0, color: fi === plan.aiFeatureIdx ? '#C084FC' : '#6366F1' }}></i>
                        <span style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: fi === plan.aiFeatureIdx ? '#C084FC' : '#94A3B8' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.ctaVariant === 'dark' ? (
                    <a href="mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry" style={{ marginTop: '1.5rem', display: 'block', textAlign: 'center', padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: '#1E1B4B', color: '#C084FC', border: '1px solid rgba(139,92,246,0.25)' }}>
                      {plan.cta}
                    </a>
                  ) : (
                    <button onClick={() => handlePlanClick(plan.name)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
            </div>

            {/* Viewer Free Banner */}
            <div style={{ marginTop: '2.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', padding: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(99,102,241,0.15)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ri-eye-line" style={{ fontSize: '1.25rem', color: '#818CF8' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <i className="ri-gift-2-fill" style={{ color: '#818CF8' }}></i>
                  {t.viewerBanner.title}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.7, marginBottom: '0.25rem' }}>
                  {t.viewerBanner.description}
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.7, marginBottom: '1rem' }}>
                  {t.viewerBanner.example}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {t.viewerBanner.tags.map((tag: string) => (
                    <span key={tag} style={{ fontSize: '0.75rem', fontWeight: 500, color: '#A5B4FC', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '9999px', padding: '0.25rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <i className="ri-check-line" style={{ fontSize: '0.7rem' }}></i>{tag}
                    </span>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818CF8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {lang === 'en' ? 'WHY THIS MATTERS' : '왜 중요한가요'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {t.viewerBanner.comparison.map((c: { name: string; detail: string; price: string; negative: boolean }) => (
                      <div key={c.name} style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.5rem', background: c.negative ? 'rgba(239,68,68,0.06)' : 'rgba(52,211,153,0.06)', border: `1px solid ${c.negative ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)'}` }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: c.negative ? '#F87171' : '#34D399', marginBottom: '0.25rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{c.detail}</div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: c.negative ? '#F87171' : '#34D399', marginTop: '0.125rem' }}>{c.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center mt-8 text-sm leading-relaxed" style={{ color: '#64748B' }}>
              <i className="ri-shield-check-line text-indigo-400 mr-1.5"></i>
              {lang === 'en' ? (
                <>Free forever for up to 3 members · 14-day free trial on all paid plans<br />No per-seat charges</>
              ) : t.pricingSection.note}
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-[#0F172A] relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="max-w-3xl mx-auto px-6 relative z-10">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-3">
                <i className="ri-question-line text-indigo-400 text-sm"></i>
                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">{t.faqSection.badge}</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {lang === 'en' ? <>Frequently asked <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>questions</span></> : t.faqSection.title}
              </h2>
              <p className="text-gray-400 text-lg">{t.faqSection.description}</p>
            </div>

            <div style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>
              {t.faqs.map((faq, index) => (
                <div key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    className="w-full flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9375rem', fontWeight: 600, padding: '1.25rem 0', fontFamily: 'inherit' }}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span id={`faq-${index}`}>{faq.question}</span>
                    <i
                      className={`ri-add-line flex-shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-45' : ''}`}
                      style={{ fontSize: '1.125rem', color: '#6366F1' }}
                    ></i>
                  </button>
                  {openFaq === index && (
                    <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.7, paddingBottom: '1.25rem' }}>{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm mb-4">
                {lang === 'en' ? 'Still have questions?' : '아직 궁금한 점이 있으신가요?'}
              </p>
              <a
                href="mailto:hello@testably.app"
                className="inline-flex items-center gap-2 px-6 py-3 border border-indigo-500/30 text-indigo-400 rounded-xl font-semibold text-sm hover:bg-indigo-500/8 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="ri-mail-line"></i>
                {lang === 'en' ? 'Contact our team' : '팀에 문의하기'}
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[#0F172A] px-8">
          <div
            className="max-w-6xl mx-auto text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '1.5rem',
              padding: '4rem 3rem',
            }}
          >
            {/* Blobs */}
            <div className="absolute pointer-events-none" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(80px)', top: '-40%', right: '-10%' }}></div>
            <div className="absolute pointer-events-none" style={{ width: 350, height: 350, background: 'rgba(139,92,246,0.08)', borderRadius: '50%', filter: 'blur(60px)', bottom: '-30%', left: '-5%' }}></div>
            <div className="relative z-10">
              <h2 className="font-extrabold text-white mb-4" style={{ fontSize: '2.5rem', lineHeight: 1.15, letterSpacing: '-0.025em' }}>
                {lang === 'en' ? (
                  <>Ready to level up<br />your <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>QA workflow</span>?</>
                ) : (
                  <><span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818CF8, #C084FC)' }}>QA 워크플로우</span>를<br />한 단계 업그레이드할 준비가 되셨나요?</>
                )}
              </h2>
              <p className="mb-8" style={{ fontSize: '1.0625rem', color: '#94A3B8', maxWidth: '32rem', margin: '1rem auto 2rem', lineHeight: 1.6 }}>{t.cta.description}</p>
              <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 text-white font-semibold cursor-pointer transition-all hover:bg-indigo-600"
                style={{ padding: '1rem 2.25rem', background: '#6366F1', borderRadius: 9999, fontSize: '1rem', border: 'none', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 30px rgba(99,102,241,0.45)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#6366F1';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }}
              >
                {t.cta.button} <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-[#0F172A] border-t border-white/5">
          <div className="max-w-[30rem] mx-auto px-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">{t.newsletter.title}</h3>
            <p className="text-sm mb-5 whitespace-nowrap" style={{ color: '#94A3B8' }}>{t.newsletter.description}</p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-indigo-400">
                <i className="ri-check-circle-line text-xl"></i>
                <span className="font-semibold">{t.newsletter.success}</span>
              </div>
            ) : (
              <form data-readdy-form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.newsletter.placeholder}
                  className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-400 transition-all cursor-pointer whitespace-nowrap"
                >
                  {t.newsletter.button}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0F172A] border-t border-white/5 py-14">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
              <div className="md:col-span-1">
                <div className="mb-4">
                  <Logo variant="dark" className="h-8" />
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{t.footer.tagline}</p>
                <div className="flex gap-2 mt-4">
                  {[
                    { icon: 'ri-twitter-x-line', href: 'https://x.com/GetTestably' },
                    { icon: 'ri-linkedin-box-line', href: 'https://linkedin.com/company/testably' },
                  ].map(({ icon, href }) => (
                    <a key={icon} href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-500 hover:bg-indigo-500/15 hover:text-indigo-400 transition-all cursor-pointer">
                      <i className={`${icon} text-sm`}></i>
                    </a>
                  ))}
                </div>
              </div>
              <nav>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.footer.product}</h4>
                <ul className="space-y-2.5">
                  {t.footer.productLinks.map((item, i) => (
                    <li key={item}>
                      <Link to={['/features', '/pricing', '/changelog', '/roadmap'][i]} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{item}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.footer.compare}</h4>
                <ul className="space-y-2.5">
                  {t.footer.compareLinks.map((item, i) => (
                    <li key={item}>
                      <Link to={['/compare/testrail', '/compare/qase', '/compare/zephyr'][i]} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{item}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.footer.resources}</h4>
                <ul className="space-y-2.5">
                  <li><Link to="/docs" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Documentation</Link></li>
                  <li><Link to="/docs/api" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">API Reference</Link></li>
                  <li><Link to="/contact" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Contact</Link></li>
                  <li><Link to="/about" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">About</Link></li>
                </ul>
              </nav>
              <nav>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.footer.legal}</h4>
                <ul className="space-y-2.5">
                  <li>
                    <Link to="/privacy" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{t.footer.privacy}</Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{t.footer.terms}</Link>
                  </li>
                  <li>
                    <Link to="/refund" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{t.footer.refund}</Link>
                  </li>
                  <li>
                    <Link to="/cookies" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{t.footer.cookies}</Link>
                  </li>
                </ul>
              </nav>
            </div>
            <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-600 text-xs">{t.footer.copyright}</p>
            </div>
          </div>
        </footer>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  );
}
