import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useToast } from '../../components/Toast';
import PageLoader from '../../components/PageLoader';
import AIPlanAssistantModal from '../project-plans/AIPlanAssistantModal';
import { Avatar } from '../../components/Avatar';
import IssuesList from '../../components/issues/IssuesList';
import {
  HEATMAP_COLORS,
  cellLabel,
  buildEnvironmentHeatmap,
  type HeatmapMatrix,
} from '../../lib/environments';
import EnvironmentAIInsights from '../../components/EnvironmentAIInsights';
import type { Environment } from '../../types/environment';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestPlan {
  id: string;
  project_id: string;
  milestone_id: string | null;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  target_date: string | null;
  entry_criteria: string[];
  exit_criteria: string[];
  entry_criteria_met: boolean[];
  exit_criteria_met: boolean[];
  is_locked: boolean;
  snapshot_id?: string | null;
  snapshot_locked_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanTestCase {
  test_plan_id: string;
  test_case_id: string;
  added_at: string;
  test_case: {
    id: string;
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    lifecycle_status: string;
    folder: string | null;
    tags: string[] | null;
    custom_id: string | null;
  };
}

interface PlanRun {
  id: string;
  name: string;
  status: string;
  milestone_id: string | null;
  test_plan_id: string | null;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  created_at: string;
  environment?: string | null;
  assignee_ids?: string[];
  assignee_names?: string[];
}

interface ActivityLog {
  id: string;
  event_type: string;
  event_category: string;
  metadata: any;
  created_at: string;
  actor_id: string;
}

interface Milestone {
  id: string;
  name: string;
  parent_milestone_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface TestCaseRow {
  id: string;
  title: string;
  priority: string;
  lifecycle_status: string;
  folder: string | null;
  tags: string[] | null;
  custom_id: string | null;
  updated_at?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLDER_COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  indigo:  { bg: '#EEF2FF', fg: '#6366F1' },
  violet:  { bg: '#F5F3FF', fg: '#8B5CF6' },
  pink:    { bg: '#FDF2F8', fg: '#EC4899' },
  emerald: { bg: '#F0FDF4', fg: '#10B981' },
  amber:   { bg: '#FFFBEB', fg: '#F59E0B' },
  cyan:    { bg: '#ECFEFF', fg: '#06B6D4' },
  red:     { bg: '#FEF2F2', fg: '#EF4444' },
  teal:    { bg: '#F0FDFA', fg: '#14B8A6' },
  orange:  { bg: '#FFF7ED', fg: '#F97316' },
  blue:    { bg: '#EFF6FF', fg: '#3B82F6' },
  gray:    { bg: '#F3F4F6', fg: '#6B7280' },
};

const STATUS_CONFIG = {
  planning:  { label: 'Planning',     badgeCls: 'badge badge-neutral' },
  active:    { label: 'In Progress',  badgeCls: 'badge badge-warning' },
  completed: { label: 'Completed',    badgeCls: 'badge badge-success' },
  cancelled: { label: 'Cancelled',    badgeCls: 'badge badge-danger'  },
};

const PRIORITY_CONFIG = {
  critical: { label: 'P1 Critical', priCls: 'pri-badge pri-p1' },
  high:     { label: 'P2 High',     priCls: 'pri-badge pri-p2' },
  medium:   { label: 'P3 Medium',   priCls: 'pri-badge pri-p3' },
  low:      { label: 'P3 Low',      priCls: 'pri-badge pri-p3' },
};

const TABS = [
  { key: 'testcases',    label: 'Test Cases',   iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'runs',         label: 'Runs',         iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { key: 'activity',    label: 'Activity',      iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { key: 'issues',       label: 'Issues',       iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  { key: 'environments', label: 'Environments', iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/></svg> },
  { key: 'settings',     label: 'Settings',     iconEl: <svg style={{width:13,height:13,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6m11-11h-6M7 12H1"/></svg> },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Plan Sidebar (shared across all tabs) ────────────────────────────────────

function PlanSidebar({ plan, milestone, parentMilestone, profiles, driftCount, onLock, onUnlock, onRebase, planTcs, runs, tcResultMap, dailyExecCounts, projectId, currentUserProfile }:
  { plan: TestPlan; milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>;
    driftCount: number; onLock: () => Promise<void>; onUnlock: () => Promise<void>; onRebase: () => Promise<void>;
    planTcs: PlanTestCase[]; runs: PlanRun[]; tcResultMap: Map<string, { result: string; assignee: string | null }>;
    dailyExecCounts: number[]; projectId: string; currentUserProfile: Profile | null; }) {
  const { showToast } = useToast();
  const owner = plan.owner_id ? profiles.get(plan.owner_id) : null;
  const lockedByUser = owner || currentUserProfile;

  // ── Execution Pace: real data from dailyExecCounts (7 days) ──
  const today = new Date();
  const sparkDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  });
  const sparkValues = dailyExecCounts.length === 7 ? dailyExecCounts : [0,0,0,0,0,0,0];
  const maxSpark = Math.max(...sparkValues, 1);
  const totalExecLast7 = sparkValues.reduce((s, v) => s + v, 0);
  const avgTcPerDay = totalExecLast7 > 0 ? +(totalExecLast7 / 7).toFixed(1) : 0;
  const testedCount = planTcs.filter(ptc => {
    const r = tcResultMap.get(ptc.test_case_id);
    return r && r.result !== 'untested';
  }).length;
  const untested = planTcs.length - testedCount;
  const daysEst = avgTcPerDay > 0 ? Math.ceil(untested / avgTcPerDay) : null;

  // ── AI Risk Predictor: API-backed state ──
  const [riskData, setRiskData] = useState<{
    forecast_date: string; forecast_note: string;
    confidence: number; confidence_label: string;
    risk_signals: { signal: string; severity: string; badge: string }[];
    recommendation: string; summary: string;
    meta?: { credits_used: number; credits_remaining: number };
    _scanned_at?: string;
  } | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Load previous risk scan result on mount (owner 팀 shared pool 범위).
  // RLS 때문에 ai_generation_logs 를 직접 SELECT 하면 본인 행만 보여 팀원의 결과를
  // 재사용할 수 없다. SECURITY DEFINER RPC `get_team_ai_log` 로 owner 팀 범위에서 조회.
  useEffect(() => {
    if (!plan.id || !projectId) return;
    (async () => {
      try {
        const { data: projectRow } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .maybeSingle();
        const ownerId = (projectRow as any)?.owner_id;
        if (!ownerId) return;

        const { data: rows } = await supabase.rpc('get_team_ai_log', {
          p_owner_id: ownerId,
          p_mode: 'risk-predictor',
          p_input_match: { plan_id: plan.id },
        });
        const row = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any) : null;
        if (row?.output_data) {
          setRiskData({ ...row.output_data, _scanned_at: row.created_at });
        }
      } catch {
        // Silently fail — user can manually scan
      }
    })();
  }, [plan.id, projectId]);

  const handleRunRiskScan = async () => {
    if (planTcs.length === 0) {
      showToast('Add test cases to this plan first', 'warning');
      return;
    }
    setRiskLoading(true);
    setRiskError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/risk-predictor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, plan_id: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          showToast(data.error || 'Starter plan required for AI Risk Predictor', 'warning');
        } else if (res.status === 429) {
          showToast(data.error || 'Monthly AI credit limit reached', 'warning');
        } else {
          throw new Error(data.error || 'Risk scan failed');
        }
        setRiskError(data.error);
        return;
      }

      setRiskData({ ...data, _scanned_at: new Date().toISOString() });
      if (data.meta) {
        showToast(`Risk scan complete (${data.meta.credits_used} credit used)`, 'success');
      }
    } catch (err: any) {
      console.error('Risk scan error:', err);
      setRiskError(err.message);
      showToast(`Risk scan failed: ${err.message}`, 'error');
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <aside className="plan-side">

      {/* ── AI Risk Predictor (mockup full version) ── */}
      <div style={{
        background:'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 50%, #e0e7ff 100%)',
        border:'1px solid #c4b5fd', borderRadius:10, overflow:'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          padding:'13px 15px 11px', display:'flex', alignItems:'center', gap:10,
          borderBottom:'1px solid #c4b5fd',
          background:'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.08))',
        }}>
          <div style={{width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0}}>
            <svg style={{width:15,height:15,color:'#fff'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:14, color:'#3730a3'}}>AI Risk Predictor</div>
            <div style={{color:'#7c3aed', fontSize:11, opacity:0.8, marginTop:1}}>
              {riskData?._scanned_at
                ? `Scanned ${new Date(riskData._scanned_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })} · ${new Date(riskData._scanned_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}`
                : 'Failure risk diagnostic'}
            </div>
          </div>
        </div>
        {/* Body */}
        <div style={{padding:'13px 15px', display:'flex', flexDirection:'column', gap:11}}>
          {riskData ? (
            <>
              {/* Forecast + Confidence */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div style={{display:'flex', flexDirection:'column', gap:2}}>
                  <div style={{fontSize:10, fontWeight:600, color:'#6d28d9', textTransform:'uppercase', letterSpacing:'0.06em'}}>Forecast Completion</div>
                  <div style={{fontSize:22, fontWeight:800, letterSpacing:'-0.02em', color:'#1e1b4b', lineHeight:1.1}}>{riskData.forecast_date}</div>
                  <div style={{fontSize:11, color:'#7c3aed'}}>{riskData.forecast_note}</div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:2, textAlign:'right'}}>
                  <div style={{fontSize:10, fontWeight:600, color:'#6d28d9', textTransform:'uppercase', letterSpacing:'0.06em'}}>Confidence</div>
                  <div style={{fontSize:22, fontWeight:800, color: riskData.confidence >= 80 ? '#22c55e' : riskData.confidence >= 50 ? '#f59e0b' : 'var(--danger)', lineHeight:1.1}}>{riskData.confidence}%</div>
                  <div style={{fontSize:11, color:'var(--text-muted)'}}>{riskData.confidence_label}</div>
                </div>
              </div>
              {/* Top Risk Signals */}
              <div style={{background:'rgba(255,255,255,0.65)', border:'1px solid #c4b5fd', borderRadius:8, padding:'9px 11px'}}>
                <div style={{fontSize:10, fontWeight:700, color:'#6d28d9', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7}}>Top Risk Signals</div>
                {(riskData.risk_signals || []).map((r, i) => (
                  <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:12, gap:8, padding:'2px 0', ...(i > 0 ? {borderTop:'1px solid rgba(196,181,253,0.35)', paddingTop:5, marginTop:3} : {})}}>
                    <div style={{display:'flex', alignItems:'flex-start', gap:6, color:'#374151', flex:1}}>
                      <span style={{width:7, height:7, borderRadius:'50%', background: r.severity === 'high' ? 'var(--danger)' : r.severity === 'medium' ? 'var(--warning)' : '#22c55e', flexShrink:0, marginTop:3}} />
                      <span>{r.signal}</span>
                    </div>
                    <span style={{fontSize:11, fontWeight:700, whiteSpace:'nowrap', color: r.severity === 'high' ? 'var(--danger)' : r.severity === 'medium' ? 'var(--warning)' : '#6b7280'}}>{r.badge}</span>
                  </div>
                ))}
              </div>
              {/* Recommendation */}
              <div style={{background:'rgba(255,255,255,0.8)', border:'1px solid #ddd6fe', borderRadius:8, padding:'10px 12px'}}>
                <div style={{fontSize:11, fontWeight:700, color:'#7c3aed', display:'flex', alignItems:'center', gap:5, marginBottom:5}}>Recommendation</div>
                <div style={{fontSize:12, lineHeight:1.55, color:'#374151'}}>{riskData.recommendation}</div>
              </div>
              {/* Re-scan button */}
              <button className="pd-btn pd-btn-sm" onClick={handleRunRiskScan} disabled={riskLoading}
                style={{width:'100%', justifyContent:'center', background:'#fff', borderColor:'#ddd6fe', color:'var(--violet)', fontWeight:500, opacity: riskLoading ? 0.6 : 1}}>
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {riskLoading ? 'Scanning...' : 'Re-scan'}
              </button>
            </>
          ) : (
            <>
              {/* Empty state — scan not run yet */}
              <div style={{textAlign:'center', padding:'8px 0'}}>
                <div style={{fontSize:12, color:'#6d28d9', lineHeight:1.5, marginBottom:12}}>
                  Run an AI-powered risk analysis to get failure predictions, risk signals, and actionable recommendations.
                </div>
                <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:4}}>
                  Costs 1 AI credit · Requires Starter plan
                </div>
              </div>
              <button className="pd-btn pd-btn-sm" onClick={handleRunRiskScan} disabled={riskLoading || planTcs.length === 0}
                style={{width:'100%', justifyContent:'center', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', borderColor:'transparent', color:'#fff', fontWeight:500, opacity: (riskLoading || planTcs.length === 0) ? 0.6 : 1}}>
                {riskLoading ? (
                  <><svg style={{width:12,height:12,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Scanning...</>
                ) : (
                  <><svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg> Run Risk Scan</>
                )}
              </button>
              {riskError && (
                <div style={{fontSize:11, color:'var(--danger)', textAlign:'center'}}>{riskError}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Snapshot Card ── */}
      <div className="side-card" style={plan.is_locked ? {borderColor:'var(--violet)', borderWidth:1.5} : {}}>
        <div className="side-card-title">
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Snapshot
          {plan.is_locked
            ? <span className="badge" style={{marginLeft:'auto', background:'#ede9fe', color:'var(--violet)', border:'1px solid #ddd6fe', fontSize:'10px', fontWeight:600}}>LOCKED</span>
            : <span className="badge badge-neutral" style={{marginLeft:'auto', fontSize:'10px'}}>Unlocked</span>
          }
        </div>
        {plan.is_locked ? (
          <>
            {plan.snapshot_locked_at && (
              <div className="side-row">
                <span className="k">Locked at</span>
                <span className="v">{new Date(plan.snapshot_locked_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })} · {new Date(plan.snapshot_locked_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })}</span>
              </div>
            )}
            {lockedByUser && (
              <div className="side-row">
                <span className="k">Locked by</span>
                <span className="v" style={{display:'inline-flex', alignItems:'center', gap:4}}>
                  <Avatar userId={lockedByUser.id} name={lockedByUser.full_name || undefined} email={lockedByUser.email || undefined} size="xs" />
                  <span>{lockedByUser.full_name || lockedByUser.email}</span>
                </span>
              </div>
            )}
            <div className="side-row">
              <span className="k">TC revision</span>
              <span className="v" style={{fontFamily:'JetBrains Mono,monospace', fontSize:11}}>
                {plan.snapshot_locked_at
                  ? `rev.${new Date(plan.snapshot_locked_at).toISOString().slice(0,10).replace(/-/g,'.')}-a`
                  : '—'}
              </span>
            </div>
            <div className="side-row">
              <span className="k">Drift from live</span>
              <span className="v">
                {driftCount > 0
                  ? <span style={{color:'var(--warning)', fontWeight:600}}>{driftCount} TC edited <span title="TCs modified after snapshot was locked" style={{cursor:'help', fontSize:12}}>ⓘ</span></span>
                  : <span style={{color:'var(--success-600)'}}>Up to date</span>
                }
              </span>
            </div>
            <div style={{display:'flex', gap:6, marginTop:8}}>
              <button className="pd-btn pd-btn-sm" onClick={onRebase}
                disabled={driftCount === 0}
                style={{flex:1, justifyContent:'center', opacity: driftCount === 0 ? 0.5 : 1, cursor: driftCount === 0 ? 'not-allowed' : 'pointer'}} title={driftCount === 0 ? 'No drift detected' : 'Update baseline to latest TC revisions'}>
                ↻ Rebase
              </button>
              <button className="pd-btn pd-btn-sm" onClick={onUnlock}
                style={{flex:1, justifyContent:'center', color:'var(--danger)', borderColor:'var(--danger-200)'}}>
                <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                Unlock
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.5, marginBottom:10}}>
              Lock the TC scope to prevent drift. Required before starting a tracked run.
            </div>
            {planTcs.length > 0 ? (
              <button className="pd-btn pd-btn-sm" onClick={onLock}
                style={{width:'100%', justifyContent:'center', background:'var(--violet)', borderColor:'var(--violet)', color:'#fff'}}>
                <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Lock Snapshot
              </button>
            ) : (
              <div style={{fontSize:11.5, color:'var(--text-subtle)'}}>Add TCs to enable locking.</div>
            )}
          </>
        )}
      </div>

      {/* ── Execution Pace ── */}
      <div className="side-card">
        <div className="side-card-title">
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Execution Pace
        </div>
        {/* 7-day sparkline bar chart */}
        <div style={{display:'flex', alignItems:'flex-end', gap:3, height:40, marginBottom:8}}>
          {sparkValues.map((v, i) => (
            <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2}}>
              <div style={{
                width:'100%', borderRadius:'2px 2px 0 0',
                height: `${Math.round((v / maxSpark) * 36)}px`,
                background: i === sparkValues.length - 1 ? 'var(--primary)' : 'var(--primary-50)',
                minHeight:3,
              }} />
            </div>
          ))}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-subtle)', marginBottom:10}}>
          <span>{sparkDays[0]}</span>
          <span>{sparkDays[6]}</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div style={{background:'var(--bg-subtle)', borderRadius:8, padding:'8px 10px', border:'1px solid var(--border)'}}>
            <div style={{fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em'}}>Avg TC/day</div>
            <div style={{fontSize:18, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace'}}>{avgTcPerDay}</div>
          </div>
          <div style={{background:'var(--bg-subtle)', borderRadius:8, padding:'8px 10px', border:'1px solid var(--border)'}}>
            <div style={{fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em'}}>Remaining</div>
            <div style={{fontSize:18, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace'}}>
              {untested > 0 ? `${untested} TC` : '0'}
              {daysEst !== null && untested > 0 ? <span style={{fontSize:11, fontWeight:500, color:'var(--text-muted)'}}> ~{daysEst}d</span> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Meta and Team cards moved to Settings tab sidebar */}
    </aside>
  );
}

// ─── Tab: Test Cases ──────────────────────────────────────────────────────────

function TestCasesTab({
  plan, planTcs, allTcs, onAddTc, onAddTcs, onRemoveTc, onLock, onUnlock, onRebase, milestone, parentMilestone, profiles, tcResultMap, driftCount, runs, dailyExecCounts, folders, currentUserProfile, onUpdateCriteriaMet,
}: {
  plan: TestPlan; planTcs: PlanTestCase[]; allTcs: TestCaseRow[];
  onAddTc: (id: string) => Promise<void>;
  onAddTcs: (ids: string[]) => Promise<void>;
  onRemoveTc: (id: string) => Promise<void>;
  onLock: () => Promise<void>;
  onUnlock: () => Promise<void>;
  onRebase: () => Promise<void>;
  driftCount: number;
  milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>;
  tcResultMap: Map<string, { result: string; assignee: string | null }>;
  runs: PlanRun[]; dailyExecCounts: number[];
  folders: { name: string; icon: string; color: string }[];
  currentUserProfile: Profile | null;
  onUpdateCriteriaMet: (type: 'entry' | 'exit', met: boolean[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [filterPri, setFilterPri] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<string>>(new Set());
  const [pickerFolder, setPickerFolder] = useState('');
  const [pickerIncludeDraft, setPickerIncludeDraft] = useState(false);

  const includedIds = new Set(planTcs.map(p => p.test_case_id));
  const filtered = planTcs.filter(p => {
    if (search && !p.test_case.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPri && p.test_case.priority !== filterPri) return false;
    return true;
  }).sort((a, b) => {
    const idA = a.test_case.custom_id || '';
    const idB = b.test_case.custom_id || '';
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
  const available = allTcs.filter(tc =>
    !includedIds.has(tc.id) &&
    (!pickerSearch || tc.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const TC_PRI: Record<string, { label: string; cls: string }> = {
    critical: { label: 'Critical', cls: 'pri-badge pri-p1' },
    high:     { label: 'High',     cls: 'pri-badge pri-p2' },
    medium:   { label: 'Medium',   cls: 'pri-badge pri-p3' },
    low:      { label: 'Low',      cls: 'pri-badge pri-p3' },
  };
  const RESULT_CLS: Record<string, string> = {
    passed: 'sb-pass', failed: 'sb-fail', blocked: 'sb-block', untested: 'sb-untested',
  };

  const entryCriteria: string[] = Array.isArray(plan.entry_criteria) ? plan.entry_criteria : [];
  const exitCriteria: string[] = Array.isArray(plan.exit_criteria) ? plan.exit_criteria : [];

  // ── Auto-evaluation context ──
  const totalTCs = planTcs.length;
  const resultValues = [...tcResultMap.values()].map(r => r.result);
  const passedTCs = resultValues.filter(r => r === 'passed').length;
  const failedTCs = resultValues.filter(r => r === 'failed').length;
  const blockedTCs = resultValues.filter(r => r === 'blocked').length;
  const executedTCs = resultValues.filter(r => r !== 'untested').length;
  const untestedTCs = totalTCs - executedTCs;
  const passRate = totalTCs > 0 ? (passedTCs / totalTCs) * 100 : 0;
  const completionRate = totalTCs > 0 ? (executedTCs / totalTCs) * 100 : 0;
  const criticalTCs = planTcs.filter(p => p.test_case?.priority === 'critical');
  const criticalPassed = criticalTCs.filter(p => tcResultMap.get(p.test_case_id)?.result === 'passed').length;
  const highTCs = planTcs.filter(p => p.test_case?.priority === 'high');
  const highPassed = highTCs.filter(p => tcResultMap.get(p.test_case_id)?.result === 'passed').length;

  const autoEvaluate = (text: string): { isAuto: boolean; met: boolean } => {
    const t = text.toLowerCase().trim();
    // Pass rate ≥ N%  |  >= N% passed  |  N% pass rate
    const passMatch = t.match(/(?:[≥>=]+\s*(\d+)\s*%\s*pass)|(?:pass\s*(?:rate)?\s*[≥>=]+\s*(\d+)\s*%)|(?:(\d+)\s*%\s*pass\s*rate)/);
    if (passMatch) { const n = Number(passMatch[1] || passMatch[2] || passMatch[3]); return { isAuto: true, met: passRate >= n }; }
    // Completion rate ≥ N%
    const compMatch = t.match(/completion\s*rate\s*[≥>=]+\s*(\d+)\s*%/);
    if (compMatch) return { isAuto: true, met: completionRate >= Number(compMatch[1]) };
    // 0 critical failures  |  no critical failures  |  all critical TCs passed
    if (/(?:0|no|zero)\s*critical\s*(failure|fail|bug|defect|issue)/i.test(t))
      return { isAuto: true, met: criticalTCs.filter(p => tcResultMap.get(p.test_case_id)?.result === 'failed').length === 0 };
    if (/all\s*critical\s*(tc|test\s*case)s?\s*passed/i.test(t))
      return { isAuto: true, met: criticalTCs.length > 0 && criticalPassed === criticalTCs.length };
    // 0 high failures  |  all high TCs passed
    if (/(?:0|no|zero)\s*high\s*(failure|fail|bug|defect|issue)/i.test(t))
      return { isAuto: true, met: highTCs.filter(p => tcResultMap.get(p.test_case_id)?.result === 'failed').length === 0 };
    if (/all\s*high\s*(tc|test\s*case)s?\s*passed/i.test(t))
      return { isAuto: true, met: highTCs.length > 0 && highPassed === highTCs.length };
    // No blocked  |  0 blocked
    if (/(?:0|no|zero)\s*blocked/i.test(t)) return { isAuto: true, met: blockedTCs === 0 };
    // No failed  |  0 failed
    if (/(?:0|no|zero)\s*fail/i.test(t)) return { isAuto: true, met: failedTCs === 0 };
    // All TCs executed  |  100% execution
    if (/all\s*(tc|test\s*case)s?\s*executed/i.test(t) || /100\s*%\s*(execution|completion)/i.test(t))
      return { isAuto: true, met: totalTCs > 0 && untestedTCs === 0 };
    // N untested TCs pending  |  untested ≤ N  |  N or fewer untested
    const untestedMatch = t.match(/(\d+)\s*(?:or\s*fewer\s*)?untested\s*(tc|test\s*case)?s?\s*(?:pending|remaining|left)?/);
    if (untestedMatch) return { isAuto: true, met: untestedTCs <= Number(untestedMatch[1]) };
    const untestedMatch2 = t.match(/untested\s*[≤<=]+\s*(\d+)/);
    if (untestedMatch2) return { isAuto: true, met: untestedTCs <= Number(untestedMatch2[1]) };
    return { isAuto: false, met: false };
  };

  // Met state from DB, merged with auto-evaluation
  const dbEntryMet: boolean[] = Array.isArray(plan.entry_criteria_met) ? plan.entry_criteria_met : [];
  const dbExitMet: boolean[] = Array.isArray(plan.exit_criteria_met) ? plan.exit_criteria_met : [];
  const [entryMetLocal, setEntryMetLocal] = useState<boolean[]>(() => entryCriteria.map((_, i) => dbEntryMet[i] ?? false));
  const [exitMetLocal, setExitMetLocal] = useState<boolean[]>(() => exitCriteria.map((_, i) => dbExitMet[i] ?? false));

  // Compute final met (auto overrides manual for auto-evaluable items)
  const entryFinal = entryCriteria.map((c, i) => {
    const auto = autoEvaluate(c);
    return { text: c, isAuto: auto.isAuto, met: auto.isAuto ? auto.met : (entryMetLocal[i] ?? false) };
  });
  const exitFinal = exitCriteria.map((c, i) => {
    const auto = autoEvaluate(c);
    return { text: c, isAuto: auto.isAuto, met: auto.isAuto ? auto.met : (exitMetLocal[i] ?? false) };
  });

  const handleToggleCriteria = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') {
      if (entryFinal[index]?.isAuto) return; // auto items can't be toggled
      const next = [...entryMetLocal]; next[index] = !next[index];
      setEntryMetLocal(next);
      onUpdateCriteriaMet('entry', next);
    } else {
      if (exitFinal[index]?.isAuto) return;
      const next = [...exitMetLocal]; next[index] = !next[index];
      setExitMetLocal(next);
      onUpdateCriteriaMet('exit', next);
    }
  };

  return (
    <div className="plan-layout">
      <div style={{minWidth:0}}>
        {/* Snapshot lock strip */}
        {plan.is_locked && (
          <div className="lock-strip">
            <svg style={{width:16,height:16,color:'var(--violet)',flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div style={{flex:1}}>
              <b>Snapshot locked</b> — TC scope is fixed. New TC changes in the library won't affect this plan.
            </div>
            <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
              <button className="pd-btn pd-btn-sm" onClick={onRebase}>↻ Rebase</button>
              <button className="pd-btn pd-btn-sm" onClick={onUnlock} style={{color:'var(--danger)', borderColor:'var(--danger-200)'}}>Unlock</button>
            </div>
          </div>
        )}

        {/* Entry / Exit criteria grid */}
        {(entryCriteria.length > 0 || exitCriteria.length > 0) && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
            {/* Entry Criteria */}
            <div className="criteria-block">
              <div className="criteria-title">
                <svg style={{width:13,height:13,color:'var(--success-600)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Entry Criteria
                <span className="badge badge-success" style={{marginLeft:'auto'}}>{entryFinal.filter(f => f.met).length} / {entryCriteria.length} met</span>
              </div>
              {entryFinal.map((item, i) => (
                <div key={i} className="criterion">
                  <div className={item.met ? 'crit-check' : 'crit-check pending'}
                    style={{cursor: item.isAuto ? 'default' : 'pointer', ...(item.isAuto && item.met ? {background:'var(--primary-50)', borderColor:'var(--primary)'} : {})}}
                    onClick={() => handleToggleCriteria('entry', i)}
                    title={item.isAuto ? 'Auto-evaluated based on test results' : 'Click to toggle'}>
                    {item.met
                      ? item.isAuto
                        ? <svg style={{width:10,height:10,color:'var(--primary)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/></svg>
                    }
                  </div>
                  <span style={{fontSize:13, textDecoration: item.met ? 'line-through' : 'none', color: item.met ? 'var(--text-muted)' : 'inherit', flex:1}}>{item.text}</span>
                  {item.isAuto && (
                    <span title="Auto-evaluated" style={{fontSize:10, color:'var(--primary)', display:'inline-flex', alignItems:'center', gap:2, background:'var(--primary-50)', padding:'1px 6px', borderRadius:8, fontWeight:600, whiteSpace:'nowrap'}}>
                      <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      Auto
                    </span>
                  )}
                </div>
              ))}
              {entryCriteria.length === 0 && <div style={{fontSize:12, color:'var(--text-muted)'}}>No entry criteria defined.</div>}
            </div>
            {/* Exit Criteria */}
            <div className="criteria-block">
              <div className="criteria-title">
                <svg style={{width:13,height:13,color:'var(--warning)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Exit Criteria
                <span className="badge badge-warning" style={{marginLeft:'auto'}}>
                  {exitFinal.filter(f => f.met).length} / {exitCriteria.length} met
                </span>
              </div>
              {exitFinal.map((item, i) => (
                <div key={i} className="criterion">
                  <div className={item.met ? 'crit-check' : 'crit-check pending'}
                    style={{cursor: item.isAuto ? 'default' : 'pointer', ...(item.isAuto && item.met ? {background:'var(--primary-50)', borderColor:'var(--primary)'} : {})}}
                    onClick={() => handleToggleCriteria('exit', i)}
                    title={item.isAuto ? 'Auto-evaluated based on test results' : 'Click to toggle'}>
                    {item.met
                      ? item.isAuto
                        ? <svg style={{width:10,height:10,color:'var(--primary)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/></svg>
                    }
                  </div>
                  <span style={{fontSize:13, textDecoration: item.met ? 'line-through' : 'none', color: item.met ? 'var(--text-muted)' : 'inherit', flex:1}}>{item.text}</span>
                  {item.isAuto && (
                    <span title="Auto-evaluated" style={{fontSize:10, color:'var(--primary)', display:'inline-flex', alignItems:'center', gap:2, background:'var(--primary-50)', padding:'1px 6px', borderRadius:8, fontWeight:600, whiteSpace:'nowrap'}}>
                      <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      Auto
                    </span>
                  )}
                </div>
              ))}
              {exitCriteria.length === 0 && <div style={{fontSize:12, color:'var(--text-muted)'}}>No exit criteria defined.</div>}
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap'}}>
          <div style={{position:'relative', flex:1, minWidth:200}}>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:'var(--text-subtle)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search in plan…"
              style={{width:'100%', padding:'6px 10px 6px 32px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg-muted)', fontSize:13, outline:'none', boxSizing:'border-box'}} />
          </div>
          <select value={filterPri} onChange={e=>setFilterPri(e.target.value)}
            style={{padding:'6px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, background:'#fff', outline:'none'}}>
            <option value="">All Priority</option>
            <option value="critical">P1 Critical</option>
            <option value="high">P2 High</option>
            <option value="medium">P3 Medium</option>
          </select>
          <div style={{marginLeft:'auto', display:'flex', gap:6}}>
            {!plan.is_locked && planTcs.length > 0 && (
              <button onClick={onLock} className="pd-btn pd-btn-sm">
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Lock Snapshot
              </button>
            )}
            {!plan.is_locked && (
              <button onClick={()=>setShowPicker(true)} className="pd-btn pd-btn-sm pd-btn-primary">
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add TCs
              </button>
            )}
          </div>
        </div>

        {/* TC Table */}
        <div className="tc-card">
          <div className="tc-head-row">
            <div />
            <div>ID</div>
            <div>Title</div>
            <div>Folder</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Assignee</div>
            <div />
          </div>
          {filtered.length === 0 ? (
            <div style={{textAlign:'center', padding:'3rem 1rem', borderTop:'1px solid var(--border)'}}>
              <svg style={{width:32,height:32,color:'#CBD5E1',margin:'0 auto 12px',display:'block'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <p style={{color:'var(--text-muted)', fontSize:13, margin:0}}>
                {search ? 'No test cases match your search.' : 'No test cases added yet. Click "Add TCs" to start.'}
              </p>
            </div>
          ) : (
            filtered.map(ptc => {
              const pri = ptc.test_case.priority as string;
              const priCfg = TC_PRI[pri] || { label: pri || 'Medium', cls: 'pri-badge pri-p3' };
              const tcEntry = tcResultMap.get(ptc.test_case_id);
              const result = tcEntry?.result || 'untested';
              const resultLabel = result.charAt(0).toUpperCase() + result.slice(1);
              const sbClass = RESULT_CLS[result] || 'sb-untested';
              const assigneeId = tcEntry?.assignee;
              const assignee = assigneeId ? profiles.get(assigneeId) : null;
              const assigneeInitials = assignee?.full_name
                ? assignee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()
                : assignee?.email?.slice(0,2).toUpperCase() ?? null;
              return (
                <div key={ptc.test_case_id} className="tc-row">
                  <div style={{width:16,height:16,border:'1.5px solid var(--border)',borderRadius:3,background:'#fff'}} />
                  <div className="tc-id">{ptc.test_case.custom_id || ptc.test_case_id.slice(0,8)}</div>
                  <div>
                    <div style={{fontWeight:500, fontSize:13}}>{ptc.test_case.title}</div>
                    {Array.isArray(ptc.test_case.tags) && ptc.test_case.tags.length > 0 && (
                      <div style={{fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:4}}>
                        {ptc.test_case.tags.slice(0,2).map(t=>(
                          <span key={t} style={{fontFamily:'JetBrains Mono,monospace', fontSize:10, background:'var(--bg-subtle)', padding:'1px 4px', borderRadius:3}}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:12, color:'var(--text-muted)'}}>
                    {ptc.test_case.folder ? (() => {
                      const f = folders.find(fd => fd.name === ptc.test_case.folder);
                      const fs = FOLDER_COLOR_MAP[f?.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                      return (
                        <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                          <span style={{width:18, height:18, borderRadius:4, background:fs.bg, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                            <i className={f?.icon || 'ri-folder-line'} style={{fontSize:11, color:fs.fg}} />
                          </span>
                          <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{ptc.test_case.folder}</span>
                        </span>
                      );
                    })() : '—'}
                  </div>
                  <div><span className={priCfg.cls}>{priCfg.label}</span></div>
                  <div><span className={sbClass}><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor'}} />{resultLabel}</span></div>
                  <div>
                    {assigneeInitials ? (
                      <div style={{display:'flex', alignItems:'center', gap:5}}>
                        <span style={{width:22,height:22,borderRadius:'50%',background:'var(--primary-50)',color:'var(--primary)',fontSize:9,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'none'}}>{assigneeInitials}</span>
                        <span style={{fontSize:11.5, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:90}}>
                          {assignee?.full_name?.split(' ')[0] || assignee?.email}
                        </span>
                      </div>
                    ) : (
                      <span style={{fontSize:11.5, color:'var(--text-subtle)'}}>—</span>
                    )}
                  </div>
                  {!plan.is_locked && (
                    <button onClick={()=>onRemoveTc(ptc.test_case_id)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-subtle)',padding:'0 2px',fontSize:14}}>×</button>
                  )}
                </div>
              );
            })
          )}
          <div style={{padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', fontSize:12, color:'var(--text-muted)', alignItems:'center'}}>
            Showing {filtered.length} of {planTcs.length}
            {planTcs.length > filtered.length && (
              <div style={{marginLeft:'auto', display:'flex', gap:6}}>
                <button className="pd-btn pd-btn-sm">Previous</button>
                <button className="pd-btn pd-btn-sm">Next</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
        driftCount={driftCount} onLock={onLock} onUnlock={onUnlock} onRebase={onRebase} planTcs={planTcs}
        runs={runs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} projectId={plan.project_id} currentUserProfile={currentUserProfile} />

      {/* TC Picker Modal — runs-style */}
      {showPicker && (() => {
        const closePicker = () => { setShowPicker(false); setPickerSearch(''); setPickerFolder(''); setPickerIncludeDraft(false); setPickerSelectedIds(new Set()); };
        const notAdded = allTcs.filter(tc => !includedIds.has(tc.id));
        const draftCount = notAdded.filter(tc => tc.lifecycle_status === 'draft').length;
        const baseTcs = pickerIncludeDraft ? notAdded : notAdded.filter(tc => tc.lifecycle_status !== 'draft');
        const folderFiltered = pickerFolder
          ? baseTcs.filter(tc => pickerFolder === '__none__' ? !tc.folder : tc.folder === pickerFolder)
          : baseTcs;
        const visibleTcs = folderFiltered
          .filter(tc => !pickerSearch || tc.title.toLowerCase().includes(pickerSearch.toLowerCase()))
          .sort((a, b) => {
            const aId = a.custom_id || '';
            const bId = b.custom_id || '';
            // Numeric-aware sort: TC-001 < TC-002 < TC-010
            const aNum = parseInt(aId.replace(/\D/g, ''), 10);
            const bNum = parseInt(bId.replace(/\D/g, ''), 10);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return aId.localeCompare(bId);
          });
        const uniqueFolders = [...new Set(notAdded.map(tc => tc.folder).filter(Boolean))] as string[];
        const allVisibleSelected = visibleTcs.length > 0 && visibleTcs.every(tc => pickerSelectedIds.has(tc.id));
        return (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) closePicker(); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <svg style={{width:14,height:14,color:'#6366f1'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <span className="text-[0.9375rem] font-bold text-gray-900">Add Test Cases</span>
                </div>
                <button onClick={closePicker} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100">
                  <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {/* Filter bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
                <div className="relative flex-1 min-w-[140px]">
                  <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:'#94a3b8'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}
                    placeholder="Search test cases..." autoFocus
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                {uniqueFolders.length > 0 && (
                  <select value={pickerFolder} onChange={e=>setPickerFolder(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer bg-white">
                    <option value="">All Folders</option>
                    {uniqueFolders.map(f => <option key={f} value={f}>{f}</option>)}
                    <option value="__none__">No Folder</option>
                  </select>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setPickerIncludeDraft(p => !p)}
                    className={`relative flex-shrink-0 cursor-pointer transition-colors duration-200 rounded-full overflow-hidden ${pickerIncludeDraft ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    style={{width:42,height:24}}>
                    <span className="absolute top-[3px] left-0 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200"
                      style={{transform: pickerIncludeDraft ? 'translateX(21px)' : 'translateX(3px)'}} />
                  </button>
                  <span className="text-xs text-gray-600 font-medium whitespace-nowrap">Include Draft TCs</span>
                  {!pickerIncludeDraft && draftCount > 0 && (
                    <span className="text-[10px] text-gray-400">{draftCount} hidden</span>
                  )}
                </div>
              </div>
              {/* Summary row */}
              <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                {visibleTcs.length} test case{visibleTcs.length !== 1 ? 's' : ''} available
              </div>
              {/* TC table */}
              <div className="max-h-[42vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                    <tr>
                      <th className="px-5 py-2.5 w-9">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                          checked={allVisibleSelected}
                          onChange={() => {
                            if (allVisibleSelected) {
                              setPickerSelectedIds(prev => { const n = new Set(prev); visibleTcs.forEach(tc => n.delete(tc.id)); return n; });
                            } else {
                              setPickerSelectedIds(prev => { const n = new Set(prev); visibleTcs.forEach(tc => n.add(tc.id)); return n; });
                            }
                          }} />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleTcs.map(tc => {
                      const selected = pickerSelectedIds.has(tc.id);
                      const isDraft = tc.lifecycle_status === 'draft';
                      return (
                        <tr key={tc.id}
                          onClick={() => setPickerSelectedIds(prev => { const n = new Set(prev); if (n.has(tc.id)) n.delete(tc.id); else n.add(tc.id); return n; })}
                          className={`cursor-pointer transition-colors ${isDraft ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-indigo-50/40'}`}>
                          <td className="px-5 py-2.5">
                            <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                              checked={selected} onChange={() => {}} />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[0.8125rem] text-indigo-600 font-semibold whitespace-nowrap">
                            {tc.custom_id || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-gray-800">
                            <div>{tc.title}</div>
                            {tc.folder && <div className="text-[10px] text-gray-400 mt-0.5">{tc.folder}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                              isDraft ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-800 border-green-200'
                            }`}>
                              {isDraft ? 'Draft' : 'Active'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              tc.priority === 'critical' ? 'bg-red-100 text-red-700'
                              : tc.priority === 'high' ? 'bg-amber-100 text-amber-700'
                              : tc.priority === 'medium' ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>{tc.priority?.toUpperCase()}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleTcs.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">
                        {pickerSearch ? 'No test cases match your search.' : 'All test cases already added.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-500">
                  <strong className="text-gray-900 text-sm">{pickerSelectedIds.size}</strong> selected
                </span>
                <div className="flex gap-2">
                  <button onClick={closePicker}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">Cancel</button>
                  <button
                    onClick={() => { onAddTcs([...pickerSelectedIds]); closePicker(); }}
                    disabled={pickerSelectedIds.size === 0}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold cursor-pointer disabled:opacity-50">
                    Add {pickerSelectedIds.size > 0 ? `${pickerSelectedIds.size} TC${pickerSelectedIds.size > 1 ? 's' : ''}` : 'TCs'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Tab: Runs ────────────────────────────────────────────────────────────────

function RunsTab({ runs, projectId, planId, planTcCount, milestone, parentMilestone, profiles, plan, driftCount, onLock, onUnlock, onRebase, planTcs, tcResultMap, dailyExecCounts, currentUserProfile }: {
  runs: PlanRun[]; projectId: string; planId: string; planTcCount: number;
  milestone: Milestone | null; parentMilestone: Milestone | null;
  profiles: Map<string, Profile>; plan: TestPlan;
  driftCount: number; onLock: () => Promise<void>; onUnlock: () => Promise<void>; onRebase: () => Promise<void>;
  planTcs: PlanTestCase[];
  tcResultMap: Map<string, { result: string; assignee: string | null }>; dailyExecCounts: number[];
  currentUserProfile: Profile | null;
}) {
  const navigate = useNavigate();
  const totalRuns = runs.length;

  // Best pass rate + which run
  let bestPassRate = 0;
  let bestRunLabel = '—';
  runs.forEach(r => {
    const executed = r.passed + r.failed + r.blocked;
    const rate = executed > 0 ? Math.round(r.passed / executed * 100) : 0;
    if (rate > bestPassRate) {
      bestPassRate = rate;
      bestRunLabel = `${r.name} (${new Date(r.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'})})`;
    }
  });

  const latest = runs[0];
  const latestAgo = latest ? (() => {
    const diff = Date.now() - new Date(latest.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  })() : '';

  // Env coverage
  const envs = new Set(runs.map(r => r.environment).filter(Boolean));
  const envCount = envs.size || 0;

  const getRunIcon = (r: PlanRun) => {
    const executed = r.passed + r.failed + r.blocked;
    const rate = executed > 0 ? r.passed / executed : 0;
    if (r.status === 'in_progress') return 'inprogress';
    if (r.status === 'new') return 'notstarted';
    if (executed === 0) return 'notstarted';
    if (rate >= 0.9) return 'pass';
    if (rate >= 0.6) return 'mixed';
    return 'fail';
  };

  const runIconSvg = (type: string) => {
    if (type === 'pass')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    if (type === 'mixed' || type === 'inprogress')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
    if (type === 'fail')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
  };

  const startNewRun = () => navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}${plan.milestone_id ? `&milestone_id=${plan.milestone_id}` : ''}`);

  return (
    <div className="plan-layout">
      <div>
        {/* Runs summary strip */}
        <div className="runs-strip" style={{margin:0, marginBottom:14}}>
          <div className="strip-stat">
            <div className="l">Total Runs</div>
            <div className="v">{totalRuns}</div>
            <div className="sub">{totalRuns > 0 ? 'plan-linked' : 'no runs yet'}</div>
          </div>
          <div className="strip-stat">
            <div className="l">Best Pass Rate</div>
            <div className="v" style={{color: bestPassRate >= 90 ? 'var(--success-600)' : bestPassRate >= 70 ? 'var(--warning)' : totalRuns > 0 ? 'var(--danger-600)' : 'var(--text-muted)'}}>{totalRuns > 0 ? `${bestPassRate}%` : '—'}</div>
            <div className="sub">{totalRuns > 0 ? bestRunLabel : '—'}</div>
          </div>
          <div className="strip-stat">
            <div className="l">Latest</div>
            <div className="v" style={{fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{latest ? latest.name : '—'}</div>
            <div className="sub">{latest ? `${latestAgo}${latest.assignee_names?.length ? ` · ${latest.assignee_names[0]}` : ''}` : '—'}</div>
          </div>
          <div className="strip-stat">
            <div className="l">Envs Covered</div>
            <div className="v">{envCount > 0 ? envCount : '—'}</div>
            <div className="sub">{envCount > 0 ? [...envs].slice(0, 3).join(', ') : 'no env data'}</div>
          </div>
          <div>
            <button className="pd-btn pd-btn-primary" onClick={startNewRun}>
              <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              New Run
            </button>
          </div>
        </div>

        {/* Run cards */}
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {runs.map((r, idx) => {
            const runNumber = totalRuns - idx; // runs sorted desc by created_at
            const totalTc = r.passed + r.failed + r.blocked + r.retest + r.untested;
            const executed = r.passed + r.failed + r.blocked + r.retest;
            const passRate = executed > 0 ? Math.round(r.passed / executed * 100) : 0;
            const passW = executed > 0 ? (r.passed / executed * 100) : 0;
            const failW = executed > 0 ? (r.failed / executed * 100) : 0;
            const iconType = getRunIcon(r);
            const createdDate = new Date(r.created_at);
            const dateStr = createdDate.toLocaleDateString('en-US', {month:'short',day:'numeric'});
            const timeStr = createdDate.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false});
            const ago = (() => {
              const diff = Date.now() - createdDate.getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })();

            return (
              <div key={r.id} className="run-card" style={{
                display:'grid', gridTemplateColumns:'36px minmax(200px,1.6fr) 120px minmax(140px,1fr) auto',
                gap:16, alignItems:'center', padding:'14px 16px', cursor:'pointer',
                background:'#fff', border:'1px solid var(--border)', borderRadius:10
              }}
                onClick={()=>navigate(`/projects/${projectId}/runs/${r.id}`)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none';}}>

                {/* Icon */}
                <div className={`run-icon ${iconType}`} style={{width:36,height:36,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
                  background: iconType==='pass'?'var(--success)':iconType==='mixed'?'var(--warning)':iconType==='fail'?'var(--danger)':iconType==='inprogress'?'var(--primary)':'var(--text-subtle)'}}>
                  {runIconSvg(iconType)}
                </div>

                {/* Title & sub */}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--text)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,background:'var(--bg-subtle)',color:'var(--text-muted)',padding:'1px 6px',borderRadius:3,fontWeight:500,flexShrink:0}}>Run #{runNumber}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                    <span><b style={{color:'var(--text)',fontWeight:500}}>{dateStr}, {timeStr}</b> · {ago}</span>
                    <span>{executed} of {totalTc} executed{r.untested > 0 ? ` · ${r.untested} untested` : ''}</span>
                    {r.environment && (
                      <span style={{fontSize:10.5,background:'var(--bg-subtle)',border:'1px solid var(--border)',borderRadius:4,padding:'1px 6px'}}>{r.environment}</span>
                    )}
                  </div>
                </div>

                {/* Pass rate bar */}
                <div>
                  <div style={{fontSize:18,fontWeight:700,lineHeight:1.1,
                    color: passRate>=90?'var(--success-600)':passRate>=70?'var(--warning)':executed>0?'var(--danger-600)':'var(--text-muted)'}}>
                    {executed > 0 ? `${passRate}%` : '—'}
                  </div>
                  <div style={{marginTop:4,height:5,background:'var(--bg-subtle)',borderRadius:3,overflow:'hidden',position:'relative'}}>
                    <div style={{position:'absolute',left:0,top:0,bottom:0,background:'var(--success)',width:`${passW}%`}} />
                    <div style={{position:'absolute',left:`${passW}%`,top:0,bottom:0,background:'var(--danger)',width:`${failW}%`}} />
                  </div>
                  <div style={{fontSize:10.5,color:'var(--text-muted)',marginTop:3}}>
                    {r.passed} pass · {r.failed} fail{r.blocked > 0 ? ` · ${r.blocked} block` : ''}
                  </div>
                </div>

                {/* Assignees */}
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {(r.assignee_names?.length ?? 0) > 0 ? (
                    <>
                      <div style={{display:'flex'}}>
                        {r.assignee_ids!.map((uid, ai) => (
                          <span key={uid} style={{marginLeft: ai > 0 ? -6 : 0}}>
                            <Avatar userId={uid} name={r.assignee_names![ai] || undefined} size="xs" />
                          </span>
                        ))}
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500}}>{r.assignee_names![0]}</div>
                        {r.assignee_names!.length > 1 && (
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>+{r.assignee_names!.length - 1} more</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Unassigned</div>
                  )}
                </div>

                {/* View action */}
                <div>
                  <button className="pd-btn pd-btn-sm" onClick={e=>{e.stopPropagation();navigate(`/projects/${projectId}/runs/${r.id}`);}}>
                    <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    View
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Run CTA */}
          <div className="new-run-card" onClick={startNewRun} style={{marginTop:4}}>
            <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Start a new Run with these {planTcCount} TCs
            <span style={{fontSize:11.5, color:'var(--text-muted)', fontWeight:400}}>· opens New Run modal with Plan pre-selected</span>
          </div>

          {runs.length === 0 && (
            <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13, marginTop:8}}>No runs linked to this plan yet.</div>
          )}
        </div>
      </div>

      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
        driftCount={driftCount} onLock={onLock} onUnlock={onUnlock} onRebase={onRebase} planTcs={planTcs}
        runs={runs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} projectId={plan.project_id} currentUserProfile={currentUserProfile} />
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({ logs, profiles, plan, milestone, parentMilestone, driftCount, onLock, onUnlock, onRebase, planTcs, runs, tcResultMap, dailyExecCounts, currentUserProfile }: {
  logs: ActivityLog[]; profiles: Map<string, Profile>;
  plan: TestPlan; milestone: Milestone | null; parentMilestone: Milestone | null;
  driftCount: number; onLock: () => Promise<void>; onUnlock: () => Promise<void>; onRebase: () => Promise<void>;
  planTcs: PlanTestCase[];
  runs: PlanRun[]; tcResultMap: Map<string, { result: string; assignee: string | null }>; dailyExecCounts: number[];
  currentUserProfile: Profile | null;
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | 'all'>('14d');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showDateMenu && dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDateMenu]);

  // Date-filtered logs
  const dateLogs = useMemo(() => {
    if (dateRange === 'all') return logs;
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return logs.filter(l => new Date(l.created_at) >= cutoff);
  }, [logs, dateRange]);

  const isResultEvent = (t: string) => t.includes('test_result') || t.includes('result');
  const isRunEvent = (t: string) => t.includes('run') && !t.includes('result');
  const isTcEvent = (t: string) => t.includes('tc_') || t.includes('test_case');
  const isAiEvent = (t: string) => t.startsWith('ai_') || t.includes('_ai_') || t === 'ai';
  const isStatusEvent = (t: string) => t.includes('status') || t.includes('snapshot') || t.includes('lock') || t.includes('plan_') || t.includes('criteria') || t.includes('update');

  const filters = [
    { key: 'all',     label: 'All',      dot: '', count: dateLogs.length },
    { key: 'results', label: 'Results',  dot: 'var(--success)', count: dateLogs.filter(l=>isResultEvent(l.event_type||'')).length },
    { key: 'runs',    label: 'Runs',     dot: 'var(--blue,#3B82F6)', count: dateLogs.filter(l=>isRunEvent(l.event_type||'')).length },
    { key: 'tc',      label: 'TC Edits', dot: 'var(--warning)', count: dateLogs.filter(l=>isTcEvent(l.event_type||'')).length },
    { key: 'ai',      label: 'AI',       dot: 'var(--violet)', count: dateLogs.filter(l=>isAiEvent(l.event_type||'')).length },
    { key: 'status',  label: 'Status',   dot: 'var(--text-subtle)', count: dateLogs.filter(l=>isStatusEvent(l.event_type||'')).length },
  ];

  const filtered = activeFilter === 'all' ? dateLogs
    : activeFilter === 'results' ? dateLogs.filter(l=>isResultEvent(l.event_type||''))
    : activeFilter === 'runs' ? dateLogs.filter(l=>isRunEvent(l.event_type||''))
    : activeFilter === 'tc' ? dateLogs.filter(l=>isTcEvent(l.event_type||''))
    : activeFilter === 'ai' ? dateLogs.filter(l=>isAiEvent(l.event_type||''))
    : dateLogs.filter(l=>isStatusEvent(l.event_type||''));

  const handleExport = async () => {
    // Fetch user timezone/format preferences
    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let dateFmt = 'YYYY-MM-DD';
    let timeFmt: '24h' | '12h' = '24h';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase.from('profiles')
          .select('timezone, date_format, time_format, auto_detect_tz')
          .eq('id', user.id).maybeSingle();
        if (prefs) {
          if (!prefs.auto_detect_tz && prefs.timezone) tz = prefs.timezone;
          if (prefs.date_format) dateFmt = prefs.date_format;
          if (prefs.time_format) timeFmt = prefs.time_format as '24h' | '12h';
        }
      }
    } catch { /* use defaults */ }
    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      const opts: Intl.DateTimeFormatOptions = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: timeFmt === '12h' };
      return new Intl.DateTimeFormat('en-US', opts).format(d);
    };
    const rows = filtered.map(l => ({
      date: fmtDate(l.created_at),
      event: l.event_type,
      actor: profiles.get(l.actor_id)?.full_name || profiles.get(l.actor_id)?.email || '',
      details: l.metadata?.details || l.metadata?.tc_title || l.metadata?.name || '',
    }));
    const csv = ['Date,Event,Actor,Details', ...rows.map(r => `"${r.date}","${r.event}","${r.actor}","${r.details.replace(/"/g,'""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activity_${plan.name.replace(/\s+/g,'_')}_${dateRange}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const groupByDay = (logs: ActivityLog[]) => {
    const groups: Record<string, ActivityLog[]> = {};
    logs.forEach(log => {
      const d = new Date(log.created_at);
      const key = d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  };

  const grouped = groupByDay(filtered);

  const eventStyle = (type: string): { cls: string; iconCls: string; icon: JSX.Element } => {
    if (type.includes('pass') || type.includes('complete'))
      return { cls: 'success', iconCls: 'success', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> };
    if (type.includes('fail') || type.includes('block'))
      return { cls: 'fail', iconCls: 'fail', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> };
    if (type.includes('ai'))
      return { cls: 'violet', iconCls: 'violet', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg> };
    if (type.includes('status') || type.includes('update') || type.includes('edit') || type.includes('criteria'))
      return { cls: 'warning', iconCls: 'warning', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> };
    if (type.includes('run') || type.includes('start') || type.includes('create'))
      return { cls: 'info', iconCls: 'info', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> };
    if (type.includes('add') || type.includes('insert'))
      return { cls: 'info', iconCls: 'info', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> };
    if (type.includes('lock') || type.includes('snapshot'))
      return { cls: 'violet', iconCls: 'violet', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> };
    return { cls: 'info', iconCls: 'info', icon: <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> };
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12: false });

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = new Date(); y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  };

  const getDayLabel = (dateStr: string, firstLog: ActivityLog) => {
    if (isToday(firstLog.created_at)) return `Today · ${new Date(firstLog.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'})}`;
    if (isYesterday(firstLog.created_at)) return `Yesterday · ${new Date(firstLog.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'})}`;
    return dateStr;
  };

  return (
    <div className="activity-layout">
      <div>
        {/* Filter pills */}
        <div style={{display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center'}}>
          {filters.map(f => (
            <button key={f.key} className={`filter-pill ${activeFilter===f.key?'active':''}`}
              onClick={()=>setActiveFilter(f.key)}>
              {f.dot && <span style={{width:6,height:6,borderRadius:'50%',background:f.dot,flex:'none'}} />}
              {f.label} <span style={{opacity:0.7, fontSize:10.5}}>{f.count}</span>
            </button>
          ))}
          <div style={{marginLeft:'auto', display:'flex', gap:6}}>
            <div ref={dateMenuRef} style={{position:'relative'}}>
              <button className="pd-btn pd-btn-sm" onClick={()=>setShowDateMenu(!showDateMenu)}>
                {dateRange === 'all' ? 'All time' : `Last ${dateRange}`} <svg style={{width:10,height:10,marginLeft:2}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showDateMenu && (
                <div style={{position:'absolute',right:0,top:'100%',marginTop:4,background:'#fff',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,.1)',zIndex:20,minWidth:120,overflow:'hidden'}}>
                  {([['7d','Last 7d'],['14d','Last 14d'],['30d','Last 30d'],['all','All time']] as const).map(([v,l])=>(
                    <div key={v} onClick={()=>{setDateRange(v); setShowDateMenu(false);}}
                      style={{padding:'8px 12px',fontSize:12,cursor:'pointer',fontWeight:dateRange===v?600:400,color:dateRange===v?'var(--primary)':'var(--text)',background:dateRange===v?'var(--primary-50)':'transparent'}}
                      onMouseEnter={e=>{if(dateRange!==v) e.currentTarget.style.background='var(--bg-subtle)';}}
                      onMouseLeave={e=>{if(dateRange!==v) e.currentTarget.style.background='transparent';}}>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="pd-btn pd-btn-sm" onClick={handleExport}>
              <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>

        {/* Timeline */}
        {Object.keys(grouped).length === 0 ? (
          <div style={{textAlign:'center', padding:'3rem 1rem', border:'2px dashed var(--border)', borderRadius:10}}>
            <p style={{color:'var(--text-muted)', fontSize:13, margin:0}}>No activity recorded yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              <div className="day-header">
                {getDayLabel(day, dayLogs[0])}
                {isToday(dayLogs[0].created_at) && <span className="today">{dayLogs.length} events</span>}
                {!isToday(dayLogs[0].created_at) && <span style={{background:'var(--bg-subtle)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:10, fontSize:10}}>{dayLogs.length}</span>}
              </div>
              <div className="timeline">
                {dayLogs.map(log => {
                  const actor = profiles.get(log.actor_id);
                  const actorName = actor?.full_name || actor?.email || 'System';
                  const { cls, iconCls, icon } = eventStyle(log.event_type || '');
                  const evtType = log.event_type || '';
                  const metaDetails = log.metadata?.details;
                  const metaStatus = log.metadata?.status;

                  // Human-readable description
                  let desc = '';
                  let metaLine = metaDetails || '';
                  const md = log.metadata || {};
                  if (evtType.includes('test_result_passed')) { desc = 'recorded'; metaLine = `${md.tc_custom_id || ''} ${md.tc_title || ''} · ${md.run_name || ''}`.trim(); }
                  else if (evtType.includes('test_result_failed')) { desc = 'recorded'; metaLine = `${md.tc_custom_id || ''} ${md.tc_title || ''} · ${md.run_name || ''} · ${md.priority || ''}`.trim(); }
                  else if (evtType.includes('test_result_blocked')) { desc = 'recorded'; metaLine = `${md.tc_custom_id || ''} ${md.tc_title || ''} · ${md.run_name || ''}`.trim(); }
                  else if (evtType.includes('test_result_retest')) { desc = 'recorded'; metaLine = `${md.tc_custom_id || ''} ${md.tc_title || ''} · ${md.run_name || ''}`.trim(); }
                  else if (evtType.includes('run_status')) { desc = `changed run status`; metaLine = md.run_name || md.name || ''; }
                  else if (evtType.includes('tc_added')) desc = 'added test cases to the plan';
                  else if (evtType.includes('tc_removed')) desc = 'removed a test case from the plan';
                  else if (evtType.includes('snapshot_locked')) desc = 'locked the snapshot';
                  else if (evtType.includes('snapshot_unlocked')) desc = 'unlocked the snapshot';
                  else if (evtType.includes('snapshot_rebased')) desc = 'rebased snapshot to latest';
                  else if (evtType.includes('status_changed')) desc = 'changed plan status';
                  else if (evtType.includes('criteria_updated')) desc = 'updated entry/exit criteria';
                  else if (evtType.includes('plan_updated')) desc = 'updated plan settings';
                  else if (evtType.includes('plan_deleted')) desc = 'deleted the plan';
                  else if (evtType.includes('plan_created') || evtType.includes('test_plan_created')) desc = 'created the plan';
                  else if (evtType.includes('milestone')) desc = evtType.replace(/_/g, ' ');
                  else desc = evtType.replace(/_/g, ' ');

                  // Status from metadata
                  const displayStatus = metaStatus || md.status;

                  return (
                    <div key={log.id} className={`t-event ${cls}`}>
                      <div className={`t-event-icon ${iconCls}`}>{icon}</div>
                      <div className="t-event-body">
                        <div className="what">
                          <b>{actorName}</b> {desc}
                          {displayStatus && <> <span className={`pill ${displayStatus === 'passed' || displayStatus === 'completed' ? 'success' : displayStatus === 'failed' ? 'danger' : displayStatus === 'blocked' ? 'danger' : displayStatus === 'active' || displayStatus === 'in_progress' ? 'violet' : ''}`}>{displayStatus.replace(/_/g,' ')}</span></>}
                          {md.tc_custom_id && !metaLine && <> on <span className="pill">{md.tc_custom_id}</span></>}
                        </div>
                        {metaLine && (
                          <div className="meta">{metaLine}</div>
                        )}
                      </div>
                      <div className="when">{formatTime(log.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
        driftCount={driftCount} onLock={onLock} onUnlock={onUnlock} onRebase={onRebase} planTcs={planTcs}
        runs={runs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} projectId={plan.project_id} currentUserProfile={currentUserProfile} />
    </div>
  );
}

// ─── Tab: Issues ──────────────────────────────────────────────────────────────

function IssuesTab({ runs, plan, planTcs, milestone, parentMilestone, profiles, driftCount, onLock, onUnlock, onRebase, tcResultMap, dailyExecCounts, currentUserProfile, onIssuesCount }: {
  runs: PlanRun[]; plan: TestPlan; planTcs: PlanTestCase[];
  milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>;
  driftCount: number; onLock: () => Promise<void>; onUnlock: () => Promise<void>; onRebase: () => Promise<void>;
  tcResultMap: Map<string, { result: string; assignee: string | null }>; dailyExecCounts: number[];
  currentUserProfile: Profile | null;
  onIssuesCount?: (count: number) => void;
}) {
  const runIds = runs.map(r => r.id);
  return (
    <div className="plan-layout">
      <div>
        <IssuesList runIds={runIds} onCountChange={onIssuesCount} allowRefresh={true} />
      </div>
      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
        driftCount={driftCount} onLock={onLock} onUnlock={onUnlock} onRebase={onRebase} planTcs={planTcs}
        runs={runs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} projectId={plan.project_id} currentUserProfile={currentUserProfile} />
    </div>
  );
}

// ─── Tab: Environments ────────────────────────────────────────────────────────

function EnvironmentsTab({ plan, planTcs }: { plan: TestPlan; planTcs: PlanTestCase[] }) {
  const { t } = useTranslation('environments');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [matrix, setMatrix] = useState<HeatmapMatrix | null>(null);

  // Mobile viewport detection (Design Spec §2-5): <768px → 400px cap.
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        // 1) Fetch ALL runs for this plan (so we can count legacy-only runs)
        const { data: allRunsData, error: runsErr } = await supabase
          .from('test_runs')
          .select('id, environment_id')
          .eq('test_plan_id', plan.id);
        if (runsErr) throw runsErr;
        const allRuns = (allRunsData ?? []) as Array<{ id: string; environment_id: string | null }>;
        const structuredRuns = allRuns.filter(r => !!r.environment_id);
        const legacyRunCount = allRuns.length - structuredRuns.length;

        // 2) Fetch test_results for structured runs only
        const runIds = structuredRuns.map(r => r.id);
        let results: Array<{ run_id: string; test_case_id: string; status: string }> = [];
        if (runIds.length > 0) {
          const { data: resultsData, error: resErr } = await supabase
            .from('test_results')
            .select('run_id, test_case_id, status')
            .in('run_id', runIds);
          if (resErr) throw resErr;
          results = resultsData ?? [];
        }

        // 3) Fetch referenced environments (only those used by runs in this plan)
        const envIds = [...new Set(structuredRuns.map(r => r.environment_id as string))];
        let envs: Environment[] = [];
        if (envIds.length > 0) {
          const { data: envsData, error: envErr } = await supabase
            .from('environments')
            .select('id, project_id, name, os_name, os_version, browser_name, browser_version, device_type, description, is_active, created_by, created_at, updated_at')
            .in('id', envIds);
          if (envErr) throw envErr;
          envs = (envsData ?? []) as Environment[];
        }

        // 4) Build heatmap from Plan's test_plan_test_cases
        const tcRows = planTcs.map(ptc => ({
          id: ptc.test_case_id,
          title: ptc.test_case.title,
          priority: ptc.test_case.priority,
          custom_id: ptc.test_case.custom_id,
        }));

        const built = buildEnvironmentHeatmap({
          runs: structuredRuns,
          results,
          envs,
          testCases: tcRows,
          legacyRunCount,
        });

        if (!cancelled) setMatrix(built);
      } catch (e) {
        console.error('[EnvironmentsTab] load failed', e);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [plan.id, planTcs]);

  const wrapperStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobileViewport ? '1fr' : 'minmax(0,1fr) 280px',
    gap: 14,
    padding: isMobileViewport ? '16px 12px' : '16px 24px',
  };

  if (loading) {
    return (
      <div style={wrapperStyle}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ height: 16, background: '#F1F5F9', borderRadius: 4, marginBottom: 12, width: 240 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '240px repeat(6, 64px)', gap: 8 }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{ height: 38, background: '#F8FAFC', borderRadius: 5 }} />
            ))}
          </div>
        </div>
        <EnvironmentAIInsights matrix={null} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={wrapperStyle}>
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
        }}>
          {t('heatmap.loadFailed')}
        </div>
        <EnvironmentAIInsights matrix={null} />
      </div>
    );
  }

  // No data scenarios
  const hasStructuredData = matrix && matrix.columns.length > 0 && matrix.rows.length > 0;

  if (!hasStructuredData) {
    const emptyMsg = !matrix || matrix.columns.length === 0
      ? (matrix?.legacyRunCount ?? 0) > 0
        ? t('heatmap.emptyLegacyOnly')
        : t('heatmap.empty')
      : t('heatmap.emptyNoTcs');
    return (
      <div style={wrapperStyle}>
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <svg style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            {t('heatmap.title')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
            {emptyMsg}
          </div>
          {(matrix?.legacyRunCount ?? 0) > 0 && (
            <div style={{
              marginTop: 16, padding: '8px 12px', borderRadius: 6,
              background: '#FFFBEB', border: '1px solid #FDE68A',
              fontSize: 11, color: '#92400E', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {t('heatmap.legacyWarning', { count: matrix!.legacyRunCount })}
            </div>
          )}
        </div>
        <EnvironmentAIInsights matrix={matrix} />
      </div>
    );
  }

  const groups = matrix.groups;
  const columns = matrix.columns;

  return (
    <div style={wrapperStyle}>
      {/* Heatmap card */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg style={{ width: 14, height: 14, color: 'var(--primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            {t('heatmap.title')}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {plan.name} · {t('heatmap.tcsByEnvs', { tcs: matrix.rows.length, envs: columns.length })}
          </span>
        </div>
        <div
          className="matrix-scroll"
          style={{
            maxHeight: isMobileViewport ? 'min(calc(100vh - 280px), 480px)' : 'min(calc(100vh - 320px), 560px)',
            overflow: 'auto',
            padding: '0 16px 12px',
          }}
        >
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 5, background: '#fff', minWidth: 240, textAlign: 'left', padding: '0 14px 0 6px' }}></th>
                {groups.map(g => (
                  <th key={g.os} colSpan={g.columns.length}
                    style={{ position: 'sticky', top: 0, zIndex: 3, fontWeight: 700, color: '#0F172A', padding: '6px 8px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11, background: '#F9FAFB', borderRadius: 6, textAlign: 'center' }}>
                    {g.os}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: 38, left: 0, zIndex: 5, background: '#fff', padding: '8px 14px 10px 6px' }}></th>
                {columns.map(col => (
                  <th key={col.env.id} style={{ position: 'sticky', top: 38, zIndex: 3, background: '#fff', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '8px 4px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {col.browserLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map(row => {
                const pri = row.tc.priority;
                const priLabel = pri === 'critical' ? 'P0'
                  : pri === 'high' ? 'P1'
                  : pri === 'medium' ? 'P2'
                  : pri === 'low' ? 'P3'
                  : '';
                const isTopPri = pri === 'critical' || pri === 'high';
                return (
                  <tr key={row.tc.id}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 2, background: '#fff', textAlign: 'left', padding: '0 14px 0 6px', whiteSpace: 'nowrap', minWidth: 240, boxShadow: '2px 0 4px -2px rgba(0,0,0,0.04)' }}>
                      {row.tc.custom_id && (
                        <span style={{ color: 'var(--primary)', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, marginRight: 8 }}>
                          {row.tc.custom_id}
                        </span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.tc.title}</span>
                      {priLabel && (
                        <span style={{
                          fontSize: 10,
                          color: isTopPri ? 'var(--danger-600)' : 'var(--text-muted)',
                          marginLeft: 6,
                          background: isTopPri ? 'var(--danger-50)' : 'var(--bg-subtle)',
                          padding: '1px 5px',
                          borderRadius: 3,
                        }}>{priLabel}</span>
                      )}
                    </td>
                    {row.cells.map((cell, ci) => {
                      const hm = HEATMAP_COLORS[cell.status] ?? HEATMAP_COLORS.untested;
                      const isUntested = cell.executed === 0 && cell.status !== 'na';
                      const isNA = cell.status === 'na';
                      return (
                        <td key={ci}>
                          <div
                            title={cell.tooltip}
                            style={{
                              width: 64, height: 38, borderRadius: 5,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: isUntested || isNA ? 500 : 700,
                              fontSize: isUntested ? 16 : isNA ? 11 : 13,
                              background: hm.bg, color: hm.color,
                              cursor: 'default',
                              border: isUntested ? '1px dashed #9CA3AF' : 'none',
                            }}
                          >
                            {cellLabel(cell.status, cell.passed, cell.executed)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Summary row */}
              <tr style={{ paddingTop: 12 }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 2, background: '#F9FAFB', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', padding: '12px 14px 4px 6px', whiteSpace: 'nowrap' }}>
                  {t('heatmap.envSummary')}
                </td>
                {matrix.summary.map((cell, ci) => {
                  const hm = HEATMAP_COLORS[cell.status] ?? HEATMAP_COLORS.untested;
                  const isUntested = cell.executed === 0 && cell.status !== 'na';
                  const isNA = cell.status === 'na';
                  return (
                    <td key={ci} style={{ paddingTop: 12 }}>
                      <div
                        title={cell.tooltip}
                        style={{
                          width: 64, height: 38, borderRadius: 5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: isUntested || isNA ? 500 : 700,
                          fontSize: isUntested ? 16 : isNA ? 11 : 14,
                          background: hm.bg, color: hm.color,
                          border: isUntested ? '1px dashed #9CA3AF' : 'none',
                        }}
                      >
                        {cellLabel(cell.status, cell.passed, cell.executed)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legacy warning footer */}
        {matrix.legacyRunCount > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid #FDE68A',
            background: 'rgba(255, 251, 235, 0.5)',
            fontSize: 11, color: '#92400E',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {t('heatmap.legacyWarning', { count: matrix.legacyRunCount })}
          </div>
        )}
      </div>

      <EnvironmentAIInsights matrix={matrix} />

      {/* Legend strip — full width (spans heatmap + sidebar) per Design Spec §5 */}
      <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <b style={{ color: 'var(--text)' }}>{t('heatmap.scaleLabel')}</b>
        {(['perfect', 'pass', 'mixed', 'warn', 'fail', 'untested'] as const).map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 22, height: 14, borderRadius: 3, display: 'inline-block',
              background: HEATMAP_COLORS[k].bg,
              border: k === 'untested' ? '1px dashed #9CA3AF' : 'none',
            }} />
            {t(`heatmap.scale.${k}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({
  plan, milestones, profiles, memberProfiles, onUpdate, onDelete, entryPresets, exitPresets, onSavePreset,
}: {
  plan: TestPlan; milestones: Milestone[]; profiles: Map<string, Profile>; memberProfiles: Profile[];
  onUpdate: (data: Partial<TestPlan>) => Promise<void>;
  onDelete: () => void;
  entryPresets: string[]; exitPresets: string[];
  onSavePreset: (type: 'entry' | 'exit', text: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? '',
    status: plan.status,
    priority: plan.priority,
    milestone_id: plan.milestone_id ?? '',
    start_date: plan.start_date ?? '',
    end_date: plan.end_date ?? '',
    owner_id: plan.owner_id ?? '',
  });
  const initEntry = Array.isArray(plan.entry_criteria) ? plan.entry_criteria : [];
  const initExit = Array.isArray(plan.exit_criteria) ? plan.exit_criteria : [];
  const [entryCriteria, setEntryCriteria] = useState<string[]>(initEntry);
  const [exitCriteria, setExitCriteria] = useState<string[]>(initExit);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showEntryPresets, setShowEntryPresets] = useState(false);
  const [showExitPresets, setShowExitPresets] = useState(false);
  const entryPresetRef = useRef<HTMLDivElement>(null);
  const exitPresetRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showEntryPresets && entryPresetRef.current && !entryPresetRef.current.contains(e.target as Node)) setShowEntryPresets(false);
      if (showExitPresets && exitPresetRef.current && !exitPresetRef.current.contains(e.target as Node)) setShowExitPresets(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEntryPresets, showExitPresets]);

  const setFormField = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        milestone_id: form.milestone_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        owner_id: form.owner_id || null,
        entry_criteria: entryCriteria,
        exit_criteria: exitCriteria,
      });
      setDirty(false);
      showToast('Settings saved', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-layout">
      {/* Basic Information */}
      <div className="section-card">
        <div className="section-title">
          <span className="icn"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
          Basic Information
        </div>
        <div className="form-grid">
          {/* Plan Name — full width */}
          <div className="form-row-2">
            <label className="form-label">Plan Name *</label>
            <input className="form-input" value={form.name} onChange={e=>setFormField('name',e.target.value)} />
          </div>
          {/* Description — full width */}
          <div className="form-row-2">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description} onChange={e=>setFormField('description',e.target.value)}
              rows={3} style={{resize:'vertical', fontFamily:'inherit'}} />
          </div>
          {/* Owner (left) + Priority (right) */}
          <div>
            <label className="form-label">Owner</label>
            <div style={{position:'relative'}}>
              {form.owner_id && (() => {
                const owner = memberProfiles.find(p=>p.id===form.owner_id) || profiles.get(form.owner_id);
                if (!owner) return null;
                return (
                  <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',zIndex:1,pointerEvents:'none'}}>
                    <Avatar userId={owner.id} name={owner.full_name || undefined} email={owner.email || undefined} size="xs" />
                  </span>
                );
              })()}
              <select className="form-input" value={form.owner_id} onChange={e=>setFormField('owner_id',e.target.value)}
                style={{paddingLeft: form.owner_id && (memberProfiles.find(p=>p.id===form.owner_id) || profiles.get(form.owner_id)) ? 40 : 10}}>
                <option value="">— Unassigned —</option>
                {(memberProfiles.length > 0 ? memberProfiles : [...profiles.values()]).map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Priority</label>
            <div style={{display:'flex',gap:6}}>
              {(['critical','high','medium'] as const).map(p => (
                <button key={p} onClick={()=>setFormField('priority',p)}
                  style={{flex:1,padding:'7px 6px',textAlign:'center',border:'1px solid var(--border)',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
                    background: form.priority===p ? (p==='critical'?'var(--danger-50)':p==='high'?'var(--warning-50)':'var(--primary-50)') : '#fff',
                    borderColor: form.priority===p ? (p==='critical'?'var(--danger)':p==='high'?'var(--warning)':'var(--primary)') : 'var(--border)',
                    color: form.priority===p ? (p==='critical'?'var(--danger-600)':p==='high'?'var(--warning)':'var(--primary)') : 'var(--text-muted)',
                  }}>
                  {p==='critical'?'P1':p==='high'?'P2':'P3'}
                </button>
              ))}
            </div>
          </div>
          {/* Dates — full width, two inputs side-by-side */}
          <div className="form-row-2">
            <label className="form-label">Dates</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <input type="date" className="form-input" value={form.start_date} onChange={e=>setFormField('start_date',e.target.value)}
                placeholder="Start date" />
              <input type="date" className="form-input" value={form.end_date} onChange={e=>setFormField('end_date',e.target.value)}
                placeholder="End date" />
            </div>
          </div>
          {/* Linked Milestone (left) + Status (right) */}
          <div>
            <label className="form-label">Linked Milestone</label>
            <select className="form-input" value={form.milestone_id} onChange={e=>setFormField('milestone_id',e.target.value)}>
              <option value="">— Ad-hoc (no milestone) —</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id}>
                  {m.parent_milestone_id ? `↳ ${m.name} (sub-milestone)` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e=>setFormField('status',e.target.value as any)}>
              <option value="planning">Planning</option>
              <option value="active">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entry / Exit Criteria — 2-column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Entry Criteria */}
      <div className="section-card" style={{marginBottom:0}}>
        <div className="section-title">
          <span className="icn success"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></span>
          Entry Criteria
          <span className="badge badge-neutral" style={{marginLeft:'auto'}}>{entryCriteria.length} items</span>
        </div>
        {entryCriteria.map((c, i) => (
          <div key={i} className="criterion-item">
            <span style={{width:18,height:18,borderRadius:4,flex:'none',background:'var(--bg-subtle)',border:'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--text-subtle)',fontWeight:700}}>
              {i + 1}
            </span>
            <input value={c} onChange={e=>{const a=[...entryCriteria]; a[i]=e.target.value; setEntryCriteria(a); setDirty(true);}}
              placeholder="e.g. All critical TCs passed"
              style={{border:'none',outline:'none',fontSize:13,background:'transparent',width:'100%',fontFamily:'inherit'}} />
            {c.trim() && !entryPresets.includes(c.trim()) && (
              <button onClick={()=>onSavePreset('entry', c.trim())} title="Save as preset"
                style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontSize:12,padding:'0 2px',whiteSpace:'nowrap'}}>
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            )}
            <button onClick={()=>{setEntryCriteria(entryCriteria.filter((_,j)=>j!==i)); setDirty(true);}}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-subtle)',fontSize:16,padding:'0 2px'}}>×</button>
          </div>
        ))}
        <div style={{display:'flex',gap:6}}>
          <div style={{flex:1,border:'1px dashed var(--border)',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}
            onClick={()=>{setEntryCriteria([...entryCriteria,'']); setDirty(true);}}>
            <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add criterion
          </div>
          <div ref={entryPresetRef} style={{position:'relative'}}>
              <button className="pd-btn pd-btn-sm" onClick={()=>setShowEntryPresets(!showEntryPresets)}
                style={{height:'100%',fontSize:12,gap:4,whiteSpace:'nowrap'}}>
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Presets
              </button>
              {showEntryPresets && (
                <div style={{position:'absolute',right:0,top:'100%',marginTop:4,background:'#fff',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,.1)',zIndex:20,minWidth:260,maxHeight:200,overflowY:'auto'}}>
                  {entryPresets.filter(p => !entryCriteria.includes(p)).map((p, i) => (
                    <div key={i} onClick={()=>{setEntryCriteria([...entryCriteria, p]); setDirty(true); setShowEntryPresets(false);}}
                      style={{padding:'8px 12px',fontSize:13,cursor:'pointer',borderBottom:'1px solid var(--bg-subtle)'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-subtle)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      {p}
                    </div>
                  ))}
                  {entryPresets.length === 0 && (
                    <div style={{padding:'8px 12px',fontSize:12,color:'var(--text-muted)'}}>No presets saved yet</div>
                  )}
                  {entryPresets.length > 0 && entryPresets.filter(p => !entryCriteria.includes(p)).length === 0 && (
                    <div style={{padding:'8px 12px',fontSize:12,color:'var(--text-muted)'}}>All presets already added</div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Exit Criteria */}
      <div className="section-card" style={{marginBottom:0}}>
        <div className="section-title">
          <span className="icn warning"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
          Exit Criteria
          <span className="badge badge-neutral" style={{marginLeft:'auto'}}>{exitCriteria.length} items</span>
        </div>
        {exitCriteria.map((c, i) => (
          <div key={i} className="criterion-item">
            <span style={{width:18,height:18,borderRadius:4,flex:'none',background:'var(--bg-subtle)',border:'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--text-subtle)',fontWeight:700}}>
              {i + 1}
            </span>
            <input value={c} onChange={e=>{const a=[...exitCriteria]; a[i]=e.target.value; setExitCriteria(a); setDirty(true);}}
              placeholder="e.g. Pass rate ≥ 95%"
              style={{border:'none',outline:'none',fontSize:13,background:'transparent',width:'100%',fontFamily:'inherit'}} />
            {c.trim() && !exitPresets.includes(c.trim()) && (
              <button onClick={()=>onSavePreset('exit', c.trim())} title="Save as preset"
                style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontSize:12,padding:'0 2px',whiteSpace:'nowrap'}}>
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            )}
            <button onClick={()=>{setExitCriteria(exitCriteria.filter((_,j)=>j!==i)); setDirty(true);}}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-subtle)',fontSize:16,padding:'0 2px'}}>×</button>
          </div>
        ))}
        <div style={{display:'flex',gap:6}}>
          <div style={{flex:1,border:'1px dashed var(--border)',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}
            onClick={()=>{setExitCriteria([...exitCriteria,'']); setDirty(true);}}>
            <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add criterion
          </div>
          <div ref={exitPresetRef} style={{position:'relative'}}>
              <button className="pd-btn pd-btn-sm" onClick={()=>setShowExitPresets(!showExitPresets)}
                style={{height:'100%',fontSize:12,gap:4,whiteSpace:'nowrap'}}>
                <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Presets
              </button>
              {showExitPresets && (
                <div style={{position:'absolute',right:0,top:'100%',marginTop:4,background:'#fff',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,.1)',zIndex:20,minWidth:260,maxHeight:200,overflowY:'auto'}}>
                  {exitPresets.filter(p => !exitCriteria.includes(p)).map((p, i) => (
                    <div key={i} onClick={()=>{setExitCriteria([...exitCriteria, p]); setDirty(true); setShowExitPresets(false);}}
                      style={{padding:'8px 12px',fontSize:13,cursor:'pointer',borderBottom:'1px solid var(--bg-subtle)'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-subtle)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      {p}
                    </div>
                  ))}
                  {exitPresets.length === 0 && (
                    <div style={{padding:'8px 12px',fontSize:12,color:'var(--text-muted)'}}>No presets saved yet</div>
                  )}
                  {exitPresets.length > 0 && exitPresets.filter(p => !exitCriteria.includes(p)).length === 0 && (
                    <div style={{padding:'8px 12px',fontSize:12,color:'var(--text-muted)'}}>All presets already added</div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>

      </div>{/* end criteria grid */}

      {/* Save bar */}
      {dirty && (
        <div className="save-bar">
          <span style={{fontSize:12,color:'var(--warning)',display:'flex',alignItems:'center',gap:5}}>
            <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
            Unsaved changes
          </span>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button className="pd-btn pd-btn-sm" onClick={()=>setDirty(false)}>Discard</button>
            <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="section-card" style={{borderColor:'var(--danger-100)',background:'#fef2f2'}}>
        <div className="section-title" style={{color:'var(--danger-600)',borderColor:'var(--danger-100)'}}>
          <span className="icn danger"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></span>
          Danger Zone
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
          <div style={{padding:12,border:'1px solid var(--border)',borderRadius:6}}>
            <div style={{fontWeight:600,marginBottom:4,fontSize:13}}>Archive plan</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:8}}>Plan becomes read-only. Existing run data is preserved.</div>
            <button className="pd-btn pd-btn-sm">Archive</button>
          </div>
          <div style={{padding:12,border:'1px solid var(--border)',borderRadius:6}}>
            <div style={{fontWeight:600,marginBottom:4,fontSize:13}}>Duplicate plan</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:8}}>Create a new plan with the same TC snapshot.</div>
            <button className="pd-btn pd-btn-sm" style={{borderColor:'var(--primary-100)',color:'var(--primary)'}}>Duplicate</button>
          </div>
          <div style={{padding:12,border:'1px solid var(--danger)',borderRadius:6,background:'var(--danger-50)'}}>
            <div style={{fontWeight:600,marginBottom:4,fontSize:13,color:'var(--danger-600)'}}>Delete plan</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:8}}>Cannot be undone. All runs and issues will be orphaned.</div>
            <button onClick={onDelete} style={{background:'var(--danger)',color:'#fff',border:'1px solid var(--danger)',padding:'6px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:500}}>Delete permanently</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Run Button Helpers ───────────────────────────────────────────────────────

function getRunButtonState(planRuns: PlanRun[]): { label: string; mode: 'start' | 'continue' | 'multiple'; runs: PlanRun[] } {
  const inProgress = planRuns.filter(r => r.status === 'in_progress');
  if (inProgress.length === 0) return { label: 'Start Run', mode: 'start', runs: [] };
  if (inProgress.length === 1) return { label: 'Continue Run', mode: 'continue', runs: inProgress };
  return { label: `${inProgress.length} Runs In Progress`, mode: 'multiple', runs: inProgress };
}

function SplitButton({ label, mode, inProgressRuns, onStartNew, projectId, navigate, planTcs }: {
  label: string;
  mode: 'start' | 'continue' | 'multiple';
  inProgressRuns: PlanRun[];
  onStartNew: () => void;
  projectId: string;
  navigate: (path: string) => void;
  planTcs: PlanTestCase[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMain = () => {
    if (mode === 'start') {
      onStartNew();
    } else if (inProgressRuns.length === 1) {
      navigate(`/projects/${projectId}/runs/${inProgressRuns[0].id}`);
    } else {
      setOpen(o => !o);
    }
  };

  // mode === 'start' → plain button
  if (mode === 'start') {
    return (
      <button className="pd-btn pd-btn-primary" onClick={handleMain}>
        <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        {label}
      </button>
    );
  }

  // mode === 'continue' | 'multiple' → split button with dropdown
  return (
    <div ref={ref} style={{position:'relative', display:'inline-flex'}}>
      <button className="pd-btn pd-btn-primary" onClick={handleMain}
        style={{borderTopRightRadius:0, borderBottomRightRadius:0}}>
        <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        {label}
      </button>
      <button className="pd-btn pd-btn-primary" onClick={() => setOpen(o => !o)}
        style={{borderTopLeftRadius:0, borderBottomLeftRadius:0, borderLeft:'1px solid rgba(255,255,255,0.3)', padding:'0 8px', minWidth:0}}>
        <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:'absolute', top:'100%', right:0, marginTop:4, background:'#fff', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.12)', zIndex:100, minWidth:230, overflow:'hidden'}}>
          {inProgressRuns.map(r => (
            <button key={r.id}
              onClick={() => { navigate(`/projects/${projectId}/runs/${r.id}`); setOpen(false); }}
              style={{width:'100%', display:'flex', flexDirection:'column', gap:2, padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, textAlign:'left'}}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{fontWeight:500, color:'var(--text)'}}>Continue: {r.name}</span>
              <span style={{fontSize:11, color:'var(--text-muted)'}}>
                {r.passed + r.failed + r.blocked + r.retest}/{planTcs.length} executed
              </span>
            </button>
          ))}
          <div style={{height:1, background:'var(--border)'}} />
          <button
            onClick={() => { setOpen(false); onStartNew(); }}
            style={{width:'100%', display:'flex', alignItems:'center', gap:6, padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'var(--primary)', fontWeight:500}}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            ＋ Start New Run
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  // Support both /projects/:id/milestones/:milestoneId/plans/:planId
  // and /projects/:id/plans/:planId (standalone plan without milestone)
  const params = useParams<{ id: string; milestoneId?: string; planId: string }>();
  const projectId = params.id;
  const planId = params.planId;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [planTcs, setPlanTcs] = useState<PlanTestCase[]>([]);
  const [allTcs, setAllTcs] = useState<TestCaseRow[]>([]);
  const [runs, setRuns] = useState<PlanRun[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [parentMilestone, setParentMilestone] = useState<Milestone | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [tcResultMap, setTcResultMap] = useState<Map<string, { result: string; assignee: string | null }>>(new Map());
  const [entryPresets, setEntryPresets] = useState<string[]>([]);
  const [exitPresets, setExitPresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('testcases');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [issuesCount, setIssuesCount] = useState(0);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Story 4: Drift count — TCs modified after snapshot was locked
  const driftCount = useMemo(() => {
    if (!plan?.is_locked || !plan?.snapshot_locked_at) return 0;
    const lockedAt = new Date(plan.snapshot_locked_at).getTime();
    return planTcs.filter(ptc => {
      const tc = allTcs.find(t => t.id === ptc.test_case_id);
      if (!tc) return false;
      return tc.updated_at ? new Date(tc.updated_at).getTime() > lockedAt : false;
    }).length;
  }, [plan?.is_locked, plan?.snapshot_locked_at, planTcs, allTcs]);

  // Folders for icon/color display
  const [folders, setFolders] = useState<{ name: string; icon: string; color: string }[]>([]);

  // Daily execution counts for last 7 days (from test_results via runs)
  const [dailyExecCounts, setDailyExecCounts] = useState<number[]>([0,0,0,0,0,0,0]);

  useEffect(() => {
    if (!projectId || !planId) return;
    load();
  }, [projectId, planId]);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [projectRes, planRes, planTcIdsRes, allTcsRes, runsRes, milestonesRes, foldersRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId!).single(),
        supabase.from('test_plans').select('*').eq('id', planId!).single(),
        // Two-step approach: first get IDs, then join with test_cases
        // (avoids PostgREST FK-ambiguity errors with embedded joins)
        supabase.from('test_plan_test_cases')
          .select('test_plan_id, test_case_id, added_at')
          .eq('test_plan_id', planId!),
        supabase.from('test_cases')
          .select('id, title, priority, lifecycle_status, folder, tags, custom_id, updated_at')
          .eq('project_id', projectId!)
          .neq('lifecycle_status', 'deprecated')
          .order('title'),
        supabase.from('test_runs').select('*').eq('test_plan_id', planId!).order('created_at', { ascending: false }),
        supabase.from('milestones').select('id, name, parent_milestone_id').eq('project_id', projectId!).order('created_at'),
        supabase.from('folders').select('name, icon, color').eq('project_id', projectId!),
      ]);

      if (planRes.error) {
        setLoadError(true);
        return;
      }
      setProject(projectRes.data);
      setPlan(planRes.data);

      // Normalize tags: DB may return null | string[] | JSON string — ensure string[]
      const normalizeTags = (raw: any): string[] | null => {
        if (!raw) return null;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
        }
        return null;
      };

      const normalizedAllTcs: TestCaseRow[] = (allTcsRes.data || []).map((tc: any) => ({
        ...tc,
        tags: normalizeTags(tc.tags),
        custom_id: tc.custom_id ?? null,
      }));
      setAllTcs(normalizedAllTcs);
      setFolders((foldersRes.data || []).map((f: any) => ({ name: f.name, icon: f.icon || 'ri-folder-line', color: f.color || 'indigo' })));
      setMilestones(milestonesRes.data || []);

      // Runs linked to this plan (test_plan_id only — no TC overlap fallback)
      // Enrich with all assignee UUIDs → profile names
      const rawRuns = runsRes.data || [];
      const parseAssignees = (a: any): string[] => {
        if (Array.isArray(a)) return a.filter(Boolean);
        if (typeof a === 'string') { try { const p = JSON.parse(a); if (Array.isArray(p)) return p.filter(Boolean); } catch {} }
        return [];
      };
      const runAssigneeIds = [...new Set(rawRuns.flatMap((r: any) => parseAssignees(r.assignees)))];
      let runAssigneeMap = new Map<string, string>();
      if (runAssigneeIds.length > 0) {
        try {
          const { data: ap } = await supabase.from('profiles').select('id, full_name, email').in('id', runAssigneeIds);
          (ap || []).forEach((p: any) => runAssigneeMap.set(p.id, p.full_name || p.email));
        } catch { /* ignore */ }
      }
      const allRuns: PlanRun[] = rawRuns.map((r: any) => {
        // Parse assignees — may be UUID[], JSONB, or JSON string
        let rawAssignees: string[] = [];
        if (Array.isArray(r.assignees)) {
          rawAssignees = r.assignees.filter(Boolean);
        } else if (typeof r.assignees === 'string') {
          try { const p = JSON.parse(r.assignees); if (Array.isArray(p)) rawAssignees = p.filter(Boolean); } catch {}
        }
        const ids: string[] = [];
        const names: string[] = [];
        for (const id of rawAssignees) {
          ids.push(id);
          names.push(runAssigneeMap.get(id) || id.slice(0, 8));
        }
        return { ...r, assignee_ids: ids, assignee_names: names };
      });
      setRuns(allRuns);

      // Build planTcs by joining planTcIds with allTcs
      const tcMap = new Map<string, TestCaseRow>(normalizedAllTcs.map(tc => [tc.id, tc]));
      const planTcRows: PlanTestCase[] = (planTcIdsRes.data || []).map((row: any) => ({
        test_plan_id: row.test_plan_id,
        test_case_id: row.test_case_id,
        added_at: row.added_at,
        test_case: tcMap.get(row.test_case_id) ?? {
          id: row.test_case_id, title: '(unknown)', priority: 'medium' as const,
          lifecycle_status: 'untested', folder: null, tags: null, custom_id: null,
        },
      }));
      setPlanTcs(planTcRows);

      // Find direct milestone and parent milestone
      if (planRes.data?.milestone_id) {
        const allMs: Milestone[] = milestonesRes.data || [];
        const ms = allMs.find(m => m.id === planRes.data.milestone_id);
        if (ms) {
          setMilestone(ms);
          if (ms.parent_milestone_id) {
            const parent = allMs.find(m => m.id === ms.parent_milestone_id);
            if (parent) setParentMilestone(parent);
          }
        }
      }

      // Activity logs — Plan direct events + linked Run/Result events
      const runIds = allRuns.map((r: any) => r.id);
      const logQueries: Promise<any>[] = [
        // Plan-specific events (TC added/removed, snapshot, settings)
        supabase.from('activity_logs').select('*')
          .eq('target_id', planId!).eq('target_type', 'test_plan')
          .order('created_at', { ascending: false }).limit(50),
      ];
      if (runIds.length > 0) {
        // Test result events from linked runs
        logQueries.push(
          supabase.from('activity_logs').select('*')
            .in('target_type', ['test_result', 'test_run'])
            .order('created_at', { ascending: false }).limit(100)
            .then(res => {
              // Filter to only runs linked to this plan (metadata.run_id)
              const runIdSet = new Set(runIds);
              return { ...res, data: (res.data || []).filter((l: any) =>
                runIdSet.has(l.metadata?.run_id) || runIdSet.has(l.target_id)
              )};
            })
        );
      }
      const logResults = await Promise.all(logQueries);
      const allLogs = [...(logResults[0]?.data || []), ...(logResults[1]?.data || [])];
      // Deduplicate and sort
      const logMap = new Map<string, any>();
      allLogs.forEach(l => logMap.set(l.id, l));
      const logs = [...logMap.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);
      setActivityLogs(logs);

      // Test results for TC execution status + assignee
      let resultAssigneeIds: string[] = [];
      if (runIds.length > 0) {
        const { data: results } = await supabase
          .from('test_results')
          .select('test_case_id, run_id, status, author, created_at')
          .in('run_id', runIds)
          .order('created_at', { ascending: false });
        const rMap = new Map<string, { result: string; assignee: string | null }>();
        for (const r of (results || [])) {
          if (r.test_case_id && !rMap.has(r.test_case_id)) {
            rMap.set(r.test_case_id, {
              result: r.status || 'untested',
              assignee: r.author || null,
            });
          }
        }
        setTcResultMap(rMap);

        // Re-aggregate per-run stats from actual test_results (DB values may be stale)
        const perRunStats = new Map<string, { passed: number; failed: number; blocked: number; retest: number }>();
        // Get latest result per TC per run
        const perRunTcMap = new Map<string, Map<string, string>>(); // runId -> (tcId -> status)
        for (const r of (results || [])) {
          if (!r.run_id || !r.test_case_id) continue;
          if (!perRunTcMap.has(r.run_id)) perRunTcMap.set(r.run_id, new Map());
          const tcMap = perRunTcMap.get(r.run_id)!;
          if (!tcMap.has(r.test_case_id)) tcMap.set(r.test_case_id, r.status || 'untested');
        }
        for (const [runId, tcMap] of perRunTcMap) {
          let passed = 0, failed = 0, blocked = 0, retest = 0;
          for (const status of tcMap.values()) {
            if (status === 'passed') passed++;
            else if (status === 'failed') failed++;
            else if (status === 'blocked') blocked++;
            else if (status === 'retest') retest++;
          }
          perRunStats.set(runId, { passed, failed, blocked, retest });
        }
        // Patch allRuns with real stats
        for (const run of allRuns) {
          const stats = perRunStats.get(run.id);
          if (stats) {
            const totalTc = planTcRows.length || (run.passed + run.failed + run.blocked + run.retest + run.untested);
            run.passed = stats.passed;
            run.failed = stats.failed;
            run.blocked = stats.blocked;
            run.retest = stats.retest;
            run.untested = Math.max(0, totalTc - stats.passed - stats.failed - stats.blocked - stats.retest);
          }
        }
        setRuns([...allRuns]);
        resultAssigneeIds = [...new Set((results || []).map((r: any) => r.author).filter(Boolean))] as string[];

        // Daily execution counts for last 7 days
        const now = new Date();
        const counts = [0,0,0,0,0,0,0];
        for (const r of (results || [])) {
          if (!r.created_at || !r.status || r.status === 'untested') continue;
          const execDate = new Date(r.created_at);
          const dayDiff = Math.floor((now.getTime() - execDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff >= 0 && dayDiff < 7) {
            counts[6 - dayDiff]++;
          }
        }
        setDailyExecCounts(counts);
      }

      // Current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const currentUserId = currentUser?.id;

      // Project members (for Owner selector) — independent query
      let memberIds: string[] = [];
      try {
        const { data: memberRows } = await supabase
          .from('project_members').select('user_id').eq('project_id', projectId!);
        memberIds = (memberRows || []).map((m: any) => m.user_id).filter(Boolean) as string[];
      } catch { /* ignore — fallback to current user */ }

      // Always include current user + plan owner in member list
      if (currentUserId && !memberIds.includes(currentUserId)) memberIds.push(currentUserId);
      if (planRes.data?.owner_id && !memberIds.includes(planRes.data.owner_id)) memberIds.push(planRes.data.owner_id);

      // Profiles — combine activity actors + project members (skip resultAssigneeIds — author is name string, not UUID)
      const actorIds = [...new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean))] as string[];
      const allFetchIds = [...new Set([...actorIds, ...memberIds])];
      const profileMap = new Map<string, Profile>();
      if (allFetchIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('id, full_name, email, avatar_url').in('id', allFetchIds);
        (profileData || []).forEach((p: any) => profileMap.set(p.id, p));
      }
      setProfiles(profileMap);
      setMemberProfiles(memberIds.map(id => profileMap.get(id)).filter(Boolean) as Profile[]);
      if (currentUserId) setCurrentUserProfile(profileMap.get(currentUserId) || null);

      // Criteria presets
      try {
        const { data: presets } = await supabase
          .from('criteria_presets').select('type, text').eq('project_id', projectId!);
        setEntryPresets((presets || []).filter((p: any) => p.type === 'entry').map((p: any) => p.text));
        setExitPresets((presets || []).filter((p: any) => p.type === 'exit').map((p: any) => p.text));
      } catch { /* presets table may not exist yet */ }

      // Issues count (pre-load for tab badge)
      if (runIds.length > 0) {
        try {
          const { data: issueResults } = await supabase
            .from('test_results')
            .select('issues, github_issues')
            .in('run_id', runIds)
            .limit(200);
          let count = 0;
          for (const r of (issueResults || [])) {
            if (Array.isArray(r.issues)) count += r.issues.filter(Boolean).length;
            if (Array.isArray(r.github_issues)) count += r.github_issues.length;
          }
          setIssuesCount(count);
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Activity log helper — fire-and-forget
  const logActivity = (eventType: string, eventCategory: string, metadata?: Record<string, any>) => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !projectId || !planId) return;
      supabase.from('activity_logs').insert({
        project_id: projectId,
        actor_id: user.id,
        event_type: eventType,
        event_category: eventCategory,
        target_type: 'test_plan',
        target_id: planId,
        metadata: { name: plan?.name, ...metadata },
      }).then(() => {
        // Refresh activity logs — re-fetch all plan + linked run events
        fetchData();
      });
    });
  };

  const handleUpdateCriteriaMet = async (type: 'entry' | 'exit', met: boolean[]) => {
    const field = type === 'entry' ? 'entry_criteria_met' : 'exit_criteria_met';
    const { error } = await supabase.from('test_plans').update({ [field]: met }).eq('id', planId!);
    if (error) { showToast('Failed to save criteria state', 'error'); return; }
    setPlan(p => p ? { ...p, [field]: met } : p);
  };

  const handleSavePreset = async (type: 'entry' | 'exit', text: string) => {
    const { error } = await supabase.from('criteria_presets').insert({ project_id: projectId!, type, text });
    if (error) {
      if (error.code === '23505') { showToast('Preset already exists', 'info'); return; }
      showToast('Failed to save preset', 'error'); return;
    }
    if (type === 'entry') setEntryPresets(prev => [...prev, text]);
    else setExitPresets(prev => [...prev, text]);
    showToast('Saved as preset', 'success');
  };

  const handleAddTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases').insert({ test_plan_id: planId, test_case_id: tcId });
    if (error) { showToast('Failed to add test case', 'error'); return; }
    const tc = allTcs.find(t => t.id === tcId);
    if (tc) setPlanTcs(prev => [...prev, { test_plan_id: planId!, test_case_id: tcId, added_at: new Date().toISOString(), test_case: tc } as PlanTestCase]);
    showToast('Test case added', 'success');
    logActivity('tc_added', 'test_case', { details: `Added TC "${tc?.title || tcId}"` });
  };

  const handleAddTcs = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const inserts = ids.map(tcId => ({ test_plan_id: planId!, test_case_id: tcId }));
      const { error } = await supabase.from('test_plan_test_cases').insert(inserts);
      if (error) { showToast('Failed to add test cases: ' + error.message, 'error'); return; }
      const addedTcs = allTcs.filter(t => ids.includes(t.id));
      setPlanTcs(prev => [...prev, ...addedTcs.map(tc => ({
        test_plan_id: planId!, test_case_id: tc.id,
        added_at: new Date().toISOString(), test_case: tc,
      } as PlanTestCase))]);
      showToast(`Added ${ids.length} test case${ids.length > 1 ? 's' : ''}`, 'success');
      logActivity('tc_added', 'test_case', { details: `Added ${ids.length} TCs to plan` });
    } catch (err) {
      console.error('handleAddTcs error:', err);
      showToast('Failed to add test cases', 'error');
    }
  };

  const handleRemoveTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases').delete().eq('test_plan_id', planId!).eq('test_case_id', tcId);
    if (error) { showToast('Failed to remove test case', 'error'); return; }
    const removed = planTcs.find(p => p.test_case_id === tcId);
    setPlanTcs(prev => prev.filter(p => p.test_case_id !== tcId));
    showToast('Test case removed', 'success');
    logActivity('tc_removed', 'test_case', { details: `Removed TC "${removed?.test_case?.title || tcId}"` });
  };

  const handleLock = async () => {
    const snapId = `snap_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const { error } = await supabase.from('test_plans')
      .update({ is_locked: true, snapshot_id: snapId, snapshot_locked_at: now })
      .eq('id', planId!);
    if (error) { showToast('Failed to lock snapshot', 'error'); return; }
    setPlan(p => p ? { ...p, is_locked: true, snapshot_id: snapId, snapshot_locked_at: now } : p);
    showToast('Snapshot locked', 'success');
    logActivity('snapshot_locked', 'status', { details: 'Snapshot locked — TC scope is fixed' });
  };

  const handleUnlockRequest = () => setShowUnlockConfirm(true);

  const handleUnlockConfirm = async () => {
    setShowUnlockConfirm(false);
    const { error } = await supabase.from('test_plans')
      .update({ is_locked: false, snapshot_id: null, snapshot_locked_at: null })
      .eq('id', planId!);
    if (error) { showToast('Failed to unlock snapshot', 'error'); return; }
    setPlan(p => p ? { ...p, is_locked: false, snapshot_id: null, snapshot_locked_at: null } : p);
    showToast('Snapshot unlocked', 'success');
    logActivity('snapshot_unlocked', 'status', { details: 'Snapshot unlocked — TC scope is open' });
  };

  const handleRebase = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('test_plans')
      .update({ snapshot_locked_at: now })
      .eq('id', planId!);
    if (error) { showToast('Failed to rebase snapshot', 'error'); return; }
    setPlan(p => p ? { ...p, snapshot_locked_at: now } : p);
    showToast('Snapshot rebased to latest', 'success');
    logActivity('snapshot_rebased', 'status', { details: 'Snapshot rebased to latest TC revisions' });
  };

  const handleUpdate = async (data: Partial<TestPlan>) => {
    const { error } = await supabase.from('test_plans').update(data).eq('id', planId!);
    if (error) { showToast('Failed to update plan', 'error'); throw error; }
    const prev = plan;
    setPlan(p => p ? { ...p, ...data } : p);
    // Log significant changes
    if (data.status && data.status !== prev?.status) {
      logActivity('status_changed', 'status', { details: `Status changed: ${prev?.status} → ${data.status}`, status: data.status });
    } else if (data.entry_criteria || data.exit_criteria) {
      logActivity('criteria_updated', 'update', { details: 'Entry/Exit criteria updated' });
    } else {
      logActivity('plan_updated', 'update', { details: 'Plan settings updated' });
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('test_plans').delete().eq('id', planId!);
    if (error) { showToast('Failed to delete plan', 'error'); return; }
    logActivity('plan_deleted', 'status', { details: `Plan "${plan?.name}" deleted` });
    navigate(`/projects/${projectId}/milestones`);
    showToast('Plan deleted', 'success');
  };

  if (loading) return <PageLoader />;
  if (!plan || loadError) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name ?? ''} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'var(--text-muted)' }}>
        <svg style={{width:48,height:48,color:'#CBD5E1'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div style={{textAlign:'center'}}>
          <p style={{fontSize:15,fontWeight:600,color:'var(--text)',margin:'0 0 4px'}}>
            {loadError ? 'Failed to load plan' : 'Plan not found'}
          </p>
          <p style={{fontSize:13,margin:0}}>
            {loadError ? 'The plan may have been deleted or you may not have access.' : 'This plan does not exist or has been deleted.'}
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => navigate(`/projects/${projectId}/milestones`)}
            style={{padding:'8px 16px',border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',background:'#fff',color:'var(--text)'}}>
            ← Back to Milestones
          </button>
          {loadError && (
            <button onClick={() => load()}
              style={{padding:'8px 16px',border:'1px solid var(--primary)',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',background:'var(--primary-50)',color:'var(--primary)'}}>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Compute stats from tcResultMap (single source of truth for TC status)
  const totalTCs = planTcs.length;
  const passed = planTcs.filter(ptc => tcResultMap.get(ptc.test_case_id)?.result === 'passed').length;
  const failed = planTcs.filter(ptc => tcResultMap.get(ptc.test_case_id)?.result === 'failed').length;
  const blocked = planTcs.filter(ptc => tcResultMap.get(ptc.test_case_id)?.result === 'blocked').length;
  const retest = planTcs.filter(ptc => tcResultMap.get(ptc.test_case_id)?.result === 'retest').length;
  const executed = passed + failed + blocked + retest;
  const untested = totalTCs - executed;
  const passRate = executed > 0 ? Math.round(passed / executed * 100) : 0;
  const passWidth = totalTCs > 0 ? (passed / totalTCs * 100) : 0;
  const failWidth = totalTCs > 0 ? (failed / totalTCs * 100) : 0;

  const sc = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planning;

  // Story 5/6: Dynamic run button state
  const runButtonState = getRunButtonState(runs);

  // Story 7: TC 0 guard — block new run start if no TCs added
  const handleStartNewRun = () => {
    if (planTcs.length === 0) {
      showToast('Add at least one test case before starting a run.', 'warning');
      setActiveTab('testcases');
      return;
    }
    navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}${plan.milestone_id ? `&milestone_id=${plan.milestone_id}` : ''}`);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#F8FAFC', fontFamily:'Inter,system-ui,sans-serif' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name ?? ''} />

      {/* White header area */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--border)', flexShrink:0 }}>

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to={`/projects/${projectId}/milestones`}>Milestones</Link>
          {parentMilestone && (
            <>
              <span className="sep">›</span>
              <Link to={`/projects/${projectId}/milestones/${parentMilestone.id}`}>{parentMilestone.name}</Link>
            </>
          )}
          {milestone && (
            <>
              <span className="sep">›</span>
              <Link to={`/projects/${projectId}/milestones/${milestone.id}`} style={{display:'inline-flex', alignItems:'center', gap:4}}>
                {milestone.parent_milestone_id && (
                  <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                )}
                {milestone.name}
              </Link>
            </>
          )}
          <span className="sep">›</span>
          <Link to={milestone
            ? `/projects/${projectId}/milestones/${milestone.id}`
            : `/projects/${projectId}/milestones`}>Plans</Link>
          <span className="sep">›</span>
          <span style={{color:'var(--text)', fontWeight:500}}>{plan.name}</span>
        </div>

        {/* Detail head */}
        <div className="detail-head">
          <div className="detail-flag" style={{background:'var(--primary-50)', color:'var(--primary)'}}>
            <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h1 className="detail-title">{plan.name}</h1>
          <span className={sc.badgeCls}>{sc.label}</span>
          {/* Story 13: start_date – end_date range display */}
          {(plan.start_date || plan.end_date) && (
            <span className="detail-meta">
              <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '?'}
              {' – '}
              {plan.end_date ? new Date(plan.end_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '?'}
            </span>
          )}
          {!plan.start_date && !plan.end_date && plan.target_date && (
            <span className="detail-meta">
              <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
              Due {new Date(plan.target_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
            </span>
          )}
          {milestone && (
            <span className="badge badge-violet" style={{display:'inline-flex', alignItems:'center', gap:4}}>
              {milestone.parent_milestone_id && (
                <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              )}
              {milestone.name}
            </span>
          )}
          {parentMilestone && milestone?.parent_milestone_id && (
            <span className="meta-inherited">
              <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h13"/><path d="M16 6l6 6-6 6"/></svg>
              Inherited from <b style={{color:'var(--text)', fontWeight:600, marginLeft:2}}>{parentMilestone.name}</b>
            </span>
          )}
          <div className="detail-head-right">
            <button className="pd-btn pd-btn-ai" onClick={() => setShowAIModal(true)}>
              <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
              AI Optimize
            </button>
            <button className="pd-btn" onClick={()=>setActiveTab('settings')}>
              <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <SplitButton
              label={runButtonState.label}
              mode={runButtonState.mode}
              inProgressRuns={runButtonState.runs}
              onStartNew={handleStartNewRun}
              projectId={projectId!}
              navigate={navigate}
              planTcs={planTcs}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div style={{margin:'0 24px 8px', display:'flex', alignItems:'center', gap:10}}>
          <div className="detail-progress" style={{margin:0, flex:1}}>
            <div className="seg-pass" style={{left:0, width:`${passWidth}%`}} />
            <div className="seg-fail" style={{left:`${passWidth}%`, width:`${failWidth}%`}} />
          </div>
          {totalTCs > 0 && (
            <span className="detail-progress-label" style={{flexShrink:0, fontSize:13, fontWeight:600, color:'var(--primary)'}}>{Math.round(executed / totalTCs * 100)}%</span>
          )}
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <span className="stat"><span className="dot dot-success" />Passed <b>{passed}</b></span>
          <span className="stat"><span className="dot dot-danger" />Failed <b>{failed}</b></span>
          <span className="stat"><span className="dot dot-warning" />Blocked <b>{blocked}</b></span>
          <span className="stat"><span className="dot dot-neutral" />Untested <b>{untested}</b></span>
          <span className="sep" />
          <span className="stat">{executed}/{totalTCs} executed · <b>{totalTCs > 0 ? Math.round(executed / totalTCs * 100) : 0}%</b></span>
          <span className="sep" />
          <span className="stat">Pass Rate <b>{passRate}%</b></span>
        </div>

        {/* Tab navigation */}
        <div className="detail-tabs">
          {TABS.map(tab => (
            <button key={tab.key}
              className={`detail-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}>
              {tab.iconEl}
              {tab.label}
              {tab.key === 'testcases' && <span className="count">{totalTCs}</span>}
              {tab.key === 'runs' && <span className="count">{runs.length}</span>}
              {tab.key === 'activity' && <span className="count">{activityLogs.length}</span>}
              {tab.key === 'issues' && issuesCount > 0 && <span className="count">{issuesCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflow:'auto' }}>
        {activeTab === 'testcases' && (
          <TestCasesTab
            plan={plan} planTcs={planTcs} allTcs={allTcs}
            onAddTc={handleAddTc} onAddTcs={handleAddTcs} onRemoveTc={handleRemoveTc}
            onLock={handleLock} onUnlock={handleUnlockRequest} onRebase={handleRebase}
            driftCount={driftCount}
            milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
            tcResultMap={tcResultMap} runs={runs} dailyExecCounts={dailyExecCounts}
            folders={folders} currentUserProfile={currentUserProfile}
            onUpdateCriteriaMet={handleUpdateCriteriaMet}
          />
        )}
        {activeTab === 'runs' && (
          <RunsTab
            runs={runs} projectId={projectId!} planId={planId!} planTcCount={totalTCs}
            milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} plan={plan}
            driftCount={driftCount} onLock={handleLock} onUnlock={handleUnlockRequest} onRebase={handleRebase}
            planTcs={planTcs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts}
            currentUserProfile={currentUserProfile}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab logs={activityLogs} profiles={profiles} plan={plan} milestone={milestone} parentMilestone={parentMilestone}
            driftCount={driftCount} onLock={handleLock} onUnlock={handleUnlockRequest} onRebase={handleRebase} planTcs={planTcs}
            runs={runs} tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} projectId={plan.project_id} currentUserProfile={currentUserProfile} />
        )}
        {activeTab === 'issues' && (
          <IssuesTab runs={runs} plan={plan} planTcs={planTcs} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
            driftCount={driftCount} onLock={handleLock} onUnlock={handleUnlockRequest} onRebase={handleRebase}
            tcResultMap={tcResultMap} dailyExecCounts={dailyExecCounts} currentUserProfile={currentUserProfile} onIssuesCount={setIssuesCount} />
        )}
        {activeTab === 'environments' && (
          <EnvironmentsTab plan={plan} planTcs={planTcs} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab plan={plan} milestones={milestones} profiles={profiles} memberProfiles={memberProfiles} onUpdate={handleUpdate} onDelete={()=>setShowDeleteConfirm(true)} entryPresets={entryPresets} exitPresets={exitPresets} onSavePreset={handleSavePreset} />
        )}
      </div>

      {/* AI Optimize Modal */}
      {showAIModal && (
        <AIPlanAssistantModal
          projectId={projectId!}
          milestones={milestones.map(m => ({ id: m.id, name: m.name, status: 'active', end_date: null }))}
          onClose={() => setShowAIModal(false)}
          onApply={async (tcIds, _planName) => {
            // Add recommended TCs to the current plan (skip already-added ones)
            const existingIds = new Set(planTcs.map(p => p.test_case_id));
            const newIds = tcIds.filter(id => !existingIds.has(id));
            if (newIds.length === 0) {
              showToast('All recommended TCs are already in this plan', 'info');
              setShowAIModal(false);
              return;
            }
            const inserts = newIds.map(tcId => ({ test_plan_id: planId, test_case_id: tcId }));
            const { error } = await supabase.from('test_plan_test_cases').insert(inserts);
            if (error) { showToast('Failed to add TCs: ' + error.message, 'error'); return; }
            const addedTcs = allTcs.filter(t => newIds.includes(t.id));
            setPlanTcs(prev => [...prev, ...addedTcs.map(tc => ({
              test_plan_id: planId!, test_case_id: tc.id,
              added_at: new Date().toISOString(), test_case: tc,
            } as PlanTestCase))]);
            setShowAIModal(false);
            showToast(`Added ${newIds.length} AI-recommended TCs to plan`, 'success');
            setActiveTab('testcases');
          }}
        />
      )}

      {/* Unlock confirm modal */}
      {showUnlockConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,23,42,0.5)'}}>
          <div style={{background:'#fff',borderRadius:12,padding:'1.5rem',maxWidth:'28rem',width:'100%',margin:'1rem',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'var(--warning-100)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg style={{width:18,height:18,color:'var(--warning)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              </div>
              <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Unlock Snapshot</h3>
            </div>
            <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:8,lineHeight:1.6}}>
              Unlocking the snapshot will allow TC additions and removals.
            </p>
            <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20,lineHeight:1.6}}>
              Existing runs will not be affected, but plan scope may shift. Are you sure you want to proceed?
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowUnlockConfirm(false)} className="pd-btn pd-btn-sm">Cancel</button>
              <button onClick={handleUnlockConfirm}
                style={{padding:'6px 16px',border:'none',borderRadius:6,background:'var(--warning)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(15,23,42,0.5)'}}>
          <div style={{background:'#fff',borderRadius:12,padding:'1.5rem',maxWidth:'28rem',width:'100%',margin:'1rem',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'var(--danger-50)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg style={{width:18,height:18,color:'var(--danger)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Delete Test Plan</h3>
            </div>
            <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>
              Are you sure you want to delete <strong>"{plan.name}"</strong>? This action cannot be undone.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowDeleteConfirm(false)} className="pd-btn pd-btn-sm">Cancel</button>
              <button onClick={handleDelete}
                style={{padding:'6px 16px',border:'none',borderRadius:6,background:'var(--danger)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
