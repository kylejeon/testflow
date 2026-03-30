import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    badge: 'Legal',
    title: 'Refund Policy',
    updated: 'Last Updated: March 30, 2026',
    sections: [
      {
        heading: 'Overview',
        body: 'This Refund Policy applies to all paid subscription plans for Testably ("Service") offered by Testably Inc. ("Company"). Payments for the Service are processed by Paddle.com Market Limited ("Paddle"), which acts as the Merchant of Record for all transactions. By subscribing to a paid plan, you agree to the terms outlined in this policy.',
      },
      {
        heading: 'Free Plan and Free Trial',
        body: 'Testably offers a Free plan with limited features at no cost. No payment information is required, and no charges are incurred. If a free trial is offered for paid plans, you will not be charged until the trial period ends. You may cancel at any time during the trial without being charged.',
      },
      {
        heading: 'Subscription Plans and Billing',
        body: 'Testably offers the following paid plans:',
        list: [
          'Starter — $49/month (or $499/year, ~15% discount)',
          'Professional — $99/month (or $1,009/year, ~15% discount)',
          'Enterprise S — $249/month (or $2,540/year)',
          'Enterprise M — $499/month (or $5,090/year)',
          'Enterprise L — Custom pricing (contact sales)',
        ],
        note: 'Subscriptions are billed in advance on a monthly or annual basis. Viewer seats are free and do not incur charges regardless of plan.',
      },
      {
        heading: 'Refund Eligibility',
        table: [
          { scenario: 'Cancel during free trial', refund: 'N/A (no charge)', detail: 'No payment is collected during the trial period.' },
          { scenario: 'Cancel within 7 days of first payment (no significant usage)', refund: 'Full refund', detail: 'If you have not created any projects or test cases, a full refund is available upon request.' },
          { scenario: 'Cancel within 7 days of first payment (with usage)', refund: 'Case-by-case', detail: 'If you have actively used the service, refund eligibility will be reviewed on a case-by-case basis.' },
          { scenario: 'Cancel after 7 days', refund: 'No refund', detail: 'No refund for the current billing period. Your subscription remains active until the end of the billing cycle.' },
          { scenario: 'Annual plan — cancel mid-term', refund: 'No pro-rata refund', detail: 'Annual subscriptions are not eligible for partial refunds. Service access continues until the end of the annual billing period.' },
          { scenario: 'Plan downgrade', refund: 'No refund', detail: 'Downgrading takes effect at the next billing cycle. No refund is issued for the difference.' },
          { scenario: 'Service outage (Company fault)', refund: 'Credit or extension', detail: 'If the Service experiences extended downtime (24+ hours) due to Company fault, service credit or billing extension will be provided.' },
          { scenario: 'Enterprise L plan', refund: 'Per contract', detail: 'Enterprise L plans are governed by individual contract terms.' },
        ],
      },
      {
        heading: 'How to Request a Refund',
        body: 'To request a refund, please contact our support team at support@testably.app with the following information:',
        list: [
          'Your account email address',
          'The date of the transaction',
          'Reason for the refund request',
        ],
        note: 'We will review your request and respond within 3 business days. Approved refunds are processed through Paddle and typically appear in your account within 5\u201310 business days, depending on your payment method and financial institution.',
      },
      {
        heading: 'Payment Processing',
        body: 'All payments are processed by Paddle.com Market Limited, which acts as our Merchant of Record. Paddle handles payment processing, tax collection, and invoicing. Your credit card statement will show a charge from Paddle, not from Testably directly. For payment-related inquiries, you may also contact Paddle directly through their buyer support page.',
      },
      {
        heading: 'Chargebacks',
        body: 'We encourage you to contact us before initiating a chargeback with your bank or payment provider. Filing a chargeback without contacting us first may result in the suspension of your account. We are committed to resolving payment disputes promptly and fairly.',
      },
      {
        heading: 'Changes to This Policy',
        body: 'We reserve the right to update this Refund Policy at any time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the Service after changes constitutes acceptance of the revised policy.',
      },
      {
        heading: 'Contact',
        contactEmail: 'support@testably.app',
        contactLabel: 'For questions about this Refund Policy, please contact us at:',
      },
    ],
  },
  ko: {
    badge: '법적 정보',
    title: '환불 정책',
    updated: '최종 수정일: 2026년 3월 30일',
    sections: [
      {
        heading: '개요',
        body: '본 환불 정책은 Testably(이하 "회사")가 제공하는 유료 구독 서비스에 적용됩니다. 서비스의 결제는 Paddle.com Market Limited(이하 "Paddle")가 판매 대행자(Merchant of Record)로서 처리합니다. 유료 플랜을 구독함으로써 본 정책의 조건에 동의하는 것으로 간주됩니다.',
      },
      {
        heading: '무료 플랜 및 무료 체험',
        body: 'Testably는 제한된 기능의 무료 플랜(Free Plan)을 제공합니다. 결제 정보 입력이 불필요하며 요금이 청구되지 않습니다. 유료 플랜의 무료 체험이 제공되는 경우, 체험 기간 중 언제든지 취소할 수 있으며 요금이 청구되지 않습니다.',
      },
      {
        heading: '구독 플랜 및 결제',
        body: 'Testably는 다음 유료 플랜을 제공합니다:',
        list: [
          'Starter — 월 $49 (연 $499, 약 15% 할인)',
          'Professional — 월 $99 (연 $1,009, 약 15% 할인)',
          'Enterprise S — 월 $249 (연 $2,540)',
          'Enterprise M — 월 $499 (연 $5,090)',
          'Enterprise L — 맞춤 가격 (영업팀 문의)',
        ],
        note: '구독 요금은 월간 또는 연간 단위로 선결제됩니다. Viewer 시트는 플랜에 관계없이 무료입니다.',
      },
      {
        heading: '환불 조건',
        table: [
          { scenario: '무료 체험 중 취소', refund: '해당 없음 (미청구)', detail: '체험 기간 중에는 결제가 발생하지 않습니다.' },
          { scenario: '첫 결제 후 7일 이내 취소 (미사용)', refund: '전액 환불', detail: '프로젝트나 테스트 케이스를 생성하지 않은 경우, 요청 시 전액 환불됩니다.' },
          { scenario: '첫 결제 후 7일 이내 취소 (사용 이력 있음)', refund: '개별 심사', detail: '서비스를 적극적으로 사용한 경우 개별 검토를 통해 환불 여부를 결정합니다.' },
          { scenario: '7일 초과 후 취소', refund: '환불 불가', detail: '현재 결제 주기에 대한 환불은 제공되지 않으며, 결제 주기 종료까지 서비스를 이용할 수 있습니다.' },
          { scenario: '연간 플랜 — 중도 취소', refund: '일할 환불 불가', detail: '연간 구독은 부분 환불 대상이 아닙니다. 연간 결제 기간 종료까지 서비스를 계속 이용할 수 있습니다.' },
          { scenario: '플랜 다운그레이드', refund: '환불 불가', detail: '다운그레이드는 다음 결제 주기부터 적용됩니다. 차액 환불은 제공되지 않습니다.' },
          { scenario: '서비스 장애 (회사 귀책)', refund: '크레딧 또는 기간 연장', detail: '회사 귀책 사유로 24시간 이상 서비스 중단 시, 서비스 크레딧 또는 결제 기간 연장을 제공합니다.' },
          { scenario: 'Enterprise L 플랜', refund: '개별 계약 조건', detail: 'Enterprise L 플랜은 개별 계약 조건에 따릅니다.' },
        ],
      },
      {
        heading: '환불 요청 방법',
        body: '환불을 요청하시려면 support@testably.app으로 다음 정보와 함께 연락해 주세요:',
        list: [
          '계정 이메일 주소',
          '결제 일자',
          '환불 요청 사유',
        ],
        note: '요청을 검토하여 영업일 기준 3일 이내 답변드립니다. 승인된 환불은 Paddle을 통해 처리되며, 결제 수단과 금융기관에 따라 5~10 영업일 내에 반영됩니다.',
      },
      {
        heading: '결제 처리',
        body: '모든 결제는 Paddle.com Market Limited가 판매 대행자(Merchant of Record)로서 처리합니다. Paddle이 결제, 세금 징수, 청구서 발행을 담당합니다. 신용카드 명세서에는 Testably가 아닌 Paddle로 청구 내역이 표시됩니다.',
      },
      {
        heading: '차지백(결제 이의신청)',
        body: '은행이나 결제사에 차지백을 신청하기 전에 먼저 저희에게 연락해 주시기 바랍니다. 사전 연락 없이 차지백을 신청하면 계정이 정지될 수 있습니다.',
      },
      {
        heading: '정책 변경',
        body: '회사는 본 환불 정책을 언제든지 변경할 수 있습니다. 변경 시 본 페이지에 업데이트된 "최종 수정일"과 함께 게시됩니다.',
      },
      {
        heading: '문의',
        contactEmail: 'support@testably.app',
        contactLabel: '본 환불 정책에 관한 문의:',
      },
    ],
  },
};

