import { useNavigate, useLocation, type NavigateFunction } from "react-router-dom";
import { useRoutes } from "react-router-dom";
import { useEffect, Suspense } from "react";
import routes from "./config";
import PageLoader from "../components/PageLoader";

let navigateResolver: (navigate: ReturnType<typeof useNavigate>) => void;

declare global {
  interface Window {
    REACT_APP_NAVIGATE: ReturnType<typeof useNavigate>;
  }
}

export const navigatePromise = new Promise<NavigateFunction>((resolve) => {
  navigateResolver = resolve;
});

function PageLoadingFallback() {
  return <PageLoader fullScreen />;
}

export function AppRoutes() {
  const element = useRoutes(routes);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    navigateResolver(window.REACT_APP_NAVIGATE);
  });
  return <Suspense fallback={<PageLoadingFallback />}>{element}</Suspense>;
}
