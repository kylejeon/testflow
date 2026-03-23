import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { supabase } from "./lib/supabase";
import { useOnboarding } from "./hooks/useOnboarding";
import { useSampleProject } from "./hooks/useSampleProject";
import WelcomeScreen from "./components/onboarding/WelcomeScreen";
import OnboardingChecklist from "./components/onboarding/OnboardingChecklist";

/**
 * Supabase 인증 콜백(비밀번호 재설정, OAuth 등)이 루트 URL로 오는 경우를
 * 어느 페이지에서든 감지해서 /auth 로 리다이렉트한다.
 */
function RecoveryHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const error = params.get('error');

    const isOnAuth = window.location.pathname.endsWith('/auth');
    if (isOnAuth) return;

    if (type === 'recovery' && accessToken) {
      window.location.replace('/auth' + hash);
      return;
    }

    if (error) {
      window.location.replace('/auth' + hash);
    }
  }, []);

  return null;
}

/**
 * Inner component rendered inside BrowserRouter so we can use useNavigate.
 * Handles onboarding overlay rendering.
 */
function AppContent() {
  const navigate = useNavigate();
  const { state, completeWelcome, markStep, dismissChecklist, setSampleProjectCreated } = useOnboarding();
  const { createSampleProject } = useSampleProject();

  const [userName, setUserName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firstProjectId, setFirstProjectId] = useState<string | null>(null);

  // Fetch authenticated user info
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setIsAuthenticated(true);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'there';
      setUserName(name);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        const u = session.user;
        const name =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split('@')[0] ||
          'there';
        setUserName(name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch first project id for checklist deep links
  useEffect(() => {
    if (!isAuthenticated || !state.steps.createProject) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (data?.project_id) setFirstProjectId(data.project_id);
    });
  }, [isAuthenticated, state.steps.createProject]);

  const handleWelcomeComplete = useCallback(
    async (role: string, teamSize: string, useSample: boolean) => {
      await completeWelcome(role, teamSize);

      if (useSample) {
        const projectId = await createSampleProject();
        await setSampleProjectCreated();
        await markStep('createProject');
        navigate(`/projects/${projectId}`);
      }
    },
    [completeWelcome, createSampleProject, setSampleProjectCreated, markStep, navigate],
  );

  const handleWelcomeSkip = useCallback(async () => {
    await completeWelcome('other', '1');
  }, [completeWelcome]);

  const showWelcome =
    isAuthenticated &&
    !state.isLoading &&
    !state.welcomeCompleted;

  const showChecklist =
    isAuthenticated &&
    !state.isLoading &&
    state.welcomeCompleted &&
    !state.isComplete;

  return (
    <>
      <RecoveryHandler />
      <AppRoutes />

      {showWelcome && (
        <WelcomeScreen
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
        />
      )}

      {showChecklist && (
        <OnboardingChecklist
          state={state}
          onDismiss={dismissChecklist}
          firstProjectId={firstProjectId}
        />
      )}
    </>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AppContent />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
