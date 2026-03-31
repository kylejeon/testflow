import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 로컬 스토리지에서 Supabase 토큰 및 앱 사용자별 데이터 제거
const clearSupabaseTokens = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-') || key.startsWith('_tc_logins')) {
      localStorage.removeItem(key);
    }
  });
  ['cmdpalette_recent', 'testably_tips_dismissed_1', 'testably_tips_dismissed_2'].forEach(key =>
    localStorage.removeItem(key)
  );
};

// 인증 상태 변경 감지 - 토큰 갱신 실패 시 자동 로그아웃
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    clearSupabaseTokens();
  }
  if (event === 'TOKEN_REFRESHED' && !session) {
    clearSupabaseTokens();
    supabase.auth.signOut();
  }
});

// 앱 시작 시 유효하지 않은 토큰 자동 정리
supabase.auth.getSession().then(({ error }) => {
  if (
    error &&
    (error.message?.includes('Refresh Token Not Found') ||
      error.message?.includes('Invalid Refresh Token'))
  ) {
    clearSupabaseTokens();
    supabase.auth.signOut().catch(() => {});
  }
});

// 전역 fetch 에러 핸들러: Invalid Refresh Token 감지 시 자동 로그아웃
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  return response;
};

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  jira_project_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'passed' | 'failed' | 'pending';
  lifecycle_status: 'draft' | 'active' | 'deprecated';
  is_automated: boolean;
  folder: string | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export type LifecycleStatus = 'draft' | 'active' | 'deprecated';

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface TestRun {
  id: string;
  project_id: string;
  test_case_id: string | null;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  executed_at: string;
  created_at: string;
}
