import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from '@/context/UserContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReactNode, useEffect, useState, memo, useMemo, lazy, Suspense } from 'react';
import { register as registerServiceWorker } from '@/ServiceWorkerRegistration.ts';
import UpdateBanner from '@/components/update-banner/UpdateBanner.tsx';

// Lazy load pages for better code splitting and initial load performance
const Login = lazy(() => import('@/pages/Login'));
const DataCollection = lazy(() => import('@/pages/DataCollection'));

/**
 * Protected route wrapper that requires authentication
 * Memoized to prevent unnecessary re-renders
 */
const ProtectedRoute = memo(({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useUser();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

/**
 * Application routes component
 * Memoized to prevent unnecessary re-renders
 */
const AppRoutes = memo(() => {
  return (
    <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/data-collection"
          element={
            <ProtectedRoute>
              <DataCollection />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
});

AppRoutes.displayName = 'AppRoutes';

const App = () => {
  const [hasAppUpdate, setHasAppUpdate] = useState<boolean>(false);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorker | null>(null);

  // Memoize service worker callbacks to prevent recreating them on each render
  const swCallbacks = useMemo(() => ({
    onUpdate: (sw: ServiceWorker) => {
      setHasAppUpdate(true);
      setServiceWorker(sw);
    },
    onSuccess: () => {
      window.location.reload();
    }
  }), []);

  useEffect(() => {
    registerServiceWorker(swCallbacks);
  }, [swCallbacks]);

  return (
    <ErrorBoundary>
      <UpdateBanner hasUpdate={ hasAppUpdate } serviceWorker={ serviceWorker } />
      <UserProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </Router>
      </UserProvider>
    </ErrorBoundary>
  );
};

export default App;
