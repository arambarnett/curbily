import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import Dashboard from './pages/Dashboard';
import CrewHome from './pages/TalentHome';
import ProjectDetail from './pages/ProjectDetail';
import Network from './pages/Network';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Join from './pages/Join';
import StudioJoin from './pages/StudioJoin';
import EditProfile from './pages/EditProfile';
import NetworkInfo from './pages/NetworkInfo';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import InvestmentMemo from './pages/InvestmentMemo';
import TargetOutreach from './pages/TargetOutreach';
import CallSheets from './pages/CallSheets';
import ProductionCalendar from './pages/ProductionCalendar';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import JobInvites from './pages/JobInvites';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import Layout from './components/Layout';

import { Toaster } from 'sonner';

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
      </Router>
    </AuthProvider>
  );
}
