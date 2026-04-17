# Plan-Run TC Status Policy

> Dev spec fragment. Defines how TC execution status is resolved in Plan Detail and Milestone Plan Cards.

---

## Q1: Run-level TC status independence

**Rule:** Each Run is an independent execution context. TC statuses are scoped to `(run_id, test_case_id)` in `test_results`. A TC that is "passed" in Run #1 starts as "untested" in Run #2 unless explicitly executed. No status bleeds between Runs.

**Already correct** by schema design. No code change needed.

---

## Q2: What status to show in the Plan Detail TC table

**Decision: Option B — Latest result across all of this Plan's Runs.**

Rationale:
- Option A (latest Run only) hides regression info from earlier Runs if the latest Run hasn't executed that TC yet.
- Option C/D (best/worst) distorts reality and confuses testers.
- Option E (aggregated) is useful for dashboards but too noisy for a per-TC table row.
- Option B gives the most recent truth for each TC without hiding data.

**Rule:**
1. Collect all Runs linked to this Plan (see Q4 for how).
2. Query `test_results` for those `run_id`s, ordered by `created_at DESC`.
3. For each `test_case_id`, take the **first row** (= most recent result across all Runs).
4. If no result exists for a TC, its status is `"untested"`.

**Edge case — re-execution within the same Run:**
A tester can re-run a TC in the same Run (creating a newer `test_results` row). The latest row wins. This is already handled by `ORDER BY created_at DESC` + first-match dedup.

---

## Q3: Newly added TC to a Plan with existing Runs

**Rule:** Status is `"untested"`.

A TC added after Runs were created or completed has zero rows in `test_results` for those `run_id`s. The query from Q2 naturally returns nothing, so it falls through to the default `"untested"`.

No special-case code needed.

---

## Q4: Run-to-Plan association

**Rule: Use `test_runs.test_plan_id` as the ONLY link.**

The current TC-overlap heuristic is wrong because:
- An unrelated Run sharing TCs gets falsely matched to the Plan.
- Results from ad-hoc Runs leak into Plan stats.

### Migration states

| `test_plan_id` column exists? | Behavior |
|-------------------------------|----------|
| Yes, populated | Use `WHERE test_plan_id = :planId` |
| Yes, all NULL | All TCs show "untested" (correct — no Runs linked) |
| Column missing (migration not applied) | All TCs show "untested" |

**The TC-overlap fallback MUST be removed.** Showing wrong data is worse than showing no data.

### When creating a new Run from a Plan

The "Add Run" flow MUST set `test_plan_id` on the new `test_runs` row. This is the moment the link is established. Without it, the Run is orphaned (ad-hoc).

---

## Exact Query Logic: Plan Detail TC Table

```
-- Step 1: Get Run IDs for this Plan
SELECT id FROM test_runs
WHERE test_plan_id = :planId;

-- Step 2: Get latest result per TC across those Runs
SELECT DISTINCT ON (test_case_id)
  test_case_id, status, author, created_at
FROM test_results
WHERE run_id = ANY(:runIds)
ORDER BY test_case_id, created_at DESC;

-- Step 3: Build TC table
-- For each TC in test_plan_test_cases WHERE test_plan_id = :planId:
--   if TC has a row from Step 2 → use that status
--   else → "untested"
```

Client-side (current pattern with Supabase JS):

```typescript
// Runs for this plan
const { data: runs } = await supabase
  .from('test_runs')
  .select('id')
  .eq('test_plan_id', planId);

const runIds = (runs || []).map(r => r.id);

// Latest result per TC
if (runIds.length > 0) {
  const { data: results } = await supabase
    .from('test_results')
    .select('test_case_id, status, author, created_at')
    .in('run_id', runIds)
    .order('created_at', { ascending: false });

  const tcResultMap = new Map();
  for (const r of (results || [])) {
    if (r.test_case_id && !tcResultMap.has(r.test_case_id)) {
      tcResultMap.set(r.test_case_id, {
        result: r.status || 'untested',
        assignee: r.author || null,
      });
    }
  }
}
// TCs not in tcResultMap → "untested"
```

---

## Exact Query Logic: Milestone Plan Card

The Milestone page shows plan cards with aggregate stats (passed/failed counts, pass rate).

```typescript
// Step 1: Get plans for this milestone
const plans = await supabase
  .from('test_plans')
  .select('id, name, status, ...')
  .eq('milestone_id', milestoneId);

// Step 2: TC count per plan
const tcCounts = await supabase
  .from('test_plan_test_cases')
  .select('test_plan_id, test_case_id')
  .in('test_plan_id', planIds);

// Step 3: Runs per plan (direct link only)
const runs = await supabase
  .from('test_runs')
  .select('id, test_plan_id')
  .in('test_plan_id', planIds);

// Step 4: Results for those runs
const results = await supabase
  .from('test_results')
  .select('run_id, test_case_id, status, created_at')
  .in('run_id', allRunIds)
  .order('created_at', { ascending: false });

// Step 5: Per-plan aggregation
for (const planId of planIds) {
  const planRunIds = runs.filter(r => r.test_plan_id === planId).map(r => r.id);
  const planResults = results.filter(r => planRunIds.includes(r.run_id));

  // Dedup: latest result per TC
  const latestPerTc = new Map();
  for (const r of planResults) {
    if (!latestPerTc.has(r.test_case_id)) {
      latestPerTc.set(r.test_case_id, r.status);
    }
  }

  let passed = 0, failed = 0, blocked = 0, untested = 0;
  // Count from deduped results
  for (const status of latestPerTc.values()) {
    if (status === 'passed') passed++;
    else if (status === 'failed') failed++;
    else if (status === 'blocked') blocked++;
  }
  // TCs with no result = untested
  untested = tcCountForPlan - latestPerTc.size;
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Plan has 0 Runs | All TCs show "untested". Pass rate = 0%. |
| Run created outside Plan shares TCs | NOT matched. Only `test_plan_id` link counts. |
| TC removed from Plan but has results in linked Runs | TC disappears from Plan table. Results still exist in Run Detail but don't affect Plan stats. |
| TC added to Plan after Runs completed | Shows "untested" until executed in a new Run. |
| Multiple results for same TC in same Run | Latest `created_at` wins (re-execution). |
| Run with `test_plan_id = NULL` | Ad-hoc run. Never appears in any Plan. |
| `test_plan_id` column not in DB yet | `supabase.from('test_runs').select('id').eq('test_plan_id', planId)` returns empty → all TCs "untested". Correct. |

---

## Code Changes Required

1. **`src/pages/plan-detail/page.tsx`** (lines ~1893-1904): Remove TC-overlap fallback. Keep only `test_plan_id` match.
2. **`src/pages/project-milestones/page.tsx`** (lines ~317-342): Remove TC-overlap fallback. Keep only `test_plan_id` match.
3. **Run creation flow** (`src/pages/project-runs/page.tsx`): Verify that when creating a Run from a Plan, `test_plan_id` is set on the `test_runs` row.
