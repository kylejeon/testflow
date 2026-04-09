# Legal Documents — Testably

> ⚠️ **All documents in this folder are Draft v1 — pending legal review.**  
> Do not publish any of these documents without attorney approval.

**Prepared:** 2026-04-09  
**Target launch:** 2026-05-05 (Product Hunt)

---

## Document Index

| Document | File | Status | Purpose |
|---|---|---|---|
| Terms of Service | [terms-of-service.md](./terms-of-service.md) | Draft v1 | User agreement, usage rules, payment, IP, liability |
| Privacy Policy | [privacy-policy.md](./privacy-policy.md) | Draft v1 | GDPR + CCPA compliant data handling |
| Refund Policy | [refund-policy.md](./refund-policy.md) | Draft v1 | Paddle-compatible 14-day refund terms |
| Data Processing Agreement | [dpa.md](./dpa.md) | Draft v1 | GDPR Art. 28 DPA for B2B customers |
| Cookie Policy | [cookie-policy.md](./cookie-policy.md) | Draft v1 | Cookie usage + EU consent banner text |

---

## ⚡ Kyle's Decision List (fill in before publishing)

### 1. Company Legal Name
- **Variable:** `{{company_legal_name}}`
- **Required in:** All 5 documents
- **What to fill:** The registered legal entity name (e.g., "Testably Inc." or "Kyle Hong 1인 사업자" etc.)
- **Consideration:** Determines which jurisdiction's corporate law applies. If no entity yet, use your personal name or discuss incorporating before launch.

### 2. Jurisdiction / Governing Law
- **Variable:** `{{jurisdiction}}`
- **Required in:** Terms of Service (§16), DPA (§8)
- **What to fill:** The state/country whose laws govern disputes (e.g., "the State of Delaware, USA" or "the Republic of Korea")
- **Consideration:**
  - If incorporated in the US: Delaware or home state
  - If Korean sole proprietor / Korean corp: Republic of Korea
  - For B2B SaaS, Delaware (US) is common even for non-US founders
  - Paddle may have requirements — check their MoR agreement

### 3. Support Email
- **Variable:** `{{support_email}}`
- **Required in:** All 5 documents
- **What to fill:** The primary customer-facing email (e.g., `support@testably.app`)
- **Action:** Set up this email alias before launch (Google Workspace, Fastmail, etc.)

### 4. DPO Email
- **Variable:** `{{dpo_email}}`
- **Required in:** Privacy Policy (§2, §9), DPA (Schedule C)
- **What to fill:** Data Protection Officer contact email
- **Consideration:**
  - GDPR requires a DPO if you process data at scale or process special categories of data
  - For a small B2B SaaS, a dedicated DPO may not be legally required
  - Options: (a) use `privacy@testably.app` aliased to Kyle, (b) hire a virtual DPO service (~$100-300/month), (c) confirm with lawyer whether DPO is required
  - If no formal DPO, relabel to "Privacy Contact" in the documents

### 5. Paddle MoR Agreement Review
- **Action:** Review Paddle's contract to confirm:
  - Paddle is correctly described as Merchant of Record
  - Refund Policy terms (14-day, pro-rated annual) are compliant with Paddle's policies
  - Tax handling language in ToS (§5.6) matches Paddle's actual tax collection behavior
- **Contact:** Paddle seller onboarding support

### 6. Stripe → Paddle Migration
- **Note:** Codebase currently references Stripe (`@stripe/react-stripe-js`). Confirm Paddle migration is complete before publishing the Refund Policy and ToS which reference Paddle.

### 7. Anthropic API Agreement Check
- **Action:** Confirm in Anthropic's API usage policy that:
  - User input data is not used for model training under your API tier
  - Privacy Policy statement (§5, AI features) is accurate

### 8. Sub-processor DPAs
- **Action:** Ensure you have signed DPAs with:
  - [x] Supabase (standard DPA available at supabase.com)
  - [ ] Vercel (DPA available on request)
  - [ ] Paddle (covered in seller agreement)
  - [ ] Loops (contact Loops support)
  - [ ] Anthropic (check API terms)
  - [ ] Sentry (available at sentry.io) — when Sentry is added
  - [ ] PostHog (available at posthog.com) — when PostHog is added

### 9. PostHog / Sentry — Timing
- **Note:** Cookie Policy and Privacy Policy mark Sentry and PostHog as "planned". Update these sections (remove *(planned)* qualifier) when integrated.

### 10. Korean Law Considerations
- If operating as a Korean business, consider:
  - **PIPA (개인정보보호법)** compliance in addition to GDPR/CCPA
  - Korean users may have additional rights under PIPA
  - Disclosure requirements for data transfers abroad (제17조, 제28조)
  - Consult a Korean attorney familiar with IT/SaaS before launch in Korea

---

## Pre-Launch Publishing Checklist

### Legal Review
- [ ] Attorney reviews all 5 documents
- [ ] Attorney confirms jurisdiction selection is appropriate
- [ ] Attorney confirms DPO designation decision

### Content
- [ ] Replace all `{{placeholder}}` variables with real values
- [ ] Remove `*(planned)*` qualifiers for integrated services (Sentry, PostHog)
- [ ] Remove "⚠️ Draft v1 — pending legal review" banners after attorney sign-off
- [ ] Update "Effective Date" to actual publish date

### Technical Implementation
- [ ] `/terms` page on testably.app displays Terms of Service
- [ ] `/privacy` page on testably.app displays Privacy Policy
- [ ] `/cookies` page on testably.app displays Cookie Policy
- [ ] `/refund` (or section in pricing page) displays Refund Policy
- [ ] DPA available to B2B customers on request (or via dedicated page)
- [ ] Cookie consent banner implemented (EU users) — see Cookie Policy §5
- [ ] Footer links to: Terms · Privacy · Cookies · Refund
- [ ] Auth flow links to Terms and Privacy at signup
- [ ] Checkout flow shows link to Refund Policy

### Paddle-Specific
- [ ] Paddle checkout displays correct legal entity name
- [ ] Paddle seller profile has correct address and tax info
- [ ] Refund policy URL configured in Paddle seller settings

### Operational
- [ ] `support@testably.app` email is active and monitored
- [ ] Privacy/DPO email is active
- [ ] Process documented for handling GDPR rights requests
- [ ] Process documented for handling data breach notifications (72-hour clock)

---

## Revision History

| Version | Date | Author | Notes |
|---|---|---|---|
| Draft v1 | 2026-04-09 | Claude (AI) | Initial draft for attorney review |

---

*Questions? Contact {{support_email}}*
