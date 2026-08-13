import { Routes, Route, Navigate } from "react-router-dom";

import { CategoryProvider } from "./context/CategoryProvider.jsx";
import { TransactionProvider } from "./context/TransactionProvider.jsx";
import { useAuth } from "./hooks/useAuth";
import { ROUTES } from "./constants/routes.js";

import Layout from "./layout/Layout";
import RouteErrorBoundary from "./components/RouteErrorBoundary.jsx";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Recurring from "./pages/Recurring";

const LoadingScreen = () => (
  <div className="h-screen flex items-center justify-center bg-background text-primaryText text-lg font-medium">
    Loading…
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to={ROUTES.LOGIN} replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to={ROUTES.DASHBOARD} replace /> : children;
};

function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />

      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.REGISTER}
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <CategoryProvider>
              <TransactionProvider>
                <Layout />
              </TransactionProvider>
            </CategoryProvider>
          </ProtectedRoute>
        }
      >
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <RouteErrorBoundary routeName="Dashboard">
              <Dashboard />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={ROUTES.TRANSACTIONS}
          element={
            <RouteErrorBoundary routeName="Transactions">
              <Transactions />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={ROUTES.CATEGORIES}
          element={
            <RouteErrorBoundary routeName="Categories">
              <Categories />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={ROUTES.REPORTS}
          element={
            <RouteErrorBoundary routeName="Reports">
              <Reports />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={ROUTES.RECURRING}
          element={
            <RouteErrorBoundary routeName="Recurring">
              <Recurring />
            </RouteErrorBoundary>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default App;
