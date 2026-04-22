import { invokeEdge } from './aiFetch';
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
  // 회원가입 직후엔 세션이 있을 수도/없을 수도 있음 — allowAnonymous.
  const { error } = await invokeEdge('log-consent', {
    allowAnonymous: true,
    body: {
      email,
      user_id: userId,
      consent_type: 'signup',
      policy_version: POLICY_VERSIONS.tos,
      consents,
      source: 'web',
    },
  });
  if (error) {
    console.error('[consentLog] logSignupConsent failed:', error);
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
  // 쿠키 동의는 비로그인 상태에서도 호출됨.
  const { error } = await invokeEdge('log-consent', {
    allowAnonymous: true,
    body: {
      email: '',
      user_id: userId ?? null,
      consent_type: 'cookie',
      policy_version: POLICY_VERSIONS.cookie,
      consents,
      source: 'web',
    },
  });
  if (error) {
    console.error('[consentLog] logCookieConsent failed:', error);
  }
}
