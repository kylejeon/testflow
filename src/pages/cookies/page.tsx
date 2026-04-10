import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    badge: 'Legal',
    title: 'Cookie Policy',
    updated: 'Last Updated: March 30, 2026',
    sections: [
      {
        heading: 'What Are Cookies',
        body: 'Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and supply information to the site owners. This Cookie Policy explains what cookies Testably ("Service") uses, why we use them, and how you can manage your cookie preferences.',
      },
      {
        heading: 'Types of Cookies We Use',
        intro: 'We use the following categories of cookies:',
        categories: [
          {
            name: 'Essential Cookies',
            required: true,
            description: 'These cookies are strictly necessary for the Service to function. They enable core features such as user authentication, session management, and security. Without these cookies, the Service cannot operate properly.',
            examples: [
              'Supabase authentication session token',
              'CSRF protection token',
              'Cookie consent preferences',
            ],
          },
          {
            name: 'Preference Cookies',
            required: false,
            description: 'These cookies remember your settings and preferences, such as language selection and display preferences, to provide a more personalized experience.',
            examples: [
              'Language preference (English / Korean)',
              'Theme settings',
              'Timezone preference',
            ],
          },
          {
            name: 'Analytics Cookies',
            required: false,
            description: 'These cookies help us understand how visitors interact with the Service by collecting and reporting information anonymously. This data helps us improve the Service.',
            examples: [
              'Page view counts and navigation patterns',
              'Feature usage statistics',
              'Performance metrics',
            ],
          },
        ],
      },
      {
        heading: 'Third-Party Cookies',
        intro: 'Some cookies are placed by third-party services that appear on our pages:',
        thirdParties: [
          { name: 'Paddle', purpose: 'Payment processing — sets cookies for transaction security and fraud prevention.' },
          { name: 'Google', purpose: 'OAuth authentication — sets cookies when you sign in with Google.' },
        ],
        note: 'We do not control cookies set by third parties. Please refer to their respective privacy policies for more information.',
      },
      {
        heading: 'Cookie Duration',
        intro: 'Cookies can be classified by their lifespan:',
        list: [
          'Session cookies — These are temporary cookies that are deleted when you close your browser. Used primarily for authentication.',
          'Persistent cookies — These remain on your device for a set period or until you delete them. Used for remembering preferences and analytics.',
        ],
      },
      {
        heading: 'How to Manage Cookies',
        body: 'Most web browsers allow you to control cookies through their settings. You can typically:',
        list: [
          'View what cookies are stored on your device',
          'Delete individual or all cookies',
          'Block cookies from specific or all websites',
          'Set your browser to notify you when a cookie is being set',
        ],
        note: 'Please note that blocking essential cookies may prevent the Service from functioning properly. If you disable authentication cookies, you will not be able to log in.',
        browsers: [
          { name: 'Chrome', url: 'chrome://settings/cookies' },
          { name: 'Firefox', url: 'about:preferences#privacy' },
          { name: 'Safari', url: 'Preferences > Privacy' },
          { name: 'Edge', url: 'edge://settings/content/cookies' },
        ],
      },
      {
        heading: 'Cookie Consent',
        body: 'When you first visit the Service, we may display a cookie consent banner (for users in the European Union and other applicable regions). You can choose to accept or reject non-essential cookies. Your consent preferences are stored in a cookie so that we remember your choice on subsequent visits. You can change your cookie preferences at any time through your browser settings.',
      },
      {
        heading: 'Changes to This Policy',
        body: 'We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. Any changes will be posted on this page with an updated "Last Updated" date.',
      },
      {
        heading: 'Contact',
        contactEmail: 'support@testably.app',
        contactLabel: 'If you have questions about our use of cookies, please contact us at:',
      },
    ],
  },
  ko: {
    badge: '법적 정보',
    title: '쿠키 정책',
    updated: '최종 수정일: 2026년 3월 30일',
    sections: [
      {
        heading: '쿠키란 무엇인가요',
        body: '쿠키는 웹사이트를 방문할 때 사용자의 기기(컴퓨터, 태블릿, 모바일)에 저장되는 작은 텍스트 파일입니다. 쿠키는 웹사이트가 효율적으로 작동하고 더 나은 사용자 경험을 제공하며, 사이트 소유자에게 정보를 제공하는 데 사용됩니다. 본 쿠키 정책은 Testably("서비스")가 사용하는 쿠키, 사용 이유, 쿠키 설정 관리 방법을 설명합니다.',
      },
      {
        heading: '사용하는 쿠키 유형',
        intro: '다음과 같은 유형의 쿠키를 사용합니다:',
        categories: [
          {
            name: '필수 쿠키',
            required: true,
            description: '서비스가 정상적으로 작동하기 위해 반드시 필요한 쿠키입니다. 사용자 인증, 세션 관리, 보안 등 핵심 기능을 가능하게 합니다.',
            examples: [
              'Supabase 인증 세션 토큰',
              'CSRF 보호 토큰',
              '쿠키 동의 설정',
            ],
          },
          {
            name: '환경설정 쿠키',
            required: false,
            description: '언어 선택, 디스플레이 설정 등 사용자의 설정과 환경을 기억하여 개인화된 경험을 제공합니다.',
            examples: [
              '언어 설정 (한국어 / 영어)',
              '테마 설정',
              '시간대 설정',
            ],
          },
          {
            name: '분석 쿠키',
            required: false,
            description: '방문자가 서비스를 어떻게 사용하는지 이해하기 위해 익명으로 정보를 수집합니다. 이 데이터는 서비스 개선에 활용됩니다.',
            examples: [
              '페이지 조회수 및 탐색 패턴',
              '기능 사용 통계',
              '성능 지표',
            ],
          },
        ],
      },
      {
        heading: '제3자 쿠키',
        intro: '일부 쿠키는 서비스 페이지에 나타나는 제3자 서비스에 의해 설정됩니다:',
        thirdParties: [
          { name: 'Paddle', purpose: '결제 처리 — 거래 보안 및 사기 방지를 위한 쿠키를 설정합니다.' },
          { name: 'Google', purpose: 'OAuth 인증 — Google로 로그인 시 쿠키를 설정합니다.' },
        ],
        note: '제3자가 설정한 쿠키는 저희가 통제하지 않습니다. 자세한 내용은 해당 서비스의 개인정보처리방침을 참조해 주세요.',
      },
      {
        heading: '쿠키 유효 기간',
        intro: '쿠키는 유효 기간에 따라 분류됩니다:',
        list: [
          '세션 쿠키 — 브라우저를 닫으면 삭제되는 임시 쿠키입니다. 주로 인증에 사용됩니다.',
          '영구 쿠키 — 설정된 기간 동안 또는 삭제할 때까지 기기에 남아 있습니다. 환경설정 기억 및 분석에 사용됩니다.',
        ],
      },
      {
        heading: '쿠키 관리 방법',
        body: '대부분의 웹 브라우저에서 설정을 통해 쿠키를 제어할 수 있습니다:',
        list: [
          '기기에 저장된 쿠키 확인',
          '개별 또는 모든 쿠키 삭제',
          '특정 또는 모든 웹사이트의 쿠키 차단',
          '쿠키 설정 시 알림 받기',
        ],
        note: '필수 쿠키를 차단하면 서비스가 정상적으로 작동하지 않을 수 있습니다. 인증 쿠키를 비활성화하면 로그인이 불가능합니다.',
        browsers: [
          { name: 'Chrome', url: 'chrome://settings/cookies' },
          { name: 'Firefox', url: 'about:preferences#privacy' },
          { name: 'Safari', url: '환경설정 > 개인 정보 보호' },
          { name: 'Edge', url: 'edge://settings/content/cookies' },
        ],
      },
      {
        heading: '쿠키 동의',
        body: '서비스를 처음 방문할 때, 유럽연합 및 기타 해당 지역의 사용자에게 쿠키 동의 배너를 표시할 수 있습니다. 비필수 쿠키를 수락하거나 거부할 수 있습니다. 동의 설정은 쿠키에 저장되어 재방문 시 선택이 기억됩니다. 브라우저 설정을 통해 언제든지 쿠키 환경설정을 변경할 수 있습니다.',
      },
      {
        heading: '정책 변경',
        body: '기술, 법률 또는 데이터 관행의 변경을 반영하기 위해 본 쿠키 정책을 수시로 업데이트할 수 있습니다. 변경 사항은 업데이트된 "최종 수정일"과 함께 이 페이지에 게시됩니다.',
      },
      {
        heading: '문의',
        contactEmail: 'support@testably.app',
        contactLabel: '쿠키 사용에 관한 문의:',
      },
    ],
  },
};

