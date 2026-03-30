import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface OnboardingState {
  isLoading: boolean;
  welcomeCompleted: boolean;
  checklistDismissed: boolean;
  sampleProjectCreated: boolean;
  steps: {
    createProject: boolean;
    createTestcase: boolean;
    tryAi: boolean;
    runTest: boolean;
    inviteMember: boolean;
    connectJira: boolean;
  };
  completedCount: number;
  isComplete: boolean;
  role: string | null;
  teamSize: string | null;
  createdAt: string;
}

export interface UseOnboardingReturn {
  state: OnboardingState;
  completeWelcome: (role: string, teamSize: string) => Promise<void>;
  markStep: (step: keyof OnboardingState['steps']) => Promise<void>;
  dismissChecklist: () => Promise<void>;
  setSampleProjectCreated: () => Promise<void>;
  refetch: () => Promise<void>;
}

const STEP_FIELD_MAP: Record<keyof OnboardingState['steps'], string> = {
  createProject: 'step_create_project',
  createTestcase: 'step_create_testcase',
  tryAi: 'step_try_ai',
  runTest: 'step_run_test',
  inviteMember: 'step_invite_member',
  connectJira: 'step_connect_jira',
};

const DEFAULT_STATE: OnboardingState = {
  isLoading: true,
  welcomeCompleted: false,
  checklistDismissed: false,
  sampleProjectCreated: false,
  steps: {
    createProject: false,
    createTestcase: false,
    tryAi: false,
    runTest: false,
    inviteMember: false,
    connectJira: false,
  },
  completedCount: 0,
  isComplete: false,
  role: null,
  teamSize: null,
  createdAt: '',
};

function computeState(row: Record<string, unknown>): OnboardingState {
  const steps = {
    createProject: Boolean(row.step_create_project),
    createTestcase: Boolean(row.step_create_testcase),
    tryAi: Boolean(row.step_try_ai),
    runTest: Boolean(row.step_run_test),
    inviteMember: Boolean(row.step_invite_member),
    connectJira: Boolean(row.step_connect_jira),
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  // Auto-complete if required 5 steps done, all 6 done, OR 14 days have passed
  const createdAt = (row.created_at as string) ?? '';
  const daysSinceSignup = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const requiredSteps = ['createProject', 'createTestcase', 'tryAi', 'runTest', 'inviteMember'] as const;
  const requiredComplete = requiredSteps.every(k => steps[k as keyof typeof steps]);
  const isComplete = requiredComplete || completedCount === 6 || daysSinceSignup >= 14;

  return {
    isLoading: false,
    welcomeCompleted: Boolean(row.welcome_completed),
    checklistDismissed: Boolean(row.checklist_dismissed),
    sampleProjectCreated: Boolean(row.sample_project_created),
    steps,
    completedCount,
    isComplete,
    role: (row.role as string) ?? null,
    teamSize: (row.team_size as string) ?? null,
    createdAt,
  };
}

export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  const fetchOnboarding = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ ...DEFAULT_STATE, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No onboarding record — existing user from before onboarding feature.
          // Insert a row so future markOnboardingStep upserts have a target.
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase
              .from('user_onboarding')
              .insert({ user_id: currentUser.id, welcome_completed: true });
          }
          setState({ ...DEFAULT_STATE, isLoading: false, welcomeCompleted: true });
        } else {
          throw error;
        }
        return;
      }

      setState(computeState(data as Record<string, unknown>));
    } catch (err) {
      console.error('[useOnboarding] fetch error:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  // Sync when any component calls markOnboardingStep (event-based, no Realtime dependency)
  useEffect(() => {
    const handler = () => { void fetchOnboarding(); };
    window.addEventListener('onboarding:step-marked', handler);
    return () => window.removeEventListener('onboarding:step-marked', handler);
  }, [fetchOnboarding]);

  // Realtime sync: re-fetch whenever user_onboarding row changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel('onboarding_realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_onboarding',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setState(computeState(payload.new as Record<string, unknown>));
          },
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const completeWelcome = useCallback(async (role: string, teamSize: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding')
      .update({ role, team_size: teamSize, welcome_completed: true })
      .eq('user_id', user.id);

    if (error) throw error;
    setState((prev) => ({ ...prev, welcomeCompleted: true, role, teamSize }));
  }, []);

  const markStep = useCallback(async (step: keyof OnboardingState['steps']) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const field = STEP_FIELD_MAP[step];
    const newSteps = { ...state.steps, [step]: true };
    const newCount = Object.values(newSteps).filter(Boolean).length;
    const allDone = newCount === 6;

    const update: Record<string, unknown> = { [field]: true };
    if (allDone) update.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('user_onboarding')
      .update(update)
      .eq('user_id', user.id);

    if (error) throw error;

    setState((prev) => ({
      ...prev,
      steps: newSteps,
      completedCount: newCount,
      isComplete: allDone || prev.isComplete,
    }));
  }, [state.steps]);

  const dismissChecklist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding')
      .update({ checklist_dismissed: true })
      .eq('user_id', user.id);

    if (error) throw error;
    setState((prev) => ({ ...prev, checklistDismissed: true }));
  }, []);

  const setSampleProjectCreated = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding')
      .update({ sample_project_created: true, step_create_project: true })
      .eq('user_id', user.id);

    if (error) throw error;
    setState((prev) => ({
      ...prev,
      sampleProjectCreated: true,
      steps: { ...prev.steps, createProject: true },
      completedCount: prev.steps.createProject ? prev.completedCount : prev.completedCount + 1,
    }));
  }, []);

  return {
    state,
    completeWelcome,
    markStep,
    dismissChecklist,
    setSampleProjectCreated,
    refetch: fetchOnboarding,
  };
}

export default useOnboarding;
