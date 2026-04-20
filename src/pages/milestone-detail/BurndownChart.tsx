import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';

interface BurndownChartProps {
  startDate: Date | null;
  endDate: Date | null;
  totalTCs: number;
  executedPerDay: Map<string, number>; // ISO date (YYYY-MM-DD) → executed count that day
}

type Range = '7d' | '30d' | 'all';

function iso(d: Date): string { return d.toISOString().slice(0, 10); }

export default function BurndownChart({ startDate, endDate, totalTCs, executedPerDay }: BurndownChartProps) {
  const [range, setRange] = useState<Range>('30d');

  const data = useMemo(() => {
    if (!startDate || !endDate || totalTCs <= 0) return [] as any[];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));

    // cumulative executed by day
    let cumulative = 0;
    const perDay: Array<{ date: string; dateLabel: string; actual: number | null; ideal: number; projected: number | null }> = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const key = iso(d);
      const count = executedPerDay.get(key) || 0;
      cumulative += count;
      const remaining = Math.max(0, totalTCs - cumulative);
      const idealRemaining = Math.max(0, totalTCs - (totalTCs * (i / totalDays)));
      perDay.push({
        date: key,
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: i <= daysElapsed ? remaining : null,
        ideal: idealRemaining,
        projected: null, // filled later if we have velocity
      });
    }

    // Projected segment — only draw if milestone is still in progress (not overdue)
    // and we have room on the X axis between today and end date.
    const todayIdx = Math.min(daysElapsed, perDay.length - 1);
    const isOverdue = daysElapsed >= totalDays;
    if (!isOverdue && perDay[todayIdx]?.actual != null) {
      const currentRemaining = perDay[todayIdx].actual!;
      const elapsed = Math.max(1, daysElapsed);
      const executedSoFar = totalTCs - currentRemaining;
      const velocity = executedSoFar / elapsed;
      const projDays = velocity > 0 ? Math.ceil(currentRemaining / velocity) : null;
      if (projDays != null && projDays > 0) {
        const projEnd = Math.min(totalDays, todayIdx + projDays);
        const span = projEnd - todayIdx;
        if (span > 0) {
          for (let i = todayIdx; i <= projEnd; i++) {
            const t = (i - todayIdx) / span;
            perDay[i].projected = Math.max(0, currentRemaining * (1 - t));
          }
        }
      }
    }

    // Apply range filter
    if (range === 'all') return perDay;
    const days = range === '7d' ? 7 : 30;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const cutoff = new Date(now.getTime() - days * 86400000);
    return perDay.filter(row => new Date(row.date) >= cutoff);
  }, [startDate, endDate, totalTCs, executedPerDay, range]);

  const todayISO = iso(new Date());
  const endISO = endDate ? iso(endDate) : null;

  if (!startDate || !endDate || totalTCs <= 0) {
    return (
      <div className="mo-chart-card">
        <div className="mo-chart-head">
          <div className="mo-chart-title">
            <i className="ri-line-chart-line" /> Burndown
          </div>
        </div>
        <div className="mo-chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>
            <i className="ri-bar-chart-line" style={{ fontSize: 32, display: 'block', margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12 }}>Start running tests to see burndown</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mo-chart-card">
      <div className="mo-chart-head">
        <div className="mo-chart-title">
          <i className="ri-line-chart-line" /> Burndown
        </div>
        <div className="mo-legend">
          <span><span className="sw ideal" />Ideal</span>
          <span><span className="sw actual" />Actual</span>
          <span><span className="sw projected" />Projected</span>
        </div>
        <div className="mo-range-tabs">
          {(['7d', '30d', 'all'] as Range[]).map(r => (
            <button key={r} type="button" className={`mo-range-tab${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>
      <div className="mo-chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 6, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              interval="preserveStartEnd"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              stroke="#d1d5db"
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              stroke="#d1d5db"
              width={26}
              tickCount={4}
              domain={[0, totalTCs]}
              allowDataOverflow={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip
              contentStyle={{ background: '#111827', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, padding: '6px 8px' }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Line type="monotone" dataKey="ideal" stroke="#9ca3af" strokeWidth={1.2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey="projected" stroke="#a5b4fc" strokeWidth={1.2} strokeDasharray="2 2" dot={false} isAnimationActive={false} connectNulls={false} />
            {data.find(d => d.date === todayISO) && (
              <ReferenceLine x={data.find(d => d.date === todayISO)!.dateLabel} stroke="var(--primary)" strokeDasharray="2 2" />
            )}
            {endISO && data.find(d => d.date === endISO) && (
              <ReferenceLine x={data.find(d => d.date === endISO)!.dateLabel} stroke="var(--danger)" strokeDasharray="2 2" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