export default function RefundPolicyPage() {
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage === 'ko' ? 'ko' : 'en';
  const t = content[lang];

  return (
    <MarketingLayout
      title={lang === 'ko' ? '환불 정책 | Testably' : 'Refund Policy | Testably'}
      description="Refund policy for Testably paid subscription plans."
      showCTA={false}
    >
      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <i className="ri-refund-2-line text-indigo-600 text-sm"></i>
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
              {'list' in section && section.list && (
                <ul className="space-y-2 mb-3">
                  {section.list.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {'note' in section && section.note && (
                <p className="text-gray-600 bg-gray-50 rounded-lg p-4 border border-gray-100">{section.note}</p>
              )}
              {'table' in section && section.table && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 font-semibold text-gray-800 border-b border-gray-200">{lang === 'ko' ? '상황' : 'Scenario'}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-800 border-b border-gray-200">{lang === 'ko' ? '환불 가능 여부' : 'Refund?'}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-800 border-b border-gray-200">{lang === 'ko' ? '상세' : 'Details'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{row.scenario}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-600">{row.refund}</td>
                          <td className="px-4 py-3 text-gray-600">{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            <i className="ri-file-text-line text-indigo-500 text-lg flex-shrink-0"></i>
            <p className="text-gray-600">
              {lang === 'ko'
                ? '서비스 이용 조건에 대한 자세한 내용은 '
                : 'For full terms and conditions, please see our '}
              <Link to="/terms" className="text-indigo-600 font-semibold hover:underline">
                {lang === 'ko' ? '이용약관' : 'Terms of Service'}
              </Link>
              {lang === 'ko' ? '을 참조하세요.' : '.'}
            </p>
          </div>
        </article>
      </main>
    </MarketingLayout>
  );
}
