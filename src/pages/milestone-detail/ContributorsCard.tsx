interface ContributorsCardProps {
  contributors: Array<[string, number]>; // [author, count]
  contributorProfiles: Map<string, { name: string | null; url: string | null }>;
  getAuthorColor: (author: string) => string;
  getContributorInitials: (author: string) => string;
}

/**
 * Contributors Top 5 card — moved from old Status tab.
 * Design-spec §6.
 */
export default function ContributorsCard({ contributors, contributorProfiles, getAuthorColor, getContributorInitials }: ContributorsCardProps) {
  if (contributors.length === 0) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <i className="ri-team-line" style={{ fontSize: '0.9375rem', color: 'var(--primary)' }} /> Contributors — Top 5
      </div>
      {contributors.map(([author, count], idx) => {
        const profile = contributorProfiles.get(author);
        return (
          <div key={author} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: idx < contributors.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            {profile?.url ? (
              <img src={profile.url} alt={author} style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: getAuthorColor(author), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {profile?.name ? getContributorInitials(profile.name) : getContributorInitials(author)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{author}</div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>{count} TCs executed</span>
          </div>
        );
      })}
    </div>
  );
}
