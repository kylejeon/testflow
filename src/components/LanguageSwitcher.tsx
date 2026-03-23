import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, changeLanguage } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (lang: 'ko' | 'en') => {
    changeLanguage(lang);
    setIsOpen(false);
  };

  const getCurrentFlag = () => {
    return currentLanguage === 'ko' ? '🇰🇷' : '🇬🇧';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xl hover:border-indigo-500 transition-all cursor-pointer"
        title="Change Language"
      >
        {getCurrentFlag()}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
          <button
            onClick={() => handleLanguageChange('ko')}
            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors ${
              currentLanguage === 'ko' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🇰🇷</span>
              <span className="font-medium">한국어</span>
            </div>
            {currentLanguage === 'ko' && (
              <i className="ri-check-line text-indigo-600 text-lg"></i>
            )}
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors ${
              currentLanguage === 'en' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🇬🇧</span>
              <span className="font-medium">English</span>
            </div>
            {currentLanguage === 'en' && (
              <i className="ri-check-line text-indigo-600 text-lg"></i>
            )}
          </button>
        </div>
      )}
    </div>
  );
}