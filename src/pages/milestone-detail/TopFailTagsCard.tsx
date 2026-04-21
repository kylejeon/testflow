import { useTranslation } from 'react-i18next';

interface TagEntry { name: string; count: number; }

interface TopFailTagsCardProps {
  tags: TagEntry[]; // sorted desc by count
  totalFails: number;
}

/**
 * Design-spec §4-2 (C) — Top-Fail Tags (new, not in mockup).
 */
export default function TopFailTagsCard({ tags, totalFails }: TopFailTagsCardProps) {
  const { t } = useTranslation('milestones');
  const hasData = tags.length > 0 && totalFails > 0;
  return (
    <article className="mo-panel" aria-label={t('detail.overview.topFailTags.a11y.region')}>
      <div className="mo-panel-head">
        <i className="ri-price-tag-3-line" style={{ color: 'var(--danger)' }} />
        {t('detail.overview.topFailTags.title')}
        {hasData && <span className="right">{t('detail.overview.topFailTags.suffix', { total: totalFails, count: totalFails })}</span>}
      </div>
      {!hasData ? (
        <div style={{ padding: '8px 0', color: 'var(--text-subtle)', textAlign: 'center', fontSize: '11.5px' }}>
          {t('detail.overview.topFailTags.empty')}
        </div>
      ) : (
        tags.slice(0, 3).map(tag => {
          const pct = Math.round((tag.count / totalFails) * 100);
          return (
            <div key={tag.name} className="mo-tag-row">
              <span className="tname">#{tag.name}</span>
              <div className="mini-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="pct">{pct}%</span>
            </div>
          );
        })
      )}
    </article>
  );
}
