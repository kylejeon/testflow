import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logCookieConsent } from '../lib/consentLog';

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

  const accept = async (fn: boolean, an: boolean, mk: boolean) => {
    saveConsent({ functional: fn, analytics: an, marketing: mk });
    setVisible(false);
    const { data: { session } } = await supabase.auth.getSession();
    logCookieConsent({
      userId: session?.user?.id ?? null,
      consents: { essential: true, functional: fn, analytics: an, marketing: mk },
    });
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
                  We use cookies to improve your experience.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Strictly necessary cookies are required for login and security. Optional cookies help us
                  analyze usage and improve our service.{' '}
                  <Link to="/cookies" className="text-indigo-600 hover:underline">
                    Learn more →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => accept(true, true, true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Accept all
              </button>
              <button
                onClick={() => accept(false, false, false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Essential only
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Customize
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Cookie preferences</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span className="text-xs ml-1">Back</span>
              </button>
            </div>

            <div className="space-y-1 divide-y divide-gray-100 mb-4">
              {/* Strictly necessary — always on */}
              <label className="flex items-center justify-between py-2 opacity-60">
                <div>
                  <span className="text-sm font-medium text-gray-700">Strictly necessary</span>
                  <p className="text-xs text-gray-400">Login sessions, security &amp; CSRF protection (always on)</p>
                </div>
                <span className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full bg-indigo-600">
                  <span className="inline-block h-3.5 w-3.5 translate-x-4 rounded-full bg-white shadow" />
                </span>
              </label>

              <div className="pt-1">
                {toggleRow(
                  'Functional — language, theme & workspace preferences',
                  functional,
                  setFunctional,
                )}
                {toggleRow(
                  'Analytics — usage patterns & product improvements',
                  analytics,
                  setAnalytics,
                )}
                {toggleRow(
                  'Marketing — ad performance & retargeting',
                  marketing,
                  setMarketing,
                )}
              </div>
            </div>

            <button
              onClick={() => accept(functional, analytics, marketing)}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Save preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
