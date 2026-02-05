import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

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

const routes: RouteObject[] = [
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: <Projects />,
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
    path: '/projects/:id/sessions',
    element: <ProjectSessions />,
  },
  {
    path: '/projects/:projectId/sessions/:sessionId',
    element: <SessionDetail />,
  },
  {
    path: '/projects/:projectId/runs/:runId',
    element: <RunDetail />,
  },
  {
    path: '/testcases',
    element: <TestCases />,
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
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
