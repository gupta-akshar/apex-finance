import { Routes, Route, Navigate } from "react-router-dom";

import { TransactionProvider } from "./context/TransactionProvider.jsx";
import { useAuth } from "./hooks/useAuth";

import Layout from "./layout/Layout";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Recurring from "./pages/Recurring";

const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center text-lg font-medium">
      Loading...
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait until auth check finishes
  if (loading) {
    return <LoadingScreen />;
  }

  // Redirect if not authenticated
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait until auth check finishes
  if (loading) {
    return <LoadingScreen />;
  }

  // Redirect authenticated users away from auth pages
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <TransactionProvider>
              <Layout />
            </TransactionProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/transactions" element={<Transactions />} />

        <Route path="/categories" element={<Categories />} />

        <Route path="/reports" element={<Reports />} />

        <Route path="/recurring" element={<Recurring />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
