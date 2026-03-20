import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEY = 'app_language';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'ko' || savedLanguage === 'en')) {
      i18n.changeLanguage(savedLanguage);
    } else {
      // Default to English
      i18n.changeLanguage('en');
      localStorage.setItem(LANGUAGE_KEY, 'en');
    }
  }, [i18n]);

  const changeLanguage = (lang: 'ko' | 'en') => {
    i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  return {
    currentLanguage: i18n.language as 'ko' | 'en',
    changeLanguage,
  };
};

export default useLanguage;
