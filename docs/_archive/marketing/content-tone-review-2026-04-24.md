# Marketing Tone & Messaging Consistency Review — 2026-04-24
> 유형: Internal Review
> 작성일: 2026-04-24
> 타겟 채널: All (site + marketing assets)
> 관련 기능: f028 Test Automation SDK (Playwright + Cypress + Jest)

---

## §1 Summary Verdict

**Overall messaging consistency score: 7.5 / 10**

The core narrative — "AI-first QA, now with the world's best CI reporters" — is present and credible across most touchpoints. The SDK launch story is well-structured and the two-wave event design (5/11 Playwright, 5/13 Cypress) is sound. However, three friction points create enough inconsistency to warrant pre-launch fixes before May 11.

### Top 5 Recommendations (priority order)

**1. Unify Jest's status label to "Coming Soon" everywhere — drop "in preview"**
The cicd/page.tsx intro paragraph says "Jest in preview" while integrations/page.tsx says "Coming Soon." These are read by developers in the same session. One inconsistent label erodes the precision of every other status label on the page. Pick "Coming Soon" and apply it across all six instances (detailed in §3).

**2. Add a one-line SemVer trust signal to the blog and 5/11 tweet thread**
`f028-changelog.md` and `f028-blog` establish that 1.0.1 means API frozen — but this sentence only appears in the technical CHANGELOG.md, not in the public-facing blog post conclusion or Tweet 7 CTA. Developer trust in a new SDK package hinges on "will this break my CI in 2 months?" One sentence answers it and meaningfully reduces adoption friction.
Suggested addition (blog "Next steps" section, Tweet 7): *"`1.0.1` is the stable API. We follow strict SemVer — no breaking changes without a major version bump."*

**3. Cypress "Stable (1.0.1)" in README is fine — but the changelog date needs guarding**
The changelog entry for Cypress is dated `2026-05-13` and already visible in the public changelog page (changelog/page.tsx, line 48–60). Any visitor on or after today (4/24) will see this entry and know the Cypress package is published. This is not a blocker — the strategy explicitly allows "available now, event on 5/13" — but the entry's category label ("New Feature") reads as a standard announcement rather than a preview. Consider adding a single parenthetical to the description: "Stable on npm since April 2026. Official launch announcement: May 13." This reframes early discovery as intentional rather than accidental.

**4. The 5/13 Cypress reply thread (f028-twitter-thread.md) says "Cypress reporter is now live on npm" — but it will be posted as a reply to the 5/11 thread, 48 hours later. The phrasing is accurate but misses the continuity cue.**
Add one bridging phrase at the top of Tweet A: *"48 hours ago we launched Playwright. Today, the Cypress side of the family joins."* This turns the reply into a narrative beat rather than a standalone announcement.

**5. The home page Professional plan card lists "Test Automation SDK (Playwright & Cypress)" — this is correct and sufficiently specific, but the Korean-language version says "테스트 자동화 Framework SDK" which drops the framework names. Localization parity issue: Korean visitors do not see Playwright/Cypress named in the plan card, potentially missing the concrete value signal that English visitors get.**

---

## §2 Page-by-Page Tone Review

### src/pages/home/page.tsx

| Element | Assessment | Note |
|---|---|---|
| Hero badge: "Test Case Management System for Modern QA Teams" | **Watch out** | Generic. Does not signal AI-first or SDK launch. No urgency for May launch. Low risk now, high opportunity. |
| Hero h1: "The Test Case Management / tool your team needs" | **Watch out** | Functional but flat. "tool your team needs" is table-stakes phrasing TestRail could use verbatim. |
| Hero description | **Good** | Covers scope clearly. Approachable tone. |
| SDK feature block copy: "npm install @testably.kr/playwright-reporter (or cypress variant). Results flow into your runs automatically — no manual uploads, no config headaches. Jest coming soon." | **Good** | Concrete, action-oriented. "Jest coming soon" is correct and succinct. |
| Professional plan feature list (EN): "Test Automation SDK (Playwright & Cypress)" | **Good** | Specific framework names add credibility. Consistent with pricing page. |
| Professional plan feature list (KO): "테스트 자동화 Framework SDK" | **Change** | Framework names (Playwright, Cypress) missing in Korean version. Recommend: "테스트 자동화 SDK (Playwright & Cypress)" |

