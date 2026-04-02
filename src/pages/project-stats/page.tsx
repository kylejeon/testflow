/**
 * Project Stats Page — /projects/:id/stats
 * 프로젝트별 종합 통계를 한 눈에 볼 수 있는 전용 페이지
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import ProjectStatsPanel from '../project-detail/widgets/ProjectStatsPanel';

export default function ProjectStatsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, prefix, color, status')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />

        <main className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 페이지 헤더 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <i className="ri-bar-chart-2-line text-indigo-600 text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">프로젝트 통계</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pass Rate 추이 · 커버리지 현황 · 우선순위별 분석 · 마일스톤 현황
                </p>
              </div>
            </div>

            {/* Stats Panel */}
            {id && <ProjectStatsPanel projectId={id} />}
          </div>
        </main>
      </div>
    </div>
  );
}
