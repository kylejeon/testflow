import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoMark } from '../Logo';

interface WelcomeScreenProps {
  userId?: string | null;
  onComplete: (role: string, teamSize: string, useSample: boolean) => Promise<void>;
  onSkip: (persist: boolean) => void;
}

type Role = 'qa_engineer' | 'developer' | 'product_manager' | 'other';
type TeamSize = '1' | '2-5' | '6-10' | '10+';
type WorkspaceChoice = 'fresh' | 'sample';

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userId, onComplete, onSkip }) => {
  const { t } = useTranslation('onboarding');

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceChoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: Role[] = ['qa_engineer', 'developer', 'product_manager', 'other'];
  const teamSizes: TeamSize[] = ['1', '2-5', '6-10', '10+'];

  const step1Valid = role !== null && teamSize !== null;
  const step2Valid = workspace !== null;

  const handleNext = () => {
    if (step1Valid) setStep(2);
  };

  const handleSubmit = async () => {
    if (!step2Valid || !role || !teamSize) return;
    setLoading(true);
    setError(null);
    try {
      await onComplete(role, teamSize, workspace === 'sample');
    } catch {
      setError(t('welcome.errorMessage'));
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Persist skip to localStorage so modal doesn't re-appear on refresh
    onSkip(true);
  };

  return (
    // Centered card — no dark overlay, non-blocking
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pointer-events-none">
      <div
        className="pointer-events-auto relative bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-y-auto max-h-[80vh] border border-gray-100"
        style={{ maxWidth: 480 }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        <div style={{ padding: '36px 40px 32px' }}>
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1.5">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'bg-indigo-500 w-5'
                      : s < step
                      ? 'bg-indigo-300'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
              <span className="text-xs text-gray-400 ml-1">Step {step} of 2</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Logo */}
          <div className="w-full flex items-center justify-center mb-5">
            <LogoMark />
          </div>

          {/* Step 1: Role + Team Size */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-center mb-1" style={{ color: '#1A3A4A' }}>
                {t('welcome.greeting')}
              </h1>
              <p className="text-sm text-center text-gray-500 mb-5">
                {t('welcome.subtitle')}
              </p>

              <div className="border-t border-gray-100 mb-5" />

              {/* Role */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-2.5">{t('welcome.roleLabel')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                        role === r
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t(`welcome.roles.${r}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Size */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2.5">{t('welcome.teamSizeLabel')}</p>
                <div className="flex gap-2 flex-wrap">
                  {teamSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTeamSize(s)}
                      className={`py-2 px-4 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                        teamSize === s
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t(`welcome.teamSizes.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!step1Valid}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  step1Valid
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            </>
          )}

          {/* Step 2: Workspace Choice */}
          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-center mb-1" style={{ color: '#1A3A4A' }}>
                How would you like to start?
              </h1>
              <p className="text-sm text-center text-gray-500 mb-5">
                {t('welcome.workspaceLabel')}
              </p>

              <div className="border-t border-gray-100 mb-5" />

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setWorkspace('fresh')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    workspace === 'fresh'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <i className={`ri-rocket-line text-3xl ${workspace === 'fresh' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${workspace === 'fresh' ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {t('welcome.startFresh.label')}
                  </span>
                  <span className="text-xs text-gray-400 text-center leading-tight">
                    {t('welcome.startFresh.description')}
                  </span>
                </button>

                <button
                  onClick={() => setWorkspace('sample')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    workspace === 'sample'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <i className={`ri-box-line text-3xl ${workspace === 'sample' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${workspace === 'sample' ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {t('welcome.trySample.label')}
                  </span>
                  <span className="text-xs text-gray-400 text-center leading-tight">
                    {t('welcome.trySample.description')}
                  </span>
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center mb-4">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!step2Valid || loading}
                  className={`flex-[2] py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    step2Valid && !loading
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base" />
                      {t('welcome.loading')}
                    </>
                  ) : (
                    t('welcome.cta')
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