**Overall home assessment:** The SDK messaging in the feature grid is strong. The hero is launch-agnostic, which is acceptable pre-May but should be refreshed on 5/11.

---

### src/pages/pricing/page.tsx

| Element | Assessment | Note |
|---|---|---|
| Professional features: "CI/CD Integration" + "Test Automation SDK (Playwright & Cypress)" as separate line items | **Good** | Appropriate granularity. CI/CD Integration covers the REST API path; SDK covers the one-install reporter path. Distinct value props. |
| Comparison matrix row: "Test Automation SDK (Playwright & Cypress)" | **Good** | Consistent with plan card. No contradictions found. |
| FAQ: flat-rate pricing explained | **Good** | Tone is direct and defensible. |

**Overall pricing assessment:** Clean. No conflicts. The framework specificity in the Professional tier is a genuine differentiator signal and should be preserved.

---

### src/pages/roadmap/page.tsx

| Element | Assessment | Note |
|---|---|---|
| Completed card title: "Test Automation SDK (Playwright + Cypress)" | **Good** | Matches pricing. |
| Completed card desc: "Native npm reporters for Playwright and Cypress. One install connects CI runs to Testably automatically." | **Good** | "One install" is the right hook. Tight and accurate. |
| Planned card: Jest Reporter, date "TBD", desc: "Jest reporter coming after Playwright/Cypress stabilize." | **Watch out** | "coming after Playwright/Cypress stabilize" implies P/C are not yet stable — but they are stable at 1.0.1. Recommend updating desc to: "Jest reporter coming after Playwright and Cypress reach adoption milestones. Playwright and Cypress are stable today." |

**Overall roadmap assessment:** One desc needs a minor update. The Completed / Planned column placement is correct and consistent with the event-driven launch strategy.

---

### src/pages/changelog/page.tsx

| Element | Assessment | Note |
|---|---|---|
| April 2026 "Test Automation SDK" entry: "Jest reporter coming soon" | **Good** | Appropriate. |
| May 11 Playwright entry: "graduates to stable" | **Good** | "graduates" implies prior beta period — accurate and credible. |
| May 13 Cypress entry: date-labeled 2026-05-13, description starts with "`@testably.kr/cypress-reporter@1.0.1` is now stable on npm" | **Watch out** | The entry is live in the page data now (4/24). Any visitor reading the changelog today can see this. Per §1 Recommendation 3, add a parenthetical to make early discovery feel intentional. |
| Ordering: May 13 entry appears before May 11 entry in the array (lines 48–74) | **Watch out** | The 5/13 Cypress entry is listed first in the source array (before Playwright 5/11). If the changelog renders in source order rather than chronological sort, Cypress appears above Playwright — undercutting the 5/11 "Playwright first" narrative. Verify render order. |

**Overall changelog assessment:** Good structure, but two issues need attention: the Cypress entry's early-discovery framing and the array ordering question.

---

### src/pages/docs/integrations/page.tsx

| Element | Assessment | Note |
|---|---|---|
| Jest card: `comingSoon: true` → badge renders "Coming Soon" | **Good** | Correct label. |
| Install block comment: `# Jest (coming soon)` | **Good** | Consistent with badge. |

**Overall integrations assessment:** Clean. No issues.

---

### src/pages/docs/cicd/page.tsx

