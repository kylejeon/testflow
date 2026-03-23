import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, Package, Loader2, X } from 'lucide-react';
import { LogoMark } from '../Logo';

interface WelcomeScreenProps {
  onComplete: (role: string, teamSize: string, useSample: boolean) => Promise<void>;
  onSkip: () => Promise<void>;
}

type Role = 'qa_engineer' | 'developer' | 'product_manager' | 'other';
type TeamSize = '1' | '2-5' | '6-10' | '10+';
type WorkspaceChoice = 'fresh' | 'sample';

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete, onSkip }) => {
  const { t } = useTranslation('onboarding');

  const [role, setRole] = useState<Role | null>(null);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceChoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: Role[] = ['qa_engineer', 'developer', 'product_manager', 'other'];
  const teamSizes: TeamSize[] = ['1', '2-5', '6-10', '10+'];

  const isValid = role !== null && teamSize !== null && workspace !== null;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await onComplete(role!, teamSize!, workspace === 'sample');
    } catch {
      setError(t('welcome.errorMessage'));
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-y-auto max-h-[90vh]"
        style={{ maxWidth: 520, padding: '48px' }}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="w-full flex items-center justify-center mb-6">
          <LogoMark />
        </div>

        {/* Greeting */}
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: '#1A3A4A' }}>
          {t('welcome.greeting')}
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          {t('welcome.subtitle')}
        </p>

        <div className="border-t border-gray-200 mb-6" />

        {/* Role */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('welcome.roleLabel')}</p>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
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
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('welcome.teamSizeLabel')}</p>
          <div className="flex gap-2 flex-wrap">
            {teamSizes.map((s) => (
              <button
                key={s}
                onClick={() => setTeamSize(s)}
                className={`py-2 px-4 rounded-full border text-sm font-medium transition-all ${
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

        {/* Workspace Choice */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('welcome.workspaceLabel')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWorkspace('fresh')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                workspace === 'fresh'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Rocket
                className={`w-8 h-8 ${workspace === 'fresh' ? 'text-indigo-600' : 'text-gray-400'}`}
              />
              <span className={`text-sm font-semibold ${workspace === 'fresh' ? 'text-indigo-700' : 'text-gray-700'}`}>
                {t('welcome.startFresh.label')}
              </span>
              <span className="text-xs text-gray-400 text-center leading-tight">
                {t('welcome.startFresh.description')}
              </span>
            </button>

            <button
              onClick={() => setWorkspace('sample')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                workspace === 'sample'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Package
                className={`w-8 h-8 ${workspace === 'sample' ? 'text-indigo-600' : 'text-gray-400'}`}
              />
              <span className={`text-sm font-semibold ${workspace === 'sample' ? 'text-indigo-700' : 'text-gray-700'}`}>
                {t('welcome.trySample.label')}
              </span>
              <span className="text-xs text-gray-400 text-center leading-tight">
                {t('welcome.trySample.description')}
              </span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 text-center mb-4">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            isValid && !loading
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('welcome.loading')}
            </>
          ) : (
            t('welcome.cta')
          )}
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
