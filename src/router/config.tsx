import { lazy, ComponentType } from 'react';
import { RouteObject, Navigate, useParams } from 'react-router-dom';

/**
 * Drop-in replacement for React.lazy that retries once with a cache-busting
 * URL on dynamic import failures (stale chunk hash after a new Vercel deploy).
 */
function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('Loading chunk') ||
        (err instanceof TypeError && msg.includes('Failed to fetch'));

      if (!isChunkError) throw err;

      // Retry once with a cache-busting query param so the browser fetches the
      // latest chunk instead of serving a stale 404 from cache.
      return new Promise<{ default: T }>((resolve, reject) => {
        // Small delay to avoid hammering on immediate re-request
        setTimeout(() => {
          factory().then(resolve).catch(reject);
        }, 200);
      });
    })
  );
}

// Redirect /projects/:id/sessions → /projects/:id/discovery-logs
function SessionsRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/projects/${id}/discovery-logs`} replace />;
}

// Redirect /projects/:projectId/sessions/:sessionId → /projects/:projectId/discovery-logs/:sessionId
function SessionDetailRedirect() {
  const { projectId, sessionId } = useParams<{ projectId: string; sessionId: string }>();
  return <Navigate to={`/projects/${projectId}/discovery-logs/${sessionId}`} replace />;
}

const HomePage = lazy(() => import('../pages/home/page'));
const AuthPage = lazy(() => import('../pages/auth/page'));
const Projects = lazy(() => import('../pages/projects/page'));
const ProjectDetail = lazy(() => import('../pages/project-detail/page'));
const ProjectDocumentation = lazy(() => import('../pages/project-documentation/page'));
const ProjectMilestones = lazy(() => import('../pages/project-milestones/page'));
const MilestoneDetail = lazy(() => import('../pages/milestone-detail/page'));
const ProjectTestCases = lazy(() => import('../pages/project-testcases/page'));
const ProjectRuns = lazy(() => import('../pages/project-runs/page'));
const ProjectSessions = lazy(() => import('../pages/project-sessions/page'));
const SessionDetail = lazy(() => import('../pages/session-detail/page'));
const RunDetail = lazy(() => import('../pages/run-detail/page'));
const TestCases = lazy(() => import('../pages/testcases/page'));
const SettingsPage = lazy(() => import('../pages/settings/page'));
const NotFound = lazy(() => import('../pages/NotFound'));
const AcceptInvitationPage = lazy(() => import('../pages/accept-invitation/page'));
const PrivacyPage = lazyWithRetry(() => import('../pages/privacy/page'));
const TermsPage = lazyWithRetry(() => import('../pages/terms/page'));
const RefundPolicyPage = lazyWithRetry(() => import('../pages/refund/page'));
const CookiePolicyPage = lazyWithRetry(() => import('../pages/cookies/page'));
const AdminPage = lazy(() => import('../pages/admin/page'));
const ProjectIntegrations = lazy(() => import('../pages/project-integrations/page'));
const ProjectRequirements = lazy(() => import('../pages/project-requirements/page'));
const ProjectTraceability = lazy(() => import('../pages/project-traceability/page'));
const ProjectSharedSteps = lazy(() => import('../pages/project-shared-steps/page'));
const PlanDetail = lazyWithRetry(() => import('../pages/plan-detail/page'));
const TestCasesOverviewPage = lazy(() => import('../pages/stats/TestCasesOverviewPage'));
const ActiveRunsPage = lazy(() => import('../pages/stats/ActiveRunsPage'));
const PassRateReportPage = lazy(() => import('../pages/stats/PassRateReportPage'));
const TeamActivityPage = lazy(() => import('../pages/stats/TeamActivityPage'));
const FeaturesPage = lazy(() => import('../pages/features/page'));
const PricingPage = lazy(() => import('../pages/pricing/page'));
const ChangelogPage = lazy(() => import('../pages/changelog/page'));
const RoadmapPage = lazy(() => import('../pages/roadmap/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const ComparePage = lazy(() => import('../pages/compare/page'));
const CompareIndexPage = lazy(() => import('../pages/compare/index'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const TestCaseManagementPage = lazyWithRetry(() => import('../pages/use-cases/test-case-management/page'));
const TestManagementToolPage = lazyWithRetry(() => import('../pages/use-cases/test-management-tool/page'));
const BlogChoosingToolPage = lazyWithRetry(() => import('../pages/blog/choosing-test-management-tool/page'));
const BlogPlaywrightReporterPage = lazyWithRetry(() => import('../pages/blog/playwright-reporter-ci-integration/page'));
const BlogCypressReporterPage = lazyWithRetry(() => import('../pages/blog/cypress-reporter-ci-integration/page'));
const DocsPage = lazy(() => import('../pages/docs/page'));
const ApiReferencePage = lazy(() => import('../pages/docs/api/page'));
const DocsGettingStartedPage = lazy(() => import('../pages/docs/getting-started/page'));
const DocsCICDPage = lazy(() => import('../pages/docs/cicd/page'));
const DocsImportExportPage = lazy(() => import('../pages/docs/import-export/page'));
const DocsWebhooksPage = lazy(() => import('../pages/docs/webhooks/page'));
const DocsIntegrationsPage = lazy(() => import('../pages/docs/integrations/page'));
const DocsApiAuthPage = lazy(() => import('../pages/docs/api/authentication/page'));
const DocsApiProjectsPage = lazy(() => import('../pages/docs/api/projects/page'));
const DocsApiTestCasesPage = lazy(() => import('../pages/docs/api/test-cases/page'));
const DocsApiTestRunsPage = lazy(() => import('../pages/docs/api/test-runs/page'));
const DocsApiTestResultsPage = lazy(() => import('../pages/docs/api/test-results/page'));
const DocsApiCiUploadPage = lazy(() => import('../pages/docs/api/ci-upload/page'));
const DocsApiMilestonesPage = lazy(() => import('../pages/docs/api/milestones/page'));
const DocsApiDiscoveryLogsPage = lazy(() => import('../pages/docs/api/discovery-logs/page'));
const DocsApiMembersPage = lazy(() => import('../pages/docs/api/members/page'));
const DocsTestCasesPage = lazy(() => import('../pages/docs/test-cases'));
const DocsTestRunsPage = lazy(() => import('../pages/docs/test-runs'));
const DocsMilestonesPage = lazy(() => import('../pages/docs/milestones'));
const DocsDiscoveryLogsPage = lazy(() => import('../pages/docs/discovery-logs'));
const DocsRequirementsTraceabilityPage = lazy(() => import('../pages/docs/requirements-traceability'));
const DocsSharedStepsPage = lazy(() => import('../pages/docs/shared-steps'));
const DocsTeamPermissionsPage = lazy(() => import('../pages/docs/team-permissions'));
const DocsAccountBillingPage = lazy(() => import('../pages/docs/account-billing'));
const DocsKeyboardShortcutsPage = lazy(() => import('../pages/docs/keyboard-shortcuts'));
const DocsFaqPage = lazy(() => import('../pages/docs/faq'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/projects',
    element: <Projects />,
  },
  {
    path: '/projects/:id',
    element: <ProjectDetail />,
  },
  {
    path: '/projects/:id/documentation',
    element: <ProjectDocumentation />,
  },
  {
    path: '/projects/:id/milestones',
    element: <ProjectMilestones />,
  },
  {
    path: '/projects/:projectId/milestones/:milestoneId',
    element: <MilestoneDetail />,
  },
  {
    path: '/projects/:id/testcases',
    element: <ProjectTestCases />,
  },
  {
    path: '/projects/:id/runs',
    element: <ProjectRuns />,
  },
  {
    path: '/projects/:id/discovery-logs',
    element: <ProjectSessions />,
  },
  {
    path: '/projects/:projectId/discovery-logs/:sessionId',
    element: <SessionDetail />,
  },
  // Legacy redirects — keep old /sessions URLs working
  {
    path: '/projects/:id/sessions',
    element: <SessionsRedirect />,
  },
  {
    path: '/projects/:projectId/sessions/:sessionId',
    element: <SessionDetailRedirect />,
  },
  {
    path: '/projects/:projectId/runs/:runId',
    element: <RunDetail />,
  },
  {
    path: '/projects/:id/integrations',
    element: <ProjectIntegrations />,
  },
  {
    path: '/projects/:id/requirements',
    element: <ProjectRequirements />,
  },
  {
    path: '/projects/:id/traceability',
    element: <ProjectTraceability />,
  },
  {
    path: '/projects/:id/shared-steps',
    element: <ProjectSharedSteps />,
  },
  {
    path: '/projects/:id/milestones/:milestoneId/plans/:planId',
    element: <PlanDetail />,
  },
  // Standalone plan (no milestone) — milestoneId = "standalone" sentinel
  {
    path: '/projects/:id/plans/:planId',
    element: <PlanDetail />,
  },
  {
    path: '/testcases',
    element: <TestCases />,
  },
  {
    path: '/testcases-overview',
    element: <TestCasesOverviewPage />,
  },
  {
    path: '/active-runs',
    element: <ActiveRunsPage />,
  },
  {
    path: '/passrate-report',
    element: <PassRateReportPage />,
  },
  {
    path: '/team-activity',
    element: <TeamActivityPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/accept-invitation',
    element: <AcceptInvitationPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/refund',
    element: <RefundPolicyPage />,
  },
  {
    path: '/cookies',
    element: <CookiePolicyPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },
  {
    path: '/features',
    element: <FeaturesPage />,
  },
  {
    path: '/pricing',
    element: <PricingPage />,
  },
  {
    path: '/changelog',
    element: <ChangelogPage />,
  },
  {
    path: '/roadmap',
    element: <RoadmapPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/compare',
    element: <CompareIndexPage />,
  },
  {
    path: '/compare/:competitor',
    element: <ComparePage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '/use-cases/test-case-management',
    element: <TestCaseManagementPage />,
  },
  {
    path: '/use-cases/test-management-tool',
    element: <TestManagementToolPage />,
  },
  {
    path: '/blog/choosing-test-management-tool',
    element: <BlogChoosingToolPage />,
  },
  {
    path: '/blog/playwright-reporter-ci-integration',
    element: <BlogPlaywrightReporterPage />,
  },
  {
    path: '/blog/cypress-reporter-ci-integration',
    element: <BlogCypressReporterPage />,
  },
  {
    path: '/docs',
    element: <DocsPage />,
  },
  {
    path: '/docs/api',
    element: <ApiReferencePage />,
  },
  {
    path: '/docs/getting-started',
    element: <DocsGettingStartedPage />,
  },
  {
    path: '/docs/cicd',
    element: <DocsCICDPage />,
  },
  {
    path: '/docs/import-export',
    element: <DocsImportExportPage />,
  },
  {
    path: '/docs/webhooks',
    element: <DocsWebhooksPage />,
  },
  {
    path: '/docs/integrations',
    element: <DocsIntegrationsPage />,
  },
  {
    path: '/docs/api/authentication',
    element: <DocsApiAuthPage />,
  },
  {
    path: '/docs/api/projects',
    element: <DocsApiProjectsPage />,
  },
  {
    path: '/docs/api/test-cases',
    element: <DocsApiTestCasesPage />,
  },
  {
    path: '/docs/api/test-runs',
    element: <DocsApiTestRunsPage />,
  },
  {
    path: '/docs/api/test-results',
    element: <DocsApiTestResultsPage />,
  },
  {
    path: '/docs/api/ci-upload',
    element: <DocsApiCiUploadPage />,
  },
  {
    path: '/docs/api/milestones',
    element: <DocsApiMilestonesPage />,
  },
  {
    path: '/docs/api/discovery-logs',
    element: <DocsApiDiscoveryLogsPage />,
  },
  {
    path: '/docs/api/members',
    element: <DocsApiMembersPage />,
  },
  {
    path: '/docs/test-cases',
    element: <DocsTestCasesPage />,
  },
  {
    path: '/docs/test-runs',
    element: <DocsTestRunsPage />,
  },
  {
    path: '/docs/milestones',
    element: <DocsMilestonesPage />,
  },
  {
    path: '/docs/discovery-logs',
    element: <DocsDiscoveryLogsPage />,
  },
  {
    path: '/docs/requirements-traceability',
    element: <DocsRequirementsTraceabilityPage />,
  },
  {
    path: '/docs/shared-steps',
    element: <DocsSharedStepsPage />,
  },
  {
    path: '/docs/team-permissions',
    element: <DocsTeamPermissionsPage />,
  },
  {
    path: '/docs/account-billing',
    element: <DocsAccountBillingPage />,
  },
  {
    path: '/docs/keyboard-shortcuts',
    element: <DocsKeyboardShortcutsPage />,
  },
  {
    path: '/docs/faq',
    element: <DocsFaqPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
