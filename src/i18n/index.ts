import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from './local';

const LANGUAGE_KEY = 'app_language';

// 초기 언어를 localStorage 에서 동기적으로 읽어서 init 에 전달.
// useLanguage 훅의 useEffect 로 바꾸면 최초 렌더 사이클에서 영어→한국어 flash 가
// 발생하고, Settings 의 `useState(currentLanguage || 'en')` 같이 initializer 로만
// 값을 잡는 곳에서 'en' 에 stuck 되는 버그가 생긴다.
function getInitialLanguage(): 'en' | 'ko' {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_KEY) : null;
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // SSR / private mode — 기본값으로 폴백
  }
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
