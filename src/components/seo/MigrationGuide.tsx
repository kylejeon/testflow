/**
 * MigrationGuide — Migration steps + optional field mapping table for
 * /alternatives/{slug} pages.
 *
 * Design spec §1.1.F + §2.3:
 *   - Step cards row (3-col on lg, stacked on sm) with indigo numbered badges
 *   - Optional collapsible <details> field mapping table
 */

export interface MigrationStep {
  num: number;
  title: string;
  body: string;
}

export interface FieldMappingRow {
  from: string;
  to: string;
  note?: string;
}

export interface MigrationGuideProps {
  title: string;
  steps: MigrationStep[];
  importFormats: string[];
  fieldMapping?: FieldMappingRow[];
  /** Competitor display name used in the field mapping header (e.g. "TestRail field") */
  fromLabel?: string;
}

export default function MigrationGuide({
  title,
  steps,
  importFormats,
  fieldMapping,
  fromLabel = 'Source field',
}: MigrationGuideProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">{title}</h2>
      {importFormats.length > 0 && (
        <p className="text-center text-gray-500 mb-12">
          Supported import formats: {importFormats.join(' · ')}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col"
          >
            <p className="text-indigo-500 font-extrabold text-2xl mb-2">
              {String(step.num).padStart(2, '0')}
            </p>
            <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>

      {fieldMapping && fieldMapping.length > 0 && (
        <details className="group mt-8 bg-gray-50 rounded-2xl border border-gray-200 p-6">
          <summary className="cursor-pointer font-semibold text-slate-700 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
            <i
              className="ri-arrow-right-s-line text-gray-400 text-lg group-open:rotate-90 transition-transform"
              aria-hidden="true"
            ></i>
            View field mapping table
          </summary>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th
                    scope="col"
                    className="text-left py-3 px-4 font-semibold text-gray-500 uppercase tracking-wide text-xs"
                  >
                    {fromLabel}
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 font-semibold text-indigo-700 uppercase tracking-wide text-xs"
                  >
                    Testably field
                  </th>
                  <th
                    scope="col"
                    className="text-left py-3 px-4 font-semibold text-gray-500 uppercase tracking-wide text-xs"
                  >
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {fieldMapping.map((row, i) => (
                  <tr
                    key={`${row.from}-${row.to}-${i}`}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  >
                    <td className="py-3 px-4 text-gray-700 font-medium">{row.from}</td>
                    <td className="py-3 px-4 text-indigo-700 font-medium">{row.to}</td>
                    <td className="py-3 px-4 text-gray-500">{row.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
