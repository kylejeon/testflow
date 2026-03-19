import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

/**
 * Supabase 인증 콜백(비밀번호 재설정, OAuth 등)이 루트 URL로 오는 경우를
 * 어느 페이지에서든 감지해서 /auth 로 리다이렉트한다.
 */
function RecoveryHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const error = params.get('error');

    const isOnAuth = window.location.pathname.endsWith('/auth');
    if (isOnAuth) return; // 이미 /auth에 있으면 패스

    // 비밀번호 재설정 성공 콜백
    if (type === 'recovery' && accessToken) {
      window.location.replace('/auth' + hash);
      return;
    }

    // 에러 콜백 (만료, 잘못된 링크 등)
    if (error) {
      window.location.replace('/auth' + hash);
    }
  }, []);

  return null;
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <RecoveryHandler />
        <AppRoutes />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
