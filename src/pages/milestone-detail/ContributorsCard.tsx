interface ContributorsCardProps {
  contributors: Array<[string, number]>; // [author, count]
  contributorProfiles: Map<string, { name: string | null; url: string | null }>;
  getAuthorColor: (author: string) => string;
  getContributorInitials: (author: string) => string;
}

/**
 * Contributors Top 5 sidebar (design-spec v2 §1-2 / §9-2).
 * .mo-contrib-side is a narrow 240px sidebar that sits to the right of the Bottom Row's
 * Execution sections on ≥1280px. On ≤1279px the Bottom Row collapses to a single column,
 * at which point .mo-contrib-side stays static (no sticky) and flows underneath.
 */
export default function ContributorsCard({
  contributors,
  contributorProfiles,
  getAuthorColor,
  getContributorInitials,
}: ContributorsCardProps) {
  return (
    <aside className="mo-contrib-side" aria-label="Top contributors">
      <div className="mo-contrib-head">
        <i className="ri-team-line" style={{ fontSize: '13px', color: 'var(--primary)' }} aria-hidden="true" />
        Contributors — Top 5
      </div>
      {contributors.length === 0 ? (
        <div className="mo-contrib-empty">No contributors yet</div>
      ) : (
        contributors.map(([author, count]) => {
          const profile = contributorProfiles.get(author);
          return (
            <div key={author} className="mo-contrib-row">
              {profile?.url ? (
                <img src={profile.url} alt={author} className="av" />
              ) : (
                <div
                  className="av initials"
                  style={{ background: getAuthorColor(author) }}
                >
                  {profile?.name ? getContributorInitials(profile.name) : getContributorInitials(author)}
                </div>
              )}
              <div className="name" title={profile?.name || author}>{profile?.name || author}</div>
              <span className="cnt">{count} TCs</span>
            </div>
          );
        })
      )}
    </aside>
  );
}
