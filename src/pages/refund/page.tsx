import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { useLanguage } from '../../hooks/useLanguage';

const content = {
  en: {
    badge: 'Legal',
    title: 'Refund Policy',
    updated: 'Last Updated: April 10, 2026',
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
          'Hobby — $19/month (or $194/year)',
          'Starter — $49/month (or $499/year, ~15% discount)',
          'Professional — $99/month (or $1,009/year, ~15% discount)',
          'Enterprise S — $249/month (or $2,540/year)',
          'Enterprise M — $499/month (or $5,090/year)',
          'Enterprise L — Custom pricing (contact sales)',
        ],
        note: 'Subscriptions are billed in advance on a monthly or annual basis. Viewer seats are free and do not incur charges regardless of plan.',
      },
      {
        heading: 'Monthly Subscription Refunds',
        body: 'For monthly subscriptions, a full refund is available within 14 days of the billing date, for any reason, no questions asked. After 14 days, no refund is provided for the remainder of the current billing period. Upon cancellation, your access continues until the end of the current billing cycle.',
        note: 'Partial refunds are not available for monthly subscriptions.',
      },
      {
        heading: 'Annual Subscription Refunds',
        body: 'Annual subscriptions follow a two-tier refund model:',
        list: [
          'Full refund: Available within 30 days of the billing date, for any reason.',
          'Pro-rata partial refund: Available after 30 days. You are charged for the months already used, and the remaining unused months are refunded.',
        ],
        note: 'Example: If you paid $194/year and request a refund in month 5, you are charged for 5 months of usage and the remaining 7 months are refunded proportionally.',
      },
      {
        heading: 'Exceptions',
        body: 'The following exceptions apply to this Refund Policy:',
        list: [
          'Enterprise contracts: Enterprise plans are governed by separate contract terms that take precedence over this policy.',
          'Service outages (SLA breach): If the Service fails to meet its Service Level Agreement, a refund may be reviewed regardless of the time elapsed since payment.',
          'Fraudulent or abusive use: Refund requests may be denied if the account has violated our Terms of Service, including fraudulent or abusive use of the Service.',
          'Promotional pricing: Refund amounts are calculated based on the actual amount paid, not the standard list price.',
        ],
      },
      {
        heading: 'How to Request a Refund',
        body: 'To request a refund, please use one of the following methods:',
        list: [
          'Via your account: Go to Settings → Billing and submit a refund request directly.',
          'Via email: Contact us at support@testably.app with your account email, transaction date, and order/transaction ID (if available).',
        ],
        note: 'We will acknowledge your request within 3 business days. Approved refunds are processed through Paddle and typically appear in your account within 3–10 business days, depending on your payment method and financial institution.',
      },
      {
        heading: 'Subscription Cancellation',
        body: 'You can cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period — you retain full access to the Service until then. If you are eligible for a refund under this policy, you may request one at the time of cancellation.',
      },
      {
        heading: 'Payment Processing',
        body: 'All payments are processed by Paddle.com Market Limited, which acts as our Merchant of Record. Paddle handles payment processing, tax collection, and invoicing. Your credit card statement will show a charge from Paddle, not from Testably directly. For payment-related inquiries, you may also contact Paddle directly through their buyer support page.',
      },
      {
        heading: 'Chargebacks',
        body: 'We encourage you to contact us before initiating a chargeback with your bank or payment provider. We are committed to resolving payment disputes promptly and fairly.',
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
    updated: '최종 수정일: 2026년 4월 10일',
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
          'Hobby — 월 $19 (연 $194)',
          'Starter — 월 $49 (연 $499, 약 15% 할인)',
          'Professional — 월 $99 (연 $1,009, 약 15% 할인)',
          'Enterprise S — 월 $249 (연 $2,540)',
          'Enterprise M — 월 $499 (연 $5,090)',
          'Enterprise L — 맞춤 가격 (영업팀 문의)',
        ],
        note: '구독 요금은 월간 또는 연간 단위로 선결제됩니다. Viewer 시트는 플랜에 관계없이 무료입니다.',
      },
      {
        heading: '월간 구독 환불',
        body: '월간 구독의 경우, 결제일로부터 14일 이내에는 이유를 불문하고 전액 환불이 가능합니다. 14일 경과 후에는 잔여 구독 기간에 대한 환불이 제공되지 않습니다. 취소 후에도 현재 결제 주기 종료일까지 서비스를 이용할 수 있습니다.',
        note: '월간 구독에는 부분 환불이 적용되지 않습니다.',
      },
      {
        heading: '연간 구독 환불',
        body: '연간 구독은 2단계 환불 정책을 따릅니다:',
        list: [
          '전액 환불: 결제일로부터 30일 이내에 이유를 불문하고 전액 환불이 가능합니다.',
          '비례 부분 환불(Pro-rata): 30일 경과 후에도 이미 사용한 기간을 제외한 남은 기간에 대해 비례 환불이 가능합니다.',
        ],
        note: '예시: 연간 $194를 결제하고 5개월 차에 환불을 요청하는 경우, 사용한 5개월분이 청구되고 남은 7개월분이 비례 환불됩니다.',
      },
      {
        heading: '예외 사항',
        body: '본 환불 정책에는 다음 예외 사항이 적용됩니다:',
        list: [
          'Enterprise 계약: Enterprise 플랜은 별도의 계약 조건이 우선 적용됩니다.',
          '서비스 장애(SLA 미달): 서비스가 SLA를 충족하지 못한 경우, 결제 후 경과 기간에 관계없이 환불이 검토될 수 있습니다.',
          '사기적 또는 악의적 사용: 이용약관 위반(사기적 사용 등)이 확인된 경우 환불이 거부될 수 있습니다.',
          '프로모션 가격: 환불 금액은 정가가 아닌 실제 결제 금액을 기준으로 산정됩니다.',
        ],
      },
      {
        heading: '환불 요청 방법',
        body: '환불을 요청하시려면 아래 방법 중 하나를 이용해 주세요:',
        list: [
          '계정에서 직접: 설정(Settings) → 결제(Billing) 메뉴에서 환불 요청을 제출합니다.',
          '이메일로: support@testably.app으로 계정 이메일, 결제 일자, 주문/거래 ID(있는 경우)를 포함하여 연락합니다.',
        ],
        note: '요청을 검토하여 영업일 기준 3일 이내 답변드립니다. 승인된 환불은 Paddle을 통해 처리되며, 결제 수단과 금융기관에 따라 3~10 영업일 내에 반영됩니다.',
      },
      {
        heading: '구독 취소',
        body: '구독 취소는 계정 설정에서 언제든 가능하며, 현재 결제 주기가 끝난 후 적용됩니다. 취소 이후에도 결제 주기 종료일까지 서비스를 계속 이용할 수 있습니다. 본 정책에 따라 환불 자격이 있는 경우 취소 시점에 환불을 요청할 수 있습니다.',
      },
      {
        heading: '결제 처리',
        body: '모든 결제는 Paddle.com Market Limited가 판매 대행자(Merchant of Record)로서 처리합니다. Paddle이 결제, 세금 징수, 청구서 발행을 담당합니다. 신용카드 명세서에는 Testably가 아닌 Paddle로 청구 내역이 표시됩니다.',
      },
      {
        heading: '차지백(결제 이의신청)',
        body: '은행이나 결제사에 차지백을 신청하기 전에 먼저 저희에게 연락해 주시기 바랍니다. 결제 분쟁을 신속하고 공정하게 해결하기 위해 최선을 다하겠습니다.',
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
                ? <>서비스 이용 조건에 대한 자세한 내용은 <Link to="/terms" className="text-indigo-600 font-semibold hover:underline">이용약관</Link>을 참조하세요.</>
                : <>For full terms and conditions, please see our <Link to="/terms" className="text-indigo-600 font-semibold hover:underline">Terms of Service</Link>.</>}
            </p>
          </div>
        </article>
      </main>
    </MarketingLayout>
  );
}
