# Testably UI Guidelines

> **For AI assistants (Claude, Cursor, v0, GitHub Copilot, etc.)** — This document is the single source of truth for generating UI that matches the Testably product at https://testably.app. Follow it literally: when a Tailwind class is specified, use that class. When a hex value is specified, use that value. Do not "improve" or "modernize" the design — match it.
>
> **Design DNA:** Dark, focused, keyboard-first SaaS for QA engineers. Slate-900 canvas, indigo accent, glass-morphism cards, generous whitespace, glowing primary CTAs, sharp bold headlines, subdued muted body copy.

---

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Framework | **React** (client-side SPA, bundled with Vite) |
| Styling | **Tailwind CSS** (utility-first, v3 — uses `--tw-*` CSS variables) |
| Component library | **None (custom-built primitives)** — not shadcn/ui, not MUI. Build components from raw Tailwind utilities. |
| Icons | **Remix Icon** (`remixicon` via `<i class="ri-*">` — ~99% of all icons on the site) |
| Fonts | **Inter** (body), **Pacifico** (brand wordmark only), Korean fallback: **"Noto Sans KR"** |
| Payments UI | Lemonsqueezy |
| Routing | Client-side (no Next.js) |

**Setup expectation for generated code:**
```html
<!-- Remix Icon CDN -->
<link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
<!-- Inter + Noto Sans KR + Pacifico -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans KR"', 'sans-serif'],
        brand: ['Pacifico', 'cursive'],
      },
    },
  },
};
```

---

## 2. Color Palette

### 2.1 Foundation

| Role | Tailwind | Hex | Usage |
|---|---|---|---|
| Canvas (page bg) | `bg-slate-900` | `#0F172A` | `<body>`, page root, footer |
| Nav translucent | `bg-slate-900/90 backdrop-blur-xl` | — | Fixed top nav |
| Text primary | `text-white` | `#FFFFFF` | Headings, active nav, button text |
| Text secondary | `text-slate-400` | `#94A3B8` | Body paragraphs, hero description |
| Text tertiary | `text-gray-400` | `#9CA3AF` | Feature descriptions, footer links |
| Text muted | `text-white/55` | rgba(255,255,255,0.55) | Inactive nav links |
| Text disabled | `text-white/30` | rgba(255,255,255,0.3) | "No credit card required" micro-copy |

### 2.2 Brand (Indigo)

The brand is **indigo**, not blue, not purple. All default CTAs, focus rings, and highlights use indigo.

| Token | Tailwind | Hex | Where |
|---|---|---|---|
| Indigo primary | `bg-indigo-500` / `text-indigo-500` | `#6366F1` | Primary button bg, focus border |
| Indigo hover | `hover:bg-indigo-400` | `#818CF8` | Primary button hover |
| Indigo light text | `text-indigo-400` | `#818CF8` | Gradient headline stop, pill text, AI-related labels |
| Indigo highlight | `text-indigo-300` | `#A5B4FC` | Gradient headline light stop |
| Indigo glow (shadow) | `shadow-indigo-500/30` | rgba(99,102,241,0.3) | Primary button glow |

### 2.3 Surface tints (on slate-900 canvas)

| Purpose | Tailwind | Notes |
|---|---|---|
| Card surface | `bg-white/[0.03]` | Standard feature card |
| Card surface (elevated) | `bg-white/[0.05]` | Input background |
| Card surface (hovered) | `bg-white/[0.06]` | Secondary button bg |
| Card border subtle | `border-white/[0.06]` | Standard card outline |
| Card border default | `border-white/10` | Input/secondary button outline |
| Card border hover | `border-white/20` | Secondary button hover |
| Indigo-tinted card border | `border-indigo-500/15` | Highlighted feature card |
| Indigo-tinted card hover | `hover:border-indigo-500/20` | Feature card hover |
| Footer divider | `border-white/5` | Top border of footer |

### 2.4 Semantic category colors (for badges, icon tiles, accents)

Each category uses the pattern `bg-{color}-500/10 text-{color}-400`. Pick the category that matches semantic meaning; do not mix arbitrarily.

