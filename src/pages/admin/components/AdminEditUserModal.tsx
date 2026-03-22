import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { sendLoopsEvent, tierToPlanName } from '../../../lib/loops';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: number | null;
  is_trial: boolean | null;
  is_superadmin: boolean | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

interface AdminEditUserModalProps {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}

const TIER_OPTIONS = [
  { value: 1, label: 'Free', description: '무료 플랜', color: 'border-gray-300 bg-gray-50', activeColor: 'border-gray-500 bg-gray-100', dot: 'bg-gray-400' },
  { value: 2, label: 'Starter', description: '$49/월', color: 'border-yellow-200 bg-yellow-50', activeColor: 'border-yellow-500 bg-yellow-50', dot: 'bg-yellow-400' },
  { value: 3, label: 'Professional', description: '$99/월', color: 'border-teal-200 bg-teal-50', activeColor: 'border-teal-500 bg-teal-50', dot: 'bg-teal-500' },
  { value: 4, label: 'Enterprise', description: '$249/월', color: 'border-amber-200 bg-amber-50', activeColor: 'border-amber-500 bg-amber-50', dot: 'bg-amber-500' },
];

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

export default function AdminEditUserModal({ user, onClose, onSaved }: AdminEditUserModalProps) {
  const [tier, setTier] = useState<number>(user.subscription_tier || 1);
  const [isTrial, setIsTrial] = useState<boolean>(user.is_trial || false);
  const [trialEndsAt, setTrialEndsAt] = useState<string>(toDateInputValue(user.trial_ends_at));
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string>(toDateInputValue(user.subscription_ends_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updates: Record<string, any> = {
        subscription_tier: tier,
        is_trial: isTrial,
      };

      if (isTrial) {
        updates.trial_ends_at = trialEndsAt ? new Date(trialEndsAt).toISOString() : null;
        updates.subscription_ends_at = subscriptionEndsAt
          ? new Date(subscriptionEndsAt).toISOString()
          : null;
      } else {
        updates.trial_ends_at = trialEndsAt ? new Date(trialEndsAt).toISOString() : null;
        if (tier > 1) {
          updates.subscription_ends_at = subscriptionEndsAt
            ? new Date(subscriptionEndsAt).toISOString()
            : null;
        } else {
          updates.subscription_ends_at = null;
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      if (tier !== user.subscription_tier && tier > (user.subscription_tier || 1)) {
        sendLoopsEvent(user.email, 'plan_upgraded', {
          plan: tierToPlanName(tier),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  const selectedTierOption = TIER_OPTIONS.find((t) => t.value === tier)!;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user.full_name || '(이름 없음)'}</p>
              <p className="text-slate-400 text-xs">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              <i className="ri-vip-crown-line mr-1.5 text-amber-500"></i>
              구독 플랜
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIER_OPTIONS.map((option) => {
                const isActive = tier === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTier(option.value)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isActive ? option.activeColor + ' border-opacity-100' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${option.dot}`}></div>
                    <span className={`text-sm font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-400">{option.description}</span>
                    {isActive && (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-sm"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trial Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="ri-time-line text-teal-600"></i>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">무료 체험 (Trial)</p>
                <p className="text-xs text-gray-400">활성화 시 트라이얼 상태로 설정</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTrial(!isTrial)}
              className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ml-4 focus:outline-none ${
                isTrial ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  isTrial ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>

          {/* Date Fields */}
          <div className="space-y-4">
            {/* Trial End Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <i className="ri-calendar-2-line mr-1"></i>
                트라이얼 만료일
              </label>
              <input
                type="date"
                value={trialEndsAt}
                onChange={(e) => setTrialEndsAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white cursor-pointer"
              />
              {trialEndsAt && (
                <button
                  onClick={() => setTrialEndsAt('')}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-circle-line mr-0.5"></i>날짜 제거
                </button>
              )}
            </div>

            {/* Subscription End Date */}
            <div className={tier === 1 && !isTrial ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <i className="ri-calendar-check-line mr-1"></i>
                구독 만료일
                {tier === 1 && !isTrial && (
                  <span className="ml-2 normal-case font-normal text-gray-400">(Free 플랜 해당 없음)</span>
                )}
              </label>
              <input
                type="date"
                value={subscriptionEndsAt}
                onChange={(e) => setSubscriptionEndsAt(e.target.value)}
                disabled={tier === 1 && !isTrial}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white cursor-pointer disabled:bg-gray-50"
              />
              {subscriptionEndsAt && tier > 1 && (
                <button
                  onClick={() => setSubscriptionEndsAt('')}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-circle-line mr-0.5"></i>날짜 제거
                </button>
              )}
            </div>
          </div>

          {/* Summary Badge */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <i className="ri-information-line text-slate-400"></i>
            <p className="text-xs text-slate-600">
              저장 후 플랜이&nbsp;
              <span className="font-bold text-slate-900">{selectedTierOption.label}</span>
              {isTrial && <span className="text-teal-600 font-semibold"> (Trial 활성)</span>}
              &nbsp;으로 즉시 변경됩니다.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <i className="ri-error-warning-line text-red-500"></i>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || success}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-sm font-bold text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {success ? (
                <>
                  <i className="ri-check-line"></i>
                  저장 완료!
                </>
              ) : saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  저장 중...
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  변경사항 저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
