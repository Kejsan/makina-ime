import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocalizedDom } from './components/LocalizedDom';
import { ThemeProvider } from './context/ThemeContext';
import { Seo } from './lib/seo';
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

const NotFound = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Seo
      title="Page not found | Makina Ime"
      description="This Makina Ime page could not be found. Return to the personal vehicle garage or business fleet landing page."
      path="/404"
      robots="noindex,follow"
    />
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <p className="mi-label mb-3 text-primary">404</p>
      <h1 className="text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        This address does not match a public page or an app workspace route.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">
          Personal garage
        </Link>
        <Link to="/business-fleet" className="inline-flex h-11 items-center rounded-xl border border-input px-5 text-sm font-bold">
          Business fleet
        </Link>
      </div>
    </main>
  </div>
);

const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, hash]);

  return null;
};

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
          <ScrollToTop />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

