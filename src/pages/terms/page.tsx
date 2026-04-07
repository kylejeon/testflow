import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    badge: 'Legal',
    title: 'Terms of Service',
    updated: 'Last Updated: January 1, 2025',
    back: 'Back to Home',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    sections: [
      {
        heading: 'Purpose',
        body: 'These Terms govern the conditions, procedures, and the rights, obligations, and responsibilities between the Company and users for the use of the test management platform service (hereinafter referred to as the "Service") provided by Testably (hereinafter referred to as the "Company").',
      },
      {
        heading: 'Definitions',
        definitions: [
          { term: '"Service"', def: 'The Testably test management platform and all related ancillary services provided by the Company.' },
          { term: '"User"', def: 'Any member or non-member who agrees to these Terms and uses the Service.' },
          { term: '"Member"', def: 'A person who has registered as a member by providing personal information to the Company and can continuously use the Service.' },
          { term: '"Content"', def: 'All data created and registered by users within the Service, including test cases, documents, and session records.' },
        ],
      },
      {
        heading: 'Effect and Amendment of Terms',
        body: 'These Terms take effect when posted on the Service screen or otherwise communicated to users. The Company may amend these Terms for reasonable cause within the scope of applicable laws, and amended Terms will be announced through the Service at least 7 days prior to their effective date. If users do not agree with the amended Terms, they may discontinue using the Service and request account deletion. Continued use of the Service after the amendment notice shall be deemed as consent to the amended Terms.',
      },
      {
        heading: 'Membership Registration and Account Management',
        list: [
          'Users may apply for membership registration by filling in the prescribed form and agreeing to these Terms.',
          'The Company approves registration applications in principle, but may refuse approval if the applicant has used false information or impersonated another person.',
          'Members must promptly update any changes to their registered information; any disadvantage resulting from failure to do so shall be borne by the member.',
          'Members are responsible for managing their accounts and passwords, which may not be transferred or lent to third parties.',
          'Members must immediately notify the Company upon discovering any unauthorized use of their accounts.',
        ],
      },
      {
        heading: 'Service Use',
        body: 'The Service is available 24 hours a day, 365 days a year in principle. However, service may be temporarily suspended due to system maintenance, expansion, replacement, equipment failure, or heavy traffic. The Company will provide advance notice of service interruptions; where advance notice is not feasible, post-notice will be provided.',
      },
      {
        heading: 'Paid Services and Payment',
        body: 'The Company offers paid plans including Hobby ($19/month), Starter ($49/month), Professional ($99/month), Enterprise S ($249/month), Enterprise M ($499/month), and Enterprise L (custom pricing). To use paid services, users must select a plan and complete payment.',
        refundTitle: 'Refund Policy',
        refundList: [
          'No charges are incurred if canceled during the 14-day free trial period.',
          'A full refund is available if no usage has occurred within 7 days of payment.',
          'No refund is provided for the remaining period after 7 days.',
          'Enterprise plan refunds are subject to separate contract terms.',
        ],
      },
      {
        heading: 'User Obligations',
        intro: 'Users must not engage in the following activities:',
        prohibitedList: [
          'Impersonation or registration of false information',
          'Infringement of the Company\'s or third parties\' intellectual property rights',
          'Interference with the normal operation of the Service',
          'Distribution of malicious code, viruses, or other harmful programs',
          'Activities prohibited by applicable laws or these Terms',
          'Unauthorized collection or use of others\' personal information',
          'Unauthorized commercial advertising or spam',
        ],
      },
      {
        heading: 'Content and Intellectual Property Rights',
        body: 'Copyright for Content registered by users within the Service belongs to the respective users. However, users grant the Company a non-exclusive license to use such Content for the purposes of operating, improving, and promoting the Service. Intellectual property rights for the Service itself (including logo, UI, and software) belong to the Company, and users may not reproduce, distribute, or modify these without prior written consent from the Company.',
      },
      {
        heading: 'Service Restriction and Contract Termination',
        body: 'The Company may take measures such as warning, temporary suspension, or permanent suspension if a user violates these Terms or interferes with the normal operation of the Service. Members may request account deletion at any time through the Settings page within the Service, and upon deletion, personal information and Content will be processed in accordance with applicable laws.',
      },
      {
        heading: 'Disclaimer',
        warningList: [
          'Service interruption due to force majeure events such as natural disasters, war, or terrorism',
          'Service disruption caused by the user\'s own fault',
          'Failure of users to achieve expected profits through the Service',
          'Accuracy and reliability of information posted by third parties',
          'Disputes between users or between users and third parties',
        ],
      },
      {
        heading: 'Governing Law and Dispute Resolution',
        body: 'These Terms shall be interpreted and governed by the laws of the Republic of Korea. In the event of a dispute between the Company and a user regarding the use of the Service, both parties shall negotiate in good faith. If negotiation fails, either party may file a lawsuit with the competent court under the Civil Procedure Act.',
      },
      {
        heading: 'Contact',
        contactEmail: 'support@testably.app',
        contactLabel: 'For inquiries regarding these Terms, please contact:',
      },
    ],
  },
  ko: {
    badge: '법적 고지',
    title: '이용약관',
    updated: '최종 수정일: 2025년 1월 1일',
    back: '홈으로 돌아가기',
    privacy: '개인정보처리방침',
    terms: '이용약관',
    sections: [
      {
        heading: '목적',
        body: '본 약관은 Testably(이하 "회사")가 제공하는 테스트 관리 플랫폼 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.',
      },
      {
        heading: '용어의 정의',
        definitions: [
          { term: '"서비스"', def: '회사가 제공하는 Testably 테스트 관리 플랫폼 및 관련 부가 서비스 일체를 의미합니다.' },
          { term: '"이용자"', def: '본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 의미합니다.' },
          { term: '"회원"', def: '회사에 개인정보를 제공하여 회원 등록을 한 자로, 서비스를 지속적으로 이용할 수 있는 자를 의미합니다.' },
          { term: '"콘텐츠"', def: '이용자가 서비스 내에서 작성·등록한 테스트 케이스, 문서, 세션 기록 등 모든 데이터를 의미합니다.' },
        ],
      },
      {
        heading: '약관의 효력 및 변경',
        body: '본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 합리적인 사유가 있는 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 변경된 약관은 적용일 7일 전부터 서비스 내 공지사항을 통해 공지합니다. 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다. 변경 공지 후 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.',
      },
      {
        heading: '회원가입 및 계정 관리',
        list: [
          '이용자는 회사가 정한 가입 양식에 따라 정보를 기입하고 본 약관에 동의함으로써 회원가입을 신청합니다.',
          '회사는 가입 신청자에게 서비스 이용을 승낙함을 원칙으로 하나, 타인의 정보를 도용하거나 허위 정보를 기재한 경우 승낙을 거부할 수 있습니다.',
          '회원은 등록된 정보에 변경이 있는 경우 즉시 수정해야 하며, 미수정으로 인한 불이익은 회원이 부담합니다.',
          '계정 및 비밀번호의 관리 책임은 회원에게 있으며, 제3자에게 양도하거나 대여할 수 없습니다.',
          '계정 도용 또는 무단 사용을 인지한 경우 즉시 회사에 통보해야 합니다.',
        ],
      },
      {
        heading: '서비스 이용',
        body: '서비스는 연중무휴 24시간 제공을 원칙으로 합니다. 단, 시스템 점검, 증설 및 교체, 설비 장애, 서비스 이용 폭주 등 운영상 상당한 이유가 있는 경우 서비스 제공이 일시 중단될 수 있습니다. 회사는 서비스 중단 시 사전에 공지하며, 불가피한 사유로 사전 공지가 어려운 경우 사후에 공지합니다.',
      },
      {
        heading: '유료 서비스 및 결제',
        body: '회사는 Starter, Professional, Enterprise 등 유료 요금제를 제공합니다. 유료 서비스 이용을 위해서는 해당 요금제를 선택하고 결제를 완료해야 합니다.',
        refundTitle: '환불 정책',
        refundList: [
          '14일 무료 체험 기간 중 취소 시 요금이 청구되지 않습니다.',
          '유료 결제 후 7일 이내 미사용 시 전액 환불이 가능합니다.',
          '7일 초과 후에는 잔여 기간에 대한 환불이 제공되지 않습니다.',
          'Enterprise 플랜의 환불은 별도 계약 조건에 따릅니다.',
        ],
      },
      {
        heading: '이용자의 의무',
        intro: '이용자는 다음 행위를 해서는 안 됩니다.',
        prohibitedList: [
          '타인의 정보 도용 또는 허위 정보 등록',
          '회사 또는 제3자의 지식재산권 침해',
          '서비스의 정상적인 운영을 방해하는 행위',
          '악성 코드, 바이러스 등 유해 프로그램 배포',
          '관련 법령 또는 본 약관에서 금지하는 행위',
          '타인의 개인정보 무단 수집·이용',
          '상업적 목적의 무단 광고 또는 스팸 발송',
        ],
      },
      {
        heading: '콘텐츠 및 지식재산권',
        body: '이용자가 서비스 내에 등록한 콘텐츠에 대한 저작권은 해당 이용자에게 귀속됩니다. 단, 이용자는 회사가 서비스 운영, 개선, 홍보 등의 목적으로 해당 콘텐츠를 사용할 수 있도록 비독점적 라이선스를 회사에 부여합니다. 서비스 자체(로고, UI, 소프트웨어 등)에 대한 지식재산권은 회사에 귀속되며, 이용자는 회사의 사전 서면 동의 없이 이를 복제, 배포, 수정할 수 없습니다.',
      },
      {
        heading: '서비스 이용 제한 및 계약 해지',
        body: '회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고·일시 정지·영구 이용 정지 등의 조치를 취할 수 있습니다. 회원은 언제든지 서비스 내 설정 페이지에서 회원 탈퇴를 신청할 수 있으며, 탈퇴 즉시 개인정보 및 콘텐츠는 관련 법령에 따라 처리됩니다.',
      },
      {
        heading: '면책 조항',
        warningList: [
          '천재지변, 전쟁, 테러 등 불가항력적 사유로 인한 서비스 중단',
          '이용자의 귀책 사유로 인한 서비스 이용 장애',
          '이용자가 서비스를 통해 기대하는 수익을 얻지 못한 경우',
          '제3자가 서비스를 통해 게재한 정보의 정확성 및 신뢰성',
          '이용자 간 또는 이용자와 제3자 간의 분쟁',
        ],
      },
      {
        heading: '준거법 및 분쟁 해결',
        body: '본 약관은 대한민국 법률에 따라 해석되고 적용됩니다. 서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 양 당사자는 성실히 협의하여 해결하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.',
      },
      {
        heading: '문의',
        contactEmail: 'support@testably.app',
        contactLabel: '본 약관에 관한 문의 사항은 아래로 연락해 주시기 바랍니다.',
      },
    ],
  },
};

