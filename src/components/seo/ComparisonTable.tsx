/**
 * ComparisonTable — Feature / Pricing comparison table component.
 *
 * Two variants:
 *   - two-col: Testably vs one competitor (used by /alternatives/{slug})
 *   - three-col: Testably vs A vs B (used by /compare/{a}-vs-{b} vs-matrix)
 *
 * Visual: same JSX pattern that lives inline in src/pages/compare/page.tsx.
 * Extracted so /alternatives/{slug} and /compare/{a}-vs-{b} can reuse without
 * dragging in the entire /compare/{slug} page shell.
 */

import type { ReactNode } from 'react';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'w-5 h-5 text-indigo-500'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'w-5 h-5 text-red-400'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FeatureCell({ value, accent }: { value: boolean | string; accent?: boolean }) {
  if (value === true) {
    return (
      <>
        <CheckIcon className={`w-5 h-5 ${accent ? 'text-indigo-500' : 'text-gray-400'}`} />
        <span className="sr-only">Yes</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <XIcon className="w-5 h-5 text-gray-300" />
        <span className="sr-only">No</span>
      </>
    );
  }
  return <span className="text-xs font-medium text-gray-600">{value}</span>;
}

export interface TwoColRow {
  feature: string;
  testably: boolean | string;
  competitor: boolean | string;
}

export interface ThreeColRow {
  feature: string;
  testably: boolean | string;
  a: boolean | string;
  b: boolean | string;
}

export interface TwoColHeaders {
  feature: string;
  testably: string;
  competitor: string;
}

export interface ThreeColHeaders {
  feature: string;
  testably: string;
  competitorA: string;
  competitorB: string;
}

export type ComparisonTableProps =
  | {
      variant?: 'two-col';
      headers: TwoColHeaders;
      rows: TwoColRow[];
      renderCell?: (value: boolean | string, isTestably: boolean) => ReactNode;
      caption?: string;
    }
  | {
      variant: 'three-col';
      headers: ThreeColHeaders;
      rows: ThreeColRow[];
      /**
       * column: 'testably' | 'a' | 'b' so callers can distinguish three columns
       * (the two-col `isTestably` boolean is insufficient for three columns).
       */
      renderCell?: (value: boolean | string, column: 'testably' | 'a' | 'b') => ReactNode;
      caption?: string;
    };

export default function ComparisonTable(props: ComparisonTableProps) {
  if (props.variant === 'three-col') {
    return <ThreeColTable {...props} />;
  }
  return <TwoColTable {...props} />;
}

function TwoColTable({
  headers,
  rows,
  renderCell,
  caption,
}: {
  headers: TwoColHeaders;
  rows: TwoColRow[];
  renderCell?: (value: boolean | string, isTestably: boolean) => ReactNode;
  caption?: string;
}) {
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                className="text-left px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/2"
              >
                {headers.feature}
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wide"
              >
                {headers.testably}
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide"
              >
                {headers.competitor}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <th scope="row" className="px-6 py-4 text-sm text-gray-700 font-medium text-left">
                  {row.feature}
                </th>
                <td className="px-6 py-4 text-center bg-indigo-50/30">
                  <div className="flex justify-center">
                    {renderCell ? (
                      renderCell(row.testably, true)
                    ) : (
                      <FeatureCell value={row.testably} accent />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    {renderCell ? (
                      renderCell(row.competitor, false)
                    ) : (
                      <FeatureCell value={row.competitor} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="text-center text-gray-400 text-xs mt-4">{caption}</p>}
    </div>
  );
}

function ThreeColTable({
  headers,
  rows,
  renderCell,
  caption,
}: {
  headers: ThreeColHeaders;
  rows: ThreeColRow[];
  renderCell?: (value: boolean | string, column: 'testably' | 'a' | 'b') => ReactNode;
  caption?: string;
}) {
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                className="text-left px-5 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/4"
              >
                {headers.feature}
              </th>
              <th
                scope="col"
                className="px-5 py-4 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wide bg-indigo-50/40 w-1/4"
              >
                {headers.testably}
              </th>
              <th
                scope="col"
                className="px-5 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/4"
              >
                {headers.competitorA}
              </th>
              <th
                scope="col"
                className="px-5 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/4"
              >
                {headers.competitorB}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <th scope="row" className="px-5 py-4 text-sm text-gray-700 font-medium text-left">
                  {row.feature}
                </th>
                <td className="px-5 py-4 text-center bg-indigo-50/30">
                  <div className="flex justify-center">
                    {renderCell ? (
                      renderCell(row.testably, 'testably')
                    ) : (
                      <FeatureCell value={row.testably} accent />
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    {renderCell ? (
                      renderCell(row.a, 'a')
                    ) : (
                      <FeatureCell value={row.a} />
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    {renderCell ? (
                      renderCell(row.b, 'b')
                    ) : (
                      <FeatureCell value={row.b} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="text-center text-gray-400 text-xs mt-4">{caption}</p>}
    </div>
  );
}
