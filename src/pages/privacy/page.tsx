import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
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
            <i className="ri-shield-check-line text-teal-600 text-sm"></i>
            <span className="text-teal-700 text-sm font-medium">법적 고지</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">개인정보처리방침</h1>
          <p className="text-gray-500 text-sm">최종 수정일: 2025년 1월 1일</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              총칙
            </h2>
            <p>
              Testably(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수합니다.
              본 개인정보처리방침은 회사가 제공하는 Testably 서비스(이하 "서비스") 이용 과정에서 수집되는 개인정보의 처리 목적, 항목, 보유 기간 및 이용자의 권리에 대해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              수집하는 개인정보 항목 및 수집 방법
            </h2>
            <p className="mb-3">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
              <div>
                <p className="font-semibold text-gray-800 mb-1">① 회원가입 시</p>
                <p className="text-gray-600">이메일 주소, 비밀번호(암호화 저장), 이름(닉네임)</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">② 소셜 로그인(Google) 시</p>
                <p className="text-gray-600">이메일 주소, 프로필 이름, 프로필 사진 URL</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">③ 서비스 이용 과정에서 자동 수집</p>
                <p className="text-gray-600">IP 주소, 접속 일시, 서비스 이용 기록, 브라우저 종류 및 OS 정보, 쿠키</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">④ 유료 서비스 결제 시</p>
                <p className="text-gray-600">결제 수단 정보(카드 번호 등은 PG사에서 처리하며 회사는 저장하지 않음), 청구지 정보</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              개인정보의 처리 목적
            </h2>
            <ul className="space-y-2 list-none">
              {[
                '회원 가입 및 본인 확인, 서비스 제공',
                '서비스 이용 내역 관리 및 고객 지원',
                '유료 서비스 결제 처리 및 요금 청구',
                '서비스 개선 및 신규 기능 개발을 위한 통계 분석',
                '공지사항 전달, 이벤트 및 마케팅 정보 제공(수신 동의 시)',
                '부정 이용 방지 및 보안 강화',
                '법령 및 이용약관 위반 행위 조사',
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
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              개인정보의 보유 및 이용 기간
            </h2>
            <p className="mb-3">회사는 이용자의 개인정보를 원칙적으로 회원 탈퇴 시까지 보유합니다. 단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">계약 또는 청약철회 등에 관한 기록</span>
                <span className="font-semibold text-gray-800">5년</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">대금결제 및 재화 등의 공급에 관한 기록</span>
                <span className="font-semibold text-gray-800">5년</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">소비자 불만 또는 분쟁처리에 관한 기록</span>
                <span className="font-semibold text-gray-800">3년</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-600">접속에 관한 기록</span>
                <span className="font-semibold text-gray-800">3개월</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              개인정보의 제3자 제공
            </h2>
            <p>
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우에는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
              개인정보 처리 위탁
            </h2>
            <p className="mb-3">회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between font-semibold text-gray-800 pb-2 border-b border-gray-200">
                <span>수탁업체</span>
                <span>위탁 업무</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supabase Inc.</span>
                <span className="text-gray-800">데이터베이스 및 인증 서비스</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-600">Google LLC</span>
                <span className="text-gray-800">소셜 로그인, 이메일 발송</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">7</span>
              이용자의 권리와 행사 방법
            </h2>
            <p className="mb-3">이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="space-y-2">
              {[
                '개인정보 열람 요청',
                '개인정보 정정·삭제 요청',
                '개인정보 처리 정지 요청',
                '개인정보 이동 요청',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="ri-check-line text-teal-500 mt-0.5 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">권리 행사는 서비스 내 설정 페이지 또는 아래 개인정보 보호책임자에게 이메일로 요청하실 수 있으며, 회사는 지체 없이 조치하겠습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">8</span>
              쿠키(Cookie) 운영
            </h2>
            <p>
              회사는 서비스 이용 편의를 위해 쿠키를 사용합니다. 쿠키는 웹사이트 운영에 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며, 이용자의 PC 컴퓨터 내 하드디스크에 저장됩니다.
              이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 불편이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">9</span>
              개인정보의 안전성 확보 조치
            </h2>
            <ul className="space-y-2">
              {[
                '비밀번호 암호화(bcrypt) 저장',
                '개인정보 접근 권한 최소화 및 관리',
                'SSL/TLS를 통한 데이터 전송 암호화',
                '정기적인 보안 취약점 점검',
                '개인정보 처리 직원 대상 보안 교육',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="ri-shield-check-line text-teal-500 mt-0.5 flex-shrink-0"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">10</span>
              개인정보 보호책임자
            </h2>
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
              <p className="text-gray-700 mb-2">개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등에 관한 사항은 아래 담당자에게 연락해 주시기 바랍니다.</p>
              <div className="space-y-1 text-sm mt-3">
                <p><span className="font-semibold text-gray-800">담당자:</span> <span className="text-gray-600">개인정보 보호팀</span></p>
                <p><span className="font-semibold text-gray-800">이메일:</span> <span className="text-gray-600">privacy@testably.app</span></p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">11</span>
              개인정보처리방침 변경
            </h2>
            <p>
              본 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있습니다. 변경 시에는 서비스 내 공지사항을 통해 사전에 안내드리겠습니다.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 mt-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-xs">© 2025 Testably. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-900 transition-colors cursor-pointer font-semibold text-teal-600">개인정보처리방침</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-900 transition-colors cursor-pointer">이용약관</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