| Element | Assessment | Note |
|---|---|---|
| Intro paragraph: "Use our SDK reporters for Playwright and Cypress (Jest in preview)" | **Change** | "in preview" conflicts with integrations page "Coming Soon." See §3. |
| Jest tab banner: "Jest reporter is in preview. The npm package exists but is not officially supported yet." | **Watch out** | Accurate technically, but "in preview" implies it's partially available. If the intent is "not officially supported," the cleaner framing is "coming soon" — which does not invite attempts to use it in production. The banner also exposes the npm package name (`@testably.kr/jest-reporter@1.0.0`) which could lead adventurous developers to install an unsupported package and report issues. Consider masking the version number: reference the package name without the `@1.0.0` tag, or replace the specific version with "early alpha" language. |
| Jest tab: full implementation guide shown (install command, config snippet, status mapping) despite "preview" status | **Watch out** | Showing complete setup docs for an unsupported package is a support liability. If a developer follows this guide and files an issue, the response ("it's in preview") is frustrating. Recommend collapsing the Jest tab to just the preview banner + "Watch the changelog for the stable release" rather than full documentation. |

**Overall cicd assessment:** The Jest tab is the most significant tone inconsistency across the site. It says "not officially supported" while providing complete setup documentation — a mixed signal that damages credibility.

---

### README.md

| Element | Assessment | Note |
|---|---|---|
| SDK table: Playwright and Cypress both "Stable (1.0.1)" | **Good** | Accurate and clear. |
| Jest row: "Planned" with no npm link | **Good** | Consistent with roadmap "Planned" column. No confusion. |
| reporter-core listed as "Stable (1.0.1) — shared HTTP client" | **Watch out** | Internal implementation detail. Developers reading the table may try to import reporter-core directly. If it's not meant to be used standalone, add: "internal dependency — use via playwright-reporter or cypress-reporter." |

**Overall README assessment:** Clean for external developers. One minor clarification on reporter-core.

---

### docs/marketing/f028-blog-ship-results-3-lines.md

| Element | Assessment | Note |
|---|---|---|
| Blog conclusion: "Cypress reporter 1.0.1 is also available today — same install flow" | **Good** | Accurately foreshadows Cypress without making it the headline. Appropriate for a Playwright-focused post. |
| "Jest reporter is coming soon" | **Good** | Consistent. |
| Missing: SemVer stability signal | **Watch out** | The blog mentions "1.0.1 stable" in the intro but never explicitly states what "stable" means to a developer making an adoption decision. See §1 Recommendation 2. |
| Missing: Plan requirement visibility | **Watch out** | The plan requirement ("CI upload requires Professional plan") is mentioned in one inline note and the final CTA but not in the lead paragraph. Developers who read the setup steps before the CTA may invest 20 minutes and then discover the gate. Earlier placement reduces frustration. Suggested: add a callout box immediately after Step 1 ("Note: CI/CD integration requires the Professional plan. Check pricing."). |

**Overall blog assessment:** High quality. Two additions would meaningfully improve developer trust and conversion.

---

### docs/marketing/f028-changelog.md

| Element | Assessment | Note |
|---|---|---|
| CHANGELOG.md entry: "1.0.1 is the first stable version. The API surface is frozen." | **Good** | This is the clearest trust signal in the entire content set. It is, however, only in the technical CHANGELOG, not the public-facing marketing copy. |
| Public changelog entry: "Also available now: Cypress Reporter 1.0.1 stable" | **Good** | Appropriate tone for a Playwright launch announcement. Cypress is confirmed available without stealing the headline. |

**Overall f028-changelog assessment:** The technical CHANGELOG.md entry is exemplary. The public changelog entry is solid.

---

### docs/marketing/f028-twitter-thread.md

| Element | Assessment | Note |
|---|---|---|
| Tweet 7: "Cypress reporter ships May 13. Jest coming after." | **Good** | Clean, forward-looking, creates anticipation without over-promising. |
| Tweet 7: No SemVer stability mention | **Watch out** | One phrase here ("stable API, SemVer guaranteed") would convert developer fence-sitters. Small addition, high value. |
| 5/13 reply thread Tweet A: "Cypress reporter is now live on npm" | **Watch out** | Technically true (it was published in April), but the "now live" framing on 5/13 implies it just became available. Developers who were watching between 4/24 and 5/13 will notice the discrepancy. See §1 Recommendation 4. |
| 5/13 reply thread: 3 tweets, tight and clear | **Good** | Good length. Mirrors Playwright setup flow without repeating it verbatim. |

