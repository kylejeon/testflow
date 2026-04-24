
# TestFlow - Test Management Solution

A modern test management platform built with React, TypeScript, and Supabase.

## Features

- **Project Management**: Create and manage multiple test projects
- **Test Cases**: Organize test cases with tags and priorities
- **Milestones**: Track project milestones and progress
- **Test Runs**: Execute test runs and record results
- **Sessions**: Manage exploratory testing sessions
- **Documentation**: Store project documents and links
- **Team Collaboration**: Invite team members and track contributions
- **Timeline**: View project activity history
- **AI-native**: Test case generation, AI Run Summary, flaky detection, milestone risk analysis
- **AI Credit Observability**: per-member / per-feature / daily usage breakdown (Owner view)

## SDK Packages

Connect your CI pipeline to Testably — test results land in your dashboard
automatically, no manual uploads.

| Package | npm | Status |
|---------|-----|--------|
| [`@testably.kr/playwright-reporter`](./packages/playwright) | [npm](https://www.npmjs.com/package/@testably.kr/playwright-reporter) | **Stable (1.0.1)** |
| [`@testably.kr/cypress-reporter`](./packages/cypress) | [npm](https://www.npmjs.com/package/@testably.kr/cypress-reporter) | **Stable (1.0.1)** |
| [`@testably.kr/reporter-core`](./packages/core) | [npm](https://www.npmjs.com/package/@testably.kr/reporter-core) | Stable (1.0.1) — shared HTTP client |
| `@testably.kr/jest-reporter` | — | Planned |

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

See the [Playwright Reporter README](./packages/playwright/README.md) for the
5-minute quick start, or browse [`examples/`](./examples) for real-world
framework + CI combinations (Next.js + GitHub Actions, Nuxt + GitLab CI,
Remix + CircleCI).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Icons**: Remix Icon, Font Awesome

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/testflow.git
cd testflow
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `VITE_PUBLIC_SUPABASE_URL`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Netlify

1. Push your code to GitHub
2. Connect your repository to [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy!

### Supabase Edge Functions

Deploy Edge Functions using Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy send-invitation
supabase functions deploy accept-invitation
supabase functions deploy test-jira-connection
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Database Setup

The application requires the following Supabase tables:
- `profiles` - User profiles
- `workspaces` - Workspaces
- `workspace_members` - Workspace memberships
- `projects` - Test projects
- `project_members` - Project team members
- `project_invitations` - Pending invitations
- `test_cases` - Test cases
- `test_case_comments` - Test case comments
- `test_case_history` - Test case change history
- `milestones` - Project milestones
- `test_runs` - Test execution runs
- `test_results` - Individual test results
- `sessions` - Exploratory testing sessions
- `session_logs` - Session activity logs
- `project_documents` - Project documentation
- `jira_settings` - Jira integration settings

## Monitoring & Observability

### Error Tracking — Sentry

Sentry is integrated via `@sentry/react` + `@sentry/vite-plugin`.

- **SDK init**: `src/lib/sentry.ts` → called in `src/main.tsx`
- **DSN**: set `VITE_SENTRY_DSN` in your environment (see `.env.example`)
- **Source maps**: uploaded automatically when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set (CI / Vercel builds only)
- Events are dropped in development; only sent in `production` and `preview` environments

### Uptime Monitoring — Health Endpoint

A public health check endpoint is available at:

```
GET https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/health
```

Returns `200 OK` when all dependencies are healthy, `503 Degraded` otherwise. Response format:

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "checks": {
    "supabase": { "ok": true, "latency_ms": 120 },
    "paddle":   { "ok": true, "latency_ms": 80 },
    "loops":    { "ok": true, "latency_ms": 60 }
  }
}
```

**Registering with an uptime service (BetterStack / UptimeRobot)**:

1. Create a new monitor in your uptime service
2. Set the URL to `https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/health`
3. Set check interval to **1 minute**
4. Alert on non-2xx response or response time > 5s
5. (Optional) Create a BetterStack Heartbeat and set `BETTERSTACK_HEARTBEAT_URL` in your CI to ping it after each successful smoke run

### Smoke Tests — Playwright

Minimal smoke tests live in `e2e/smoke/` and run against the production URL by default.

```bash
# Run smoke tests
npm run test:smoke

# Run against a different URL
SMOKE_BASE_URL=https://staging.testably.app npm run test:smoke
```

**Required environment variables** (set in GitHub Actions Secrets or `.env`):

| Variable | Description |
|---|---|
| `SMOKE_BASE_URL` | Target URL (default: `https://testably.app`) |
| `SMOKE_TEST_EMAIL` | Dedicated smoke test account email |
| `SMOKE_TEST_PASSWORD` | Smoke test account password |
| `SMOKE_PROJECT_ID` | UUID of the dedicated smoke test project |

## Test Automation SDK

Testably ships an official Playwright reporter so Pro+ customers can
automatically sync CI test results to a Testably run. The SDK lives in
`packages/` and is developed as a standalone open-source package.

| Package | Location | Publish status |
|---------|----------|----------------|
| [`@testably.kr/playwright-reporter`](./packages/playwright/README.md) | `packages/playwright/` | MIT — pending publish to npm (alpha) |
| `@testably.kr/reporter-core` | `packages/core/` | Internal HTTP client used by the reporter |

### Quick start (Playwright)

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@testably.kr/playwright-reporter', { testCaseIdSource: 'title' }],
  ],
});
```

Set `TESTABLY_URL`, `TESTABLY_TOKEN`, and `TESTABLY_RUN_ID` in your CI
environment. See [`packages/playwright/README.md`](./packages/playwright/README.md)
for configuration, TC-matching strategies, and troubleshooting.

Requires a Testably **Professional** plan or higher on the server side.

## License

MIT License

## Support

For questions or issues, please open a GitHub issue.
