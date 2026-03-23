import { Navigate } from 'react-router-dom';

// Integrations management has been consolidated into Settings > Integrations.
// This redirect preserves backward-compat for any bookmarked or linked URLs.
export default function ProjectIntegrationsPage() {
  return <Navigate to="/settings?tab=integrations" replace />;
}