**Overall twitter thread assessment:** Strong. Two targeted tweaks in §1 would close the gap.

---

## §3 Jest Messaging Unification Recommendation

Current state across all touchpoints:

| Location | Current label |
|---|---|
| integrations/page.tsx card badge | "Coming Soon" |
| integrations/page.tsx install block comment | "coming soon" |
| cicd/page.tsx intro paragraph | "in preview" |
| cicd/page.tsx Jest tab banner headline | "in preview" |
| changelog/page.tsx April SDK entry | "coming soon" |
| home/page.tsx SDK feature block (EN) | "coming soon" |
| home/page.tsx SDK feature block (KO) | "곧 지원됩니다" |
| roadmap/page.tsx Planned column | (no explicit label, implied by column placement) |
| f028-changelog.md public entry | "Coming soon" |
| f028-twitter-thread.md Tweet 7 | "coming after" |
| README.md SDK table | "Planned" |

**Recommendation: Adopt "Coming Soon" as the single external-facing label for Jest.**

Rationale:
- "In preview" implies a partially available, usable product. The cicd/page.tsx banner text explicitly contradicts this: "not officially supported yet." Using "preview" while saying "not supported" is internally contradictory.
- "Planned" is appropriate for a roadmap column (where context is a planning artifact), but too weak for a feature list or install page where users are evaluating now.
- "Coming Soon" correctly signals future availability with no implied current usability. It matches integrations and changelog, and requires no behavioral clarification.

**The one exception: README.md.** In a technical README read by developers, "Planned" is appropriate and conventional for SDK tables. Keep "Planned" in README.md only.

**Change required (one line, one file):**
`cicd/page.tsx` intro paragraph: replace `(Jest in preview)` with `(Jest coming soon)`.
The Jest tab banner can keep its detailed note, but the headline should change from "Jest reporter is in preview" to "Jest reporter is coming soon — not yet officially supported."

---

## §4 Launch Event Narrative Check

### 5/11 Playwright Launch Assessment

**Narrative coherence: Strong**

The 5/11 story is cleanly "Playwright, first. Cypress confirmed for May 13. Jest after that." This is present in:
- Blog conclusion (explicit Cypress mention with date)
- Tweet 7 ("Cypress reporter ships May 13")
- f028-changelog.md public entry ("Also available now: Cypress Reporter 1.0.1 stable — Coming soon: Jest Reporter")
- cicd/page.tsx tab structure (Playwright first in tab order)

The only gap: the 5/11 PH launch post and home page hero are not in scope here (home hero does not change on launch day unless someone updates it). If no hero refresh is planned for 5/11, the hero copy will be unchanged during the most visible day of the launch. Consider a one-day hero swap with copy like: "CI test results, now in your QA dashboard automatically — Playwright Reporter 1.0.1 is live."

### 5/13 Cypress Sub-Launch Assessment

**Narrative coherence: Good with one gap (addressed in §1 Rec 4)**

The "Now Cypress too" story works as a reply thread because:
- The 5/11 thread already primed the audience ("Cypress ships May 13")
- The reply creates a satisfying callback
- The install flow mirrors Playwright's, so onboarding friction is low

The gap is the "now live" phrasing in Tweet A, as noted. The fix is one bridging sentence. The rest of the thread is clean.

**The "early discovery" scenario** (developer finds Cypress on npm between 4/24 and 5/13): The strategy explicitly accepts this, positioning the event as "stable announcement" not "availability announcement." This positioning is sound because:
1. The package is genuinely stable and installable — early users will have a good experience, not a broken one
2. The changelog entry (even if discovered early) shows a future date, signaling "we know you found it early"
3. Any organic early adoption generates social proof ahead of the event