export default function CookiePolicyPage() {
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage === 'ko' ? 'ko' : 'en';
  const t = content[lang];

  return (
    <MarketingLayout
      title={lang === 'ko' ? '쿠키 정책 | Testably' : 'Cookie Policy — Testably'}
      description="Testably's Cookie Policy — learn what cookies and tracking technologies we use, why we use them, and how to manage your cookie preferences."
      keywords="Testably cookie policy, cookies, tracking, browser storage"
      showCTA={false}
    >
      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <i className="ri-cookie-line text-indigo-600 text-sm"></i>
            <span className="text-indigo-700 text-sm font-medium">{t.badge}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t.title}</h1>
          <p className="text-gray-500 text-sm">{t.updated}</p>
        </header>

        <article className="space-y-10 text-sm leading-relaxed text-gray-700">
          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {section.heading}
              </h2>
              {'body' in section && section.body && <p className="mb-3">{section.body}</p>}
              {'intro' in section && section.intro && <p className="mb-3">{section.intro}</p>}

              {'categories' in section && section.categories && (
                <div className="space-y-4">
                  {section.categories.map(cat => (
                    <div key={cat.name} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                        {cat.required ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                            {lang === 'ko' ? '필수' : 'Required'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 uppercase">
                            {lang === 'ko' ? '선택' : 'Optional'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{cat.description}</p>
                      <ul className="space-y-1">
                        {cat.examples.map(ex => (
                          <li key={ex} className="flex items-start gap-2 text-gray-500">
                            <i className="ri-checkbox-blank-circle-fill text-[5px] mt-2 flex-shrink-0 text-gray-400"></i>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {'thirdParties' in section && section.thirdParties && (
                <div className="space-y-2 mb-3">
                  {section.thirdParties.map(tp => (
                    <div key={tp.name} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="font-semibold text-gray-800 whitespace-nowrap">{tp.name}</span>
                      <span className="text-gray-600">{tp.purpose}</span>
                    </div>
                  ))}
                </div>
              )}

              {'list' in section && section.list && (
                <ul className="space-y-2 mb-3">
                  {section.list.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {'note' in section && section.note && (
                <p className="text-gray-600 bg-amber-50 rounded-lg p-4 border border-amber-100 text-xs">
                  <i className="ri-information-line text-amber-500 mr-1"></i>
                  {section.note}
                </p>
              )}

              {'browsers' in section && section.browsers && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {section.browsers.map(b => (
                    <div key={b.name} className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                      <p className="font-semibold text-gray-800 text-xs">{b.name}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5 break-all">{b.url}</p>
                    </div>
                  ))}
                </div>
              )}

              {'contactEmail' in section && section.contactEmail && (
                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                  <p className="text-gray-700 mb-3">{section.contactLabel}</p>
                  <div className="text-sm">
                    <p><span className="font-semibold text-gray-800">{lang === 'ko' ? '이메일' : 'Email'}:</span> <span className="text-gray-600">{section.contactEmail}</span></p>
                  </div>
                </div>
              )}
            </section>
          ))}

          {/* Cross-link */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center gap-3">
            <i className="ri-shield-check-line text-indigo-500 text-lg flex-shrink-0"></i>
            <p className="text-gray-600">
              {lang === 'ko'
                ? '개인정보 처리에 대한 자세한 내용은 '
                : 'For more information about how we handle your data, see our '}
              <Link to="/privacy" className="text-indigo-600 font-semibold hover:underline">
                {lang === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
              </Link>
              {lang === 'ko' ? '을 참조하세요.' : '.'}
            </p>
          </div>
        </article>
      </main>
    </MarketingLayout>
  );
}