| Category | Tailwind bg | Tailwind text | Hex (400) | Semantic use |
|---|---|---|---|---|
| Indigo | `bg-indigo-500/10` | `text-indigo-400` | `#818CF8` | AI-NATIVE, default, primary features |
| Violet | `bg-violet-500/10` | `text-violet-400` | `#A78BFA` | UNIQUE, premium, power features |
| Pink | `bg-pink-500/10` | `text-pink-400` | `#F472B6` | TESTING, ANALYTICS, critical metrics |
| Emerald | `bg-emerald-500/10` | `text-emerald-400` | `#34D399` | CORE, TEAM, DATA, success, pass |
| Amber | `bg-amber-500/10` | `text-amber-400` | `#FBBF24` | PLANNING, warnings, stars/ratings |
| Orange | `bg-orange-500/10` | `text-orange-400` | `#FB923C` | PRODUCTIVITY, notifications |
| Cyan | `bg-cyan-500/10` | `text-cyan-400` | `#22D3EE` | AUTOMATION, VERSIONING, CI/CD |
| Sky | `bg-sky-500/10` | `text-sky-400` | `#38BDF8` | SDK, INTEGRATION |
| Red | `bg-red-500/10` | `text-red-400` | `#F87171` | Errors, failed tests, destructive |
| Slate | `bg-slate-500/10` | `text-slate-400` | `#94A3B8` | DOCUMENTATION, neutral, secondary |

### 2.5 Signature gradient (used on key words in headlines)

```html
<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
  tool your team needs
</span>
```

Variations seen on the site:
- `from-indigo-300 to-indigo-500` — default hero headline highlight
- `from-indigo-400 via-violet-400 to-pink-400` — secondary emphasis (e.g., "4 simple steps", "who ship fast", "QA workflow", "Testably" brand repeat)

### 2.6 Decorative background blobs

Place behind hero/CTA sections for the signature ambient indigo glow:

```html
<div class="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
<div class="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.08] blur-[100px] pointer-events-none"></div>
<div class="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-400/5 blur-[80px] pointer-events-none"></div>
```

---

## 3. Typography

### 3.1 Font stack

```css
font-family: Inter, "Noto Sans KR", sans-serif;
```

- **Inter** — all UI text
- **Noto Sans KR** — Korean fallback (Testably supports Korean, do not remove this)
- **Pacifico** — brand wordmark only (`<span class="font-brand">Testably</span>`). Never use Pacifico for anything else.
- **ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace** — code, keyboard shortcut keys

### 3.2 Type scale (exact values from production)

| Role | Tailwind | Size | Weight | Line-height | Letter-spacing | Color |
|---|---|---|---|---|---|---|
| Hero H1 | `text-[56px] font-black tracking-[-0.03em]` | 56px | 900 | ~1.08 (60px) | -1.68px / -0.03em | `text-white` |
| Section H2 | `text-4xl font-bold` | 36px | 700 | 40px | normal | `text-white` |
| Feature card title (large) | `text-xl font-bold` | 20px | 700 | 28px | normal | `text-white` |
| Feature card title (small) | `text-sm font-bold` | 14px | 700 | 20px | normal | `text-white` |
| Hero lead paragraph | `text-lg md:text-xl leading-relaxed` | 20px | 400 | 28px (relaxed) | normal | `text-slate-400` |
| Section description | `text-lg` | 18px | 400 | 28px | normal | `text-gray-400` |
| Body default | `text-base` | 16px | 400 | 24px | normal | `text-white` or `text-gray-400` |
| Body small (card desc) | `text-sm leading-relaxed` | 14px | 400 | ~22.75px | normal | `text-gray-400` |
| Micro / disclaimer | `text-sm` | 14px | 400 | 20px | normal | `text-white/30` |
| Nav link | `text-[13px] font-medium` | 13px | 500 | — | normal | `text-white/55` → hover `text-white` |
| **Eyebrow label** (above headline) | `text-xs font-semibold uppercase tracking-widest text-indigo-400` | 12px | 600 | — | 0.1em | `text-indigo-400` |
| **Badge** (category tag) | `text-[0.625rem] font-semibold uppercase tracking-widest` | 10px | 600 | — | 1px | varies by category |
| **Pill** (inline tag) | `text-[10px]` | 10px | 400 | — | normal | `text-indigo-400` |

### 3.3 Headline pattern

Hero and section headlines always follow the **"plain text + gradient emphasis"** pattern:

```html
<!-- Hero H1 — two-line, with second line gradient -->
<h1 class="text-[56px] font-black tracking-[-0.03em] leading-[1.08] text-white mb-6">
  The Test Case Management<br>
  <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
    tool your team needs
  </span>
</h1>

<!-- Section H2 — single line with gradient key phrase -->
<h2 class="text-4xl font-bold text-white mb-4">
  Your QA process in
  <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">
    4 simple steps
  </span>
</h2>
```

