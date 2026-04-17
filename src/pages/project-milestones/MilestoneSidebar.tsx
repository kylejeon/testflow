import React, { useState, useEffect, useRef } from 'react';
import MilestoneCard, { MilestoneCardData } from './MilestoneCard';
import type { AdhocRun } from './AdhocRunCard';

interface Props {
  milestones: MilestoneCardData[];
  adhocRuns: AdhocRun[];
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAdhoc: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onNewMilestone: () => void;
  isOpen: boolean;           // for responsive drawer
  onClose: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);
  return debouncedValue;
}

export default function MilestoneSidebar({
  milestones,
  adhocRuns,
  selectedId,
  expandedIds,
  onSelect,
  onSelectAdhoc,
  onToggleExpand,
  onNewMilestone,
  isOpen,
  onClose,
}: Props) {
  const [searchRaw, setSearchRaw] = useState('');
  const searchQuery = useDebounce(searchRaw, 200);

  const filteredMilestones = milestones.filter(m =>
    searchQuery.trim() === '' ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.subMilestones ?? []).some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sidebarEl = (
    <aside
      className="sidebar"
      style={{
        width: 280, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: '#f8f9fb',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      {/* Top: search + new milestone */}
      <div className="sidebar-top">
        <div className="input-icon">
          <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input"
            placeholder="Search milestones…"
            style={{ fontSize: 12 }}
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center' }}
          onClick={onNewMilestone}
        >
          <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Milestone
        </button>
      </div>

      {/* Milestones section */}
      <div className="sidebar-section-label">Milestones</div>

      {filteredMilestones.length === 0 && (
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>
          {searchQuery ? 'No milestones match your search' : 'No milestones yet'}
        </div>
      )}

      {filteredMilestones.map(ms => (
        <MilestoneCard
          key={ms.id}
          milestone={ms}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={id => { onSelect(id); onClose(); }}
          onToggleExpand={onToggleExpand}
        />
      ))}

      {/* Ad-hoc summary card (single card like milestone cards) */}
      {adhocRuns.length > 0 && (
        <>
          <hr className="sidebar-divider" />
          <div className="sidebar-section-label">Ad-hoc</div>
          <div
            className={`ms-card ${selectedId === 'adhoc' || adhocRuns.some(r => r.id === selectedId) ? 'selected' : ''}`}
            onClick={() => { onSelectAdhoc('adhoc'); onClose(); }}
            style={{ cursor: 'pointer' }}
          >
            <div className="ms-card-row1">
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--warning)', flexShrink:0, display:'inline-block' }} />
              <span className="ms-card-name">Ad-hoc Runs</span>
              <span className="badge" style={{ fontSize:10, padding:'1px 5px', flexShrink:0 }}>
                {adhocRuns.length} run{adhocRuns.length !== 1 ? 's' : ''}
              </span>
            </div>
            {(() => {
              const totalPassed = adhocRuns.reduce((s, r) => s + (r.passed || 0), 0);
              const totalFailed = adhocRuns.reduce((s, r) => s + (r.failed || 0), 0);
              const totalTCs = adhocRuns.reduce((s, r) => s + (r.test_case_ids?.length || 0), 0);
              const remaining = totalTCs - totalPassed - totalFailed;
              const passPct = totalTCs > 0 ? (totalPassed / totalTCs) * 100 : 0;
              return (
                <>
                  <div className="ms-card-row2" style={{ fontSize:11, color:'var(--text-muted)' }}>
                    Runs not assigned to any milestone
                  </div>
                  <div className="ms-card-pbar">
                    <div className={`ms-card-pbar-fill${passPct < 60 && totalTCs > 0 ? ' low' : ''}`} style={{ width:`${passPct}%` }} />
                  </div>
                  <div className="ms-card-row3">
                    <span className="stat-pass">{totalPassed}</span>&nbsp;passed &nbsp;·&nbsp;
                    <span className="stat-fail">{totalFailed}</span>&nbsp;failed &nbsp;·&nbsp; {remaining} left
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </aside>
  );

  return sidebarEl;
}