The risk is low. Execution is coherent.

### "AI-first QA, now with the world's best CI reporters" master message check

Does the content set support this headline?

| Message element | Supported by | Gap |
|---|---|---|
| "AI-first QA" | Home feature grid (AI Test Generation, AI Run Summary, Flaky Detection AI, Coverage Gap Analysis), Pricing plan AI feature highlights | Home hero does not say "AI-first." Top-of-page brand perception for new visitors is still generic. |
| "now with" (timing, freshness) | Changelog entries, blog publication date, Twitter launch thread | No urgency cue on home page before launch day |
| "world's best CI reporters" | Blog technical depth, CHANGELOG.md SemVer notes | "world's best" is a claim that needs a proof point. Blog and docs establish competence but not superiority. Consider: "the reporters Playwright and Cypress teams reach for" or "zero-config CI reporters" rather than a superlative without evidence. |
| "one-install" connection | Roadmap card ("One install connects CI runs"), SDK feature block, blog title, Twitter thread | Consistent and credible. This is the strongest executed message element. |

**Summary:** The master message lands about 75% of its intended impact. The "AI-first" signal is diluted by a generic hero. The "world's best" claim is unsupported. "One install" is the sharpest executed claim and should be the anchor phrase across 5/11 launch copy.

---

## §5 Copywriter Tuning Suggestions for Developer Handoff

These are text-level suggestions only. No layout or code changes required — all are pure string replacements.

**5a. cicd/page.tsx — intro paragraph**
Current: `"Automatically upload test results from your CI/CD pipeline to Testably. Use our SDK reporters for Playwright and Cypress (Jest in preview), or integrate manually via GitHub Actions, GitLab CI, and Python."`
Suggested: `"Automatically upload test results from your CI/CD pipeline to Testably. Use our SDK reporters for Playwright and Cypress (Jest coming soon), or integrate manually via GitHub Actions, GitLab CI, and Python."`

**5b. cicd/page.tsx — Jest tab banner headline**
Current: `"Jest reporter is in preview."`
Suggested: `"Jest reporter is coming soon — not yet officially supported."`

**5c. roadmap/page.tsx — Jest Planned card description**
Current: `"Jest reporter coming after Playwright/Cypress stabilize."`
Suggested: `"Jest reporter coming after Playwright and Cypress reach adoption milestones. Both are stable on npm today."`

**5d. f028-twitter-thread.md — Tweet 7, append one sentence**
Current ends: `"Requires Testably Professional plan. Start free at testably.app"`
Suggested append: `"1.0.1 means stable API. SemVer followed — no breaking changes without a major version bump."`

**5e. f028-twitter-thread.md — 5/13 reply Tweet A, add bridging phrase**
Current: `"Cypress reporter is now live on npm: @testably.kr/cypress-reporter@1.0.1"`
Suggested: `"48 hours after Playwright, here's the Cypress side of the family.`
`@testably.kr/cypress-reporter@1.0.1 is officially announced. Same family, same one-install story."`

**5f. f028-blog-ship-results-3-lines.md — Add callout after install step**
After "Step 1: Install the package," add:
`> **Plan requirement:** CI/CD integration is available on the Professional plan ($99/month, flat-rate). Your Playwright tests still run normally on any plan — only the upload to Testably is gated. [See pricing](https://testably.app/pricing).`

**5g. home/page.tsx — Korean Professional plan feature list (optional, lower priority)**
Current: `"테스트 자동화 Framework SDK"`
Suggested: `"테스트 자동화 SDK (Playwright & Cypress)"`

**5h. README.md — reporter-core row clarification (optional)**
Current: `"Stable (1.0.1) — shared HTTP client"`
Suggested: `"Stable (1.0.1) — internal shared HTTP client (use via playwright-reporter or cypress-reporter)"`
