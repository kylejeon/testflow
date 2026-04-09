import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'testably_cookie_consent';

interface CookieConsent {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
}

function loadConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(c: Omit<CookieConsent, 'savedAt'>) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...c, savedAt: new Date().toISOString() }));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!loadConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = (fn: boolean, an: boolean, mk: boolean) => {
    saveConsent({ functional: fn, analytics: an, marketing: mk });
    setVisible(false);
  };

  const toggleRow = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <span className="text-sm text-gray-700">{label}</span>
      <span
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </span>
    </label>
  );

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] px-4 pb-4 sm:pb-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {!showSettings ? (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <i className="ri-cookie-line text-indigo-500 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Testably는 더 나은 서비스를 위해 쿠키를 사용합니다.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  필수 쿠키는 로그인 유지 및 보안을 위해 반드시 필요하며, 분석·마케팅 쿠키는 선택 사항입니다.
                  선택 쿠키에 동의하시면 서비스 이용 분석과 기능 개선에 활용됩니다.{' '}
                  <Link to="/cookies" className="text-indigo-600 hover:underline">
                    자세히 보기 →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => accept(true, true, true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                모두 허용
              </button>
              <button
                onClick={() => accept(false, false, false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                필수만 허용
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                설정
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">쿠키 설정</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span className="text-xs ml-1">뒤로</span>
              </button>
            </div>

            <div className="space-y-1 divide-y divide-gray-100 mb-4">
              {/* 필수 — 비활성화 */}
              <label className="flex items-center justify-between py-2 opacity-60">
                <div>
                  <span className="text-sm font-medium text-gray-700">필수 쿠키</span>
                  <p className="text-xs text-gray-400">로그인 세션 유지, 보안, CSRF 방어 (비활성화 불가)</p>
                </div>
                <span className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full bg-indigo-600">
                  <span className="inline-block h-3.5 w-3.5 translate-x-4 rounded-full bg-white shadow" />
                </span>
              </label>

              <div className="pt-1">
                {toggleRow(
                  '기능 쿠키 — 언어·테마·작업공간 등 사용자 환경 저장',
                  functional,
                  setFunctional,
                )}
                {toggleRow(
                  '분석 쿠키 — 서비스 이용 패턴 분석·기능 개선',
                  analytics,
                  setAnalytics,
                )}
                {toggleRow(
                  '마케팅 쿠키 — 광고 성과 측정·리타게팅',
                  marketing,
                  setMarketing,
                )}
              </div>
            </div>

            <button
              onClick={() => accept(functional, analytics, marketing)}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              선택 저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