### 3.4 Eyebrow pattern (above every section title)

```html
<div class="inline-flex items-center gap-2 mb-6">
  <i class="ri-sparkling-2-line text-indigo-400 text-xs"></i>
  <span class="text-xs font-semibold uppercase tracking-widest text-indigo-400">
    CORE FEATURES
  </span>
</div>
<h2 class="text-4xl font-bold text-white mb-4">...</h2>
<p class="text-gray-400 text-lg">...</p>
```

---

## 4. Spacing & Layout

### 4.1 Container

```html
<div class="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">...</div>
```

- Max width: `max-w-7xl` (1280px)
- Horizontal padding: `px-6 sm:px-8 lg:px-12` (24 → 32 → 48px)

### 4.2 Section vertical rhythm

| Section type | Tailwind |
|---|---|
| Hero section | `min-h-[100dvh] py-32 lg:py-0 flex items-center` |
| Standard section | `py-20 lg:py-24` |
| Compact section | `py-14` |
| Footer | `py-14` |

### 4.3 Grid patterns

| Pattern | Tailwind |
|---|---|
| Hero split (text + visual) | `grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16` → text `lg:col-span-6`, visual `lg:col-span-6` |
| 3-column feature grid | `grid grid-cols-1 md:grid-cols-3 gap-6` |
| 4-column stats | `grid grid-cols-2 md:grid-cols-4 gap-8` |
| Pricing 3-up | `grid grid-cols-1 md:grid-cols-3 gap-6` |

### 4.4 Spacing tokens (consistent increments)

Prefer these values — do not introduce `p-5`, `gap-7`, `mt-9` etc.:
`gap-2, gap-3, gap-4, gap-6, gap-8, gap-12, gap-16`
`mb-2, mb-4, mb-6, mb-8, mb-10, mb-12`
`p-6, p-7, p-8, p-10, p-12`

### 4.5 Radius scale

| Element | Tailwind | px |
|---|---|---|
| Pills, avatars, CTA buttons | `rounded-full` | 9999 |
| Pricing card button | `rounded-[10px]` | 10 |
| Inputs, small containers | `rounded-xl` | 12 |
| Cards, feature cards | `rounded-2xl` | 16 |
| Large hero/CTA cards | `rounded-3xl` | 24 |
| Icon tile inside cards | `rounded-lg` | 8 |

---

## 5. Components

### 5.1 Button — Primary (Hero CTA)

The signature button. Always use this for the main call-to-action in any section.

```html
<button class="group inline-flex items-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-bold text-base rounded-full shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.45)] transition-all cursor-pointer">
  Start for Free
  <i class="ri-arrow-right-line transition-transform group-hover:translate-x-1"></i>
</button>
```

