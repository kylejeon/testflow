/**
 * ProductHuntBadge — Conditional embed of the official Product Hunt SVG badge.
 *
 * Activation: set the three VITE_PRODUCT_HUNT_* env vars in Vercel (or .env)
 * and redeploy. With no env, the component renders null — the badge stays
 * hidden until launch day.
 *
 *   VITE_PRODUCT_HUNT_POST_ID   — numeric post id from the live PH page
 *   VITE_PRODUCT_HUNT_URL       — full PH product URL (e.g. https://www.producthunt.com/posts/testably)
 *   VITE_PRODUCT_HUNT_RANK      — optional: "1".."5". When set, swaps the
 *                                  generic "Featured" badge for the
 *                                  "Today's #N" daily-ranking badge.
 *
 * The PH widget SVG renders at 250×54 (light) / 250×54 (dark). We hardcode
 * those dimensions so the page doesn't reflow when the badge image loads.
 */

const POST_ID = import.meta.env.VITE_PRODUCT_HUNT_POST_ID as string | undefined;
const POST_URL = import.meta.env.VITE_PRODUCT_HUNT_URL as string | undefined;
const RANK = import.meta.env.VITE_PRODUCT_HUNT_RANK as string | undefined;

const VALID_RANKS = new Set(['1', '2', '3', '4', '5']);

export interface ProductHuntBadgeProps {
  /** Badge color scheme. Use 'dark' on dark backgrounds (default hero). */
  theme?: 'light' | 'dark' | 'neutral';
  className?: string;
}

export default function ProductHuntBadge({
  theme = 'light',
  className,
}: ProductHuntBadgeProps) {
  if (!POST_ID || !POST_URL) return null;

  const params = new URLSearchParams({ post_id: POST_ID, theme });

  let badgeUrl: string;
  let alt: string;
  if (RANK && VALID_RANKS.has(RANK)) {
    params.set('period', 'daily');
    badgeUrl = `https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?${params.toString()}`;
    alt = `Testably — Product Hunt Today's #${RANK}`;
  } else {
    badgeUrl = `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?${params.toString()}`;
    alt = 'Testably — Featured on Product Hunt';
  }

  return (
    <a
      href={POST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={alt}
    >
      <img
        src={badgeUrl}
        alt={alt}
        width={250}
        height={54}
        style={{ width: 250, height: 54 }}
        loading="lazy"
      />
    </a>
  );
}
