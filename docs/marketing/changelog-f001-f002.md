# f001 + f002 — Changelog Entry: Environment AI Insights + Chip Workflows
> 유형: Changelog
> 작성일: 2026-04-24
> 타겟 채널: Testably public changelog (testably.app/changelog)
> 관련 기능: f001 AI Environment Insights, f002 Create Issue / Filter / Assign Run chips

---

## Public Changelog Entry (for testably.app/changelog)

### Environment heatmap now explains itself — AI-powered coverage insights

**Released: 2026-05-12**

The Environment Coverage sidebar in your Test Plan now does more than surface raw numbers — it can explain what they mean and suggest what to do next.

**What's new:**

- **AI-powered headline and recommendations** — Click "Regenerate with AI" in the Environment tab sidebar to get a one-sentence summary of your biggest coverage risk, AI-enriched explanations for each critical environment and coverage gap, and 2–4 concrete recommendations citing specific env names and TC IDs.
- **Chip workflows now work** — The "Create issue", "Filter", and "Assign run" chips on each insight card are no longer placeholders. Create a Jira or GitHub issue pre-filled with AI context, highlight a column in the heatmap to visually isolate a problematic environment, or scroll directly to the Runs section to act on a coverage gap.
- **Honest about data** — The AI layer is additive: rule-based detection still runs on all plans. If you have fewer than 5 executed results, AI skips the call and tells you why. If you hit the daily limit, the button tells you that too.

**How to use it:**

Open any Test Plan → go to the **Environments** tab → click **"Regenerate with AI"** in the right sidebar.

**Available on:** Starter plan and above. Rule-based insights remain available on all plans.

**Credit cost:** 1 credit per call. Results are cached for 24 hours — no credit is consumed on repeat views within that window.
