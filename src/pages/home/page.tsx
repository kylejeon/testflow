import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';

const features = [
  {
    icon: 'ri-test-tube-line',
    title: '테스트 케이스 관리',
    description: '체계적인 폴더 구조로 수천 개의 테스트 케이스를 효율적으로 관리하세요. 우선순위, 태그, 상태별 필터링을 지원합니다.',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: 'ri-play-circle-line',
    title: 'Test Run 실행',
    description: '테스트 실행을 계획하고 결과를 실시간으로 추적하세요. Passed, Failed, Blocked, Retest 상태를 한눈에 확인할 수 있습니다.',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: 'ri-flag-2-line',
    title: '마일스톤 추적',
    description: '릴리즈 목표와 마일스톤을 설정하고 진행률을 시각적으로 모니터링하세요. 팀 전체가 목표를 공유합니다.',
    color: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: 'ri-video-line',
    title: '세션 기록',
    description: '탐색적 테스트 세션을 기록하고 버그와 메모를 실시간으로 캡처하세요. 스크린샷과 함께 상세한 리포트를 생성합니다.',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: 'ri-team-line',
    title: '팀 협업',
    description: '팀원을 초대하고 역할별 권한을 설정하세요. Admin, Member, Viewer 권한으로 안전하게 협업할 수 있습니다.',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: 'ri-links-line',
    title: 'Jira 연동',
    description: 'Jira와 완벽하게 연동하여 테스트 실패 시 자동으로 이슈를 생성하세요. 개발팀과의 협업이 더욱 원활해집니다.',
    color: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
];

const testimonials = [
  {
    name: '김지수',
    role: 'QA Lead @ TechCorp',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20asian%20woman%20smiling%20portrait%20headshot%20clean%20white%20background%20corporate%20style&width=80&height=80&seq=t1&orientation=squarish',
    content: 'Testably 도입 후 테스트 사이클이 3배 빨라졌습니다. 팀 전체가 실시간으로 진행 상황을 공유할 수 있어서 커뮤니케이션 비용이 크게 줄었어요.',
  },
  {
    name: '박민준',
    role: 'Software Engineer @ StartupXYZ',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20asian%20man%20smiling%20portrait%20headshot%20clean%20white%20background%20corporate%20style&width=80&height=80&seq=t2&orientation=squarish',
    content: 'Jira 연동 기능이 정말 편리합니다. 테스트 실패 시 자동으로 이슈가 생성되어 개발팀과의 협업이 훨씬 원활해졌습니다.',
  },
  {
    name: '이서연',
    role: 'Product Manager @ FinTech Co.',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20korean%20woman%20smiling%20portrait%20headshot%20clean%20white%20background%20corporate%20style&width=80&height=80&seq=t3&orientation=squarish',
    content: '마일스톤 추적 기능 덕분에 릴리즈 일정을 훨씬 정확하게 예측할 수 있게 되었습니다. 경영진에게 보고할 때도 명확한 데이터를 제시할 수 있어요.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '₩0',
    period: '영구 무료',
    description: '소규모 팀을 위한 기본 기능',
    features: ['프로젝트 3개까지', '팀 멤버 5명까지', '기본 테스트 관리', 'Jira 연동', '커뮤니티 지원'],
    cta: '무료로 시작하기',
    highlighted: false,
    icon: 'ri-user-line',
  },
  {
    name: 'Starter',
    price: '₩9,900',
    period: '/ 월',
    description: '성장하는 팀을 위한 핵심 기능',
    features: ['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira 연동', '기본 리포팅', '이메일 지원'],
    cta: '14일 무료 체험',
    highlighted: false,
    icon: 'ri-star-line',
  },
  {
    name: 'Professional',
    price: '₩24,900',
    period: '/ 월',
    description: '전문 QA 팀을 위한 완전한 기능',
    features: ['프로젝트 무제한', '팀 멤버 15명까지', 'Jira 연동', '고급 리포팅', '우선 지원'],
    cta: '14일 무료 체험',
    highlighted: true,
    icon: 'ri-vip-crown-line',
  },
  {
    name: 'Enterprise',
    price: '문의',
    period: '맞춤 견적',
    description: '대규모 조직을 위한 엔터프라이즈',
    features: ['모든 Professional 기능', '무제한 팀 멤버', 'SSO / SAML', '전담 지원 담당자', 'SLA 보장', '온프레미스 옵션'],
    cta: '영업팀 문의',
    highlighted: false,
    icon: 'ri-vip-diamond-line',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: '프로젝트 생성',
    description: '테스트할 제품이나 기능에 맞는 프로젝트를 생성하고 팀원을 초대하세요.',
    icon: 'ri-folder-add-line',
  },
  {
    step: '02',
    title: '테스트 케이스 작성',
    description: '체계적인 폴더 구조로 테스트 케이스를 작성하고 우선순위를 설정하세요.',
    icon: 'ri-file-list-3-line',
  },
  {
    step: '03',
    title: 'Test Run 실행',
    description: '마일스톤에 맞춰 Test Run을 생성하고 팀원에게 테스트를 할당하세요.',
    icon: 'ri-play-circle-line',
  },
  {
    step: '04',
    title: '결과 분석',
    description: '실시간 대시보드로 진행률을 모니터링하고 상세한 리포트를 생성하세요.',
    icon: 'ri-bar-chart-2-line',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <>
      <SEOHead
        title="Testably - QA 테스트 관리 플랫폼 | 무료로 시작하기"
        description="더 빠르고 스마트한 QA 테스트 관리. 테스트 케이스 작성부터 실행, 결과 분석까지 하나의 플랫폼에서 관리하세요. Jira 연동, 팀 협업, 마일스톤 추적 기능 제공. 14일 무료 체험."
        keywords="QA 테스트 관리, 테스트 케이스 관리, Test Run, 테스트 자동화, Jira 연동, 소프트웨어 테스팅, 품질 관리, QA 도구, 테스트 관리 플랫폼"
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Testably',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'KRW',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '127',
          },
          description: '더 빠르고 스마트한 QA 테스트 관리 플랫폼. 테스트 케이스 작성부터 실행, 결과 분석까지 하나의 플랫폼에서 관리하세요.',
        }}
      />
      <div className="min-h-screen bg-white font-sans" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>
        {/* Navbar */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100`}
        >
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <i className="ri-test-tube-line text-white text-base"></i>
              </div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>
                Testably
              </h1>
            </a>
            <div className="hidden md:flex items-center gap-8">
              {['기능', '워크플로우', '요금제', '고객 사례'].map((item) => (
                <a
                  key={item}
                  href={`#${item}`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                로그인
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold px-5 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all cursor-pointer whitespace-nowrap shadow-sm"
              >
                무료 시작
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0">
            <img
              src="https://readdy.ai/api/search-image?query=modern%20software%20development%20team%20working%20on%20quality%20assurance%20testing%20dashboard%20with%20multiple%20monitors%20showing%20charts%20and%20data%20analytics%20in%20a%20sleek%20dark%20office%20environment%20with%20teal%20accent%20lighting%20and%20abstract%20geometric%20patterns&width=1440&height=900&seq=hero1&orientation=landscape"
              alt="Testably QA 테스트 관리 플랫폼"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-teal-900/60 to-gray-900/75"></div>
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <i className="ri-sparkling-line text-teal-300 text-sm"></i>
              <span className="text-teal-200 text-sm font-medium">QA 팀을 위한 올인원 테스트 관리 플랫폼</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              더 빠르고 스마트한
              <br />
              <strong className="text-teal-400">테스트 관리</strong>
            </h2>

            <p className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
              Testably로 테스트 케이스 작성부터 실행, 결과 분석까지 QA 워크플로우 전체를 하나의 플랫폼에서 관리하세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-teal-500 text-white rounded-xl font-bold text-base hover:bg-teal-400 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-teal-500/30 flex items-center gap-2"
              >
                <i className="ri-rocket-line"></i>
                무료로 시작하기
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-xl font-semibold text-base hover:bg-white/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-play-circle-line"></i>
                데모 보기
              </button>
            </div>

            <p className="text-white/50 text-sm mt-6">
              신용카드 불필요 · 14일 무료 체험 · 언제든 취소 가능
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-white/50 text-xs">스크롤</span>
            <i className="ri-arrow-down-line text-white/50"></i>
          </div>
        </header>

        {/* Features Section */}
        <section id="기능" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-settings-3-line text-teal-600 text-sm"></i>
                <span className="text-teal-700 text-sm font-medium">핵심 기능</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                QA 팀에 필요한 모든 것
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                테스트 관리의 모든 단계를 지원하는 강력한 기능들을 경험하세요
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    activeFeature === index
                      ? 'border-teal-200 shadow-lg shadow-teal-50 scale-[1.02]'
                      : 'border-gray-100 hover:border-teal-100 hover:shadow-md'
                  } ${feature.color}`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl mb-4 bg-white shadow-sm`}>
                    <i className={`${feature.icon} text-2xl ${feature.iconColor}`}></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="워크플로우" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-flow-chart text-teal-600 text-sm"></i>
                <span className="text-teal-700 text-sm font-medium">워크플로우</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                4단계로 완성하는 QA 프로세스
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                복잡한 설정 없이 바로 시작할 수 있는 직관적인 워크플로우
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflowSteps.map((step, index) => (
                <article key={step.step} className="relative">
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-teal-200 to-transparent z-10 -translate-y-1/2" style={{ width: 'calc(100% - 2rem)', left: 'calc(100% - 1rem)' }}></div>
                  )}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl font-black text-teal-100">{step.step}</span>
                      <div className="w-10 h-10 flex items-center justify-center bg-teal-500 rounded-xl">
                        <i className={`${step.icon} text-white text-lg`}></i>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Jira Integration Banner */}
        <section className="py-20 bg-gradient-to-r from-gray-900 to-teal-900">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                  <i className="ri-links-line text-teal-300 text-sm"></i>
                  <span className="text-teal-200 text-sm font-medium">Jira 연동</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  Jira와 완벽하게<br />연동됩니다
                </h2>
                <p className="text-white/70 text-lg mb-8 leading-relaxed">
                  테스트 실패 시 자동으로 Jira 이슈를 생성하고, 개발팀과 실시간으로 협업하세요. 별도의 복사-붙여넣기 없이 QA와 개발이 하나로 연결됩니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['자동 이슈 생성', '양방향 상태 동기화', '커스텀 필드 매핑', '프로젝트 연결'].map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-white/80 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <img
                  src="https://readdy.ai/api/search-image?query=Jira%20integration%20software%20development%20workflow%20issue%20tracking%20board%20kanban%20sprint%20planning%20modern%20UI%20interface%20dark%20background%20teal%20accent%20colors%20professional&width=600&height=400&seq=jira1&orientation=landscape"
                  alt="Jira 연동 기능"
                  className="w-full h-64 object-cover object-top rounded-2xl border border-white/10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="고객 사례" className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-chat-quote-line text-teal-600 text-sm"></i>
                <span className="text-teal-700 text-sm font-medium">고객 사례</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                팀들이 Testably를 선택한 이유
              </h2>
              <p className="text-gray-500 text-lg">전 세계 QA 팀들이 Testably로 더 나은 품질을 만들어가고 있습니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <article key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className="ri-star-fill text-amber-400 text-sm"></i>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img src={t.avatar} alt={`${t.name} 프로필`} className="w-full h-full object-cover object-top" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="요금제" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
                <i className="ri-price-tag-3-line text-teal-600 text-sm"></i>
                <span className="text-teal-700 text-sm font-medium">요금제</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                팀 규모에 맞는 요금제
              </h2>
              <p className="text-gray-500 text-lg">모든 유료 요금제에 14일 무료 체험이 포함됩니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-2xl p-7 border transition-all flex flex-col ${
                    plan.highlighted
                      ? 'bg-teal-500 border-teal-500 shadow-xl shadow-teal-100 scale-[1.03]'
                      : 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-md'
                  }`}
                >
                  <div className="mb-4">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl mb-3 ${
                      plan.highlighted ? 'bg-white/20' : 'bg-teal-50'
                    }`}>
                      <i className={`${plan.icon} text-xl ${plan.highlighted ? 'text-white' : 'text-teal-600'}`}></i>
                    </div>
                    {plan.highlighted && (
                      <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 mb-2">
                        <i className="ri-star-fill text-white text-xs"></i>
                        <span className="text-white text-xs font-semibold">가장 인기</span>
                      </div>
                    )}
                    <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-5 pb-5 border-b ${plan.highlighted ? 'border-white/20' : 'border-gray-100'}">
                    <span className={`text-3xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-xs ml-1.5 ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${plan.highlighted ? 'bg-white/20' : 'bg-teal-100'}`}>
                          <i className={`ri-check-line text-xs ${plan.highlighted ? 'text-white' : 'text-teal-600'}`}></i>
                        </div>
                        <span className={`text-xs leading-relaxed ${plan.highlighted ? 'text-white/90' : 'text-gray-700'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/auth')}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                      plan.highlighted
                        ? 'bg-white text-teal-600 hover:bg-gray-50'
                        : 'bg-teal-500 text-white hover:bg-teal-600'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img
              src="https://readdy.ai/api/search-image?query=abstract%20technology%20network%20pattern%20dark%20background%20glowing%20teal%20green%20nodes%20connections%20digital%20mesh%20futuristic&width=1440&height=500&seq=cta1&orientation=landscape"
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              지금 바로 시작하세요
            </h2>
            <p className="text-white/60 text-lg mb-10">
              신용카드 없이 무료로 시작하고, 팀과 함께 더 나은 QA 프로세스를 만들어보세요.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-teal-500 text-white rounded-xl font-bold text-lg hover:bg-teal-400 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-teal-500/30 flex items-center gap-3 mx-auto"
            >
              <i className="ri-rocket-line"></i>
              Get Started — 무료
            </button>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-teal-600">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">업데이트 소식 받기</h3>
            <p className="text-teal-100 text-sm mb-6">새로운 기능과 QA 팁을 이메일로 받아보세요</p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-white">
                <i className="ri-check-circle-line text-xl"></i>
                <span className="font-semibold">구독해주셔서 감사합니다!</span>
              </div>
            ) : (
              <form data-readdy-form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className="flex-1 px-4 py-3 rounded-xl text-sm bg-white/20 border border-white/30 text-white placeholder-teal-200 focus:outline-none focus:bg-white/30"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  구독하기
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                    <i className="ri-test-tube-line text-white text-sm"></i>
                  </div>
                  <span className="text-base font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>Testably</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  QA 팀을 위한 올인원 테스트 관리 플랫폼. 더 빠르고 스마트한 테스트를 경험하세요.
                </p>
              </div>
              <nav>
                <h4 className="text-sm font-bold text-gray-900 mb-4">제품</h4>
                <ul className="space-y-2">
                  {['기능 소개', '요금제', '업데이트 노트', '로드맵'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer" rel="nofollow">{item}</a>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav>
                <h4 className="text-sm font-bold text-gray-900 mb-4">회사</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer" rel="nofollow">소개</a>
                  </li>
                  <li>
                    <button onClick={() => navigate('/privacy')} className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer">개인정보처리방침</button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/terms')} className="text-gray-500 text-sm hover:text-gray-900 transition-colors cursor-pointer">이용약관</button>
                  </li>
                </ul>
              </nav>
            </div>
            <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-xs">© 2025 Testably. All rights reserved.</p>
              <div className="flex items-center gap-4">
                {['ri-twitter-x-line', 'ri-github-line', 'ri-linkedin-box-line'].map((icon) => (
                  <a key={icon} href="#" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer" rel="nofollow">
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
