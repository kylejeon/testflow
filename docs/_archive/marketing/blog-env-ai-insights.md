# Environment Heatmap now explains itself — AI-powered coverage insights
> 유형: SEO Blog
> 작성일: 2026-04-24
> 타겟 채널: testably.app/blog
> 관련 기능: f001 AI Environment Insights, f002 Chip Workflows
> 메타 디스크립션: Testably's environment heatmap now generates AI-powered explanations and recommendations for your coverage gaps. One click, one credit, 24-hour cache.

---

You open the Environment tab on a test plan. The heatmap tells you Safari 17 has a 37% pass rate. Another column is almost entirely grey — untested. A third shows a single critical test case that has never been run on three of your five environments.

You know something is wrong. You just do not know why it matters right now, what caused it, or what to do first.

That friction is the problem this release addresses.

## The gap between data and decisions

Environment coverage data is only useful if it leads to action. A pass rate number tells you the outcome. It does not tell you whether that outcome is a fluke or a trend, whether the failing test cases are critical or routine, or whether the coverage gap is actually blocking a release.

Answering those questions has traditionally meant switching tabs, filtering runs manually, cross-referencing test case priorities, and constructing a mental model before you can even write a Jira ticket.

Leading QA platforms have added AI features in recent years — mostly for test case generation or flaky test detection. What they have not done is connect AI analysis to the environment dimension specifically: the browser/OS matrix where cross-platform failures hide, where coverage silently degrades, and where QA leads spend disproportionate time trying to make sense of raw aggregate numbers.

That is the gap Testably is filling with this release.

## What's new: f001 + f002

### AI-powered insights in the Environment sidebar (f001)

The Environment Coverage sidebar in every Test Plan now has a "Regenerate with AI" button. When you click it, Testably sends your plan's environment breakdown — per-env pass rates, untested TC counts, critical and high priority TC status, and recent execution trend — to Claude Haiku, and returns:

- A **one-sentence headline** summarising the most important coverage risk (e.g., "Safari 17 fails 63% of critical TCs — investigate before release.")
- **AI-enriched explanations** for the critical environment card and the coverage gap card, citing specific numbers and TC IDs rather than generic thresholds
- **2–4 actionable recommendations** with enough specificity to act on immediately

Results are cached for 24 hours. If you or a teammate opens the same plan within that window, the cached insight loads instantly with no additional credit cost. A "Cached · 12m ago" badge in the sidebar header shows when the analysis was last generated.

![Environment AI Insights sidebar showing headline, critical environment card with AI reasoning, and recommendations](./assets/f001-f002/env-ai-insights-sidebar.png)
<!-- Replace placeholder with actual screenshot before publishing -->

### Important: how the AI layer works

The AI analysis is **additive, not a replacement**. Rule-based detection — the same pass rate thresholds and untested percentage calculations that have always powered the sidebar — continues to run on all plans and provides the baseline. The AI layer reads that rule-based context and adds natural language explanation and recommendations on top.

This design has two practical implications. First, the sidebar is always useful, even without AI. Second, the AI output is grounded in your actual data, not in generic advice.

If your plan has fewer than 5 executed results, the AI call is skipped entirely — no credit is consumed, and the sidebar shows a "Not enough data yet" notice. This prevents spending credits on analysis that would be statistically unreliable.

### Chip workflows that actually work (f002)

The "Create issue", "Filter", and "Assign run" chips on each insight card have been placeholders until this release. They now connect to real workflows:

**Create issue** opens an inline modal pre-filled with the AI headline as the issue title and the AI reasoning plus recommendations as the description body. You can route to Jira or GitHub depending on which integration your workspace has connected. The modal stays on the page — no tab switching, no copy-pasting.

**Filter** highlights the relevant environment column in the heatmap. Other columns dim to 45% opacity so you can focus on the environment in question. Click the same chip again — or the "Clear" pill that appears above the heatmap — to reset.

**Assign run** scrolls the page to the Runs section and shows a toast with guidance on adding a run targeting the coverage gap. It does not auto-create a run, but it eliminates the moment of "now where do I go to fix this."

![Before and after: heatmap with no filter vs. heatmap with Safari 17 column highlighted](./assets/f001-f002/env-filter-chip-before-after.png)
<!-- Replace placeholder with actual screenshot before publishing -->

## Credit policy: transparent by design

Every AI call in Testably costs 1 credit, flat. This applies to environment insights the same way it applies to other AI features.

A few specifics worth knowing:

- **Cache hit = 0 credits.** If the AI has already analyzed a plan in the last 24 hours, the cached result loads with no credit charge.
- **Too-little-data skip = 0 credits.** If the executed result count is below the threshold, the call is skipped and no credit is consumed.
- **Error = 0 credits.** If the Claude API times out or returns an error, the credit is not charged. The sidebar falls back to rule-based output.
- **Monthly limit reached.** The button disables and shows the remaining reset date. You can still see rule-based insights.

The credit remaining count is shown directly in the sidebar below the Regenerate button so you always know where you stand.

## Availability

AI-powered environment insights (f001) are available on the **Starter plan and above**. Rule-based insights remain available on all plans including Free.

The chip workflows (f002) — Create issue, Filter, and Assign run — are available on **all plans**.

If you are on a Free or Hobby plan, the Regenerate button shows a lock icon and an "Upgrade to Starter" link directly in the sidebar.

## How to try it

Open any Test Plan in Testably, go to the **Environments** tab, and click **"Regenerate with AI"** in the right sidebar.

If you do not have a plan with enough environment coverage data yet, this is a good moment to set one up: add a few environments to a plan, run a test suite, and see what the heatmap and AI layer surface together.

[Try Testably free](https://testably.app) — no credit card required. [See pricing](https://testably.app/pricing).
