import { supabase } from './supabase';
import { POLICY_VERSIONS } from './policyVersion';

interface SignupConsentParams {
  email: string;
  userId: string;
  consents: {
    // 필수
    tos: boolean;
    privacy: boolean;
    dataProcessing: boolean;
    age14: boolean;
    // 선택
    marketingEmail: boolean;
    analytics: boolean;
    sms: boolean;
  };
}

export async function logSignupConsent({ email, userId, consents }: SignupConsentParams): Promise<void> {
  try {
    await supabase.functions.invoke('log-consent', {
      body: {
        email,
        user_id: userId,
        consent_type: 'signup',
        policy_version: POLICY_VERSIONS.tos,
        consents,
        source: 'web',
      },
    });
  } catch (err) {
    // 동의 로그 실패가 회원가입 흐름을 막으면 안 됨
    console.error('[consentLog] logSignupConsent failed:', err);
  }
}

interface CookieConsentParams {
  userId?: string | null;
  consents: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

export async function logCookieConsent({ userId, consents }: CookieConsentParams): Promise<void> {
  try {
    await supabase.functions.invoke('log-consent', {
      body: {
        email: '',
        user_id: userId ?? null,
        consent_type: 'cookie',
        policy_version: POLICY_VERSIONS.cookie,
        consents,
        source: 'web',
      },
    });
  } catch (err) {
    console.error('[consentLog] logCookieConsent failed:', err);
  }
}
