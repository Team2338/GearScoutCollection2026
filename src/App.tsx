import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from '@/context/UserContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import DataCollection from '@/pages/DataCollection';
import { ReactNode } from 'react';

/**
 * Protected route wrapper that requires authentication
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useUser();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
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
  );
};

const App = () => {
  return (
    <ErrorBoundary>
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
