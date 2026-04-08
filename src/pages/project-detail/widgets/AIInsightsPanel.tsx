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
    bg: 'bg-violet-50',
    border: 'border-violet-500',
    tagBg: 'bg-violet-100 text-violet-700 border border-violet-200',
    icon: 'ri-sparkling-2-fill',
    label: 'Daily Summary',
    linkColor: 'text-violet-600 hover:text-violet-800',
    timeColor: 'text-violet-400',
  },
  risk_alert: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    tagBg: 'bg-red-100 text-red-700 border border-red-200',
    icon: 'ri-alert-fill',
    label: 'Risk Alert',
    linkColor: 'text-red-600 hover:text-red-800',
    timeColor: 'text-red-400',
  },
  completion_forecast: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    tagBg: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    icon: 'ri-line-chart-line',
    label: 'Completion Forecast',
    linkColor: 'text-indigo-600 hover:text-indigo-800',
    timeColor: 'text-indigo-400',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const style = INSIGHT_STYLES[insight.type];
  return (
    <div className={`rounded-xl ${style.bg} border-l-[3px] ${style.border} p-3.5`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${style.tagBg} px-2 py-0.5 rounded-full`}>
          <i className={`${style.icon} text-[11px]`} />
          {style.label}
        </span>
        <span className={`text-[11px] ${style.timeColor}`}>{insight.timestamp}</span>
      </div>
      <p className="text-[12px] leading-relaxed text-gray-700 mb-2">{insight.body}</p>
      <a
        href={insight.actionHref}
        className={`text-[11px] font-semibold ${style.linkColor} underline underline-offset-2 transition-colors`}
      >
        {insight.actionLabel} →
      </a>
    </div>
  );
}

export default function AIInsightsPanel({ projectId, milestones = [] }: { projectId: string; milestones?: any[] }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, milestones]);

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

      // Use roll-up milestones passed from parent (already computed with derivedEndDate)
      const activeMilestone = milestones
        .filter(m => !m.parent_milestone_id && m.status !== 'completed')
        .map(m => {
          const isAutoAggregated = m.isAggregated && m.date_mode !== 'manual';
          const endDateStr = isAutoAggregated && m.derivedEndDate ? m.derivedEndDate : m.end_date;
          return { ...m, resolvedEndDate: endDateStr };
        })
        .filter(m => m.resolvedEndDate)
        .sort((a, b) => new Date(a.resolvedEndDate).getTime() - new Date(b.resolvedEndDate).getTime())[0] ?? null;

      const milestone = activeMilestone
        ? { name: activeMilestone.name, end_date: activeMilestone.resolvedEndDate, status: activeMilestone.status }
        : null;

      const derived: Insight[] = [];

      // Daily Summary
      const passRate = totalToday > 0 ? Math.round((passCount / totalToday) * 100) : 0;
      derived.push({
        type: 'daily_summary',
        tag: 'Daily Summary',
        body: totalToday > 0
          ? `${totalToday} test(s) executed today — ${passCount} passed (${passRate}%), ${failCount} failed. ${passRate >= 80 ? 'Overall looking stable.' : 'Failure rate is high. Review recommended.'}`
          : 'No tests have been executed today yet. Start a test run to get started.',
        actionLabel: 'View run details',
        actionHref: '#runs',
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });

      // Risk Alert
      if (failCount > 0) {
        derived.push({
          type: 'risk_alert',
          tag: 'Risk Alert',
          body: `${failCount} failure(s) detected today. Please review the failed TCs and re-run them.`,
          actionLabel: 'View failed TCs',
          actionHref: '#failed',
          timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        derived.push({
          type: 'risk_alert',
          tag: 'Risk Alert',
          body: 'No risk signals detected. All tests are passing stably.',
          actionLabel: 'View detailed analysis',
          actionHref: '#analytics',
          timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
      }

      // Completion Forecast
      if (milestone) {
        const daysLeft = Math.ceil((new Date(milestone.end_date).getTime() - now.getTime()) / 86400000);
        const onTrack = daysLeft > 3;
        derived.push({
          type: 'completion_forecast',
          tag: 'Completion Forecast',
          body: `Milestone "${milestone.name}" — ${daysLeft > 0 ? `${daysLeft} day(s) remaining` : 'past due'}. ${onTrack ? 'On track to complete within schedule at current pace.' : 'Schedule is tight. Consider reprioritizing.'}`,
          actionLabel: 'View milestones',
          actionHref: '#milestones',
          timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        derived.push({
          type: 'completion_forecast',
          tag: 'Completion Forecast',
          body: 'No active milestones. Set up a milestone to see completion forecasts.',
          actionLabel: 'Add milestone',
          actionHref: '#milestones',
          timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Updated just now</span>
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Starter+</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[88px] bg-gray-50 rounded-xl animate-pulse" />
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
