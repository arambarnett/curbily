import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import Layout from './components/Layout';

import { Toaster } from 'sonner';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CrewHome = React.lazy(() => import('./pages/TalentHome'));
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'));
const Network = React.lazy(() => import('./pages/Network'));
const Login = React.lazy(() => import('./pages/Login'));
const Landing = React.lazy(() => import('./pages/Landing'));
const Join = React.lazy(() => import('./pages/Join'));
const StudioJoin = React.lazy(() => import('./pages/StudioJoin'));
const EditProfile = React.lazy(() => import('./pages/EditProfile'));
const NetworkInfo = React.lazy(() => import('./pages/NetworkInfo'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const InvestmentMemo = React.lazy(() => import('./pages/InvestmentMemo'));
const TargetOutreach = React.lazy(() => import('./pages/TargetOutreach'));
const CallSheets = React.lazy(() => import('./pages/CallSheets'));
const ProductionCalendar = React.lazy(() => import('./pages/ProductionCalendar'));
const Bookings = React.lazy(() => import('./pages/Bookings'));
const Payments = React.lazy(() => import('./pages/Payments'));
const JobInvites = React.lazy(() => import('./pages/JobInvites'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Settings = React.lazy(() => import('./pages/Settings'));
const InfluencerMarketplace = React.lazy(() => import('./pages/InfluencerMarketplace'));
const MarketplaceDashboard = React.lazy(() => import('./pages/MarketplaceDashboard'));
const Brands = React.lazy(() => import('./pages/Brands'));
const Managers = React.lazy(() => import('./pages/Managers'));

function PageLoader() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [initialCheckComplete, setInitialCheckComplete] = React.useState(false);

  React.useEffect(() => {
    // Add a small delay for mobile auth stabilization
    const timer = setTimeout(() => {
      setInitialCheckComplete(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  if (loading || (!initialCheckComplete && !user)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Securing Session...</p>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/landing" />;
  
  // If user is logged in but not onboarded, redirect to appropriate onboarding
  if (profile && !profile.onboarded && !['/join', '/studio-join'].includes(location.pathname)) {
    if (profile.viewMode === 'producer') {
      return <Navigate to="/studio-join" />;
    }
    return <Navigate to="/join" />;
  }
  
  return <>{children}</>;
}

function Home() {
  const { profile } = useAuth();
  return profile?.viewMode === 'talent' ? <CrewHome /> : <Dashboard />;
}

function NavigateToProjects() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}`} replace />;
}

function NavigateToProjectsAgent() {
  const { id, agent } = useParams();
  return <Navigate to={`/projects/${id}/${agent}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" expand={true} richColors />
      <Router>
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/network-info" element={<NetworkInfo />} />
            <Route path="/join" element={<Join />} />
            <Route path="/studio-join" element={<StudioJoin />} />
            <Route path="/edit-profile" element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/targets" element={<TargetOutreach />} />
            <Route path="/investment" element={<InvestmentMemo />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/influencer-marketplace" element={<InfluencerMarketplace />} />
            <Route path="/influencer-marketplace/dashboard" element={<MarketplaceDashboard />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/managers" element={<Managers />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={<Navigate to="/" replace />} />
            <Route path="/project/:id" element={<NavigateToProjects />} />
            <Route path="/project/:id/:agent" element={<NavigateToProjectsAgent />} />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id/:agent" element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/network" element={
              <ProtectedRoute>
                <Layout>
                  <Network />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/call-sheets" element={
              <ProtectedRoute>
                <Layout>
                  <CallSheets />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Layout>
                  <ProductionCalendar />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute>
                <Layout>
                  <Bookings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/payments" element={
              <ProtectedRoute>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/invites" element={
              <ProtectedRoute>
                <Layout>
                  <JobInvites />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </React.Suspense>
      </Router>
    </AuthProvider>
  );
}