export default function TermsPage() {
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
      title={lang === 'ko' ? '이용약관 | Testably' : 'Terms of Service | Testably'}
      description="Terms and conditions for using Testably."
      showCTA={false}
    >

        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-16">
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
              <i className="ri-file-text-line text-indigo-600 text-sm"></i>
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
                {'definitions' in section && section.definitions && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
                    {section.definitions.map(({ term, def }) => (
                      <div key={term} className="flex gap-3">
                        <span className="font-semibold text-gray-800 whitespace-nowrap">{term}</span>
                        <span className="text-gray-600">{def}</span>
                      </div>
                    ))}
                  </div>
                )}
                {'list' in section && section.list && (
                  <ul className="space-y-2">
                    {section.list.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {'refundTitle' in section && section.refundTitle && section.refundList && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2">
                    <p className="font-semibold text-gray-800 mb-2">{section.refundTitle}</p>
                    <ul className="space-y-1.5">
                      {section.refundList.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-gray-600">
                          <i className="ri-information-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-gray-600 mt-3 flex items-center gap-2">
                      <i className="ri-file-text-line text-indigo-500 flex-shrink-0"></i>
                      {lang === 'ko'
                        ? <>자세한 환불 조건은 <Link to="/refund" className="text-indigo-600 font-semibold hover:underline">환불 정책</Link>을 참조하세요.</>
                        : <>For full details, please see our <Link to="/refund" className="text-indigo-600 font-semibold hover:underline">Refund Policy</Link>.</>}
                    </p>
                  </div>
                )}
                {'intro' in section && section.intro && <p className="mb-3">{section.intro}</p>}
                {'prohibitedList' in section && section.prohibitedList && (
                  <ul className="space-y-2">
                    {section.prohibitedList.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <i className="ri-close-circle-line text-red-400 mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {'warningList' in section && section.warningList && (
                  <ul className="space-y-2">
                    {section.warningList.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <i className="ri-error-warning-line text-amber-500 mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
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
          </article>
        </main>

    </MarketingLayout>
  );
}
