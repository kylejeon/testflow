# Cookie Policy

> ⚠️ **Draft v1 — pending legal review. Do not publish without attorney approval.**

**Effective Date:** 2026-04-09  
**Last Updated:** 2026-04-09

---

## 1. What Are Cookies?

Cookies are small text files stored on your device when you visit a website. They help the website remember information about your visit, improving functionality and enabling analytics.

We also use similar technologies such as local storage, session storage, and pixel tags, which are covered by this Cookie Policy.

---

## 2. Who We Are

{{company_legal_name}} operates Testably at https://testably.app. For cookie-related questions, contact {{support_email}}.

---

## 3. Cookies We Use

### 3.1 Strictly Necessary Cookies (Always Active)

These cookies are essential for the Service to function and cannot be disabled. They do not require consent.

| Cookie | Provider | Purpose | Duration |
|---|---|---|---|
| `sb-access-token` | Supabase | User authentication session token | Session |
| `sb-refresh-token` | Supabase | Refreshes the auth session | 7 days |
| `sb-[project-ref]-auth-token` | Supabase | Supabase Auth state (varies by project) | Session |
| `__Host-next-auth.csrf-token` | Next.js / App | CSRF protection | Session |
| `i18next` | App | Remembers your language preference | 1 year |

### 3.2 Functional Cookies

These cookies enhance the user experience but are not strictly required. Disabling them may affect some features.

| Cookie | Provider | Purpose | Duration |
|---|---|---|---|
| `testably_theme` | App | Stores UI theme preference (if added) | 1 year |
| `testably_sidebar` | App | Remembers sidebar collapsed state | 1 year |

### 3.3 Analytics Cookies

These cookies help us understand how the Service is used. We use this data to improve features and performance.

| Cookie | Provider | Purpose | Duration |
|---|---|---|---|
| `ph_*` | PostHog *(planned)* | Product analytics — page views, feature usage, session recording | 1 year |
| `posthog_session` | PostHog *(planned)* | Session identification for analytics | Session |

*PostHog is configured in EU mode (EU Cloud or self-hosted) where possible. Analytics cookies require your consent where required by law (EU/EEA users).*

### 3.4 Payment Cookies

These cookies are set by Paddle, our payment processor, when you interact with payment flows.

| Cookie | Provider | Purpose | Duration |
|---|---|---|---|
| `paddle_*` | Paddle | Fraud prevention, purchase flow state | Session / varies |
| `__paddle_checkout` | Paddle | Checkout session continuity | Session |

Paddle sets these cookies as our Merchant of Record. See [Paddle's Cookie Policy](https://www.paddle.com/legal/cookies) for more details.

### 3.5 Error Monitoring Cookies

| Cookie | Provider | Purpose | Duration |
|---|---|---|---|
| `sentry-*` | Sentry *(planned)* | Error tracking session (technical, not behavioral) | Session |

---

## 4. Third-Party Cookies

Some cookies are set by our sub-processors. We do not control these cookies directly. Please review the respective privacy policies:

- **Supabase:** https://supabase.com/privacy
- **PostHog:** https://posthog.com/privacy
- **Paddle:** https://www.paddle.com/legal/privacy
- **Sentry:** https://sentry.io/privacy/

---

## 5. Cookie Consent (EU/EEA Users)

Under the EU ePrivacy Directive and GDPR, we are required to obtain your consent before setting non-essential cookies if you are located in the EU or EEA.

### Cookie Banner Text (Draft)

> ---
> **We use cookies 🍪**
>
> Testably uses cookies to keep you signed in and improve your experience. We also use optional analytics cookies to understand how you use the product.
>
> [Accept All] [Necessary Only] [Manage Preferences]
>
> [Privacy Policy](https://testably.app/privacy) · [Cookie Policy](https://testably.app/cookies)
> ---

**Implementation notes for Kyle:**
- Implement consent before PostHog and Sentry load (gate their initialization behind consent state)
- Store consent preference in localStorage (`testably_cookie_consent: "all" | "necessary"`)
- Suppress analytics cookies entirely for users who choose "Necessary Only"
- Show banner to EU/EEA users (detect by IP geolocation or accept all users by default)
- Recommended consent library options: [Cookie Consent by Osano](https://www.osano.com/cookieconsent) (open source), or Termly/Iubenda if Kyle subscribes

---

## 6. How to Control Cookies

### Browser Settings
You can control cookies through your browser settings:
- [Chrome](https://support.google.com/chrome/answer/95647)
- [Firefox](https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences)
- [Safari](https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac)
- [Edge](https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

**Note:** Disabling strictly necessary cookies will break authentication and core Service functionality.

### Opt-Out Links
- **PostHog analytics:** PostHog provides an opt-out mechanism. Contact us at {{support_email}} to opt out.
- **Do Not Track (DNT):** We respect the DNT browser signal where technically feasible.

---

## 7. Changes to This Policy

We may update this Cookie Policy to reflect changes in cookies we use or regulatory requirements. We will update the "Last Updated" date and, for material changes, notify users via email or in-app notice.

---

## 8. Contact

For questions about our use of cookies:  
**{{support_email}}**

---

*Last updated: 2026-04-09*
