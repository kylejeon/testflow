import { useState, useEffect, useRef } from 'react';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    badge: 'Legal',
    title: 'Privacy Policy',
    updated: 'Last Updated: January 1, 2025',
    back: 'Back to Home',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    sections: [
      {
        heading: 'General Provisions',
        body: 'Testably (hereinafter referred to as the "Company") values the personal information of its users and complies with relevant laws and regulations, including the Personal Information Protection Act and the Act on Promotion of Information and Communications Network Utilization and Information Protection. This Privacy Policy describes the purposes, types, retention periods, and user rights regarding personal information collected in the course of using the Testably service (hereinafter referred to as the "Service").',
      },
      {
        heading: 'Categories and Methods of Personal Information Collected',
        intro: 'The Company collects the following personal information to provide the Service:',
        table: [
          { label: '(a) Upon Registration', value: 'Email address, password (encrypted), name (nickname)' },
          { label: '(b) Social Login (Google)', value: 'Email address, profile name, profile photo URL' },
          { label: '(c) Automatically Collected During Use', value: 'IP address, access date/time, service usage logs, browser type, OS information, cookies' },
          { label: '(d) Paid Service Payments', value: 'Payment method information (card numbers are processed by the PG provider and are not stored by the Company), billing address' },
        ],
      },
      {
        heading: 'Purposes of Processing Personal Information',
        list: [
          'User registration and identity verification; service delivery',
          'Service usage history management and customer support',
          'Payment processing and billing for paid services',
          'Statistical analysis for service improvement and new feature development',
          'Delivery of notices, event information, and marketing communications (with user consent)',
          'Prevention of fraudulent use and security enhancement',
          'Investigation of violations of applicable laws and terms of use',
        ],
      },
      {
        heading: 'Retention and Use Period of Personal Information',
        intro: 'The Company retains users\' personal information until account deletion, in principle. However, where applicable laws require retention for a certain period, the information is retained accordingly:',
        retention: [
          { label: 'Records on contract or withdrawal of offer', period: '5 years' },
          { label: 'Records on payment and supply of goods', period: '5 years' },
          { label: 'Records on consumer complaints or disputes', period: '3 years' },
          { label: 'Access log records', period: '3 months' },
        ],
      },
      {
        heading: 'Provision of Personal Information to Third Parties',
        body: 'The Company does not, in principle, provide users\' personal information to external parties. Exceptions include cases where the user has given prior consent, or where required by law or requested by investigative agencies in accordance with legally prescribed procedures.',
      },
      {
        heading: 'Outsourcing of Personal Information Processing',
        intro: 'The Company outsources personal information processing as follows for service provision:',
        outsource: [
          { company: 'Supabase Inc.', task: 'Database and authentication services' },
          { company: 'Google LLC', task: 'Social login, email delivery' },
        ],
      },
      {
        heading: 'User Rights and How to Exercise Them',
        intro: 'Users may exercise the following rights at any time:',
        list: [
          'Request to view personal information',
          'Request to correct or delete personal information',
          'Request to suspend processing of personal information',
          'Request to transfer personal information',
        ],
        body: 'These rights may be exercised through the Settings page within the Service or by contacting the Privacy Officer via email at privacy@testably.app. The Company will take action without delay.',
      },
      {
        heading: 'Use of Cookies',
        body: 'The Company uses cookies for the convenience of using the Service. Cookies are small pieces of information sent by the server operating the website to the user\'s browser and stored on the user\'s computer. Users may refuse to store cookies through browser settings; however, this may cause inconvenience in using the Service.',
      },
      {
        heading: 'Measures to Ensure Security of Personal Information',
        shieldList: [
          'Password encryption (bcrypt) storage',
          'Minimization and management of access rights to personal information',
          'Data transmission encryption via SSL/TLS',
          'Regular security vulnerability assessments',
          'Security training for employees handling personal information',
        ],
      },
      {
        heading: 'Privacy Officer',
        contact: { label: 'Officer', value: 'Privacy Protection Team', email: 'privacy@testably.app' },
      },
      {
        heading: 'Changes to This Privacy Policy',
        body: 'This Privacy Policy may be amended due to changes in laws, policies, or security technologies. Any changes will be announced in advance through notices within the Service.',
      },
    ],
  },
  ko: {
    badge: '법적 고지',
    title: '개인정보처리방침',
    updated: '최종 수정일: 2025년 1월 1일',
    back: '홈으로 돌아가기',
    privacy: '개인정보처리방침',
    terms: '이용약관',
    sections: [
      {
        heading: '총칙',
        body: 'Testably(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 제공하는 Testably 서비스(이하 "서비스") 이용 과정에서 수집되는 개인정보의 처리 목적, 항목, 보유 기간 및 이용자의 권리에 대해 안내합니다.',
      },
      {
        heading: '수집하는 개인정보 항목 및 수집 방법',
        intro: '회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.',
        table: [
          { label: '① 회원가입 시', value: '이메일 주소, 비밀번호(암호화 저장), 이름(닉네임)' },
          { label: '② 소셜 로그인(Google) 시', value: '이메일 주소, 프로필 이름, 프로필 사진 URL' },
          { label: '③ 서비스 이용 과정에서 자동 수집', value: 'IP 주소, 접속 일시, 서비스 이용 기록, 브라우저 종류 및 OS 정보, 쿠키' },
          { label: '④ 유료 서비스 결제 시', value: '결제 수단 정보(카드 번호 등은 PG사에서 처리하며 회사는 저장하지 않음), 청구지 정보' },
        ],
      },
      {
        heading: '개인정보의 처리 목적',
        list: [
          '회원 가입 및 본인 확인, 서비스 제공',
          '서비스 이용 내역 관리 및 고객 지원',
          '유료 서비스 결제 처리 및 요금 청구',
          '서비스 개선 및 신규 기능 개발을 위한 통계 분석',
          '공지사항 전달, 이벤트 및 마케팅 정보 제공(수신 동의 시)',
          '부정 이용 방지 및 보안 강화',
          '법령 및 이용약관 위반 행위 조사',
        ],
      },
      {
        heading: '개인정보의 보유 및 이용 기간',
        intro: '회사는 이용자의 개인정보를 원칙적으로 회원 탈퇴 시까지 보유합니다. 단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.',
        retention: [
          { label: '계약 또는 청약철회 등에 관한 기록', period: '5년' },
          { label: '대금결제 및 재화 등의 공급에 관한 기록', period: '5년' },
          { label: '소비자 불만 또는 분쟁처리에 관한 기록', period: '3년' },
          { label: '접속에 관한 기록', period: '3개월' },
        ],
      },
      {
        heading: '개인정보의 제3자 제공',
        body: '회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우에는 예외로 합니다.',
      },
      {
        heading: '개인정보 처리 위탁',
        intro: '회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.',
        outsource: [
          { company: 'Supabase Inc.', task: '데이터베이스 및 인증 서비스' },
          { company: 'Google LLC', task: '소셜 로그인, 이메일 발송' },
        ],
      },
      {
        heading: '이용자의 권리와 행사 방법',
        intro: '이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.',
        list: [
          '개인정보 열람 요청',
          '개인정보 정정·삭제 요청',
          '개인정보 처리 정지 요청',
          '개인정보 이동 요청',
        ],
        body: '권리 행사는 서비스 내 설정 페이지 또는 아래 개인정보 보호책임자에게 이메일로 요청하실 수 있으며, 회사는 지체 없이 조치하겠습니다.',
      },
      {
        heading: '쿠키(Cookie) 운영',
        body: '회사는 서비스 이용 편의를 위해 쿠키를 사용합니다. 쿠키는 웹사이트 운영에 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며, 이용자의 PC 컴퓨터 내 하드디스크에 저장됩니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 불편이 있을 수 있습니다.',
      },
      {
        heading: '개인정보의 안전성 확보 조치',
        shieldList: [
          '비밀번호 암호화(bcrypt) 저장',
          '개인정보 접근 권한 최소화 및 관리',
          'SSL/TLS를 통한 데이터 전송 암호화',
          '정기적인 보안 취약점 점검',
          '개인정보 처리 직원 대상 보안 교육',
        ],
      },
      {
        heading: '개인정보 보호책임자',
        contact: { label: '담당자', value: '개인정보 보호팀', email: 'privacy@testably.app' },
      },
      {
        heading: '개인정보처리방침 변경',
        body: '본 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있습니다. 변경 시에는 서비스 내 공지사항을 통해 사전에 안내드리겠습니다.',
      },
    ],
  },
};

