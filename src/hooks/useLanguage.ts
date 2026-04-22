import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEY = 'app_language';

/** i18n.language 가 'en-US' 같은 지역 포함 값일 때 'en' | 'ko' 로 정규화. */
function normalize(raw: string | undefined | null): 'en' | 'ko' {
  if (!raw) return 'en';
  if (raw === 'ko' || raw.startsWith('ko')) return 'ko';
  return 'en';
}

export const useLanguage = () => {
  const { i18n } = useTranslation();
  // i18n.language 를 React state 로 mirror — changeLanguage 발생 시 모든 useLanguage
  // 사용자가 동일하게 re-render 된다. (이전 버전은 매번 i18n.language 를 직접 읽기만 해서
  // Settings 의 useState initializer 가 stale 값을 잡는 버그가 있었음.)
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ko'>(() =>
    normalize(i18n.language),
  );

  useEffect(() => {
    const handler = (lng: string) => setCurrentLanguage(normalize(lng));
    i18n.on('languageChanged', handler);
    // 구독 시점과 현재 값이 drift 되어있을 수 있으므로 한 번 동기화.
    handler(i18n.language);
    return () => { i18n.off('languageChanged', handler); };
  }, [i18n]);

  const changeLanguage = useCallback((lang: 'ko' | 'en') => {
    i18n.changeLanguage(lang);
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch { /* ignore */ }
  }, [i18n]);

  return { currentLanguage, changeLanguage };
};

export default useLanguage;
