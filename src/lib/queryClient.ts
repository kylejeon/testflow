import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1분 동안 캐시 데이터를 fresh로 간주 → 탭 이동 시 재요청 없음
      staleTime: 60 * 1000,
      // 5분 동안 미사용 캐시 유지
      gcTime: 5 * 60 * 1000,
      // 실패 시 1회만 재시도
      retry: 1,
      // 창 포커스 시 자동 refetch 비활성화 (불필요한 요청 방지)
      refetchOnWindowFocus: false,
    },
  },
});
