import { supabase } from './supabase';

const STEP_FIELD_MAP = {
  createProject: 'step_create_project',
  createTestcase: 'step_create_testcase',
  tryAi: 'step_try_ai',
  runTest: 'step_run_test',
  inviteMember: 'step_invite_member',
  connectJira: 'step_connect_jira',
} as const;

export type OnboardingStepKey = keyof typeof STEP_FIELD_MAP;

export async function markOnboardingStep(step: OnboardingStepKey): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const field = STEP_FIELD_MAP[step];
    await supabase
      .from('user_onboarding')
      .update({ [field]: true })
      .eq('user_id', user.id);
  } catch {
    // silent — onboarding failure must never block core functionality
  }
}
