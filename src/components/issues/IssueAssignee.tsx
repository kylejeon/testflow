import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvatarColor, getInitials } from '../Avatar';

interface IssueAssigneeProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  login?: string | null;
}

/**
 * Assignee avatar + name — design-spec §7-2.
 * Fallback priority: avatar_url → initials → "Unassigned".
 */
export default function IssueAssignee({ avatarUrl, displayName, login }: IssueAssigneeProps) {
  const { t } = useTranslation('common');
  const [imgError, setImgError] = useState(false);
  const name = displayName || login || '';
  const hasName = !!name.trim();

  if (!hasName) {
    return (
      <div className="mo-assignee unassigned">
        <div className="av initials">
          <i className="ri-user-line" style={{ fontSize: 11 }} />
        </div>
        <span className="name">{t('issues.assignee.unassigned')}</span>
      </div>
    );
  }

  const showImg = avatarUrl && !imgError;
  const seed = login || displayName || 'anon';

  return (
    <div className="mo-assignee">
      {showImg ? (
        <img
          src={avatarUrl}
          alt={name}
          className="av"
          style={{ objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="av initials"
          style={{ background: getAvatarColor(seed) }}
        >
          {getInitials(name)}
        </div>
      )}
      <span className="name">{name}</span>
    </div>
  );
}
