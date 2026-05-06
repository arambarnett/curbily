import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Film, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  FileText,
  DollarSign,
  Calendar,
  Package,
  Send,
  Link as LinkIcon,
  Search,
  Utensils,
  Plane,
  Camera,
  MapPin,
  MessageSquare,
  User,
  Briefcase,
  RefreshCw,
  FileCheck,
  Menu,
  X,
  Monitor,
  BarChart2,
  CreditCard,
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  XCircle, 
  ChevronLeft,
  Sparkles,
  Home,
  Bell,
  Mail,
  ShoppingCart,
  ThumbsUp,
  Shield,
  Lock,
  Download
} from 'lucide-react';
import { useAuth } from '../lib/AuthProvider';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, AppNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import VoiceAssistant from './project/VoiceAssistant';
import { cn } from '../lib/utils';
import FeedbackDialog from './FeedbackDialog';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, user, switchViewMode } = useAuth();
  const { id: currentParamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [agentStatuses, setAgentStatuses] = useState<Record<string, Record<string, 'idle' | 'running' | 'completed' | 'stuck' | 'failed'>>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showDesktopAlert, setShowDesktopAlert] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const isTalentView = profile?.viewMode === 'talent';

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribes: Record<string, () => void> = {};

    const unsubscribeProjects = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(fetchedProjects);
      
    // Setup unread count listeners for each project
    fetchedProjects.forEach(project => {
      if (!unsubscribes[project.id]) {
        // Notifications listener for unread count
        const unreadQ = query(
          collection(db, `projects/${project.id}/notifications`),
          where('isRead', '==', false)
        );
        unsubscribes[project.id] = onSnapshot(unreadQ, (unreadSnapshot) => {
          setUnreadCounts(prev => ({
            ...prev,
            [project.id]: unreadSnapshot.size
          }));
        }, (error) => { console.error(error) });
      }
    });

      // Cleanup listeners for projects that are no longer in the list
      const projectIds = new Set(fetchedProjects.map(p => p.id));
      Object.keys(unsubscribes).forEach(id => {
        if (!projectIds.has(id)) {
          unsubscribes[id]();
          delete unsubscribes[id];
          setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      });
    }, (error) => { console.error(error); });

    return () => {
        unsubscribeProjects();
        Object.values(unsubscribes).forEach(un => un());
      };
  }, [user]);

  // Listen to notifications for expanded projects to track agent status
  const agentTrackingUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!user) return;

    const expandedIds = Object.keys(expandedProjects).filter(id => expandedProjects[id]);
    const currentExpandedIds = currentParamId ? Array.from(new Set([...expandedIds, currentParamId])) : expandedIds;
    const unsubs = agentTrackingUnsubs.current;

    // Set up new listeners
    currentExpandedIds.forEach(projectId => {
      if (!unsubs[projectId]) {
        const q = query(
          collection(db, `projects/${projectId}/notifications`),
          orderBy('createdAt', 'desc'),
          limit(21)
        );

        unsubs[projectId] = onSnapshot(q, (snapshot) => {
          const notifications = snapshot.docs.map(doc => doc.data() as AppNotification);
          const statuses: Record<string, 'idle' | 'running' | 'completed' | 'stuck' | 'failed'> = {};

          notifications.forEach(n => {
            const title = n.title.toLowerCase();
            let agentId = '';
            if (title.includes('breakdown')) agentId = 'breakdown';
            else if (title.includes('budget')) agentId = 'budget';
            else if (title.includes('schedule')) agentId = 'schedule';
            else if (title.includes('sourcing')) agentId = 'sourcing';
            else if (title.includes('outreach')) agentId = 'outreach';
            else if (title.includes('shot list')) agentId = 'shotlist';
            else if (title.includes('integrations')) agentId = 'integrations';

            if (agentId && !statuses[agentId]) {
              if (title.includes('completed') || title.includes('generated')) statuses[agentId] = 'completed';
              else if (title.includes('running') || title.includes('analyzing') || title.includes('sourcing') || title.includes('calculating')) statuses[agentId] = 'running';
              else if (title.includes('stuck')) statuses[agentId] = 'stuck';
              else if (title.includes('failed') || title.includes('error')) statuses[agentId] = 'failed';
            }
          });

          setAgentStatuses(prev => ({
            ...prev,
            [projectId]: statuses
          }));
        }, (error) => { console.error(error); });
      }
    });

    // Cleanup listeners for projects that are no longer expanded
    Object.keys(unsubs).forEach(projectId => {
      if (!expandedProjects[projectId]) {
        unsubs[projectId]();
        delete unsubs[projectId];
      }
    });

    // We do NOT return a cleanup here that tears down everything on every render.
    // We only tear everything down when the component unmounts.
  }, [user, expandedProjects, currentParamId]);

  useEffect(() => {
    return () => {
      // Final unmount cleanup
      Object.values(agentTrackingUnsubs.current).forEach((un: any) => {
        if (typeof un === 'function') un();
      });
      agentTrackingUnsubs.current = {};
    };
  }, []);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'running': return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'stuck': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'failed': return <XCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 font-bold';
      case 'completed': return 'text-green-600';
      case 'stuck': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return '';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchView = async (mode: 'producer' | 'talent') => {
    await switchViewMode(mode);
    navigate('/');
    setIsSidebarOpen(false);
  };

  const currentProject = projects.find(p => p.id === currentParamId);
  const isCreatorMode = currentProject?.contentType === 'new_media' || currentProject?.budgetTier === 'Non-Union Skeleton Crew' || currentProject?.budgetTier === 'New Media';

  const agents = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'locations', name: 'Locations', icon: MapPin },
    { id: 'permits', name: 'Permits', icon: FileCheck },
    { id: 'breakdown', name: 'Breakdown', icon: FileText },
    { id: 'shotlist', name: 'Shot List', icon: Camera },
    { id: 'sourcing', name: 'Sourcing', icon: Package },
    { id: 'budget', name: 'Budget', icon: DollarSign },
    { id: 'schedule', name: 'Schedule', icon: Calendar },
    ...(!isCreatorMode ? [{ id: 'dood', name: 'Day Out of Days', icon: BarChart2 }] : []),
    { id: 'outreach', name: 'Outreach', icon: MessageSquare },
    { id: 'callsheets', name: 'Call Sheets', icon: FileText },
    { id: 'production', name: 'Production Calendar', icon: Film },
    { id: 'integrations', name: 'Integrations', icon: LinkIcon },
    { id: 'export', name: 'Studio Export', icon: Download },
  ];

  return (
    <div className={cn("flex bg-white font-sans overflow-hidden relative print:block print:h-auto h-screen")}>
      {/* Sidebar Toggle Button (Desktop) */}
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={cn(
          "hidden lg:flex fixed top-4 z-[70] bg-white border border-slate-200 rounded-full w-8 h-8 items-center justify-center shadow-sm hover:bg-slate-50 transition-all print:hidden",
          isSidebarCollapsed ? "left-4" : "left-[272px]"
        )}
      >
        {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
            {isTalentView ? <User className="w-4 h-4 text-white" /> : <Briefcase className="w-4 h-4 text-white" />}
          </div>
          <span className="font-bold text-base tracking-tight">
            {isTalentView ? 'Crew Hub' : 'Studio Hub'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500" onClick={() => navigate('/settings')}>
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-[60] flex flex-col lg:hidden border-r border-slate-200"
            >
              <SidebarContent 
                isTalentView={isTalentView} 
                switchViewMode={switchViewMode} 
                projects={projects} 
                expandedProjects={expandedProjects}
                toggleProject={toggleProject}
                unreadCounts={unreadCounts}
                location={location}
                agents={agents}
                agentStatuses={agentStatuses}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                profile={profile}
                handleLogout={handleLogout}
                handleSwitchView={handleSwitchView}
                navigate={navigate}
                isFeedbackOpen={isFeedbackOpen}
                setIsFeedbackOpen={setIsFeedbackOpen}
              />
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-white border-r border-slate-200 flex-col shrink-0 transition-all duration-300 print:hidden",
        isSidebarCollapsed ? "w-0 overflow-hidden border-none" : "w-72"
      )}>
        <SidebarContent 
          isTalentView={isTalentView} 
          switchViewMode={switchViewMode} 
          projects={projects} 
          expandedProjects={expandedProjects}
          toggleProject={toggleProject}
          unreadCounts={unreadCounts}
          location={location}
          agents={agents}
          agentStatuses={agentStatuses}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
          profile={profile}
          handleLogout={handleLogout}
          handleSwitchView={handleSwitchView}
          navigate={navigate}
          isFeedbackOpen={isFeedbackOpen}
          setIsFeedbackOpen={setIsFeedbackOpen}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-16 lg:pb-0 print:overflow-visible print:pt-0 print:p-0">
        {showDesktopAlert && !isTalentView && (
          <div className="lg:hidden bg-blue-50 border-b border-blue-100 p-3 flex items-start gap-3">
            <Monitor className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                <span className="font-bold">Pro Tip:</span> Switch to desktop for full creative controls.
              </p>
            </div>
            <button onClick={() => setShowDesktopAlert(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {!isTalentView ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 print:hidden pb-safe">
          <Link 
            to="/" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Studio</span>
          </Link>
          <button 
            onClick={() => handleSwitchView('talent')}
            className="flex flex-col items-center justify-center gap-1 w-20 h-full text-blue-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">To Crew</span>
          </button>
          <Link 
            to="/settings" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/settings' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
          </Link>
        </div>
      ) : (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 print:hidden pb-safe">
          <Link 
            to="/" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Hub</span>
          </Link>
          <Link 
            to="/invites" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/invites' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <Mail className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Inquiries</span>
          </Link>
          <Link 
            to="/bookings" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/bookings' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Bookings</span>
          </Link>
          <Link 
            to="/settings" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              location.pathname === '/settings' ? "text-slate-900" : "text-slate-400"
            )}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ 
  isTalentView, 
  switchViewMode, 
  projects, 
  expandedProjects, 
  toggleProject, 
  unreadCounts, 
  location, 
  agents, 
  agentStatuses, 
  getStatusIcon, 
  getStatusColor, 
  profile, 
  handleLogout,
  handleSwitchView,
  navigate,
  isFeedbackOpen,
  setIsFeedbackOpen
}: any) {
  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              {isTalentView ? <User className="w-6 h-6 text-white" /> : <Briefcase className="w-6 h-6 text-white" />}
            </div>
            <span className="font-black text-xl tracking-tighter uppercase leading-none">
              {isTalentView ? 'Crew Hub' : 'Studio Hub'}
            </span>
          </div>
          {!isTalentView && navigate && (
            <Button variant="ghost" size="icon" className="h-10 w-10 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all" onClick={() => navigate('/')}>
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>

        <Button 
          className="w-full justify-between gap-2 border-[3px] border-black h-12 text-[11px] uppercase font-black tracking-widest rounded-2xl bg-white text-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mb-4"
          onClick={() => handleSwitchView(isTalentView ? 'producer' : 'talent')}
        >
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Switch to {isTalentView ? 'Studio' : 'Crew'}
          </span>
        </Button>
      </div>
      
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto pb-8 custom-scrollbar">
        <div className="space-y-1">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black uppercase tracking-tighter text-xs",
              location.pathname === '/' 
                ? 'bg-black text-white' 
                : 'text-slate-500 hover:text-black hover:bg-slate-50'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            {isTalentView ? 'Home' : 'Dashboard'}
          </Link>
          <Link
            to="/network"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black uppercase tracking-tighter text-xs",
              location.pathname === '/network' 
                ? 'bg-black text-white' 
                : 'text-slate-500 hover:text-black hover:bg-slate-50'
            )}
          >
            <Users className="w-4 h-4" />
            Talent Net
          </Link>
        </div>

        {!isTalentView ? (
          <div className="space-y-3">
            <div className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Projects</div>
            <div className="space-y-2">
              {projects.length === 0 ? (
                <div className="px-4 py-2 text-[10px] text-slate-400 italic">No active series</div>
              ) : (
                projects.map((project: any) => {
                  const isAnyAgentRunning = Object.values(agentStatuses[project.id] || {}).includes('running');
                  const isExpanded = expandedProjects[project.id];
                  return (
                    <div key={project.id} className="space-y-1">
                      <button
                        onClick={() => toggleProject(project.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-3 rounded-2xl transition-all text-xs font-black uppercase tracking-tighter",
                          location.pathname.includes(project.id)
                            ? 'text-black border-2 border-black'
                            : isAnyAgentRunning
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-slate-500 hover:text-black hover:bg-slate-50'
                        )}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate flex-1 text-left">{project.title}</span>
                        {isAnyAgentRunning && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                        {unreadCounts[project.id] > 0 && !isAnyAgentRunning && (
                          <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCounts[project.id]}
                          </span>
                        )}
                      </button>

                    {isExpanded && (
                      <div className="ml-6 space-y-1 border-l-2 border-slate-100 pl-3 py-1">
                        {agents.map((agent: any) => {
                          const Icon = agent.icon;
                          const path = `/projects/${project.id}/${agent.id}`;
                          const isActive = location.pathname === path;
                          const status = agentStatuses[project.id]?.[agent.id];
                          return (
                            <Link
                              key={agent.id}
                              to={path}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isActive
                                  ? 'bg-black text-white'
                                  : 'text-slate-500 hover:text-black hover:bg-slate-50'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="w-3 h-3" />
                                <span className={isActive ? '' : getStatusColor(status)}>{agent.name}</span>
                              </div>
                              {getStatusIcon(status)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">My Productions</div>
            <div className="space-y-1">
              <Link
                to="/call-sheets"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black uppercase tracking-tighter text-xs",
                  location.pathname === '/call-sheets'
                    ? 'bg-black text-white'
                    : 'text-slate-500 hover:text-black hover:bg-slate-50'
                )}
              >
                <FileText className="w-4 h-4" />
                Call Sheets
              </Link>
              <Link
                to="/calendar"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black uppercase tracking-tighter text-xs",
                  location.pathname === '/calendar'
                    ? 'bg-black text-white'
                    : 'text-slate-500 hover:text-black hover:bg-slate-50'
                )}
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </Link>
              <Link
                to="/bookings"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black uppercase tracking-tighter text-xs",
                  location.pathname === '/bookings'
                    ? 'bg-black text-white'
                    : 'text-slate-500 hover:text-black hover:bg-slate-50'
                )}
              >
                <Briefcase className="w-4 h-4" />
                Bookings
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t-2 border-slate-100 mt-auto bg-slate-50/50">
        <div className="flex items-center gap-3 px-3 py-3 mb-4">
          <Avatar className="w-10 h-10 border-2 border-black rounded-xl">
            <AvatarImage src={profile?.photoURL} />
            <AvatarFallback className="font-black text-xs">{profile?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-tighter text-black truncate leading-none">{profile?.displayName}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{isTalentView ? 'Crew' : 'Producer'}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 h-10 font-black uppercase tracking-widest text-[9px] text-slate-500 hover:text-black hover:bg-white rounded-xl"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4" />
            Billing & Settings
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 h-10 font-black uppercase tracking-widest text-[9px] text-slate-500 hover:text-black hover:bg-white rounded-xl"
            onClick={() => setIsFeedbackOpen(true)}
          >
            <MessageSquare className="w-4 h-4" />
            Support
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 h-10 font-black uppercase tracking-widest text-[9px] text-red-500 hover:bg-red-50 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="mt-6 flex gap-4 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
        </div>
      </div>
      <FeedbackDialog isOpen={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </>
  );
}
