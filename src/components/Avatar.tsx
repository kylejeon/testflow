import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

// ── Color palette (10 colors, WCAG AA against white) ──────────────────────────
const PALETTE = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#3B82F6', // Blue
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(id: string): string {
  return PALETTE[simpleHash(id) % PALETTE.length];
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

// ── Size tokens ───────────────────────────────────────────────────────────────
export type AvatarSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

const SIZE: Record<AvatarSize, { w: string; h: string; fs: string }> = {
  xl: { w: '4rem',    h: '4rem',    fs: '1.25rem'    },  // 64px
  lg: { w: '2.5rem',  h: '2.5rem',  fs: '0.875rem'   },  // 40px
  md: { w: '2rem',    h: '2rem',    fs: '0.6875rem'   },  // 32px
  sm: { w: '1.5rem',  h: '1.5rem',  fs: '0.5rem'     },  // 24px
  xs: { w: '1.25rem', h: '1.25rem', fs: '0.4375rem'  },  // 20px
};

// ── Avatar ────────────────────────────────────────────────────────────────────
export interface AvatarProps {
  /** Deterministic seed for color (userId preferred, falls back to name/email) */
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Avatar({
  userId,
  name,
  email,
  photoUrl,
  size = 'md',
  className = '',
  style,
  title,
}: AvatarProps) {
  const { t } = useTranslation('common');
  const s = SIZE[size];
  const seed = userId || name || email || '?';
  const bg = getAvatarColor(seed);
  const initials = getInitials(name, email);

  const base: CSSProperties = {
    width: s.w,
    height: s.h,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  };

  if (photoUrl) {
    return (
      <div className={className} style={base} title={title}>
        <img
          src={photoUrl}
          alt={name || email || t('avatar.altFallback')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ ...base, background: bg, fontSize: s.fs }}
      title={title}
    >
      {initials}
    </div>
  );
}

// ── AvatarStack ───────────────────────────────────────────────────────────────
export interface AvatarStackMember {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
}

interface AvatarStackProps {
  members: AvatarStackMember[];
  size?: AvatarSize;
  max?: number;
  className?: string;
  style?: CSSProperties;
}

export function AvatarStack({
  members,
  size = 'sm',
  max = 5,
  className = '',
  style,
}: AvatarStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  const overlap = size === 'md' ? '-10px' : '-8px';
  const overflowDim = size === 'md' ? '2rem' : '1.5rem';
  const overflowFs = size === 'md' ? '0.5625rem' : '0.4375rem';

  return (
    <div className={`flex items-center ${className}`} style={style}>
      {visible.map((m, i) => (
        <Avatar
          key={i}
          userId={m.userId}
          name={m.name}
          email={m.email}
          photoUrl={m.photoUrl}
          size={size}
          title={m.name || m.email}
          style={{
            marginLeft: i === 0 ? 0 : overlap,
            border: '2px solid #fff',
            zIndex: visible.length - i,
          }}
        />
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: overflowDim,
            height: overflowDim,
            borderRadius: '50%',
            border: '2px solid #fff',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: overflowFs,
            fontWeight: 700,
            color: '#64748B',
            marginLeft: overlap,
            flexShrink: 0,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