Specs:
- Background: `bg-indigo-500` (#6366F1), hover `bg-indigo-400`
- Padding: `px-8 py-4` (32px / 16px)
- Radius: `rounded-full`
- Font: `font-bold text-base` (700 / 16px), `text-white`
- Glow: `shadow-[0_0_30px_rgba(99,102,241,0.3)]` → on hover `0_0_40px_rgba(99,102,241,0.45)`
- Active: `active:scale-[0.98]`
- Trailing icon uses `group-hover:translate-x-1` for subtle motion

### 5.2 Button — Secondary (outline/glass)

Used alongside the primary CTA (e.g., "View Demo" next to "Start for Free").

```html
<button class="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-white/80 hover:text-white font-semibold text-base rounded-full backdrop-blur-sm active:scale-[0.98] transition-all cursor-pointer">
  <i class="ri-play-circle-line"></i>
  View Demo
</button>
```

### 5.3 Button — Compact (nav)

Used inside the top navigation.

```html
<button class="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-semibold rounded-full transition-colors">
  Get Started
</button>
```

### 5.4 Button — Ghost (pricing card, subtle)

Used inside pricing card footers where the primary CTA should not steal focus.

```html
<button class="w-full py-3 px-4 bg-transparent hover:bg-white/5 border border-white/[0.15] hover:border-white/[0.25] text-white text-[13px] font-semibold rounded-[10px] transition-colors">
  Get Started
</button>
```

### 5.5 Button — Text link in nav

```html
<button class="text-[13px] font-medium text-white/55 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
  Log in
</button>
```

### 5.6 Input — Text / Email

```html
<input
  type="email"
  placeholder="Enter your email"
  class="flex-1 px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
/>
```

Specs:
- bg `bg-white/5`, border `border-white/10`
- Radius: `rounded-xl` (12px)
- Padding: `px-4 py-3`
- Font: `text-sm` (14px)
- Placeholder: `placeholder-gray-600`
- Focus: **`focus:border-indigo-500`** (no ring, border-only focus — important)
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

### 5.7 Card — Standard feature

The workhorse container. Use for any grid of features, testimonials, or informational tiles.

```html
<div class="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-7 transition-all duration-300 hover:border-indigo-500/20 hover:shadow-sm hover:shadow-indigo-500/10 cursor-pointer group">
  <!-- Icon tile + badge -->
  <div class="flex items-start justify-between mb-6">
    <div class="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
      <i class="ri-folder-line text-emerald-400 text-lg"></i>
    </div>
    <span class="text-[0.625rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
      CORE
    </span>
  </div>
  <h3 class="text-sm font-bold text-white mb-2">Test Case Management</h3>
  <p class="text-gray-400 text-sm leading-relaxed">
    Organize thousands of test cases with a structured folder hierarchy.
  </p>
</div>
```

Specs:
- `bg-white/[0.03]`, `border border-white/[0.06]`
- `rounded-2xl` (16px), `p-7` (28px)
- Hover: `hover:border-indigo-500/20`, subtle indigo glow via `hover:shadow-sm hover:shadow-indigo-500/10`

### 5.8 Card — Highlighted feature (top-of-page)

Used for the marquee feature trio with the gradient top border.

```html
<div class="relative rounded-2xl border border-indigo-500/15 p-8 overflow-hidden transition-all hover:-translate-y-1 hover:border-indigo-500/30">
  <!-- Gradient top accent bar -->
  <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500"></div>

  <!-- Badge -->
  <span class="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
    <i class="ri-sparkling-2-line text-xs"></i> AI-NATIVE
  </span>

  <h3 class="text-xl font-bold text-white mb-2.5">AI Test Generation</h3>
  <p class="text-gray-400 text-sm leading-relaxed mb-4">
    Describe what you want to test in plain language.
  </p>

  <!-- Inline pill tags -->
  <div class="flex flex-wrap gap-2">
    <span class="rounded-full bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-indigo-400 text-[10px] px-2.5 py-0.5">
      Plain text → test cases
    </span>
    <span class="rounded-full bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-indigo-400 text-[10px] px-2.5 py-0.5">
      Edge case suggestions
    </span>
  </div>
</div>
```

### 5.9 Card — Pricing

```html
<div class="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-7 flex flex-col">
  <span class="text-[0.625rem] font-semibold uppercase tracking-widest text-violet-400 mb-4">HOBBY</span>
  <div class="flex items-baseline gap-1 mb-1">
    <span class="text-slate-400 text-lg">$</span>
    <span class="text-5xl font-black text-white leading-none">19</span>
    <span class="text-slate-400 text-sm">/ month</span>
  </div>
  <!-- Annual billing hint -->
  <div class="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/15 rounded-full px-3 py-1.5 mb-2 w-fit">
    <span class="text-indigo-400 text-sm font-semibold">$194/yr</span>
    <span class="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full px-2 py-0.5">
      <i class="ri-discount-percent-line"></i> Save 15%
    </span>
  </div>
  <p class="text-white text-sm mb-1">Up to 5 users</p>
  <p class="text-slate-500 text-sm mb-6">For indie devs and small side projects</p>

  <p class="text-slate-500 text-xs mb-3">Everything in Free, plus:</p>
  <ul class="space-y-2 text-sm flex-1">
    <li class="flex items-center gap-2 text-white"><i class="ri-check-line text-emerald-400"></i> 3 projects · 5 members</li>
    <li class="flex items-center gap-2 text-white"><i class="ri-check-line text-emerald-400"></i> Export/Import CSV</li>
    <li class="flex items-center gap-2 text-indigo-400"><i class="ri-sparkling-2-line"></i> 15 AI generations / month</li>
  </ul>
  <button class="w-full mt-6 py-3 px-4 bg-transparent hover:bg-white/5 border border-white/[0.15] text-white text-[13px] font-semibold rounded-[10px] transition-colors">
    Get Started
  </button>
</div>
```

### 5.10 Badge (category tag)

```html
<span class="inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
  CORE
</span>
```

Swap the color token from [§2.4](#24-semantic-category-colors-for-badges-icon-tiles-accents). The same color must be applied to the companion icon tile inside the card.

### 5.11 Pill / inline tag

Used for non-category labels — keyboard shortcuts, integrations, feature tags inside cards.

```html
<span class="inline-block rounded-full bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-indigo-400 text-[10px] px-2.5 py-0.5">
  Plain text → test cases
</span>
```

### 5.12 Keyboard key (kbd)

```html
<kbd class="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-white/10 border border-white/15 text-white text-xs font-mono font-semibold">
  Ctrl
</kbd>
```

### 5.13 Icon tile (square container for an icon)

```html
<div class="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
  <i class="ri-sparkling-2-line text-indigo-400 text-lg"></i>
</div>
```

Sizes: `w-8 h-8` (nav/compact), `w-10 h-10` (feature card), `w-12 h-12` (hero/step indicator).

### 5.14 Avatar — initials

```html
<div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
  SM
</div>
```

Color rotation for avatar groups (cycle through these): `bg-indigo-500`, `bg-violet-500`, `bg-pink-500`, `bg-emerald-500`, `bg-amber-500`.

### 5.15 Avatar group (stacked)

```html
<div class="flex -space-x-2">
  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">SJ</div>
  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-violet-500 flex items-center justify-center text-white text-[9px] font-bold">KM</div>
  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-pink-500 flex items-center justify-center text-white text-[9px] font-bold">LW</div>
</div>
```

### 5.16 Checklist item

```html
<div class="flex items-center gap-2 text-sm text-white">
  <i class="ri-check-line text-emerald-400"></i>
  View test results
</div>
```

### 5.17 Stats block

```html
<div class="text-center">
  <div class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 mb-2">10x</div>
  <div class="text-slate-400 text-sm">Faster test execution</div>
</div>
```

### 5.18 Testimonial card

```html
<div class="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-7 transition-all">
  <!-- Stars -->
  <div class="flex gap-0.5 mb-4">
    <i class="ri-star-fill text-amber-400 text-sm"></i>
    <i class="ri-star-fill text-amber-400 text-sm"></i>
    <i class="ri-star-fill text-amber-400 text-sm"></i>
    <i class="ri-star-fill text-amber-400 text-sm"></i>
    <i class="ri-star-fill text-amber-400 text-sm"></i>
  </div>
  <p class="text-white text-sm italic leading-relaxed mb-6">
    "We switched from TestRail and cut our test management time in half."
  </p>
  <div class="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
    <div class="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">SM</div>
    <div>
      <div class="text-white text-sm font-semibold">Sarah M.</div>
      <div class="text-slate-400 text-xs">QA Lead, Fintech Startup</div>
    </div>
  </div>
</div>
```

### 5.19 CTA section (page-bottom conversion card)

```html
<div class="max-w-6xl mx-auto text-center relative overflow-hidden rounded-3xl border border-indigo-500/20 px-12 py-16"
     style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));">
  <h2 class="text-4xl font-bold text-white mb-4">
    Ready to level up<br>
    your <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">QA workflow</span>?
  </h2>
  <p class="text-slate-400 mb-8">
    Start for free — no credit card needed.
  </p>
  <button class="inline-flex items-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-full shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all">
    Get Started Free <i class="ri-arrow-right-line"></i>
  </button>
</div>
```

### 5.20 Modal / Dialog (recommended — matches site primitives)

Testably uses custom-built modals, not a library. Use these specs:

```html
<!-- Overlay -->
<div class="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <!-- Dialog -->
  <div class="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-[0_25px_60px_0_rgba(0,0,0,0.4),0_0_40px_0_rgba(99,102,241,0.08)] p-8">
    <div class="flex items-start justify-between mb-6">
      <h3 class="text-xl font-bold text-white">Dialog title</h3>
      <button class="text-white/55 hover:text-white transition-colors">
        <i class="ri-close-line text-xl"></i>
      </button>
    </div>
    <div class="text-gray-400 text-sm leading-relaxed">...</div>
    <div class="flex justify-end gap-3 mt-8">
      <button class="px-5 py-2 text-white/80 hover:text-white text-sm font-semibold">Cancel</button>
      <button class="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-full">Confirm</button>
    </div>
  </div>
</div>
```

### 5.21 Table (recommended — matches site primitives)

```html
<div class="overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-white/[0.06]">
        <th class="text-left px-4 py-3 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">Name</th>
        <th class="text-left px-4 py-3 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <td class="px-4 py-3 text-white">Login flow</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            <i class="ri-check-line"></i> Passed
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 6. Layout Patterns

### 6.1 Top navigation (fixed, translucent)

```html
<nav class="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 py-3.5 bg-slate-900/90 backdrop-blur-xl transition-all duration-300">
  <!-- Brand -->
  <a href="/" class="flex items-center gap-2 no-underline flex-shrink-0">
    <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">T</div>
    <span class="font-brand text-2xl text-white">Testably</span>
  </a>

  <!-- Links (hidden on mobile) -->
  <div class="hidden md:flex items-center gap-8">
    <a class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">Features</a>
    <a class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">How It Works</a>
    <a class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">Pricing</a>
    <a class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">Why Testably</a>
    <a class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">FAQ</a>
  </div>

  <!-- Right cluster -->
  <div class="flex items-center gap-4">
    <button class="flex items-center gap-1 text-[13px] font-medium text-white/55 hover:text-white transition-colors">
      <i class="ri-translate-2"></i> EN <i class="ri-arrow-down-s-line text-xs"></i>
    </button>
    <button class="text-[13px] font-medium text-white/55 hover:text-white transition-colors">Log in</button>
    <button class="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-semibold rounded-full transition-colors">Get Started</button>
  </div>
</nav>
```

Notes:
- `z-[100]` (modals should be above at `z-[200]`).
- `bg-slate-900/90 backdrop-blur-xl` creates the frosted translucent effect — do not swap for solid.
- Height: `py-3.5` → ~60px total.

### 6.2 Hero section

```html
<section class="relative min-h-[100dvh] overflow-hidden flex items-center">
  <!-- Ambient glow blobs (see §2.6) -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
    <div class="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.08] blur-[100px]"></div>
  </div>

  <div class="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-32 lg:py-0">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
      <div class="lg:col-span-6 text-center lg:text-left">
        <!-- Eyebrow -->
        <div class="inline-flex items-center gap-2 mb-6">
          <span class="w-6 h-px bg-indigo-400"></span>
          <span class="text-xs font-semibold uppercase tracking-widest text-indigo-400">TEST CASE MANAGEMENT SYSTEM FOR MODERN QA TEAMS</span>
        </div>
        <!-- H1 -->
        <h1 class="text-[56px] font-black tracking-[-0.03em] leading-[1.08] text-white mb-6">
          The Test Case Management<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">tool your team needs</span>
        </h1>
        <!-- Lead -->
        <p class="text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 text-slate-400 mb-10">
          Testably brings your entire QA workflow together — test cases, runs, milestones, sessions, and team collaboration — all in one place.
        </p>
        <!-- CTAs -->
        <div class="flex flex-col sm:flex-row lg:items-start gap-4 mb-8 items-center lg:justify-start justify-center">
          <!-- Primary button — see §5.1 -->
          <!-- Secondary button — see §5.2 -->
        </div>
        <p class="text-white/30 text-sm mb-6">No credit card required · 14-day free trial · Cancel anytime</p>
        <!-- Avatar group + trust text — see §5.15 -->
      </div>
      <div class="lg:col-span-6"><!-- Product screenshot --></div>
    </div>
  </div>
</section>
```

### 6.3 Section template

Every standard content section follows this template:

```html
<section class="py-20 lg:py-24">
  <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
    <!-- Centered header -->
    <div class="text-center max-w-3xl mx-auto mb-16">
      <div class="inline-flex items-center gap-2 mb-6">
        <i class="ri-sparkling-2-line text-indigo-400 text-xs"></i>
        <span class="text-xs font-semibold uppercase tracking-widest text-indigo-400">CORE FEATURES</span>
      </div>
      <h2 class="text-4xl font-bold text-white mb-4">
        Complete test case management &
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">QA test management platform</span>
      </h2>
      <p class="text-gray-400 text-lg mx-auto">
        From writing test cases to analyzing results — Testably covers the full testing lifecycle.
      </p>
    </div>
    <!-- Grid of cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">...</div>
  </div>
</section>
```

### 6.4 App / Dashboard layout (recommended — extrapolated from the hero mockup)

Testably's app uses a **left sidebar + top bar + main content** pattern (visible in the hero product mockup).

```
┌──────────────────────────────────────────────┐
│ TopBar (bg-slate-900 border-b border-white/5)│
├──────────┬───────────────────────────────────┤
│          │                                   │
│ Sidebar  │  Main content (bg-slate-900)      │
│ w-64     │                                   │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

```html
<div class="min-h-screen bg-slate-900 flex">
  <!-- Sidebar -->
  <aside class="w-64 shrink-0 border-r border-white/5 bg-slate-950/40 p-4 flex flex-col gap-1">
    <!-- Nav item -->
    <a class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.03] transition-colors">
      <i class="ri-dashboard-line text-base"></i> Dashboard
    </a>
    <!-- Active -->
    <a class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/10 border border-indigo-500/15">
      <i class="ri-file-list-3-line text-base text-indigo-400"></i> Test Cases
    </a>
  </aside>

  <!-- Main -->
  <main class="flex-1 flex flex-col">
    <header class="h-14 border-b border-white/5 bg-slate-900 flex items-center justify-between px-6">
      <div class="flex items-center gap-2 text-sm">
        <span class="text-white/55">Projects</span>
        <i class="ri-arrow-right-s-line text-white/30"></i>
        <span class="text-white font-semibold">Release Readiness</span>
      </div>
      <div class="flex items-center gap-3">
        <!-- Cmd+K hint -->
        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/55 text-sm hover:text-white transition-colors">
          <i class="ri-search-line"></i> Search
          <kbd class="ml-8 text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono">⌘K</kbd>
        </button>
      </div>
    </header>
    <div class="flex-1 p-8">
      <!-- Page content -->
    </div>
  </main>
</div>
```

---

## 7. Interaction states

| State | Pattern |
|---|---|
| **Hover** (buttons) | Lighten indigo: `hover:bg-indigo-400`. Lighten surfaces: `hover:bg-white/[0.1]`. Increase glow: `hover:shadow-[0_0_40px_rgba(99,102,241,0.45)]`. |
| **Hover** (cards) | `hover:border-indigo-500/20 hover:shadow-sm hover:shadow-indigo-500/10`. Highlighted cards also get `hover:-translate-y-1`. |
| **Hover** (links/nav) | Text transitions `text-white/55 → text-white` via `transition-colors`. |
| **Focus** (inputs) | Border-only: `focus:outline-none focus:border-indigo-500`. **Do not** add a Tailwind ring — the site explicitly uses border focus. |
| **Focus-visible** (buttons) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`. |
| **Active** (buttons) | `active:scale-[0.98]` — consistent subtle press feedback. |
| **Disabled** | `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`. |
| **Loading** | Replace icon with spinner: `<i class="ri-loader-4-line animate-spin"></i>`. Keep button width stable. |
| **Transitions** | Default `transition-colors`, layout changes `transition-all duration-300`. |
| **Motion restraint** | No bouncing, no scale-up on hover (only `-translate-y-1` for highlighted cards). Always pair with `transition-all`. |

---

## 8. Icons

**Library: Remix Icon only.** Do not mix with Lucide, Heroicons, FontAwesome, Material Icons.

```html
<i class="ri-sparkling-2-line text-indigo-400 text-lg"></i>
```

Size conventions (match text size on same line):

| Context | Class |
|---|---|
| Inline with `text-xs` | `text-xs` (12px) |
| Inline with `text-sm` | `text-sm` (14px) or `text-base` (16px) |
| Icon tile `w-10 h-10` | `text-lg` (18px) |
| Icon tile `w-12 h-12` | `text-xl` (20px) |

### Canonical icon choices seen on the site (prefer these when the concept matches)

| Concept | Icon |
|---|---|
| AI / sparkle / magic | `ri-sparkling-2-line` |
| Arrow right (button trailing) | `ri-arrow-right-line` |
| Chevron down | `ri-arrow-down-s-line` |
| Check / success | `ri-check-line` |
| Close / cancel | `ri-close-line` |
| Folder (test cases) | `ri-folder-line` |
| Play (test run) | `ri-play-circle-line` |
| Flag (milestone) | `ri-flag-line` |
| Search / exploratory | `ri-search-line` / `ri-search-2-line` |
| Team / users | `ri-team-line` / `ri-group-line` |
| Link / integration | `ri-links-line` |
| Git branch / CI | `ri-git-branch-line` |
| Notifications | `ri-notification-3-line` |
| Document | `ri-file-list-3-line` |
| Import/export | `ri-arrow-left-right-line` |
| Analytics / chart | `ri-pie-chart-line` |
| Versioning | `ri-git-commit-line` |
| Code / SDK | `ri-terminal-box-line` |
| Map / traceability | `ri-road-map-line` |
| Cloud / shared | `ri-cloud-line` |
| Star (rating) | `ri-star-fill` |
| Translate / language | `ri-translate-2` |
| Discount / badge | `ri-discount-percent-line` |
| Timer (speed / setup) | `ri-timer-line` |
| Plug (integration) | `ri-plug-line` |
| Gift (free tier) | `ri-gift-line` |
| Swap (migrate) | `ri-arrow-left-right-line` |

Prefer `-line` variants (outline) by default. Use `-fill` variants only for: stars in ratings, selected/active states, and the Testably "T" mark.

---

## 9. Accessibility

- Contrast: white-on-slate-900 passes AAA. Muted text (`text-slate-400`) on slate-900 is AA — do not go lighter than `text-slate-500` on regular body copy.
- All icons inside buttons must have text labels or `aria-label`.
- `focus-visible` ring on interactive elements (see §7).
- Click targets ≥ 40×40px. All CTAs use `px-8 py-4` (hero) or `py-3`+ (compact).
- Respect `prefers-reduced-motion`: gate `-translate-y-1` and `animate-spin` with the `motion-safe:` variant where possible.
- Decorative SVG/icons: `aria-hidden="true"`.

---

## 10. Do's and Don'ts

### DO

- **DO** use `bg-slate-900` as the page canvas. Every screen starts black-blue.
- **DO** render all primary CTAs with the indigo glow shadow.
- **DO** pair every H2 with an uppercase eyebrow (`text-indigo-400 tracking-widest`).
- **DO** gradient-highlight one key phrase per headline, never the whole headline.
- **DO** keep feature cards to `bg-white/[0.03]` with `border-white/[0.06]` — consistency matters.
- **DO** match category badge color to the icon-tile color in the same card.
- **DO** use Remix Icon exclusively.
- **DO** include Korean font fallback `"Noto Sans KR"` in `font-family`.
- **DO** use `rounded-full` for CTAs, `rounded-2xl` for cards, `rounded-xl` for inputs — never mix these up.
- **DO** use `active:scale-[0.98]` on all buttons for unified press feedback.

### DON'T

- **DON'T** use light theme. Testably is dark-only.
- **DON'T** use pure black (`#000`) as background — always `slate-900`.
- **DON'T** use `blue` Tailwind colors; the accent is `indigo`. (They look similar — `indigo-500` is #6366F1, `blue-500` is #3B82F6. Use indigo.)
- **DON'T** introduce additional icon libraries. No Lucide, no Heroicons.
- **DON'T** use shadcn/ui defaults — shadcn's neutral palette will clash.
- **DON'T** add bright solid card backgrounds. Cards are glass: `bg-white/[0.03]`.
- **DON'T** add heavy drop shadows to cards. Cards use `hover:shadow-sm shadow-indigo-500/10` at most.
- **DON'T** use `rounded-md` or `rounded-sm` for buttons. Buttons are always `rounded-full` (or `rounded-[10px]` for ghost pricing buttons).
- **DON'T** use `focus:ring-*` on text inputs — use border-color focus (`focus:border-indigo-500`).
- **DON'T** center-align body paragraphs in dashboard/app screens. Center is for marketing copy only.
- **DON'T** use all-caps outside of eyebrows, category badges, and stat labels.
- **DON'T** use italic outside of testimonial quotes.
- **DON'T** use emoji as icons — always Remix Icon.

---

## 11. Reference snippet — minimum viable Testably-styled page

Drop-in template for generating a new Testably-aligned page.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Testably — Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
  <style>
    body { font-family: Inter, "Noto Sans KR", sans-serif; }
    .font-brand { font-family: Pacifico, cursive; }
  </style>
</head>
<body class="bg-slate-900 text-white antialiased">
  <!-- Nav: see §6.1 -->
  <!-- Hero: see §6.2 -->
  <!-- Section: see §6.3 -->
  <!-- CTA: see §5.19 -->
  <!-- Footer: bg-slate-900 border-t border-white/5 py-14 -->
</body>
</html>
```

---

## 12. Source of truth

This document was built by inspecting the live production site at **https://testably.app** (April 2026). All tokens (colors, sizes, radii, padding) are extracted from computed styles — not designed from scratch. When in doubt, inspect the live site before deviating.

Key observed invariants that define the brand:
- Slate-900 canvas with indigo ambient glow
- Inter + Pacifico brand mark + Korean fallback
- `bg-indigo-500` primary with `shadow-[0_0_30px_rgba(99,102,241,0.3)]` glow
- `bg-white/[0.03] border-white/[0.06] rounded-2xl` as the default card
- Remix Icon as the exclusive icon system
- Uppercase `tracking-widest text-indigo-400` eyebrows above every section title
- Gradient-highlighted key phrase per headline (`from-indigo-300 to-indigo-500` or `from-indigo-400 via-violet-400 to-pink-400`)
