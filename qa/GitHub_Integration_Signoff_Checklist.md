# GitHub Integration — CEO Sign-off Checklist

**Product:** Testably  
**Feature:** GitHub Integration (MVP)  
**Date:** ___________  
**Tester:** Kyle  
**Estimated time:** ~5 minutes

> **Before you start:** Log in with a Hobby plan account (or higher).  
> Have a GitHub Personal Access Token (PAT) with `repo` scope ready.

---

## 1. Settings — Connect GitHub

- [ ] **1.1** Go to **Settings → Integrations tab** → scroll to the **GitHub Integration** section.  
  _Expected: Section shows PAT, Owner, Repo fields and a "Test Connection" button._  
  _Fail: Section is missing or page doesn't load → stop and report._

- [ ] **1.2** Enter a **valid PAT**, **owner** (GitHub username or org), and **repo** name → click **Test Connection**.  
  _Expected: Green success banner "Connected to {owner}/{repo}" appears._  
  _Fail: Red error message appears with HTTP status → check token has `repo` scope._

- [ ] **1.3** Click **Save Settings**.  
  _Expected: Toast/banner "GitHub settings saved successfully!" appears; repo name is shown in a locked row at the top of the section._  
  _Fail: Error banner or no feedback → confirm PAT, owner, repo fields are non-empty._

---

## 2. Repository UI — Verify Saved State

- [ ] **2.1** Refresh the page → go back to **Settings → Integrations**.  
  _Expected: The saved repo (`owner/repo`) is shown in the locked status row. Fields are not empty/reset._  
  _Fail: Fields are blank after reload → settings were not persisted._

- [ ] **2.2** Click **Edit** on the locked row.  
  _Expected: Fields become editable again; "Cancel Edit" button appears._  
  _Fail: No Edit button visible → repo row may not be rendering._

- [ ] **2.3** Click **Cancel Edit** (do not change anything).  
  _Expected: Row returns to locked state showing the same repo._

---

## 3. Import GitHub Issues as Requirements

- [ ] **3.1** Open any project → navigate to the **Requirements** page → click **Import from GitHub** (or the GitHub import button).  
  _Expected: A modal opens showing the configured repo name (`owner/repo`) and filter options (Label, State: open/closed/all)._  
  _Fail: "GitHub is not connected" message appears → go back to step 1._

- [ ] **3.2** Leave filters at defaults (State: `open`) → click **Fetch Issues**.  
  _Expected: A preview list of GitHub Issues loads (PR entries are excluded). New issues are tagged "New"; already-imported ones are tagged "Already imported"._  
  _Fail: Error shown → check repo has at least one open issue._

- [ ] **3.3** Select at least 1 issue → click **Import N Requirement(s)**.  
  _Expected: Modal closes; requirements list now includes the imported issue(s) with source = GitHub and a link icon._  
  _Fail: Error or 0 count imported → verify account is on Hobby plan or above._

---

## 4. Test Case → Create GitHub Issue (Manual)

- [ ] **4.1** Open any **Test Run** → open a test case result → click **Create GitHub Issue**.  
  _Expected: A modal opens pre-filled with the test case title; fields for body, labels, and assignee are editable._  
  _Fail: Button is missing → confirm GitHub is connected (step 1) and this is a run-detail page._

- [ ] **4.2** Fill in a title → click **Create Issue**.  
  _Expected: Toast "GitHub issue #N created" appears; the modal closes._  
  _Fail: Error toast → check PAT still has `repo` scope._

---

## 5. Auto-create on Failure (Bidirectional: Testably → GitHub)

- [ ] **5.1** In **Settings → Integrations → GitHub**, enable the **"Auto-create GitHub Issue on Failure"** toggle → click **Save Settings**.  
  _Expected: Toggle turns indigo; save confirmation appears._

- [ ] **5.2** In a test run, mark any test case as **Failed**.  
  _Expected: Toast "GitHub issue #N created automatically" appears within ~2 seconds._  
  _Fail: No toast and no issue created → confirm toggle is saved and PAT is valid._

---

## 6. Re-import Sync (GitHub → Testably Status Update)

- [ ] **6.1** On the **Requirements** page, re-open **Import from GitHub** → fetch issues for a repo where a previously-imported issue is now `closed` on GitHub → import it again.  
  _Expected: The already-imported requirement's `external_status` updates to `closed` (shown in the "Already imported" badge row)._  
  _Fail: Status unchanged → partial sync is expected in MVP; flag as known limitation._

---

## 7. Error Cases — User-Facing Messages

- [ ] **7.1 Invalid token:** In Settings, enter a deliberately wrong token (e.g., `ghp_INVALID`) → click **Test Connection**.  
  _Expected: Red error "GitHub API error (HTTP 401)" or similar. No crash._

- [ ] **7.2 Permission denied (403):** Use a PAT that lacks `repo` scope on a private repo → click **Test Connection** or try fetching issues.  
  _Expected: Red error "GitHub API error (HTTP 403)" or "Resource not accessible by personal access token". No crash._

- [ ] **7.3 Rate limit:** If GitHub rate limit is hit during import, the error message includes "API rate limit exceeded" (surfaced from GitHub's response).  
  _Expected: Red error banner in the import modal with the GitHub error message. No blank/silent failure._  
  _Note: Hard to reproduce on demand — verify error banner UI exists by reviewing step 3.2 failure path._

---

## 8. Settings — Disconnect GitHub

- [ ] **8.1** In **Settings → Integrations → GitHub**, click **Disconnect**.  
  _Expected: Confirmation dialog: "Disconnect GitHub? This will remove your GitHub credentials." → click OK._  
  _Fail: No confirmation dialog → proceed but note missing guard._

- [ ] **8.2** After confirming, verify the section resets to the empty "Connect" state (PAT/Owner/Repo fields blank, no locked repo row).  
  _Expected: GitHub section shows empty fields or the initial un-connected UI._  
  _Fail: Repo row still shows the old value after disconnect._

- [ ] **8.3** Try **Import from GitHub** on any Requirements page.  
  _Expected: Modal shows "GitHub is not connected. Configure GitHub credentials in Settings to use this feature." with a "Go to Settings" link._

---

## Result

| Section | Pass | Fail | Skip |
|---------|------|------|------|
| 1. Connect |  |  |  |
| 2. Repository UI |  |  |  |
| 3. Import Issues |  |  |  |
| 4. Manual Issue Creation |  |  |  |
| 5. Auto-create on Failure |  |  |  |
| 6. Re-import Sync |  |  |  |
| 7. Error Cases |  |  |  |
| 8. Disconnect |  |  |  |

**Failures / Notes:**

```
(list any failed items and observed behavior here)
```

---

**All items passed — approved for release:**

Signature: _______________________________  Date: ___________
