import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Insight {
  type: 'daily_summary' | 'risk_alert' | 'completion_forecast';
  tag: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  timestamp: string;
}

const INSIGHT_STYLES = {
  daily_summary: {
    gradient: 'from-violet-500 to-violet-600',
    tagBg: 'bg-white/20',
    icon: 'ri-sparkling-2-fill',
    label: 'Daily Summary',
  },
  risk_alert: {
    gradient: 'from-red-500 to-rose-600',
    tagBg: 'bg-white/20',
    icon: 'ri-alert-fill',
    label: 'Risk Alert',
  },
  completion_forecast: {
    gradient: 'from-indigo-500 to-indigo-600',
    tagBg: 'bg-white/20',
    icon: 'ri-line-chart-line',
    label: 'Completion Forecast',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const style = INSIGHT_STYLES[insight.type];
  return (
    <div className={`rounded-xl bg-gradient-to-br ${style.gradient} p-3.5 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${style.tagBg} px-2 py-0.5 rounded-full`}>
          <i className={`${style.icon} text-[11px]`} />
          {style.label}
        </span>
        <span className="text-[11px] text-white/70">{insight.timestamp}</span>
      </div>
      <p className="text-[12px] leading-relaxed text-white/90 mb-2">{insight.body}</p>
      <a
        href={insight.actionHref}
        className="text-[11px] font-semibold text-white underline underline-offset-2 hover:text-white/80 transition-colors"
      >
        {insight.actionLabel} →
      </a>
    </div>
  );
}

export default function AIInsightsPanel({ projectId }: { projectId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function generate() {
    setLoading(true);
    try {
      const now = new Date();
      const todayISO = new Date(now.getTime() - 86400000).toISOString();

      // Fetch today's test results
      const { data: runs } = await supabase
        .from('test_runs').select('id').eq('project_id', projectId);
      const runIds = (runs ?? []).map(r => r.id);

      let passCount = 0, failCount = 0, totalToday = 0;
      if (runIds.length > 0) {
        const { data: results } = await supabase
          .from('test_results')
          .select('status')
          .in('run_id', runIds)
          .gte('created_at', todayISO);
        totalToday = (results ?? []).length;
        passCount = (results ?? []).filter(r => r.status === 'passed').length;
        failCount = (results ?? []).filter(r => r.status === 'failed').length;
      }

      // Fetch active milestone for forecast
      const { data: milestones } = await supabase
        .from('milestones')
        .select('name, end_date, status')
        .eq('project_id', projectId)
        .in('status', ['started', 'not_started'])
        .order('end_date', { ascending: true })
        .limit(1);

      const milestone = milestones?.[0];

      const derived: Insight[] = [];

      // Daily Summary
      const passRate = totalToday > 0 ? Math.round((passCount / totalToday) * 100) : 0;
      derived.push({
        type: 'daily_summary',
        tag: 'Daily Summary',
        body: totalToday > 0
          ? `오늘 ${totalToday}건 실행 — Pass ${passCount}건 (${passRate}%), Fail ${failCount}건. ${passRate >= 80 ? '전반적으로 안정적입니다.' : '실패율이 높습니다. 확인이 필요합니다.'}`
          : '오늘 아직 실행된 테스트가 없습니다. 테스트 런을 시작해보세요.',
        actionLabel: '실행 상세 보기',
        actionHref: '#runs',
        timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      });

      // Risk Alert
      if (failCount > 0) {
        derived.push({
          type: 'risk_alert',
          tag: 'Risk Alert',
          body: `오늘 ${failCount}건의 실패가 감지되었습니다. 실패한 TC를 검토하고 재실행해주세요.`,
          actionLabel: '실패 TC 보기',
          actionHref: '#failed',
          timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        derived.push({
          type: 'risk_alert',
          tag: 'Risk Alert',
          body: '현재 감지된 위험 신호가 없습니다. 모든 테스트가 안정적으로 통과 중입니다.',
          actionLabel: '상세 분석 보기',
          actionHref: '#analytics',
          timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Completion Forecast
      if (milestone) {
        const daysLeft = Math.ceil((new Date(milestone.end_date).getTime() - now.getTime()) / 86400000);
        const onTrack = daysLeft > 3;
        derived.push({
          type: 'completion_forecast',
          tag: 'Completion Forecast',
          body: `마일스톤 "${milestone.name}" — ${daysLeft > 0 ? `${daysLeft}일 남음` : '기한 초과'}. ${onTrack ? '현재 속도로 일정 내 완료 가능합니다.' : '일정이 촉박합니다. 우선순위를 재조정하세요.'}`,
          actionLabel: '마일스톤 보기',
          actionHref: '#milestones',
          timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        derived.push({
          type: 'completion_forecast',
          tag: 'Completion Forecast',
          body: '활성 마일스톤이 없습니다. 마일스톤을 설정하면 완료 예측을 확인할 수 있습니다.',
          actionLabel: '마일스톤 추가',
          actionHref: '#milestones',
          timestamp: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setInsights(derived);
    } catch (e) {
      console.error('AIInsightsPanel:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-sparkling-2-fill text-violet-500" />
          AI Insights
        </div>
        <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[88px] bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </>
        ) : (
          insights.map(insight => (
            <InsightCard key={insight.type} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
}
