import { useState, useEffect } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

interface FolderData {
  name: string;
  size: number;
  passRate: number;
  passed: number;
  failed: number;
  untested: number;
}

function getHeatmapColor(passRate: number, hasData: boolean): string {
  if (!hasData) return '#F1F5F9';
  if (passRate >= 90) return '#16A34A';
  if (passRate >= 80) return '#4ADE80';
  if (passRate >= 60) return '#FCD34D';
  if (passRate >= 40) return '#FB923C';
  return '#EF4444';
}

function CustomContent(props: any) {
  const { x, y, width, height, name, root } = props;
  const item = root?.children?.find((c: any) => c.name === name) ?? props;
  const passRate = item?.passRate ?? 0;
  const hasData = item?.passed + item?.failed > 0;
  const color = getHeatmapColor(passRate, hasData);

  if (width < 30 || height < 20) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={4} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
            fill="#fff" fontSize={11} fontWeight={600} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {name.length > 14 ? name.slice(0, 12) + '…' : name}
          </text>
          {hasData ? (
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
              fill="rgba(255,255,255,0.9)" fontSize={width > 100 ? 10 : 9}>
              {width > 100 ? `${item?.size ?? 0} TC · ${passRate}%` : `${passRate}%`}
            </text>
          ) : (
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
              fill="rgba(255,255,255,0.7)" fontSize={9}>
              {item?.size ?? 0} TC
            </text>
          )}
        </>
      )}
    </g>
  );
}

export default function CoverageHeatmap({ projectId }: { projectId: string }) {
  const [folderData, setFolderData] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTCs, setTotalTCs] = useState(0);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      // Get all TCs with folder info
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('id, folder')
        .eq('project_id', projectId);

      if (!tcs?.length) { setFolderData([]); setTotalTCs(0); setLoading(false); return; }
      setTotalTCs(tcs.length);

      const tcIds = tcs.map(t => t.id);
      const tcFolderMap: Record<string, string> = {};
      tcs.forEach(t => { tcFolderMap[t.id] = t.folder || 'General'; });

      // Get latest result per TC
      const { data: results } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at')
        .in('test_case_id', tcIds)
        .order('created_at', { ascending: false });

      // Keep latest per TC
      const latestByTC: Record<string, string> = {};
      (results ?? []).forEach(r => {
        if (!latestByTC[r.test_case_id]) latestByTC[r.test_case_id] = r.status;
      });

      // Aggregate by folder
      const byFolder: Record<string, { total: number; passed: number; failed: number; untested: number }> = {};
      tcs.forEach(tc => {
        const folder = tc.folder || 'General';
        if (!byFolder[folder]) byFolder[folder] = { total: 0, passed: 0, failed: 0, untested: 0 };
        byFolder[folder].total++;
        const status = latestByTC[tc.id];
        if (!status || status === 'untested') byFolder[folder].untested++;
        else if (status === 'passed') byFolder[folder].passed++;
        else if (status === 'failed') byFolder[folder].failed++;
      });

      const items: FolderData[] = Object.entries(byFolder)
        .map(([name, s]) => {
          const executed = s.passed + s.failed;
          const rawName = name === '(root)' ? 'General' : name;
          const displayName = rawName.length > 20
            ? rawName.slice(rawName.lastIndexOf('/') + 1) || rawName
            : rawName;
          return {
            name: displayName,
            size: s.total,
            passRate: executed > 0 ? Math.round((s.passed / executed) * 100) : 0,
            passed: s.passed,
            failed: s.failed,
            untested: s.untested,
          };
        })
        .sort((a, b) => b.size - a.size);

      setFolderData(items);
    } catch (e) {
      console.error('CoverageHeatmap:', e);
    } finally {
      setLoading(false);
    }
  }

  const overallCoverage = totalTCs > 0
    ? Math.round(((folderData.reduce((s, f) => s + f.passed + f.failed, 0)) / totalTCs) * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-layout-grid-2-line text-indigo-500" />
          Coverage Heatmap
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-gray-500">
            Coverage <span className="font-semibold text-gray-900">{overallCoverage}%</span>
          </span>
          <span className="text-[11px] text-gray-400">{totalTCs} TCs</span>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-[210px] bg-gray-50 rounded-lg animate-pulse" />
        ) : folderData.length === 0 ? (
          <div className="h-[100px] flex items-center justify-center text-gray-400 text-sm">
            TC가 없습니다
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <Treemap
                data={folderData.map(f => ({ ...f, children: [] }))}
                dataKey="size"
                stroke="#fff"
                content={<CustomContent />}
              />
            </ResponsiveContainer>

            {/* Color legend */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              {[
                { color: '#EF4444', label: '0–40%' },
                { color: '#FB923C', label: '40–60%' },
                { color: '#FCD34D', label: '60–80%' },
                { color: '#4ADE80', label: '80–90%' },
                { color: '#16A34A', label: '90–100%' },
                { color: '#F1F5F9', label: '미실행' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