export default function PrivacyPage() {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const lang = currentLanguage === 'ko' ? 'ko' : 'en';
  const t = content[lang];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langMenuOpen]);

  return (
    <MarketingLayout
      title={lang === 'ko' ? '개인정보처리방침 | Testably' : 'Privacy Policy | Testably'}
      description="How Testably collects, uses, and protects your data."
      showCTA={false}
    >

        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-16">
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
              <i className="ri-shield-check-line text-indigo-600 text-sm"></i>
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
                {'body' in section && section.body && <p>{section.body}</p>}
                {'intro' in section && section.intro && <p className="mb-3">{section.intro}</p>}
                {'table' in section && section.table && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
                    {section.table.map((row) => (
                      <div key={row.label}>
                        <p className="font-semibold text-gray-800 mb-1">{row.label}</p>
                        <p className="text-gray-600">{row.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {'list' in section && section.list && (
                  <ul className="space-y-2 list-none">
                    {section.list.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {'retention' in section && section.retention && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2">
                    {section.retention.map((row, j) => (
                      <div key={j} className={`flex justify-between text-sm ${j > 0 ? 'border-t border-gray-200 pt-2' : ''}`}>
                        <span className="text-gray-600">{row.label}</span>
                        <span className="font-semibold text-gray-800">{row.period}</span>
                      </div>
                    ))}
                  </div>
                )}
                {'outsource' in section && section.outsource && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between font-semibold text-gray-800 pb-2 border-b border-gray-200">
                      <span>{lang === 'ko' ? '수탁업체' : 'Processor'}</span>
                      <span>{lang === 'ko' ? '위탁 업무' : 'Task'}</span>
                    </div>
                    {section.outsource.map((row, j) => (
                      <div key={j} className={`flex justify-between ${j > 0 ? 'border-t border-gray-200 pt-2' : ''}`}>
                        <span className="text-gray-600">{row.company}</span>
                        <span className="text-gray-800">{row.task}</span>
                      </div>
                    ))}
                  </div>
                )}
                {'shieldList' in section && section.shieldList && (
                  <ul className="space-y-2">
                    {section.shieldList.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <i className="ri-shield-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {'contact' in section && section.contact && (
                  <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                    <p className="text-gray-700 mb-3">
                      {lang === 'ko'
                        ? '개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등에 관한 사항은 아래 담당자에게 연락해 주시기 바랍니다.'
                        : 'For inquiries, complaints, or remedies regarding the processing of personal information, please contact:'}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-semibold text-gray-800">{section.contact.label}:</span> <span className="text-gray-600">{section.contact.value}</span></p>
                      <p><span className="font-semibold text-gray-800">{lang === 'ko' ? '이메일' : 'Email'}:</span> <span className="text-gray-600">{section.contact.email}</span></p>
                    </div>
                  </div>
                )}
                {'body' in section && !('contact' in section) && 'list' in section && section.body && (
                  <p className="mt-3">{section.body}</p>
                )}
              </section>
            ))}
          </article>
        </main>

    </MarketingLayout>
  );
}
