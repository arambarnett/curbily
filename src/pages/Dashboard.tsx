import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { Project, Folder, PROJECT_TYPES } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, FileText, Clock, ChevronRight, Film, Link as LinkIcon, Upload, File, CheckCircle2, Loader2, MapPin, DollarSign, Globe, Folder as FolderIcon, MoreVertical, Trash2, ArrowLeft, CheckSquare, Sparkles, Activity, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import SystemVerification from '../components/project/SystemVerification';
import LocationAutocomplete from '../components/project/LocationAutocomplete';
import RatesManager from '../components/project/RatesManager';
import AdminDashboard from './AdminDashboard';
import { extractTextFromPDF, fetchGoogleDocText } from '../lib/documentUtils';
import { cn } from '../lib/utils';
import { getBudgetTier } from '../utils/projectUtils';
import { toast } from 'sonner';
import { seedSampleProject } from '../lib/projectService';
import { getDocs } from 'firebase/firestore';

import { scriptAgent } from '../lib/gemini';
import { ensureApiKey } from '../lib/apiKeyCheck';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({ 
    title: '', 
    description: '', 
    targetBudget: 0, 
    location: '',
    scriptUrl: '',
    scriptText: '',
    idea: '',
    contentType: 'feature' as Project['contentType'],
    storyboardUrl: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('paste');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'projects'), 
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const fq = query(collection(db, 'folders'), where('ownerId', '==', user.uid));
    const unsubFolders = onSnapshot(fq, (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder)));
    });

    const contactUnsubscribe = onSnapshot(doc(db, 'contacts', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfileContact(docSnap.data());
      }
    });

    return () => {
        unsubscribe();
        unsubFolders();
        contactUnsubscribe();
      };
  }, [user]);

  useEffect(() => {
    if (!user || projects.length === 0 && loading) return;

    const checkAndSeed = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('ownerId', '==', user.uid),
          where('isSample', '==', true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log('No sample project found, seeding...');
          await seedSampleProject(user.uid);
        }
      } catch (error) {
        console.error('Error checking/seeding sample project:', error);
      }
    };

    if (!loading) {
      checkAndSeed();
    }
  }, [user, loading]);

  const executeDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      if (user?.uid) {
         try {
           const userRef = doc(db, 'users', user.uid);
           const userSnap = await getDoc(userRef);
           if (userSnap.exists()) {
             const currentRuns = userSnap.data().projectsCreated || 0;
             if (currentRuns > 0) {
               await updateDoc(userRef, { projectsCreated: currentRuns - 1 });
             }
           }
         } catch (e) {
           console.warn("Failed to decrement projects", e);
         }
      }
      await deleteDoc(doc(db, 'projects', projectToDelete));
      setProjectToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectToDelete}`);
    }
  };

  const executeBulkDelete = async () => {
    try {
      if (user?.uid) {
         try {
           const userRef = doc(db, 'users', user.uid);
           const userSnap = await getDoc(userRef);
           if (userSnap.exists()) {
             const currentRuns = userSnap.data().projectsCreated || 0;
             const toDecrement = Math.min(currentRuns, selectedProjects.length);
             if (toDecrement > 0) {
               await updateDoc(userRef, { projectsCreated: currentRuns - toDecrement });
             }
           }
         } catch (e) {
           console.warn("Failed to decrement projects in bulk delete", e);
         }
      }
      await Promise.all(selectedProjects.map(id => deleteDoc(doc(db, 'projects', id))));
      setSelectedProjects([]);
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error bulk deleting projects:', error);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this folder? Projects inside will be moved to the root.')) {
      try {
        const projectsInFolder = projects.filter(p => p.folderId === folderId);
        await Promise.all(projectsInFolder.map(p => updateDoc(doc(db, 'projects', p.id), { folderId: null })));
        await deleteDoc(doc(db, 'folders', folderId));
        if (currentFolderId === folderId) setCurrentFolderId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `folders/${folderId}`);
      }
    }
  };

  const handleMoveToFolder = async (e: React.MouseEvent, projectId: string, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'projects', projectId), { folderId });
    } catch (error) {
      console.error('Failed to move project:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
      await addDoc(collection(db, 'folders'), {
        name: newFolderName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsFolderDialogOpen(false);
      setNewFolderName('');
    } catch (e) {
      console.error(e);
    }
  };

  const isFormValid = newProject.title.trim() !== '' && 
                      newProject.location.trim() !== '' && 
                      newProject.targetBudget > 0 && 
                      (newProject.scriptText.trim() !== '' || newProject.idea.trim() !== '');

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const handleGenerateScript = async () => {
    if (!newProject.idea.trim()) {
      alert("Please enter an idea first.");
      return;
    }
    await ensureApiKey();
    setIsGeneratingScript(true);
    try {
      const result = await scriptAgent(newProject.idea, newProject.contentType);
      
      setNewProject(prev => ({ 
        ...prev, 
        scriptText: result.script || result,
        title: prev.title || result.title || '',
        description: prev.description || result.description || '',
        targetBudget: prev.targetBudget || result.targetBudget || 0,
        location: prev.location || result.location || ''
      }));
      
      setUploadMethod('paste');
      toast.success("Script and project details generated successfully!");
    } catch (error: any) {
      console.error("Script generation failed. Full error context:", {
        error,
        message: error.message,
        stack: error.stack,
        idea: newProject.idea,
        contentType: newProject.contentType
      });
      
      let errorMessage = "Failed to generate script. Please try again.";
      if (error.message?.includes("Forbidden") || error.message?.includes("403")) {
        errorMessage = "Service access denied (403). This could be caused by model restrictions, region limits, or safety filters. Please try again later.";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleCreateProject = async () => {
    if (!user) return;
    
    // Check free limits
    const isAdmin = profile?.role === 'admin' || (user?.email && ['aram.barnett@gmail.com', 'jonanthonybarnett@gmail.com'].includes(user.email.toLowerCase()));
    const usedRuns = profile?.projectsCreated || 0;
    const freeLimit = profile?.freeProjectLimit || 3;
    const subscription = profile?.subscription || 'free';
    
    if (!isAdmin && subscription === 'free' && usedRuns >= freeLimit) {
      alert('You have reached your free project limit. Please visit settings to upgrade your plan.');
      navigate('/settings');
      return;
    }

    setHasAttemptedSubmit(true);

    if (!isFormValid) {
      alert('Please fill in all information, including the script, before creating the project.');
      return;
    }

    try {
      let folderId = currentFolderId;

      // If it's a micro-drama, create a dedicated folder for the season if not already in one
      if (newProject.contentType === 'micro_drama' && !folderId) {
        const folderRef = await addDoc(collection(db, 'folders'), {
          name: `${newProject.title} (Season)`,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
        folderId = folderRef.id;
      }

      const docRef = await addDoc(collection(db, 'projects'), {
        ...newProject,
        isMicroDrama: newProject.contentType === 'micro_drama',
        budgetTier: getBudgetTier(newProject.targetBudget, newProject.contentType),
        ownerId: user.uid,
        folderId: folderId || null,
        status: 'development',
        autoRunMaster: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Increment projectsCreated
      if (user.uid) {
         await updateDoc(doc(db, 'users', user.uid), {
           projectsCreated: usedRuns + 1
         });
      }

      setIsDialogOpen(false);
      setHasAttemptedSubmit(false);
      setNewProject({ 
        title: '', 
        description: '', 
        targetBudget: 0, 
        location: '', 
        scriptUrl: '', 
        scriptText: '',
        contentType: 'feature',
        storyboardUrl: ''
      });
      setFileName('');
      navigate(`/projects/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    setIsProcessing(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromPDF(file);
      setNewProject(prev => ({ ...prev, scriptText: text }));
    } catch (error: any) {
      console.error('PDF extraction failed:', error);
      alert(error.message || 'Failed to extract text from PDF. Please try another file or paste the text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleDocImport = async () => {
    if (!newProject.scriptUrl) return;
    
    setIsProcessing(true);
    try {
      const text = await fetchGoogleDocText(newProject.scriptUrl);
      setNewProject(prev => ({ ...prev, scriptText: text }));
      alert('Google Doc imported successfully!');
    } catch (error) {
      console.error('Google Doc import failed:', error);
      alert('Failed to import Google Doc. Ensure it is shared with "Anyone with the link".');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    setIsProcessing(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromPDF(file);
      setNewProject(prev => ({ ...prev, scriptText: text }));
    } catch (error: any) {
      console.error('PDF extraction failed:', error);
      alert(error.message || 'Failed to extract text from PDF. Please try another file or paste the text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const [isIdeaExpanded, setIsIdeaExpanded] = useState(false);

  // Mobile Redirect Component for Studio Mode
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="relative">
          <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center shadow-2xl rotate-3">
             <Monitor className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
             <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Studio is better on Desktop.
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            Our AI-powered creative suite requires a larger canvas for script analysis, budgeting, and shot listing.
          </p>
        </div>

        <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[32px] w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3 text-blue-900">
            <Globe className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Access Link</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-100 text-[10px] font-mono text-blue-600 break-all select-all">
            {window.location.origin}
          </div>
          <p className="text-[10px] text-blue-800 font-bold italic">Sign in on your workstation to unlock full creative control.</p>
        </div>

        <div className="pt-8 w-full max-w-sm space-y-3">
           <Button 
            className="w-full bg-[#0a0a0a] text-white hover:bg-slate-800 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
            onClick={() => navigate('/settings')}
           >
             Professional Profile
           </Button>
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
             Built for Creative Excellence
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end -mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest gap-2 h-8 px-3 rounded-full transition-all",
            showDiagnostics ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100"
          )}
        >
          <Activity className={cn("w-3.5 h-3.5", showDiagnostics && "animate-pulse")} />
          System Diagnostics
        </Button>
      </div>

      {showDiagnostics && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <SystemVerification />
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-[80px] font-black tracking-tighter text-black uppercase leading-[0.85]">
              {activeTab === 'projects' ? 'Production' : activeTab === 'profile' ? 'Professional' : activeTab === 'rates' ? 'Global' : 'System'} <br />
              <span className="text-slate-200">{activeTab === 'projects' ? 'Studio' : activeTab === 'profile' ? 'Profile' : activeTab === 'rates' ? 'Rates' : 'Admin'}</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] max-w-md">
              {activeTab === 'projects' 
                ? 'Manage your active vertical series and AI workflows.' 
                : 'Identity and network credentials.'}
            </p>
          </div>
          
          <TabsList className="bg-white p-1 rounded-[2rem] border-4 border-black flex w-full md:w-auto h-auto overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <TabsTrigger value="projects" className="rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] px-6 py-3 data-[state=active]:bg-black data-[state=active]:text-white transition-all">Studio</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] px-6 py-3 data-[state=active]:bg-black data-[state=active]:text-white transition-all">Profile</TabsTrigger>
            {(user?.email?.toLowerCase() === 'jonanthonybarnett@gmail.com' || user?.email?.toLowerCase() === 'aram.barnett@gmail.com' || profile?.role === 'admin') && (
              <>
                <TabsTrigger value="rates" className="rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] px-6 py-3 data-[state=active]:bg-black data-[state=active]:text-white transition-all">Rates</TabsTrigger>
                <TabsTrigger value="admin" className="rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] px-6 py-3 data-[state=active]:bg-black data-[state=active]:text-white transition-all">Admin</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="rates" className="space-y-6 outline-none">
          <RatesManager />
        </TabsContent>

        <TabsContent value="admin" className="space-y-6 outline-none">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border shadow-none rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-24 h-24 rounded-3xl bg-white border shadow-sm overflow-hidden flex items-center justify-center">
                    {profileContact?.headshotUrl ? (
                      <img src={profileContact.headshotUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-3xl font-black text-slate-200 uppercase">
                        {user?.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">{user?.displayName}</CardTitle>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {profileContact?.roles?.map((r: string) => (
                        <span key={r} className="text-[9px] font-bold text-slate-400 border px-2 py-0.5 rounded-full uppercase tracking-tighter">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Base Location</p>
                  <p className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profileContact?.location || 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Day Rate</p>
                  <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    ${profileContact?.rate || 0}/day
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-10 font-bold uppercase tracking-widest text-[9px] mt-4 rounded-xl"
                  onClick={() => navigate('/edit-profile')}
                >
                  Edit Professional Profile
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border shadow-none rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
                  <FileText className="w-4 h-4" /> Professional Bio 
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Biography</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed italic border border-slate-100">
                    {profileContact?.bio || "No professional biography added yet. Update your profile to help crew and talent identify your production style and experience."}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {profileContact?.productionCompany && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Entity</p>
                      <p className="text-sm font-bold text-slate-700">{profileContact.productionCompany}</p>
                    </div>
                  )}
                  {profileContact?.yearsExperience && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Experience</p>
                      <p className="text-sm font-bold text-slate-700">{profileContact.yearsExperience} Years</p>
                    </div>
                  )}
                </div>

                {profileContact?.specialties?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {profileContact.specialties.map((s: string) => (
                        <span key={s} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-12 mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 py-8 border-b-2 border-slate-100">
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black flex items-center gap-3">
                 <Film className="w-6 h-6 text-slate-300" /> Active Roster
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Select a project to enter its production hub.</p>
            </div>
            
            <div className="flex gap-3 items-center">
              <Button variant="outline" onClick={() => setIsFolderDialogOpen(true)} className="flex-1 sm:flex-none gap-2 rounded-2xl h-12 text-[10px] uppercase font-black tracking-widest border-[3px] border-black hover:bg-slate-50 transition-all">
                <FolderIcon className="w-4 h-4" /> Folders
              </Button>
              
              <Dialog 
                open={isDialogOpen} 
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setHasAttemptedSubmit(false);
                }}
              >
                <DialogTrigger render={<Button className="flex-1 sm:flex-none gap-2 rounded-2xl h-12 bg-black text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]" />}>
                  <Plus className="w-4 h-4" />
                  New Project
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Start a new production. You can upload your script later.
                    </DialogDescription>
                  </DialogHeader>
            <div className="py-4 flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Core Settings */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project Title</label>
                      <Input 
                        className={hasAttemptedSubmit && !newProject.title.trim() ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : ""}
                        placeholder="e.g. Summer Commercial 2024" 
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content Type</label>
                      <select 
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={newProject.contentType}
                        onChange={(e) => setNewProject({ ...newProject, contentType: e.target.value as any })}
                      >
                        {PROJECT_TYPES.map(type => (
                          <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Budget ($)</label>
                    <div className="flex gap-2 w-full">
                      <Input 
                        type="text"
                        className={cn(
                          "flex-1",
                          hasAttemptedSubmit && newProject.targetBudget <= 0 ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : ""
                        )}
                        placeholder="e.g. 5000" 
                        value={newProject.targetBudget || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setNewProject({ ...newProject, targetBudget: val === '' ? 0 : Number(val) });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Base Location</label>
                    <div className={cn("rounded-md transition-colors relative z-[60]", hasAttemptedSubmit && !newProject.location.trim() ? "border border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]" : "")}>
                      <LocationAutocomplete
                        value={newProject.location}
                        onChange={(val) => setNewProject({ ...newProject, location: val })}
                        onSelect={(res) => setNewProject({ ...newProject, location: res.display_name.split(',')[0] })}
                        placeholder="e.g. Los Angeles, CA"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setIsIdeaExpanded(!isIdeaExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="space-y-0.5">
                        <label className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          Draft from Idea
                        </label>
                        <p className="text-[10px] text-slate-500 italic">No script? We can generate one from your concept.</p>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", isIdeaExpanded && "rotate-90")} />
                    </button>
                    
                    {isIdeaExpanded && (
                      <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Textarea 
                          placeholder="What is your movie about? Describe the core plot, characters, or mood..."
                          value={newProject.idea}
                          onChange={(e) => setNewProject({ ...newProject, idea: e.target.value })}
                          className="min-h-[120px] bg-slate-50/50"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full gap-2 text-blue-600 border-blue-200 bg-blue-50/30 hover:bg-blue-50 h-10 font-bold uppercase tracking-widest text-[9px]"
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript || !newProject.idea.trim()}
                        >
                          {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isGeneratingScript ? 'Writing Script...' : 'Generate Project from Idea'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Files & Assets */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Storyboard / Lookbook (Optional PDF)</label>
                    <div 
                      className={cn(
                        "border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer text-xs",
                        "border-slate-200 hover:border-slate-400"
                      )}
                      onClick={() => document.getElementById('storyboard-upload')?.click()}
                    >
                      <input 
                        id="storyboard-upload"
                        type="file" 
                        accept=".pdf" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            alert('Storyboard uploaded! Our agents will analyze it for location cues.');
                            setNewProject(prev => ({ ...prev, storyboardUrl: 'mock-url' }));
                          }
                        }}
                      />
                      <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <p className="font-medium">{newProject.storyboardUrl ? 'Storyboard Uploaded' : 'Upload Storyboard PDF'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Production Script</label>
                    <Tabs value={uploadMethod} onValueChange={setUploadMethod} className={cn("w-full rounded-xl transition-colors", hasAttemptedSubmit && !newProject.scriptText.trim() ? "border border-red-500 bg-red-50/50 p-2" : "")}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="paste" className="gap-2">
                          <FileText className="w-3 h-3" /> Paste
                        </TabsTrigger>
                        <TabsTrigger value="link" className="gap-2">
                          <LinkIcon className="w-3 h-3" /> G-Doc
                        </TabsTrigger>
                        <TabsTrigger value="file" className="gap-2">
                          <Upload className="w-3 h-3" /> PDF
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="paste" className="mt-4">
                        <Textarea 
                          placeholder="Paste script content here..." 
                          className={cn("min-h-[150px] font-mono text-xs", hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'paste' ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : "")}
                          value={newProject.scriptText}
                          onChange={(e) => setNewProject({ ...newProject, scriptText: e.target.value })}
                        />
                      </TabsContent>
                      <TabsContent value="link" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input 
                              placeholder="https://docs.google.com/document/d/..." 
                              className={hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'link' ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : ""}
                              value={newProject.scriptUrl}
                              onChange={(e) => setNewProject({ ...newProject, scriptUrl: e.target.value })}
                            />
                            <Button 
                              variant="secondary" 
                              onClick={handleGoogleDocImport}
                              disabled={isProcessing || !newProject.scriptUrl}
                              className={hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'link' ? "bg-red-100 text-red-700 hover:bg-red-200" : ""}
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-500 italic">
                            Note: Ensure the document is shared with "Anyone with the link".
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="file" className="mt-4">
                        <div 
                          className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative",
                            isProcessing ? "border-blue-400 bg-blue-50/10" : "border-slate-200 hover:border-slate-400",
                            hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'file' ? "border-red-500 bg-red-50" : ""
                          )}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                        >
                          <input 
                            id="pdf-upload"
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={handleFileUpload}
                          />
                          {isProcessing ? (
                            <div className="space-y-2">
                              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                              <p className="text-sm font-medium">Extracting script text...</p>
                            </div>
                          ) : fileName ? (
                            <div className="space-y-2">
                              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm font-medium">{fileName}</p>
                              <p className="text-xs text-slate-400">Click to change file</p>
                            </div>
                          ) : (
                            <>
                              <File className={cn("w-8 h-8 mx-auto mb-2", hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'file' ? "text-red-400" : "text-slate-400")} />
                              <p className={cn("text-sm font-medium", hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'file' ? "text-red-700" : "")}>Drop PDF script here</p>
                              <p className={cn("text-xs mt-1", hasAttemptedSubmit && !newProject.scriptText.trim() && uploadMethod === 'file' ? "text-red-500/70" : "text-slate-400")}>or click to browse files</p>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject} disabled={isProcessing}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {currentFolderId && (
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="sm" onClick={() => setCurrentFolderId(null)} className="text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to all projects
              </Button>
              <span className="text-sm font-medium text-slate-700">
                / {folders.find(f => f.id === currentFolderId)?.name}
              </span>
            </div>
          )}

          {selectedProjects.length > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-xl mb-6 flex items-center justify-between sticky top-4 z-20 shadow-lg">
              <div className="flex items-center gap-4">
                <span className="bg-slate-800 text-slate-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {selectedProjects.length}
                </span>
                <span className="font-medium">Projects Selected</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setSelectedProjects([])}>Cancel</Button>
                <Button variant="destructive" className="bg-red-500 hover:bg-red-400 text-white border-0" onClick={() => setBulkDeleteConfirmOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {projects.length === 0 && folders.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Film className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
                <p className="text-slate-500 max-w-xs mb-6">Create your first project to start breaking down scripts and building schedules.</p>
                <div className="flex gap-4 items-center">
                  <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Create project</Button>
                  <Button variant="outline" onClick={() => setIsFolderDialogOpen(true)} className="gap-2">
                    <FolderIcon className="w-4 h-4" /> New Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!currentFolderId && folders.map((folder) => (
                <Card 
                  key={folder.id} 
                  className="hover:border-slate-400 transition-all cursor-pointer group h-full bg-slate-50/50 relative"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <FolderIcon className="w-6 h-6 fill-blue-600/20" />
                        </div>
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">{folder.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()} />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600" onClick={(e) => handleDeleteFolder(e, folder.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 font-medium">
                      {projects.filter(p => p.folderId === folder.id).length} Projects
                    </p>
                  </CardContent>
                </Card>
              ))}

              {projects.filter(p => currentFolderId ? p.folderId === currentFolderId : !p.folderId).map((project: any) => (
                <Card 
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className={cn(
                    "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group h-full relative overflow-hidden border-slate-200 bg-white",
                    project.isExecuting ? "ring-2 ring-blue-500" : ""
                  )}>
                  {project.isExecuting && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className={cn(
                        "uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border-2 rounded-lg",
                        project.status === 'completed' ? "bg-green-50 text-green-700 border-green-100" :
                        project.status === 'development' ? "bg-slate-50 text-slate-700 border-slate-100" :
                        "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {project.isExecuting ? 'Agent Active' : project.status}
                      </Badge>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects([...selectedProjects, project.id]);
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                            }
                          }}
                          className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity", 
                            selectedProjects.includes(project.id) && "opacity-100"
                          )} 
                        />
                      </div>
                    </div>
                    
                    <CardTitle className="text-xl font-display font-black tracking-tight group-hover:text-blue-600 transition-colors">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs font-medium text-slate-500 leading-relaxed min-h-[32px]">
                      {project.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Budget</p>
                        <p className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                          {(project as any).estimatedBudget ? (project as any).estimatedBudget.toLocaleString() : project.targetBudget ? project.targetBudget.toLocaleString() : 'TBD'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Format</p>
                        <p className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                          <Film className="w-3 h-3 text-slate-400" />
                          {project.contentType?.replace('_', ' ') || 'Feature'}
                        </p>
                      </div>
                    </div>

                    {project.agentStatuses?.breakdown?.status === 'completed' && !project.agentStatuses.breakdown.isApproved && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-tight leading-none">Extraction Ready</span>
                        </div>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-white border border-amber-200 hover:bg-amber-100 text-amber-700"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await updateDoc(doc(db, 'projects', project.id), {
                                'agentStatuses.breakdown.isApproved': true
                              });
                              toast.success("Extraction approved for " + project.title);
                            } catch (err) {
                              console.error("Failed to approve project:", err);
                            }
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 w-full pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Clock className="w-3 h-3" />
                          <span>Last Activity {project.updatedAt ? new Date(project.updatedAt?.seconds ? project.updatedAt.seconds * 1000 : project.updatedAt).toLocaleDateString() : 'recently'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Show empty state specifically for a folder if it has no projects */}
              {currentFolderId && projects.filter(p => p.folderId === currentFolderId).length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <FolderIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>This folder is empty.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </TabsContent>
    </Tabs>

      {/* New Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Organize your projects into seasons, episodes, or custom categories.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Season 1, Shorts, Under Review" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" onClick={executeDeleteProject}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Projects Dialog */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedProjects.length} Projects</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProjects.length} projects? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white" onClick={executeBulkDelete}>Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
