import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <i className="ri-test-tube-line text-white text-base"></i>
            </div>
            <span className="text-lg font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>
              Testably
            </span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line"></i>
            홈으로 돌아가기
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
            <i className="ri-file-text-line text-teal-600 text-sm"></i>
            <span className="text-teal-700 text-sm font-medium">법적 고지</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">이용약관</h1>
          <p className="text-gray-500 text-sm">최종 수정일: 2025년 1월 1일</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              목적
            </h2>
            <p>
              본 약관은 Testably(이하 "회사")가 제공하는 테스트 관리 플랫폼 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              용어의 정의
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
              {[
                { term: '서비스', def: '회사가 제공하는 Testably 테스트 관리 플랫폼 및 관련 부가 서비스 일체를 의미합니다.' },
                { term: '이용자', def: '본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 의미합니다.' },
                { term: '회원', def: '회사에 개인정보를 제공하여 회원 등록을 한 자로, 서비스를 지속적으로 이용할 수 있는 자를 의미합니다.' },
                { term: '콘텐츠', def: '이용자가 서비스 내에서 작성·등록한 테스트 케이스, 문서, 세션 기록 등 모든 데이터를 의미합니다.' },
              ].map(({ term, def }) => (
                <div key={term} className="flex gap-3">
                  <span className="font-semibold text-gray-800 whitespace-nowrap">"{term}"</span>
                  <span className="text-gray-600">{def}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              약관의 효력 및 변경
            </h2>
            <p className="mb-3">
              본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
              회사는 합리적인 사유가 있는 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있으며,
              변경된 약관은 적용일 7일 전부터 서비스 내 공지사항을 통해 공지합니다.
            </p>
            <p>
              이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.
              변경 공지 후 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              회원가입 및 계정 관리
            </h2>
            <ul className="space-y-2">
              {[
                '이용자는 회사가 정한 가입 양식에 따라 정보를 기입하고 본 약관에 동의함으로써 회원가입을 신청합니다.',
                '회사는 가입 신청자에게 서비스 이용을 승낙함을 원칙으로 하나, 타인의 정보를 도용하거나 허위 정보를 기재한 경우 승낙을 거부할 수 있습니다.',
                '회원은 등록된 정보에 변경이 있는 경우 즉시 수정해야 하며, 미수정으로 인한 불이익은 회원이 부담합니다.',
                '계정 및 비밀번호의 관리 책임은 회원에게 있으며, 제3자에게 양도하거나 대여할 수 없습니다.',
                '계정 도용 또는 무단 사용을 인지한 경우 즉시 회사에 통보해야 합니다.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="ri-check-line text-teal-500 mt-0.5 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              서비스 이용
            </h2>
            <p className="mb-3">
              서비스는 연중무휴 24시간 제공을 원칙으로 합니다. 단, 시스템 점검, 증설 및 교체, 설비 장애, 서비스 이용 폭주 등 운영상 상당한 이유가 있는 경우 서비스 제공이 일시 중단될 수 있습니다.
            </p>
            <p>
              회사는 서비스 중단 시 사전에 공지하며, 불가피한 사유로 사전 공지가 어려운 경우 사후에 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
              유료 서비스 및 결제
            </h2>
            <div className="space-y-3">
              <p>
                회사는 Starter, Professional, Enterprise 등 유료 요금제를 제공합니다. 유료 서비스 이용을 위해서는 해당 요금제를 선택하고 결제를 완료해야 합니다.
              </p>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2">
                <p className="font-semibold text-gray-800 mb-2">환불 정책</p>
                <ul className="space-y-1.5">
                  {[
                    '14일 무료 체험 기간 중 취소 시 요금이 청구되지 않습니다.',
                    '유료 결제 후 7일 이내 미사용 시 전액 환불이 가능합니다.',
                    '7일 초과 후에는 잔여 기간에 대한 환불이 제공되지 않습니다.',
                    'Enterprise 플랜의 환불은 별도 계약 조건에 따릅니다.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-600">
                      <i className="ri-information-line text-teal-500 mt-0.5 flex-shrink-0"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">7</span>
              이용자의 의무
            </h2>
            <p className="mb-3">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="space-y-2">
              {[
                '타인의 정보 도용 또는 허위 정보 등록',
                '회사 또는 제3자의 지식재산권 침해',
                '서비스의 정상적인 운영을 방해하는 행위',
                '악성 코드, 바이러스 등 유해 프로그램 배포',
                '관련 법령 또는 본 약관에서 금지하는 행위',
                '타인의 개인정보 무단 수집·이용',
                '상업적 목적의 무단 광고 또는 스팸 발송',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="ri-close-circle-line text-red-400 mt-0.5 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">8</span>
              콘텐츠 및 지식재산권
            </h2>
            <p className="mb-3">
              이용자가 서비스 내에 등록한 콘텐츠에 대한 저작권은 해당 이용자에게 귀속됩니다.
              단, 이용자는 회사가 서비스 운영, 개선, 홍보 등의 목적으로 해당 콘텐츠를 사용할 수 있도록 비독점적 라이선스를 회사에 부여합니다.
            </p>
            <p>
              서비스 자체(로고, UI, 소프트웨어 등)에 대한 지식재산권은 회사에 귀속되며, 이용자는 회사의 사전 서면 동의 없이 이를 복제, 배포, 수정할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">9</span>
              서비스 이용 제한 및 계약 해지
            </h2>
            <p className="mb-3">
              회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고·일시 정지·영구 이용 정지 등의 조치를 취할 수 있습니다.
            </p>
            <p>
              회원은 언제든지 서비스 내 설정 페이지에서 회원 탈퇴를 신청할 수 있으며, 탈퇴 즉시 개인정보 및 콘텐츠는 관련 법령에 따라 처리됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">10</span>
              면책 조항
            </h2>
            <ul className="space-y-2">
              {[
                '천재지변, 전쟁, 테러 등 불가항력적 사유로 인한 서비스 중단',
                '이용자의 귀책 사유로 인한 서비스 이용 장애',
                '이용자가 서비스를 통해 기대하는 수익을 얻지 못한 경우',
                '제3자가 서비스를 통해 게재한 정보의 정확성 및 신뢰성',
                '이용자 간 또는 이용자와 제3자 간의 분쟁',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="ri-error-warning-line text-amber-500 mt-0.5 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">11</span>
              준거법 및 분쟁 해결
            </h2>
            <p>
              본 약관은 대한민국 법률에 따라 해석되고 적용됩니다. 서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 양 당사자는 성실히 협의하여 해결하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">12</span>
              문의
            </h2>
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
              <p className="text-gray-700 mb-3">본 약관에 관한 문의 사항은 아래로 연락해 주시기 바랍니다.</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold text-gray-800">이메일:</span> <span className="text-gray-600">support@testably.app</span></p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 mt-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-xs">© 2025 Testably. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-900 transition-colors cursor-pointer">개인정보처리방침</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-900 transition-colors cursor-pointer font-semibold text-teal-600">이용약관</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
