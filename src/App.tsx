import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocalizedDom } from './components/LocalizedDom';
import { ThemeProvider } from './context/ThemeContext';
import './i18n';

const Auth = lazy(() => import('./pages/Auth').then((module) => ({ default: module.Auth })));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard').then((module) => ({ default: module.BusinessDashboard })));
const BusinessHome = lazy(() => import('./pages/BusinessHome').then((module) => ({ default: module.BusinessHome })));
const BusinessLanding = lazy(() => import('./pages/BusinessLanding').then((module) => ({ default: module.BusinessLanding })));
const BusinessVehicleDetails = lazy(() => import('./pages/BusinessVehicleDetails').then((module) => ({ default: module.BusinessVehicleDetails })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Landing = lazy(() => import('./pages/Landing').then((module) => ({ default: module.Landing })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then((module) => ({ default: module.ProfileSettings })));
const VehicleDetails = lazy(() => import('./pages/VehicleDetails').then((module) => ({ default: module.VehicleDetails })));

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

// Protected Route Component
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <>{children}</> : <Navigate to="/auth" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <LocalizedDom />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/business-fleet" element={<BusinessLanding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/cookies" element={<LegalPage type="cookies" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />
              <Route
                path="/app"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/app" replace />} />
              <Route
                path="/business"
                element={
                  <PrivateRoute>
                    <BusinessHome />
                  </PrivateRoute>
                }
              />
              <Route
                path="/business/:orgId"
                element={
                  <PrivateRoute>
                    <BusinessDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/business/:orgId/vehicle/:id"
                element={
                  <PrivateRoute>
                    <BusinessVehicleDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <CalendarPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <ProfileSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vehicle/:id"
                element={
                  <PrivateRoute>
                    <VehicleDetails />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

