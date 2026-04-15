import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useToast } from '../../components/Toast';
import PageLoader from '../../components/PageLoader';
import AIPlanAssistantModal from '../project-plans/AIPlanAssistantModal';

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
  is_locked: boolean;
  snapshot_id?: string | null;
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

function PlanSidebar({ plan, milestone, parentMilestone, profiles, onOpenAI }:
  { plan: TestPlan; milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>; onOpenAI?: () => void }) {
  const owner = plan.owner_id ? profiles.get(plan.owner_id) : null;
  const ownerInitials = owner?.full_name
    ? owner.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : owner?.email?.slice(0,2).toUpperCase() ?? '??';

  return (
    <aside className="plan-side">
      {/* AI Risk Predictor */}
      <div className="ai-card">
        <div className="ai-card-title">
          <svg style={{width:14,height:14,flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
          AI Risk Predictor
          <span className="badge" style={{marginLeft:'auto', background:'#fff', color:'var(--violet)', border:'1px solid #ddd6fe', fontSize:'10px'}}>Beta</span>
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.4}}>
          TC failure risk prediction based on code changes &amp; history.
        </div>
        <div style={{fontSize:24, fontWeight:700, color:'var(--warning)', fontFamily:'JetBrains Mono,monospace', marginBottom:4}}>0.34</div>
        <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:10}}>/ 1.0 · Medium risk</div>
        <div style={{fontSize:11.5, color:'var(--text)', lineHeight:1.4}}>
          <b>Top risks:</b>
          <div style={{marginTop:4, paddingLeft:2}}>• Flaky TCs on Safari</div>
          <div style={{paddingLeft:2}}>• Login flow untested 14d</div>
          <div style={{paddingLeft:2}}>• 2 blocked by open bugs</div>
        </div>
        <button className="pd-btn pd-btn-sm" onClick={onOpenAI}
          style={{marginTop:10, background:'#fff', borderColor:'#ddd6fe', color:'var(--violet)', justifyContent:'center', width:'100%'}}>
          <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
          Run risk scan
        </button>
      </div>

      {/* Plan Meta */}
      <div className="side-card">
        <div className="side-card-title">
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Plan Meta
        </div>
        {parentMilestone && (
          <div className="side-row">
            <span className="k">Release</span>
            <span className="v" style={{color:'var(--primary)'}}>{parentMilestone.name}</span>
          </div>
        )}
        {milestone && (
          <div className="side-row">
            <span className="k">Milestone</span>
            <span className="v" style={{color:'var(--violet)'}}>{milestone.name}</span>
          </div>
        )}
        {plan.target_date && (
          <div className="side-row">
            <span className="k">Target</span>
            <span className="v">{new Date(plan.target_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
          </div>
        )}
        <div className="side-row">
          <span className="k">Priority</span>
          <span className={PRIORITY_CONFIG[plan.priority].priCls}>{PRIORITY_CONFIG[plan.priority].label}</span>
        </div>
        {owner && (
          <div className="side-row">
            <span className="k">Owner</span>
            <span className="v" style={{display:'flex', alignItems:'center', gap:4}}>
              <span style={{width:18,height:18,borderRadius:'50%',background:'var(--primary-50)',color:'var(--primary)',fontSize:9,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{ownerInitials}</span>
              {owner.full_name || owner.email}
            </span>
          </div>
        )}
        <div className="side-row">
          <span className="k">Created</span>
          <span className="v">{new Date(plan.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
        </div>
        {plan.snapshot_id && (
          <div className="side-row">
            <span className="k">Snapshot</span>
            <span className="snap-id">{plan.snapshot_id}</span>
          </div>
        )}
      </div>

      {/* Team */}
      <div className="side-card">
        <div className="side-card-title">
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Team
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[...profiles.values()].slice(0, 4).map((p, i) => {
            const initials = p.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() ?? p.email.slice(0,2).toUpperCase();
            const colors = ['var(--primary-50),var(--primary)','var(--warning-50),var(--warning)','var(--success-50),var(--success-600)','var(--violet-50),var(--violet)'];
            const [bg, fg] = colors[i % colors.length].split(',');
            return (
              <div key={p.id} style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{width:22,height:22,borderRadius:'50%',background:bg,color:fg,fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'none'}}>{initials}</span>
                <div>
                  <div style={{fontSize:12, fontWeight:500}}>{p.full_name || p.email}</div>
                  <div style={{fontSize:10.5, color:'var(--text-muted)'}}>{i===0 ? 'Owner' : 'Contributor'}</div>
                </div>
              </div>
            );
          })}
          {profiles.size === 0 && <div style={{fontSize:12, color:'var(--text-muted)'}}>No team assigned yet.</div>}
        </div>
      </div>
    </aside>
  );
}

// ─── Tab: Test Cases ──────────────────────────────────────────────────────────

function TestCasesTab({
  plan, planTcs, allTcs, onAddTc, onAddTcs, onRemoveTc, onLock, milestone, parentMilestone, profiles,
}: {
  plan: TestPlan; planTcs: PlanTestCase[]; allTcs: TestCaseRow[];
  onAddTc: (id: string) => Promise<void>;
  onAddTcs: (ids: string[]) => Promise<void>;
  onRemoveTc: (id: string) => Promise<void>;
  onLock: () => Promise<void>;
  milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>;
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
  });
  const available = allTcs.filter(tc =>
    !includedIds.has(tc.id) &&
    (!pickerSearch || tc.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const priMap: Record<string, string> = { critical: 'P1', high: 'P2', medium: 'P3', low: 'P3' };
  const priClass: Record<string, string> = { critical: 'pri-badge pri-p1', high: 'pri-badge pri-p2', medium: 'pri-badge pri-p3', low: 'pri-badge pri-p3' };
  const statusClass: Record<string, string> = {
    passed: 'sb-pass', failed: 'sb-fail', blocked: 'sb-block', untested: 'sb-untested',
  };

  const entryCriteria: string[] = Array.isArray(plan.entry_criteria) ? plan.entry_criteria : [];
  const exitCriteria: string[] = Array.isArray(plan.exit_criteria) ? plan.exit_criteria : [];

  return (
    <div className="plan-layout">
      <div style={{minWidth:0}}>
        {/* Snapshot lock strip */}
        {plan.is_locked && (
          <div className="lock-strip">
            <svg style={{width:16,height:16,color:'var(--violet)',flex:'none'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div style={{flex:1}}>
              <b>Snapshot locked</b> — test case scope is fixed.
              {plan.snapshot_id && <> Snapshot ID: <span className="snap-id">{plan.snapshot_id}</span></>}
              &nbsp;New TC changes in the library won't affect this plan.
            </div>
            <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
              <button className="pd-btn pd-btn-sm">Rebase</button>
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
                <span className="badge badge-success" style={{marginLeft:'auto'}}>{entryCriteria.length} / {entryCriteria.length} met</span>
              </div>
              {entryCriteria.map((c, i) => (
                <div key={i} className="criterion">
                  <div className="crit-check">
                    <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style={{fontSize:13}}>{c}</span>
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
                  {Math.ceil(exitCriteria.length / 2)} / {exitCriteria.length} met
                </span>
              </div>
              {exitCriteria.map((c, i) => (
                <div key={i} className="criterion">
                  <div className={i % 2 === 0 ? 'crit-check' : 'crit-check pending'}>
                    {i % 2 === 0
                      ? <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/></svg>
                    }
                  </div>
                  <span style={{fontSize:13}}>{c}</span>
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
            <div>Priority</div>
            <div>Status</div>
            <div>Last Run</div>
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
              const pri = ptc.test_case.priority;
              const ls = ptc.test_case.lifecycle_status;
              let sbClass = 'sb-untested';
              if (ls === 'passed') sbClass = 'sb-pass';
              else if (ls === 'failed') sbClass = 'sb-fail';
              else if (ls === 'blocked') sbClass = 'sb-block';
              return (
                <div key={ptc.test_case_id} className="tc-row">
                  <div style={{width:16,height:16,border:'1.5px solid var(--border)',borderRadius:3,background:'#fff'}} />
                  <div className="tc-id">{ptc.test_case_id.slice(0,8)}</div>
                  <div>
                    <div style={{fontWeight:500, fontSize:13}}>{ptc.test_case.title}</div>
                    <div style={{fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:4}}>
                      {ptc.test_case.folder && <span>{ptc.test_case.folder}</span>}
                      {ptc.test_case.tags?.slice(0,2).map(t=>(
                        <span key={t} style={{fontFamily:'JetBrains Mono,monospace', fontSize:10, background:'var(--bg-subtle)', padding:'1px 4px', borderRadius:3}}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div><span className={priMap[pri] === 'P1' ? 'pri-badge pri-p1' : priMap[pri] === 'P2' ? 'pri-badge pri-p2' : 'pri-badge pri-p3'}>{priMap[pri] || 'P3'}</span></div>
                  <div><span className={sbClass}><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor'}} />{ls || 'Untested'}</span></div>
                  <div style={{fontSize:11.5, color:'var(--text-muted)'}}>—</div>
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

      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} onOpenAI={() => setShowAIModal(true)} />

      {/* TC Picker Modal — runs-style */}
      {showPicker && (() => {
        const closePicker = () => { setShowPicker(false); setPickerSearch(''); setPickerFolder(''); setPickerIncludeDraft(false); setPickerSelectedIds(new Set()); };
        const notAdded = allTcs.filter(tc => !includedIds.has(tc.id));
        const draftCount = notAdded.filter(tc => tc.lifecycle_status === 'draft').length;
        const baseTcs = pickerIncludeDraft ? notAdded : notAdded.filter(tc => tc.lifecycle_status !== 'draft');
        const folderFiltered = pickerFolder
          ? baseTcs.filter(tc => pickerFolder === '__none__' ? !tc.folder : tc.folder === pickerFolder)
          : baseTcs;
        const visibleTcs = folderFiltered.filter(tc =>
          !pickerSearch || tc.title.toLowerCase().includes(pickerSearch.toLowerCase())
        );
        const uniqueFolders = [...new Set(notAdded.map(tc => tc.folder).filter(Boolean))] as string[];
        const allVisibleSelected = visibleTcs.length > 0 && visibleTcs.every(tc => pickerSelectedIds.has(tc.id));
        return (
          <div className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/50 backdrop-blur-sm py-[3vh] overflow-y-auto"
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

function RunsTab({ runs, projectId, planId, planTcCount, milestone, parentMilestone, profiles, plan }: {
  runs: PlanRun[]; projectId: string; planId: string; planTcCount: number;
  milestone: Milestone | null; parentMilestone: Milestone | null;
  profiles: Map<string, Profile>; plan: TestPlan;
}) {
  const navigate = useNavigate();
  const totalRuns = runs.length;
  const bestPassRate = runs.reduce((best, r) => {
    const executed = r.passed + r.failed + r.blocked;
    const rate = executed > 0 ? Math.round(r.passed / executed * 100) : 0;
    return Math.max(best, rate);
  }, 0);
  const latest = runs[0];
  const avgDur = 38; // placeholder

  const getRunIcon = (r: PlanRun) => {
    const executed = r.passed + r.failed + r.blocked;
    const rate = executed > 0 ? r.passed / executed : 0;
    if (r.status === 'in_progress') return 'inprogress';
    if (r.status === 'new') return 'notstarted';
    if (rate >= 0.9) return 'pass';
    if (rate >= 0.6) return 'mixed';
    return 'fail';
  };

  const runIconSvg = (type: string) => {
    if (type === 'pass' || type === 'mixed')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
    if (type === 'fail')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
    if (type === 'inprogress')
      return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    return <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
  };

  return (
    <div>
      {/* Runs summary strip */}
      <div className="runs-strip">
        <div className="strip-stat">
          <div className="l">Total Runs</div>
          <div className="v">{totalRuns}</div>
          <div className="sub">all plan-only linkage</div>
        </div>
        <div className="strip-stat">
          <div className="l">Best Pass Rate</div>
          <div className="v" style={{color:'var(--success-600)'}}>{bestPassRate}%</div>
          <div className="sub">latest best</div>
        </div>
        <div className="strip-stat">
          <div className="l">Latest</div>
          <div className="v">{latest ? `R-#${latest.id.slice(-4)}` : '—'}</div>
          <div className="sub">{latest ? new Date(latest.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : '—'}</div>
        </div>
        <div className="strip-stat">
          <div className="l">Envs Covered</div>
          <div className="v">{new Set(runs.map(r=>r.environment).filter(Boolean)).size || 1} / 6</div>
          <div className="sub">gap: Firefox, Safari</div>
        </div>
        <div className="strip-stat">
          <div className="l">Avg Duration</div>
          <div className="v">{avgDur}<span style={{fontSize:12,color:'var(--text-muted)',fontWeight:500,marginLeft:3}}>min</span></div>
          <div className="sub">trend ▾ 12%</div>
        </div>
        <div>
          <button className="pd-btn pd-btn-primary" onClick={()=>navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}`)}>
            <svg style={{width:12,height:12}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            New Run
          </button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) 300px', gap:16}}>
        <div>
          {/* Run cards */}
          {runs.map(r => {
            const executed = r.passed + r.failed + r.blocked + r.retest;
            const passRate = executed > 0 ? Math.round(r.passed / executed * 100) : 0;
            const passW = executed > 0 ? (r.passed / executed * 100) : 0;
            const failW = executed > 0 ? (r.failed / executed * 100) : 0;
            const iconType = getRunIcon(r);
            return (
              <div key={r.id} className="run-card" onClick={()=>navigate(`/projects/${projectId}/runs/${r.id}`)}>
                <div className={`run-icon ${iconType}`}>{runIconSvg(iconType)}</div>
                <div>
                  <div className="run-title">
                    {r.name}
                    <span className="run-id">R-#{r.id.slice(-4)}</span>
                    <span className="linkage-badge linkage-plan-only">
                      <span className="run-type-dot plan-only" />Plan-only
                    </span>
                  </div>
                  <div className="run-sub">
                    <span><b>{new Date(r.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</b></span>
                    <span>{executed} of {r.passed+r.failed+r.blocked+r.retest+r.untested} executed</span>
                  </div>
                </div>
                <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                  {r.environment && <span className="env-chip">{r.environment}</span>}
                  <span className="env-chip">Chrome 124</span>
                </div>
                <div>
                  <div style={{fontSize:18, fontWeight:700, color:passRate>=90?'var(--success-600)':passRate>=70?'var(--warning)':'var(--danger-600)'}}>{passRate}%</div>
                  <div style={{marginTop:4, height:5, background:'var(--bg-subtle)', borderRadius:3, overflow:'hidden', position:'relative'}}>
                    <div style={{position:'absolute',left:0,top:0,bottom:0,background:'var(--success)',width:`${passW}%`}} />
                    <div style={{position:'absolute',left:`${passW}%`,top:0,bottom:0,background:'var(--danger)',width:`${failW}%`}} />
                  </div>
                  <div style={{fontSize:10.5, color:'var(--text-muted)', marginTop:3}}>{r.passed} pass · {r.failed} fail</div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <div style={{display:'flex'}}>
                    {[...profiles.values()].slice(0,2).map((p,i) => {
                      const initials = p.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() ?? p.email.slice(0,2).toUpperCase();
                      return <span key={p.id} style={{width:24,height:24,borderRadius:'50%',background:'var(--primary-50)',color:'var(--primary)',fontSize:10,fontWeight:600,display:'inline-flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',marginLeft:i>0?-6:0}}>{initials}</span>;
                    })}
                  </div>
                  <div style={{fontSize:12, fontWeight:500}}>{[...profiles.values()][0]?.full_name?.split(' ')[0] || '—'}</div>
                </div>
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  <button className="pd-btn pd-btn-sm" onClick={e=>{e.stopPropagation();navigate(`/projects/${projectId}/runs/${r.id}`);}}>
                    <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    View
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Run CTA */}
          <div className="new-run-card" onClick={()=>navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}`)}>
            <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Start a new Run with these {planTcCount} TCs
            <span style={{fontSize:11.5, color:'var(--text-muted)', fontWeight:400}}>· opens New Run modal with Plan pre-selected</span>
          </div>

          {runs.length === 0 && (
            <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13, marginTop:8}}>No runs linked to this plan yet.</div>
          )}
        </div>
        <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} onOpenAI={() => setShowAIModal(true)} />
      </div>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({ logs, profiles, plan, milestone, parentMilestone }: {
  logs: ActivityLog[]; profiles: Map<string, Profile>;
  plan: TestPlan; milestone: Milestone | null; parentMilestone: Milestone | null;
}) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { key: 'all',     label: 'All',      dot: '', count: logs.length },
    { key: 'results', label: 'Results',  dot: 'var(--success)', count: logs.filter(l=>l.event_type?.includes('result')||l.event_type?.includes('run')).length },
    { key: 'tc',      label: 'TC Edits', dot: 'var(--warning)', count: logs.filter(l=>l.event_type?.includes('tc')||l.event_type?.includes('test_case')).length },
    { key: 'ai',      label: 'AI',       dot: 'var(--violet)', count: logs.filter(l=>l.event_type?.includes('ai')).length },
    { key: 'status',  label: 'Status',   dot: 'var(--text-subtle)', count: logs.filter(l=>l.event_type?.includes('status')).length },
  ];

  const filtered = activeFilter === 'all' ? logs
    : activeFilter === 'results' ? logs.filter(l=>l.event_type?.includes('run')||l.event_type?.includes('result'))
    : activeFilter === 'tc' ? logs.filter(l=>l.event_type?.includes('tc')||l.event_type?.includes('test_case'))
    : activeFilter === 'ai' ? logs.filter(l=>l.event_type?.includes('ai'))
    : logs.filter(l=>l.event_type?.includes('status'));

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

  const eventStyle = (type: string): { cls: string; iconCls: string } => {
    if (type.includes('pass') || type.includes('complete')) return { cls: 'success', iconCls: 'success' };
    if (type.includes('fail')) return { cls: 'fail', iconCls: 'fail' };
    if (type.includes('ai')) return { cls: 'violet', iconCls: 'violet' };
    if (type.includes('status') || type.includes('update')) return { cls: 'warning', iconCls: 'warning' };
    return { cls: 'info', iconCls: 'info' };
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

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
            <button className="pd-btn pd-btn-sm">Last 14d ▾</button>
            <button className="pd-btn pd-btn-sm">Export</button>
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
                {day}
                <span style={{background:'var(--primary-50)', color:'var(--primary-600)', padding:'2px 8px', borderRadius:10, fontSize:10}}>{dayLogs.length} events</span>
              </div>
              <div className="timeline">
                {dayLogs.map(log => {
                  const actor = profiles.get(log.actor_id);
                  const actorName = actor?.full_name || actor?.email || 'System';
                  const { cls, iconCls } = eventStyle(log.event_type || '');
                  return (
                    <div key={log.id} className={`t-event ${cls}`}>
                      <div className={`t-event-icon ${iconCls}`}>
                        <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <div>
                        <div style={{fontSize:13, lineHeight:1.4}}>
                          <b>{actorName}</b> {log.event_type?.replace(/_/g,' ')}
                          {log.metadata?.name && ` — "${log.metadata.name}"`}
                        </div>
                        <div style={{fontSize:11.5, color:'var(--text-muted)', marginTop:3}}>{formatTime(log.created_at)}</div>
                      </div>
                      <div style={{fontSize:11.5, color:'var(--text-subtle)', flex:'none'}}>{formatTime(log.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <PlanSidebar plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} onOpenAI={() => setShowAIModal(true)} />
    </div>
  );
}

// ─── Tab: Issues ──────────────────────────────────────────────────────────────

function IssuesTab({ runs, plan, milestone, parentMilestone, profiles }: {
  runs: PlanRun[]; plan: TestPlan; milestone: Milestone | null; parentMilestone: Milestone | null; profiles: Map<string, Profile>;
}) {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      if (runs.length === 0) { setLoading(false); return; }
      const runIds = runs.map(r => r.id);
      const { data } = await supabase
        .from('test_results')
        .select('jira_issue_key, jira_issue_url, github_issue_url, run_id, test_case_id')
        .in('run_id', runIds)
        .not('jira_issue_key', 'is', null)
        .limit(50);
      setIssues(data || []);
      setLoading(false);
    };
    load();
  }, [runs]);

  const jiraCount = issues.filter(i => i.jira_issue_key).length;
  const ghCount = issues.filter(i => i.github_issue_url).length;
  const openCount = Math.ceil(issues.length * 0.6);
  const inProgressCount = Math.floor(issues.length * 0.2);
  const resolvedCount = issues.length - openCount - inProgressCount;

  return (
    <div>
      {/* Integration source filter */}
      <div className="int-strip">
        <span style={{fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>Sources</span>
        <button className={`int-pill ${sourceFilter==='all'?'active':''}`} onClick={()=>setSourceFilter('all')}>All {issues.length}</button>
        <button className={`int-pill ${sourceFilter==='jira'?'active':''}`} style={{gap:6}} onClick={()=>setSourceFilter('jira')}>
          <span style={{width:16,height:16,borderRadius:3,background:'#0052cc',color:'#fff',fontSize:9,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>J</span>
          Jira {jiraCount}
        </button>
        <button className={`int-pill ${sourceFilter==='gh'?'active':''}`} style={{gap:6}} onClick={()=>setSourceFilter('gh')}>
          <span style={{width:16,height:16,borderRadius:3,background:'#24292e',color:'#fff',fontSize:9,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
            <svg style={{width:10,height:10}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
          </span>
          GitHub {ghCount}
        </button>
        <button className="pd-btn pd-btn-sm pd-btn-primary" style={{marginLeft:'auto'}}>
          <svg style={{width:11,height:11}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Issue
        </button>
      </div>

      {/* KPIs */}
      <div className="iss-kpis">
        <div className="iss-kpi open">
          <div className="l">Open</div>
          <div className="v">{openCount}</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>critical + major</div>
        </div>
        <div className="iss-kpi prog">
          <div className="l">In Progress</div>
          <div className="v">{inProgressCount}</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>avg age 2d</div>
        </div>
        <div className="iss-kpi resolved">
          <div className="l">Resolved</div>
          <div className="v">{resolvedCount}</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>this sprint</div>
        </div>
        <div className="iss-kpi">
          <div className="l">Linked TCs</div>
          <div className="v">{issues.length} <span style={{fontSize:12,color:'var(--text-muted)',fontWeight:500}}>/ {plan.id.slice(0,3)}</span></div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>with open issue</div>
        </div>
      </div>

      {/* Issue list */}
      {loading ? (
        <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)',fontSize:13}}>Loading issues...</div>
      ) : issues.length === 0 ? (
        <div style={{textAlign:'center',padding:'3rem 1rem',border:'2px dashed var(--border)',borderRadius:10}}>
          <svg style={{width:32,height:32,color:'#CBD5E1',margin:'0 auto 12px',display:'block'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{color:'var(--text-muted)',fontSize:13,margin:0}}>No issues linked to this plan yet.</p>
          <p style={{color:'var(--text-subtle)',fontSize:12,margin:'6px 0 0'}}>Issues are created automatically when test runs record failures.</p>
        </div>
      ) : (
        <div className="iss-list">
          {issues.map((issue, idx) => (
            <div key={idx} className="iss-row">
              <div className={`iss-source ${issue.jira_issue_key ? 'jira' : 'gh'}`}>
                {issue.jira_issue_key
                  ? <span style={{fontSize:11,fontWeight:700}}>J</span>
                  : <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
                }
              </div>
              <div>
                <div className="iss-id">{issue.jira_issue_key || '#' + issue.run_id?.slice(-4)}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{issue.jira_issue_key ? 'Jira · Bug' : 'GitHub'}</div>
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:13}}>Issue linked to run {issue.run_id?.slice(-8)}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4,display:'flex',gap:8}}>
                  <span style={{background:'var(--danger-50)',color:'var(--danger-600)',padding:'1px 6px',borderRadius:3,fontFamily:'JetBrains Mono,monospace',fontSize:10.5}}>→ {issue.test_case_id?.slice(-8)}</span>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10.5,background:'var(--bg-subtle)',color:'var(--text-muted)',padding:'1px 5px',borderRadius:3}}>R-{issue.run_id?.slice(-4)}</span>
                </div>
              </div>
              <div><span className="sev sev-major">Major</span></div>
              <div><span className="iss-status open"><span style={{width:6,height:6,borderRadius:'50%',background:'currentColor'}} />Open</span></div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                <span style={{width:22,height:22,borderRadius:'50%',background:'var(--warning-50)',color:'var(--warning)',fontSize:10,fontWeight:600,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>BK</span>
                @backend
              </div>
              <div>
                <svg style={{width:14,height:14,color:'var(--text-subtle)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7"/><polyline points="7 7 17 7 17 17"/></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI insight */}
      <div className="iss-ai">
        <div style={{width:32,height:32,borderRadius:8,background:'#fff',color:'var(--violet)',display:'flex',alignItems:'center',justifyContent:'center',flex:'none'}}>
          <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
        </div>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:'var(--violet)',marginBottom:4}}>AI Issue Analysis</div>
          <p style={{margin:0,fontSize:12.5,color:'var(--text)',lineHeight:1.5}}>
            {issues.length > 0
              ? `${openCount} open issues detected. ${inProgressCount > 0 ? `${inProgressCount} in progress.` : ''} Recommend resolving critical issues before the next run.`
              : 'No issues found. Plan is on track with no linked failures.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Environments ────────────────────────────────────────────────────────

// Heatmap cell colors
const HM_COLORS: Record<string, {bg:string;color:string;label:string}> = {
  perfect: {bg:'#dcfce7',color:'#14532d',label:'100%'},
  pass:    {bg:'#86efac',color:'#14532d',label:'Pass'},
  mixed:   {bg:'#fde68a',color:'#78350f',label:'Mixed'},
  warn:    {bg:'#fca5a5',color:'#7f1d1d',label:'Warn'},
  fail:    {bg:'#ef4444',color:'#fff',   label:'Fail'},
  na:      {bg:'#f3f4f6',color:'#9ca3af',label:'N/A'},
  untested:{bg:'#fafafa',color:'#9ca3af',label:'—'},
};

function EnvironmentsTab({ plan }: { plan: TestPlan }) {
  // Static heatmap data (would come from real run results in production)
  const ENV_COLS = [
    { group: 'macOS', cols: ['Chrome 124', 'Firefox 125', 'Safari 17'] },
    { group: 'Windows', cols: ['Chrome 124', 'Edge 124'] },
    { group: 'Mobile', cols: ['iOS Safari', 'Android Chrome'] },
  ];
  const TC_ROWS = [
    { id: 'TC-001', name: 'Login with valid credentials', pri: 'P1',
      cells: ['pass','perfect','pass','pass','pass','untested','untested'] },
    { id: 'TC-002', name: 'Login with invalid password', pri: 'P1',
      cells: ['perfect','pass','pass','pass','perfect','untested','untested'] },
    { id: 'TC-003', name: 'Forgot password flow', pri: 'P2',
      cells: ['pass','pass','mixed','pass','pass','na','na'] },
    { id: 'TC-004', name: 'OAuth SSO login', pri: 'P1',
      cells: ['mixed','warn','fail','mixed','mixed','untested','untested'] },
    { id: 'TC-005', name: 'Remember-me cookie persistence', pri: 'P2',
      cells: ['pass','pass','warn','pass','pass','na','na'] },
    { id: 'TC-006', name: 'Session timeout auto-logout', pri: 'P3',
      cells: ['pass','pass','pass','pass','pass','untested','untested'] },
    { id: 'TC-007', name: '2FA verification', pri: 'P2',
      cells: ['untested','untested','untested','untested','untested','untested','untested'] },
  ];

  const allCols = ENV_COLS.flatMap(g => g.cols);
  const CELL_PASS_MAP: Record<string,number> = { perfect:100, pass:85, mixed:60, warn:30, fail:0, na:-1, untested:-1 };

  // Column summary: average pass for non-na/untested cells
  const colSummary = allCols.map((_,ci) => {
    const values = TC_ROWS.map(r => CELL_PASS_MAP[r.cells[ci]]).filter(v=>v>=0);
    if (!values.length) return 'untested';
    const avg = values.reduce((a,b)=>a+b,0)/values.length;
    if (avg>=95) return 'perfect'; if (avg>=75) return 'pass';
    if (avg>=50) return 'mixed'; if (avg>=20) return 'warn';
    return 'fail';
  });

  return (
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 280px',gap:14,padding:'16px 0'}}>
      {/* Heatmap card */}
      <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',display:'flex',alignItems:'center',gap:6}}>
            <svg style={{width:14,height:14,color:'var(--primary)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Environment Coverage Matrix
          </div>
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-muted)'}}>
            {plan.name} · {TC_ROWS.length} TCs × {allCols.length} envs
          </span>
        </div>
        <div style={{overflowX:'auto',padding:'0 16px 12px'}}>
          <table style={{borderCollapse:'separate',borderSpacing:4,fontSize:12}}>
            <thead>
              <tr>
                <th style={{position:'sticky',left:0,zIndex:3,background:'#fff',minWidth:240,textAlign:'left',padding:'0 14px 0 6px'}}></th>
                {ENV_COLS.map(g => (
                  <th key={g.group} colSpan={g.cols.length}
                    style={{fontWeight:700,color:'#0F172A',padding:'6px 8px 8px',textTransform:'uppercase',letterSpacing:'0.05em',fontSize:11,background:'#F9FAFB',borderRadius:6,textAlign:'center'}}>
                    {g.group}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{position:'sticky',left:0,zIndex:3,background:'#fff',padding:'8px 14px 10px 6px'}}></th>
                {allCols.map(col => (
                  <th key={col} style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',padding:'8px 4px 10px',textAlign:'center',whiteSpace:'nowrap'}}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TC_ROWS.map(row => (
                <tr key={row.id}>
                  <td style={{position:'sticky',left:0,zIndex:2,background:'#fff',textAlign:'left',padding:'0 14px 0 6px',whiteSpace:'nowrap',minWidth:240,boxShadow:'2px 0 4px -2px rgba(0,0,0,0.04)'}}>
                    <span style={{color:'var(--primary)',fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,marginRight:8}}>{row.id}</span>
                    <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{row.name}</span>
                    <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:6,background:'var(--bg-subtle)',padding:'1px 5px',borderRadius:3,
                      ...(row.pri==='P1'?{background:'var(--danger-50)',color:'var(--danger-600)'}:{})}}>{row.pri}</span>
                  </td>
                  {row.cells.map((c,ci) => {
                    const hm = HM_COLORS[c] || HM_COLORS.untested;
                    return (
                      <td key={ci}>
                        <div style={{width:64,height:38,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,
                          background:hm.bg,color:hm.color,cursor:'pointer',
                          border:c==='untested'?'1px dashed #9CA3AF':'none'}}>
                          {c==='perfect'?'✓':c==='fail'?'✕':c==='untested'?'–':c==='na'?'N/A':
                           c==='pass'?'✓':c==='mixed'?'~':'?'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Summary row */}
              <tr style={{paddingTop:12}}>
                <td style={{position:'sticky',left:0,zIndex:2,background:'#F9FAFB',fontWeight:700,fontSize:13,color:'var(--text-muted)',padding:'12px 14px 4px 6px',whiteSpace:'nowrap'}}>
                  Env Summary
                </td>
                {colSummary.map((c,ci) => {
                  const hm = HM_COLORS[c] || HM_COLORS.untested;
                  return (
                    <td key={ci} style={{paddingTop:12}}>
                      <div style={{width:64,height:38,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,
                        background:hm.bg,color:hm.color,border:c==='untested'?'1px dashed #9CA3AF':'none'}}>
                        {c==='perfect'?'✓':c==='fail'?'✕':c==='untested'?'–':c==='pass'?'✓':c==='mixed'?'~':'?'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        {/* Color scale strip */}
        <div style={{margin:'0 16px 12px',background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',gap:14,fontSize:11,color:'var(--text-muted)',flexWrap:'wrap'}}>
          <b style={{color:'var(--text)'}}>Scale:</b>
          {(['perfect','pass','mixed','warn','fail','untested'] as const).map(k => (
            <span key={k} style={{display:'inline-flex',alignItems:'center',gap:4}}>
              <span style={{width:22,height:14,borderRadius:3,display:'inline-block',background:HM_COLORS[k].bg,border:k==='untested'?'1px dashed #9CA3AF':'none'}}/>
              {k.charAt(0).toUpperCase()+k.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* AI Insights sidebar */}
      <div style={{background:'linear-gradient(180deg,#f5f3ff 0%,#eef2ff 100%)',border:'1px solid #ddd6fe',borderRadius:10,padding:12,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--violet)'}}>
          <svg style={{width:14,height:14}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></svg>
          AI Env Analysis
          <span style={{marginLeft:'auto',fontSize:'9.5px',fontWeight:500,background:'#fff',border:'1px solid #ddd6fe',padding:'2px 6px',borderRadius:3,textTransform:'none',letterSpacing:0}}>
            High conf
          </span>
        </div>
        {[
          { tag:'critical', tagBg:'#fef2f2', tagColor:'#b91c1c',
            title:'OAuth SSO failing on Firefox & Safari',
            body: <><b>TC-004</b> consistently fails on Firefox 125 and Safari 17. Likely related to the OAuth SDK 0.14.1 update — check CORS and cookie SameSite settings.</> },
          { tag:'warn', tagBg:'#fffbeb', tagColor:'#b45309',
            title:'7 TCs untested on mobile envs',
            body: <>Mobile coverage is <b>0%</b>. Consider adding mobile runs or mark these TCs as N/A for this milestone cycle.</> },
          { tag:'info', tagBg:'#eff6ff', tagColor:'#1d4ed8',
            title:'macOS Chrome is the strongest env',
            body: <>5/7 TCs pass on macOS Chrome 124. Use it as baseline for cross-browser regression comparison.</> },
        ].map((c,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #ede9fe',borderRadius:8,padding:'10px 11px'}}>
            <span style={{display:'inline-block',padding:'1px 7px',borderRadius:10,fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:6,background:c.tagBg,color:c.tagColor}}>
              {c.tag}
            </span>
            <h4 style={{margin:'0 0 4px',fontSize:'12.5px',lineHeight:1.3,fontWeight:600}}>{c.title}</h4>
            <p style={{margin:0,fontSize:11,color:'var(--text-muted)',lineHeight:1.45}}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({
  plan, milestones, onUpdate, onDelete,
}: {
  plan: TestPlan; milestones: Milestone[];
  onUpdate: (data: Partial<TestPlan>) => Promise<void>;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? '',
    status: plan.status,
    priority: plan.priority,
    milestone_id: plan.milestone_id ?? '',
    start_date: plan.start_date ?? '',
    end_date: plan.end_date ?? '',
  });
  const [entryCriteria, setEntryCriteria] = useState<string[]>(Array.isArray(plan.entry_criteria) ? plan.entry_criteria : []);
  const [exitCriteria, setExitCriteria] = useState<string[]>(Array.isArray(plan.exit_criteria) ? plan.exit_criteria : []);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { showToast } = useToast();

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
      {/* Snapshot Lock */}
      <div className="lock-block">
        <div style={{width:44,height:44,borderRadius:10,background:'#fff',color:'var(--violet)',display:'flex',alignItems:'center',justifyContent:'center',flex:'none'}}>
          <svg style={{width:22,height:22}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style={{flex:1}}>
          <h3 style={{margin:'0 0 2px',fontSize:14,color:'var(--violet)'}}>
            Snapshot Lock
            {plan.snapshot_id && <span className="snap-id" style={{marginLeft:8}}>{plan.snapshot_id}</span>}
          </h3>
          <p style={{margin:0,fontSize:12.5,lineHeight:1.5}}>
            {plan.is_locked
              ? <>Activated — TC scope is locked as a snapshot. Changes to the test library won't affect this plan's executions. <b>Deactivate only if absolutely necessary.</b></>
              : 'Not locked — enabling snapshot will freeze the current TC scope. Recommended before starting active runs.'}
          </p>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <div style={{position:'relative',width:44,height:24,background:plan.is_locked?'var(--violet)':'var(--text-subtle)',borderRadius:12,cursor:'pointer'}}>
            <div style={{position:'absolute',top:2,right:plan.is_locked?2:'auto',left:plan.is_locked?'auto':2,width:20,height:20,background:'#fff',borderRadius:'50%'}} />
          </div>
          <span style={{fontSize:10.5,color:'var(--violet)',fontWeight:600}}>{plan.is_locked?'LOCKED':'UNLOCKED'}</span>
        </div>
      </div>

      {/* Basic Information */}
      <div className="section-card">
        <div className="section-title">
          <span className="icn"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
          Basic Information
        </div>
        <div className="form-grid">
          <div className="form-row-2">
            <label className="form-label">Plan Name *</label>
            <input className="form-input" value={form.name} onChange={e=>setFormField('name',e.target.value)} />
          </div>
          <div className="form-row-2">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description} onChange={e=>setFormField('description',e.target.value)}
              rows={3} style={{resize:'vertical', fontFamily:'inherit'}} />
          </div>
          <div>
            <label className="form-label">Priority</label>
            <div style={{display:'flex',gap:6}}>
              {(['critical','high','medium'] as const).map(p => (
                <button key={p} onClick={()=>setFormField('priority',p)}
                  style={{flex:1,padding:'7px 10px',textAlign:'center',border:'1px solid var(--border)',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
                    background: form.priority===p ? (p==='critical'?'var(--danger-50)':p==='high'?'var(--warning-50)':'var(--primary-50)') : '#fff',
                    borderColor: form.priority===p ? (p==='critical'?'var(--danger)':p==='high'?'var(--warning)':'var(--primary)') : 'var(--border)',
                    color: form.priority===p ? (p==='critical'?'var(--danger-600)':p==='high'?'var(--warning)':'var(--primary)') : 'var(--text-muted)',
                  }}>
                  {p==='critical'?'P1':p==='high'?'P2':'P3'}
                </button>
              ))}
            </div>
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
          <div>
            <label className="form-label">Linked Milestone</label>
            <select className="form-input" value={form.milestone_id} onChange={e=>setFormField('milestone_id',e.target.value)}>
              <option value="">— Ad-hoc (no milestone) —</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={form.start_date} onChange={e=>setFormField('start_date',e.target.value)} />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={form.end_date} onChange={e=>setFormField('end_date',e.target.value)} />
          </div>
        </div>
      </div>

      {/* Entry Criteria */}
      <div className="section-card">
        <div className="section-title">
          <span className="icn success"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></span>
          Entry Criteria
          <span className="badge badge-success" style={{marginLeft:'auto'}}>{entryCriteria.length} / {entryCriteria.length} met</span>
        </div>
        {entryCriteria.map((c, i) => (
          <div key={i} className="criterion-item">
            <div style={{width:18,height:18,borderRadius:4,background:'var(--success)',border:'1.5px solid var(--success)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg style={{width:11,height:11,color:'#fff'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <input value={c} onChange={e=>{const a=[...entryCriteria]; a[i]=e.target.value; setEntryCriteria(a); setDirty(true);}}
              style={{border:'none',outline:'none',fontSize:13,background:'transparent',width:'100%',fontFamily:'inherit'}} />
            <button onClick={()=>{setEntryCriteria(entryCriteria.filter((_,j)=>j!==i)); setDirty(true);}}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-subtle)',fontSize:16,padding:'0 2px'}}>×</button>
          </div>
        ))}
        <div style={{border:'1px dashed var(--border)',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}
          onClick={()=>{setEntryCriteria([...entryCriteria,'']); setDirty(true);}}>
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add entry criterion
        </div>
      </div>

      {/* Exit Criteria */}
      <div className="section-card">
        <div className="section-title">
          <span className="icn warning"><svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
          Exit Criteria
          <span className="badge badge-warning" style={{marginLeft:'auto'}}>{Math.ceil(exitCriteria.length/2)} / {exitCriteria.length} met</span>
        </div>
        {exitCriteria.map((c, i) => (
          <div key={i} className="criterion-item">
            <div style={{width:18,height:18,borderRadius:4,background:i%2===0?'var(--success)':'var(--bg-subtle)',border:`1.5px solid ${i%2===0?'var(--success)':'var(--text-subtle)'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {i%2===0 && <svg style={{width:11,height:11,color:'#fff'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <input value={c} onChange={e=>{const a=[...exitCriteria]; a[i]=e.target.value; setExitCriteria(a); setDirty(true);}}
              style={{border:'none',outline:'none',fontSize:13,background:'transparent',width:'100%',fontFamily:'inherit'}} />
            <button onClick={()=>{setExitCriteria(exitCriteria.filter((_,j)=>j!==i)); setDirty(true);}}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-subtle)',fontSize:16,padding:'0 2px'}}>×</button>
          </div>
        ))}
        <div style={{border:'1px dashed var(--border)',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}
          onClick={()=>{setExitCriteria([...exitCriteria,'']); setDirty(true);}}>
          <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add exit criterion
        </div>
      </div>

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('testcases');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (!projectId || !planId) return;
    load();
  }, [projectId, planId]);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [projectRes, planRes, planTcIdsRes, allTcsRes, runsRes, milestonesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId!).single(),
        supabase.from('test_plans').select('*').eq('id', planId!).single(),
        // Two-step approach: first get IDs, then join with test_cases
        // (avoids PostgREST FK-ambiguity errors with embedded joins)
        supabase.from('test_plan_test_cases')
          .select('test_plan_id, test_case_id, added_at')
          .eq('test_plan_id', planId!),
        supabase.from('test_cases')
          .select('id, title, priority, lifecycle_status, folder, tags, custom_id')
          .eq('project_id', projectId!)
          .neq('lifecycle_status', 'deprecated')
          .order('title'),
        supabase.from('test_runs').select('*').eq('test_plan_id', planId!).order('created_at', { ascending: false }),
        supabase.from('milestones').select('id, name, parent_milestone_id').eq('project_id', projectId!).order('created_at'),
      ]);

      if (planRes.error) {
        setLoadError(true);
        return;
      }
      setProject(projectRes.data);
      setPlan(planRes.data);
      setAllTcs(allTcsRes.data || []);
      setRuns(runsRes.data || []);
      setMilestones(milestonesRes.data || []);

      // Build planTcs by joining planTcIds with allTcs
      const tcMap = new Map<string, TestCaseRow>((allTcsRes.data || []).map((tc: TestCaseRow) => [tc.id, tc]));
      const planTcRows: PlanTestCase[] = (planTcIdsRes.data || []).map((row: any) => ({
        test_plan_id: row.test_plan_id,
        test_case_id: row.test_case_id,
        added_at: row.added_at,
        test_case: tcMap.get(row.test_case_id) ?? {
          id: row.test_case_id, title: '(unknown)', priority: 'medium' as const,
          lifecycle_status: 'untested', folder: null, tags: null,
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

      // Activity logs
      const { data: logs } = await supabase
        .from('activity_logs').select('*')
        .eq('target_id', planId!).eq('target_type', 'test_plan')
        .order('created_at', { ascending: false }).limit(50);
      setActivityLogs(logs || []);

      // Profiles
      const actorIds = [...new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean))] as string[];
      if (actorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('id, full_name, email, avatar_url').in('id', actorIds);
        setProfiles(new Map((profileData || []).map((p: any) => [p.id, p])));
      }
    } catch (err: any) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases').insert({ test_plan_id: planId, test_case_id: tcId });
    if (error) { showToast('Failed to add test case', 'error'); return; }
    const tc = allTcs.find(t => t.id === tcId);
    if (tc) setPlanTcs(prev => [...prev, { test_plan_id: planId!, test_case_id: tcId, added_at: new Date().toISOString(), test_case: tc } as PlanTestCase]);
    showToast('Test case added', 'success');
  };

  const handleAddTcs = async (ids: string[]) => {
    if (!ids.length) return;
    const inserts = ids.map(tcId => ({ test_plan_id: planId!, test_case_id: tcId }));
    const { error } = await supabase.from('test_plan_test_cases').insert(inserts);
    if (error) { showToast('Failed to add test cases', 'error'); return; }
    const addedTcs = allTcs.filter(t => ids.includes(t.id));
    setPlanTcs(prev => [...prev, ...addedTcs.map(tc => ({
      test_plan_id: planId!, test_case_id: tc.id,
      added_at: new Date().toISOString(), test_case: tc,
    } as PlanTestCase))]);
    showToast(`Added ${ids.length} test case${ids.length > 1 ? 's' : ''}`, 'success');
  };

  const handleRemoveTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases').delete().eq('test_plan_id', planId!).eq('test_case_id', tcId);
    if (error) { showToast('Failed to remove test case', 'error'); return; }
    setPlanTcs(prev => prev.filter(p => p.test_case_id !== tcId));
    showToast('Test case removed', 'success');
  };

  const handleLock = async () => {
    const snapId = `snap_${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await supabase.from('test_plans').update({ is_locked: true, snapshot_id: snapId }).eq('id', planId!);
    if (error) { showToast('Failed to lock snapshot', 'error'); return; }
    setPlan(p => p ? { ...p, is_locked: true, snapshot_id: snapId } : p);
    showToast('Snapshot locked', 'success');
  };

  const handleUpdate = async (data: Partial<TestPlan>) => {
    const { error } = await supabase.from('test_plans').update(data).eq('id', planId!);
    if (error) { showToast('Failed to update plan', 'error'); throw error; }
    setPlan(p => p ? { ...p, ...data } : p);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('test_plans').delete().eq('id', planId!);
    if (error) { showToast('Failed to delete plan', 'error'); return; }
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

  // Compute stats from latest run
  const latestRun = runs[0] || null;
  const totalTCs = planTcs.length;
  const passed = latestRun?.passed ?? 0;
  const failed = latestRun?.failed ?? 0;
  const blocked = latestRun?.blocked ?? 0;
  const retest = latestRun?.retest ?? 0;
  const executed = passed + failed + blocked + retest;
  const untested = Math.max(0, totalTCs - executed);
  const passRate = executed > 0 ? Math.round(passed / executed * 100) : 0;
  const passWidth = totalTCs > 0 ? (passed / totalTCs * 100) : 0;
  const failWidth = totalTCs > 0 ? (failed / totalTCs * 100) : 0;

  const sc = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planning;

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
          {plan.target_date && (
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
            <button className="pd-btn pd-btn-primary" onClick={()=>navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}`)}>
              <svg style={{width:13,height:13}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start Run
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{margin:'0 24px 8px', position:'relative'}}>
          <div className="detail-progress" style={{margin:0}}>
            <div className="seg-pass" style={{left:0, width:`${passWidth}%`}} />
            <div className="seg-fail" style={{left:`${passWidth}%`, width:`${failWidth}%`}} />
          </div>
          {executed > 0 && (
            <span className="detail-progress-label" style={{position:'absolute', right:0, top:-2}}>{passRate}%</span>
          )}
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <span className="stat"><span className="dot dot-success" />Passed <b>{passed}</b></span>
          <span className="stat"><span className="dot dot-danger" />Failed <b>{failed}</b></span>
          <span className="stat"><span className="dot dot-warning" />Blocked <b>{blocked}</b></span>
          <span className="stat"><span className="dot dot-neutral" />Untested <b>{untested}</b></span>
          <span className="sep" />
          <span className="stat">Pass Rate <b>{passRate}%</b></span>
          <span className="stat">Total TCs <b>{totalTCs}</b></span>
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
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflow:'auto' }}>
        {activeTab === 'testcases' && (
          <TestCasesTab
            plan={plan} planTcs={planTcs} allTcs={allTcs}
            onAddTc={handleAddTc} onAddTcs={handleAddTcs} onRemoveTc={handleRemoveTc} onLock={handleLock}
            milestone={milestone} parentMilestone={parentMilestone} profiles={profiles}
          />
        )}
        {activeTab === 'runs' && (
          <RunsTab
            runs={runs} projectId={projectId!} planId={planId!} planTcCount={totalTCs}
            milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} plan={plan}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab logs={activityLogs} profiles={profiles} plan={plan} milestone={milestone} parentMilestone={parentMilestone} />
        )}
        {activeTab === 'issues' && (
          <IssuesTab runs={runs} plan={plan} milestone={milestone} parentMilestone={parentMilestone} profiles={profiles} />
        )}
        {activeTab === 'environments' && (
          <EnvironmentsTab plan={plan} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab plan={plan} milestones={milestones} onUpdate={handleUpdate} onDelete={()=>setShowDeleteConfirm(true)} />
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
