import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, addDoc, writeBatch, getDocs, query, limit, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Project, Scene, ScheduleDay, BudgetItem } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, Calendar, DollarSign, Users, Sparkles, ArrowLeft, Upload, Camera, MapPin, Mail, Link as LinkIcon, MessageSquare, ChevronRight, ChevronLeft, LayoutDashboard, Truck, CreditCard, Briefcase, Settings, PlayCircle, Edit3, ShoppingBag, Send, CheckCircle2, Loader2, File, StopCircle, RefreshCw, Printer, AlertTriangle, Pause, X, Clock, Check, Star, Film } from 'lucide-react';
import LocationManager from '../components/project/LocationManager';
import Breakdown from '../components/project/Breakdown';
import Schedule from '../components/project/Schedule';
import DayOutOfDays from '../components/project/DayOutOfDays';
import Budget from '../components/project/Budget';
import ShotList from '../components/project/ShotList';
import MicroDramaManager from '../components/project/MicroDramaManager';
import Sourcing from '../components/project/Sourcing';
import OutreachAndComms from '../components/project/OutreachAndComms';
import ProjectChat from '../components/project/ProjectChat';
import Integrations from '../components/project/Integrations';
import IndustryExport from '../components/project/IndustryExport';
import CallSheets from '../components/project/CallSheets';
import PaymentIntegration from '../components/project/PaymentIntegration';
import Permits from '../components/project/Permits';
import OrgChart from '../components/project/OrgChart';
import ProductionHub from '../components/project/ProductionHub';
import ChannelAudit from '../components/project/ChannelAudit';
import NotificationCenter from '../components/project/NotificationCenter';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { breakdown, budget, schedule, sourcing, shotList } from '../lib/gemini';
import { unionRateService } from '../services/unionRateService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { serverTimestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { extractTextFromPDF, fetchGoogleDocText, fetchGoogleSheetText } from '../lib/documentUtils';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthProvider';
import { toast } from 'sonner';

const AGENTS = []; // Removed as it is now in Layout.tsx

import { ensureApiKey } from '../lib/apiKeyCheck';
import { callSheet } from '../lib/agents/operations/callSheet';
import html2pdf from 'html2pdf.js';
import { MICRO_DRAMA_CREW_RATES } from '../constants/microDrama';

export default function ProjectDetail() {
  const { id, agent } = useParams<{ id: string, agent: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptText, setScriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingShotList, setIsGeneratingShotList] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);
  const [isGeneratingSourcing, setIsGeneratingSourcing] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('paste');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [isExecutingOutreach, setIsExecutingOutreach] = useState(false);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const [isScriptImported, setIsScriptImported] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [agentInstructions, setAgentInstructions] = useState('');
  const [executionSteps] = useState(['breakdown', 'shotlist', 'sourcing', 'budget', 'schedule', 'outreach', 'callsheets']);

  const sourcingAbortController = useRef<AbortController | null>(null);
  const breakdownAbortController = useRef<AbortController | null>(null);
  const shotListAbortController = useRef<AbortController | null>(null);
  const scheduleAbortController = useRef<AbortController | null>(null);
  const budgetAbortController = useRef<AbortController | null>(null);
  const callSheetAbortController = useRef<AbortController | null>(null);
  const outreachAbortController = useRef<AbortController | null>(null);

  const [hasBudgetData, setHasBudgetData] = useState(false);
  const [hasScheduleData, setHasScheduleData] = useState(false);
  const [hasShotListData, setHasShotListData] = useState(false);
  const [hasSourcingData, setHasSourcingData] = useState(false);
  const [hasCallSheetData, setHasCallSheetData] = useState(false);
  const [hasOutreachData, setHasOutreachData] = useState(false);
  const [isGeneratingCallSheets, setIsGeneratingCallSheets] = useState(false);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);

  const activeTab = agent || 'dashboard';

  const isAnyAgentRunning = isExecutingAll || isAnalyzing || isGeneratingShotList || isGeneratingSchedule || isGeneratingBudget || isGeneratingSourcing || isGeneratingCallSheets || isGeneratingOutreach;

  useEffect(() => {
    if (project) {
      setEditTitle(project.title || '');
    }
  }, [project?.title]);

  const [showExecutionModal, setShowExecutionModal] = useState(true);

  // When ANY execution starts from a stopped state, make sure to show the modal
  const wasRunning = useRef(false);
  useEffect(() => {
    if (isAnyAgentRunning && !wasRunning.current) {
      setShowExecutionModal(true);
    }
    wasRunning.current = isAnyAgentRunning;
  }, [isAnyAgentRunning]);

  const handleUpdateTitle = async () => {
    if (!editTitle.trim() || !id) return;
    try {
      await updateDoc(doc(db, 'projects', id), { title: editTitle.trim() });
      setIsEditingTitle(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Master auto-run check for new projects
  useEffect(() => {
    if (project?.autoRunMaster && scriptText && !isExecutingAll && currentStepIndex === -1 && scenes.length === 0) {
      handleExecuteAll();
      updateDoc(doc(db, 'projects', id!), { autoRunMaster: false });
    }
  }, [project, scriptText, scenes.length, isExecutingAll, currentStepIndex, id]);

  useEffect(() => {
    // Reset execution state when navigating to a different project
    setIsExecutingAll(false);
    setIsPaused(false);
    setCurrentStepIndex(-1);
    setIsAnalyzing(false);
    setIsGeneratingShotList(false);
    setIsGeneratingSchedule(false);
    setIsGeneratingBudget(false);
    setIsGeneratingSourcing(false);
    setIsGeneratingCallSheets(false);
    
    if (sourcingAbortController.current) sourcingAbortController.current.abort();
    if (breakdownAbortController.current) breakdownAbortController.current.abort();
    if (shotListAbortController.current) shotListAbortController.current.abort();
    if (scheduleAbortController.current) scheduleAbortController.current.abort();
    if (budgetAbortController.current) budgetAbortController.current.abort();
    if (callSheetAbortController.current) callSheetAbortController.current.abort();
    if (outreachAbortController.current) outreachAbortController.current.abort();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    // Check for budget data
    const budgetUnsub = onSnapshot(query(collection(db, `projects/${id}/budget`), limit(1)), (snap) => {
      setHasBudgetData(!snap.empty);
    }, (error) => {
      console.warn("Budget listener permission denied - likely initial load or access issue", error);
    });

    // Check for schedule data
    const scheduleUnsub = onSnapshot(query(collection(db, `projects/${id}/schedule`), limit(1)), (snap) => {
      setHasScheduleData(!snap.empty);
    }, (error) => {
      console.warn("Schedule listener permission denied", error);
    });

    // Check for shotlist data
    const shotlistUnsub = onSnapshot(query(collection(db, `projects/${id}/shots`), limit(1)), (snap) => {
      setHasShotListData(!snap.empty);
    }, (error) => {
      console.warn("Shots listener permission denied", error);
    });

    // Check for sourcing data (venues is a good indicator)
    const sourcingUnsub = onSnapshot(query(collection(db, `projects/${id}/venues`), limit(1)), (snap) => {
      setHasSourcingData(!snap.empty);
    }, (error) => {
      console.warn("Venues listener permission denied", error);
    });

    // Check for callsheet data
    const callsheetUnsub = onSnapshot(query(collection(db, `projects/${id}/call_sheets`), limit(1)), (snap) => {
      setHasCallSheetData(!snap.empty);
    }, (error) => {
      console.warn("Callsheet listener permission denied", error);
    });

    // Check for outreach data
    const outreachUnsub = onSnapshot(query(collection(db, 'outreachThreads'), where('projectId', '==', id), limit(1)), (snap) => {
      setHasOutreachData(!snap.empty);
    }, (error) => {
      console.warn("Outreach listener permission denied", error);
    });

    return () => {
        budgetUnsub();
        scheduleUnsub();
        shotlistUnsub();
        sourcingUnsub();
        callsheetUnsub();
        outreachUnsub();
      };
  }, [id, user]);

  useEffect(() => {
    if (id && project) {
      updateDoc(doc(db, 'projects', id), { isExecuting: isAnyAgentRunning }).catch(console.error);
    }
    
    // Cleanup: when navigating away or unmounting, ensure we clear the executing flag for this project
    return () => {
      if (id && project && isAnyAgentRunning) {
        updateDoc(doc(db, 'projects', id), { isExecuting: false }).catch(console.error);
        
        // Ensure running requests are safely aborted
        if (sourcingAbortController.current) sourcingAbortController.current.abort();
        if (breakdownAbortController.current) breakdownAbortController.current.abort();
        if (shotListAbortController.current) shotListAbortController.current.abort();
        if (scheduleAbortController.current) scheduleAbortController.current.abort();
        if (budgetAbortController.current) budgetAbortController.current.abort();
        if (callSheetAbortController.current) callSheetAbortController.current.abort();
      }
    };
  }, [isAnyAgentRunning, id]);

  useEffect(() => {
    if (!id || !user) return;
    
    const unsubscribe = onSnapshot(doc(db, 'projects', id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProject({ id: snapshot.id, ...data } as Project);
        setScriptText(data.scriptText || '');
        setScriptUrl(data.scriptUrl || '');
        setLocationInput(data.location || '');
        setAgentInstructions(data.agentInstructions || '');
      } else {
        navigate('/');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${id}`);
    });

    const scenesUnsubscribe = onSnapshot(collection(db, 'projects', id, 'scenes'), (snapshot) => {
      setScenes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scene)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${id}/scenes`);
    });

    const daysUnsubscribe = onSnapshot(query(collection(db, 'projects', id, 'schedule'), orderBy('dayNumber', 'asc')), (snapshot) => {
      setDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleDay)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${id}/schedule`);
    });

    const contactsUnsubscribe = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
        unsubscribe();
        scenesUnsubscribe();
        daysUnsubscribe();
        contactsUnsubscribe();
      };
  }, [id, navigate, user]);

  const saveScriptVersion = async (text: string, url?: string) => {
    if (!id || !project) return;
    try {
      const nextVersion = (project.version || 0) + 1;
      await addDoc(collection(db, `projects/${id}/script_versions`), {
        projectId: id,
        scriptText: text,
        scriptUrl: url || '',
        versionNumber: nextVersion,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'projects', id), { 
        version: nextVersion,
        scriptText: text,
        scriptUrl: url || ''
      });
    } catch (error) {
      console.error('Failed to save script version:', error);
    }
  };

  const handleSaveScript = async () => {
    if (!id || !project) return;
    if (scriptText === project.scriptText) return;
    
    try {
      await saveScriptVersion(scriptText, project.scriptUrl);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    }
  };

  const handleSaveInstructions = async () => {
    if (!id) return;
    setIsSavingInstructions(true);
    try {
      await updateDoc(doc(db, 'projects', id), { agentInstructions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const updateAgentStatus = async (agentName: keyof NonNullable<Project['agentStatuses']>, status: 'idle' | 'running' | 'completed' | 'failed', error?: string) => {
    if (!id) return;
    try {
      const updates: any = {
        [`agentStatuses.${agentName}.status`]: status,
        [`agentStatuses.${agentName}.lastRun`]: serverTimestamp(),
        [`agentStatuses.${agentName}.error`]: error || null,
        [`agentStatuses.${agentName}.version`]: project?.version || 0
      };
      
      // Reset approval when starting a new run or failing
      if (status === 'running' || status === 'failed') {
        updates[`agentStatuses.${agentName}.isApproved`] = false;
      }
      
      await updateDoc(doc(db, 'projects', id), updates);
    } catch (e) {
      console.error(`Failed to update agent status for ${agentName}:`, e);
    }
  };

  const handleSyncBudgetFromSourcing = async () => {
    if (!id) return;
    try {
      const budgetRef = collection(db, `projects/${id}/budget`);
      const budgetSnap = await getDocs(budgetRef);
      const existingItems = budgetSnap.docs.map(d => ({ id: d.id, ...d.data() } as BudgetItem));
      
      const fetchColl = async (coll: string) => {
        const snap = await getDocs(collection(db, `projects/${id}/${coll}`));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      };

      const venuesRes = await fetchColl('venues');
      const gearRes = await fetchColl('gear');
      const propsRes = await fetchColl('props');
      const wardrobeRes = await fetchColl('wardrobe');

      const syncItems = [
        ...venuesRes.map((v: any) => ({ name: v.name || '', cost: v.cost || 0, category: 'Location', description: v.name || 'Unnamed Venue', details: v.notes || '' })),
        ...gearRes.map((g: any) => ({ name: g.name || '', cost: g.cost || 0, category: 'Equipment', description: g.name || 'Unnamed Gear', details: g.category || '' })),
        ...propsRes.map((p: any) => ({ name: p.name || '', cost: p.cost || 0, category: 'Props', description: p.name || 'Unnamed Prop', details: p.description || '' })),
        ...wardrobeRes.map((w: any) => ({ name: w.character || w.description || '', cost: w.cost || 0, category: 'Wardrobe', description: w.character || w.description || 'Unnamed Wardrobe', details: w.description || '' }))
      ];

      const batch = writeBatch(db);
      const now = serverTimestamp();

      for (const item of syncItems) {
        const match = existingItems.find(ei => {
          const eiDesc = (ei.description || '').toLowerCase();
          const itemDesc = (item.description || '').toLowerCase();
          if (!eiDesc || !itemDesc) return false;
          return eiDesc.includes(itemDesc) || itemDesc.includes(eiDesc);
        });

        if (match) {
          batch.update(doc(db, `projects/${id}/budget`, match.id), {
            rate: item.cost || 0,
            amount: (item.cost || 0) * (match.quantity || 1),
            details: item.details || (match as any).details || '',
            status: 'sourced',
            updatedAt: now
          });
        } else {
          const newRef = doc(collection(db, `projects/${id}/budget`));
          batch.set(newRef, {
            projectId: id,
            category: item.category || 'Other',
            description: item.description || 'Unspecified Line Item',
            details: item.details || '',
            rate: item.cost || 0,
            quantity: 1,
            unit: 'flat',
            amount: item.cost || 0,
            status: 'sourced',
            createdAt: now
          });
        }
      }

      await batch.commit();
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Budget Synced',
        message: 'Marketplace pricing has been synced to your production budget by AI Assistant.',
        isRead: false,
        createdAt: now
      });
      toast.success('Sourcing synced to budget');
    } catch (e) {
      console.error('Agent sync failed:', e);
      toast.error('Failed to sync sourcing to budget');
    }
  };

  const handleRunBreakdown = async () => {
    if (!id || !scriptText) return false;
    await ensureApiKey();
    setIsAnalyzing(true);
    let success = false;
    await updateAgentStatus('breakdown', 'running');
    try {
      // Save current version before starting new breakdown
      await handleSaveScript();

      // Add notification
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Agent Running: Additive Breakdown',
        message: 'Synchronizing script changes with existing production data...',
        isRead: false,
        createdAt: serverTimestamp()
      });

      const breakdownData = await breakdown(scriptText, project?.agentInstructions);
      
      // Match and Merge Logic
      const existingScenesMap = new Map<number, Scene>();
      scenes.forEach(s => existingScenesMap.set(s.sceneNumber, s));

      const processedSceneNumbers = new Set<number>();
      
      // Breakdown data could be large (many scenes), Firestore batches have a 500-op limit
      const CHUNK_SIZE = 400;
      for (let i = 0; i < (breakdownData?.length || 0); i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = (breakdownData || []).slice(i, i + CHUNK_SIZE);
        
        chunk.forEach((newScene: any) => {
          const existing = existingScenesMap.get(newScene.sceneNumber);
          processedSceneNumbers.add(newScene.sceneNumber);

          if (existing) {
            batch.update(doc(db, 'projects', id, 'scenes', existing.id), {
              ...newScene,
              projectId: id,
              ownerId: user?.uid,
              notes: existing.notes || newScene.notes || '',
              duration: existing.duration || newScene.duration || 0
            });
          } else {
            const sceneRef = doc(collection(db, 'projects', id, 'scenes'));
            batch.set(sceneRef, { 
              ...newScene, 
              projectId: id,
              ownerId: user?.uid,
              duration: newScene.duration || 0 
            });
          }
        });
        
        await batch.commit();
      }
      
      await updateDoc(doc(db, 'projects', id), { status: 'pre-production' });
      await updateAgentStatus('breakdown', 'completed');

      // Automatically run sourcing sync after breakdown as requested by user
      await handleSyncBudgetFromSourcing();

      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        ownerId: user?.uid,
        type: 'approval',
        title: 'Task Completed: Breakdown & Sync',
        message: 'Script analyzed and sourcing data synchronized to budget.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      console.error('Breakdown failed:', error);
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Agent Failed: Breakdown',
        message: 'The AI encountered a critical error while analyzing the script.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      return false;
    } finally {
      setIsAnalyzing(false);
      setIsUpdatingScript(false);
      if (!success) {
         updateAgentStatus('breakdown', 'failed', 'Breakdown failed');
      }
    }
  };

  const runScheduleStep = async (dayLength: number = 10, availabilityConstraint: string = "") => {
    if (!id || scenes.length === 0) return false;
    await ensureApiKey();
    setIsGeneratingSchedule(true);
    let success = false;
    await updateAgentStatus('schedule', 'running');
    try {
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Agent Running: Schedule',
        message: `Generating shooting schedule (${dayLength}h days)...`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      // Fetch shots to pass into schedule
      const shotsQ = query(collection(db, `projects/${id}/shots`));
      const shotsSnap = await getDocs(shotsQ);
      const shotsData = shotsSnap.docs.map(doc => doc.data());

      // Fetch budget data to pass into schedule
      const budgetQ = query(collection(db, `projects/${id}/budget`));
      const budgetSnap = await getDocs(budgetQ);
      const budgetData = budgetSnap.docs.map(doc => doc.data());

      const scheduleData = await schedule(scenes, shotsData, dayLength, project?.contentType || "feature", availabilityConstraint, undefined, budgetData);
      const scheduleBatch = writeBatch(db);
      
      // Clear existing schedule
      const q = query(collection(db, `projects/${id}/schedule`));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => scheduleBatch.delete(doc.ref));
      
      scheduleData.forEach((day: any) => {
        const ref = doc(collection(db, 'projects', id, 'schedule'));
        scheduleBatch.set(ref, { 
          ...day, 
          projectId: id,
          dayLength: day.dayLength || 10,
          sceneIds: day.sceneNumbers.map((n: number) => String(n))
        });
      });
      await scheduleBatch.commit();
      await updateAgentStatus('schedule', 'completed');
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'approval',
        title: 'Task Completed: Schedule',
        message: 'Shooting schedule generated successfully.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      console.error('Schedule failed:', error);
      return false;
    } finally {
      setIsGeneratingSchedule(false);
      if (!success) {
        updateAgentStatus('schedule', 'failed', 'Schedule generation failed');
      }
    }
  };

  const runOutreachStep = async () => {
    if (!id || !project) return false;
    await ensureApiKey();
    setIsGeneratingOutreach(true);
    let success = false;
    await updateAgentStatus('outreach', 'running');
    try {
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id, type: 'system', title: 'Agent Running: Crew Outreach', message: 'Analyzing talent network and suggesting matches...', isRead: false, createdAt: serverTimestamp()
      });

      const contactsSnap = await getDocs(collection(db, 'contacts'));
      const contactsList = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const { crewRecommendations } = await import('../lib/agents/operations/staffing');
      const result = await crewRecommendations(project, contactsList);

      const batch = writeBatch(db);
      if (result && Array.isArray(result.recommendations)) {
        for (const rec of result.recommendations) {
          if (!rec.role || !Array.isArray(rec.matches)) continue;
          
          for (const match of rec.matches) {
            const threadRef = doc(collection(db, 'outreachThreads'));
            batch.set(threadRef, {
              projectId: id,
              contactId: match.contactId,
              ownerId: project.ownerId || '',
              role: rec.role,
              status: 'suggested',
              matchReason: match.reason,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await batch.commit();
      await updateAgentStatus('outreach', 'completed');
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'approval',
        title: 'Task Completed: Crew Outreach',
        message: 'AI has suggested crew matches for your project roles. Please review and send invites.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      console.error('Outreach failed:', error);
      return false;
    } finally {
      setIsGeneratingOutreach(false);
      if (!success) {
        updateAgentStatus('outreach', 'failed', 'Outreach analysis failed');
      }
    }
  };

  const runBudgetStep = async () => {
    if (!id || scenes.length === 0) return false;
    await ensureApiKey();
    setIsGeneratingBudget(true);
    let success = false;
    await updateAgentStatus('budget', 'running');
    try {
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Agent Running: Budget',
        message: 'Calculating production budget...',
        isRead: false,
        createdAt: serverTimestamp()
      });
      // Fetch schedule for budget context
      const scheduleQ = query(collection(db, `projects/${id}/schedule`));
      const scheduleSnap = await getDocs(scheduleQ);
      const scheduleDays = scheduleSnap.docs.map(doc => doc.data());

      // Fetch existing budget to find manual items
      const existingBudgetSnap = await getDocs(collection(db, 'projects', id, 'budget'));
      const existingItems = existingBudgetSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const manualItems = existingItems.filter((i: any) => i.status === 'manual');

      // Create automatic snapshot before regeneration
      if (existingItems.length > 0) {
        try {
          await addDoc(collection(db, 'projects', id, 'budget_history'), {
            items: existingItems,
            total: existingItems.reduce((sum, i: any) => sum + (i.amount || 0), 0),
            note: `Auto-snapshot before regeneration (${new Date().toLocaleTimeString()})`,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.error('Failed to create background snapshot:', e);
        }
      }

      // Fetch outreach threads to get negotiated rates
      const outreachSnap = await getDocs(query(collection(db, 'outreachThreads'), where('projectId', '==', id)));
      const threads = outreachSnap.docs.map(doc => doc.data());
      
      const enrichedPersonnel = contacts.map(contact => {
        const thread = threads.find(t => t.contactId === contact.id);
        if (thread && thread.requestedRate) {
          return { ...contact, rate: thread.requestedRate, isBid: true };
        }
        return contact;
      });

      let budgetData: any[] = [];

      if (project?.contentType === 'micro_drama') {
        // Calculate days based on 2.5 episodes per day (avg)
        const episodesSnap = await getDocs(collection(db, 'projects', id, 'episodes'));
        const episodeCount = episodesSnap.size || 10;
        const totalDays = Math.max(1, Math.ceil(episodeCount / 2.5));

        const roles = Object.keys(MICRO_DRAMA_CREW_RATES) as Array<keyof typeof MICRO_DRAMA_CREW_RATES>;
        
        // Extract real character names from scenes to replace generic placeholders
        const characters = Array.from(new Set(scenes.flatMap(s => s.characters || []))).slice(0, 2);
        
        budgetData = roles.map(role => {
          const rates = MICRO_DRAMA_CREW_RATES[role];
          const avgRate = (rates.min + rates.max) / 2;
          
          let description = (rates as any).label || role.replace(/([A-Z])/g, ' $1').trim();
          
          // Map real character names to Cast placeholders if available
          if (role === 'CAST_1' && characters[0]) description = `Cast: ${characters[0]}`;
          if (role === 'CAST_2' && characters[1]) description = `Cast: ${characters[1]}`;

          return {
            category: 'Personnel',
            description,
            amount: avgRate * totalDays,
            rate: avgRate,
            quantity: totalDays,
            unit: 'day'
          };
        });

        // Add catering and misc
        budgetData.push({
          category: 'Catering',
          description: 'Production Meals',
          amount: 150 * totalDays,
          rate: 150,
          quantity: totalDays,
          unit: 'day'
        });
      } else {
        // Trim sourcing data to avoid massive payloads busting API limits
        const fetchCollectionData = async (col: string) => {
          const snap = await getDocs(query(collection(db, `projects/${id}/${col}`)));
          return snap.docs.map(doc => {
            const data = doc.data();
            return {
              name: data.name || data.title || col,
              cost: data.cost || data.estimatedCost || 0,
              hourlyRate: data.hourlyRate || 0,
              dayRate: data.dayRate || 0,
              purchaseUrl: data.purchaseUrl || '',
              source: data.source || '',
              requiresPermit: data.requiresPermit || false
            };
          });
        };
        
        const sourcingData = {
          venues: await fetchCollectionData('venues'),
          gear: await fetchCollectionData('gear'),
          props: await fetchCollectionData('props'),
          wardrobe: await fetchCollectionData('wardrobe'),
          travel: await fetchCollectionData('travel'),
          catering: await fetchCollectionData('catering'),
        };

        const customRates = await unionRateService.getRatesForAgent();
        const canonicalRates = await unionRateService.getCanonicalRatesForAgent();

        budgetData = await budget(
          scenes, 
          project?.isSAG, 
          project?.location, 
          enrichedPersonnel, 
          project?.contentType,
          project?.permitSummary,
          scheduleDays,
          [...customRates, ...canonicalRates],
          project?.targetBudget || 0,
          sourcingData,
          project?.budgetTier,
          undefined, // onProgress
          existingItems
        );
      }
      
      const budgetBatch = writeBatch(db);

      // Clear non-manual budget items
      existingItems.forEach((item: any) => {
        if (item.status !== 'manual') {
          budgetBatch.delete(doc(db, 'projects', id, 'budget', item.id));
        }
      });
      
      if (Array.isArray(budgetData)) {
        budgetData.forEach((item: any) => {
          if (!item) return;

          // Check for conflicts with manual items
          const itemDescLower = (item.description || item.item || item.name || '').toString().toLowerCase();
          const isConflict = manualItems.some((mi: any) => {
            const miDescLower = (mi.description || mi.item || mi.name || '').toString().toLowerCase();
            return miDescLower === itemDescLower && miDescLower !== '';
          });
          
          if (isConflict) return;

          const ref = doc(collection(db, 'projects', id, 'budget'));
          budgetBatch.set(ref, { 
            projectId: id, 
            ownerId: user?.uid,
            category: item.category || 'Other',
            description: item.description || item.item || item.name || 'Unspecified Line Item',
            details: item.details || item.notes || '',
            amount: Number(item.amount || item.total || item.cost || (Number(item.rate || 0) * Number(item.quantity || 1)) || 0),
            rate: Number(item.rate || item.amount || item.cost || 0),
            rateLow: Number(item.rateLow || item.rate || item.amount || 0),
            rateMedium: Number(item.rateMedium || item.rate || item.amount || 0),
            rateHigh: Number(item.rateHigh || item.rate || item.amount || 0),
            unit: item.unit || 'flat',
            quantity: Number(item.quantity || 1),
            status: 'estimated',
            createdAt: serverTimestamp()
          });
        });
      }
      await budgetBatch.commit();
      await updateAgentStatus('budget', 'completed');
      
      const total = Array.isArray(budgetData) ? budgetData.reduce((s: number, i: any) => s + (i.amount || 0), 0) : 0;

      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'approval',
        title: 'Task Completed: Budget Modeled',
        message: `Modeled AI Budget: $${total.toLocaleString()}. Applied values.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      console.error('Budget failed:', error);
      return false;
    } finally {
      setIsGeneratingBudget(false);
      if (!success) {
        updateAgentStatus('budget', 'failed', 'Budget modeling failed');
      }
    }
  };

  const runShotListStep = async () => {
    if (!id || scenes.length === 0) return false;
    await ensureApiKey();
    setIsGeneratingShotList(true);
    let success = false;
    await updateAgentStatus('shotlist', 'running');
    try {
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Agent Running: Shot List',
        message: 'Generating shot list from breakdown...',
        isRead: false,
        createdAt: serverTimestamp()
      });
      const simplifiedScenes = scenes.map(s => ({
        id: s.id,
        sceneNumber: s.sceneNumber,
        slugline: s.slugline,
        location: s.location,
        cast: s.cast,
        props: s.props
      }));
      const suggestedShots = await shotList(simplifiedScenes);
      const batch = writeBatch(db);
      
      // Clear existing shots
      const q = query(collection(db, `projects/${id}/shots`));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      suggestedShots.forEach((shot: any) => {
        const newShotRef = doc(collection(db, `projects/${id}/shots`));
        batch.set(newShotRef, {
          ...shot,
          projectId: id,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      await updateAgentStatus('shotlist', 'completed');
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'approval',
        title: 'Task Completed: Shot List',
        message: 'Shot list generated successfully.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      console.error('Shot list failed:', error);
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Task Failed: Shot List',
        message: 'Failed to generate shot list. Please try again.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      return false;
    } finally {
      setIsGeneratingShotList(false);
      if (!success) {
        updateAgentStatus('shotlist', 'failed', 'Shot list generation failed');
      }
    }
  };

  const runSourcingStep = async (categoryFilter?: string) => {
    if (!id || scenes.length === 0) return false;
    await ensureApiKey();
    let success = false;
    await updateAgentStatus('sourcing', 'running');
    
    // Kill any existing sourcing run
    if (sourcingAbortController.current) {
      sourcingAbortController.current.abort();
    }
    sourcingAbortController.current = new AbortController();
    
    setIsGeneratingSourcing(true);
    try {
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: `Agent Running: Sourcing ${categoryFilter ? `(${categoryFilter})` : ''}`,
        message: `Sourcing ${categoryFilter || 'venues, gear, and props'}...`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      
      // Get budget context
      const budgetQ = query(collection(db, `projects/${id}/budget`));
      const budgetSnapshot = await getDocs(budgetQ);
      const budgetItems = budgetSnapshot.docs.map(doc => doc.data());

      let sourcingData: any = { venues: [], gear: [], props: [], wardrobe: [], permitContacts: [], permitSummary: "" };

      // Retry helper for API calls with aggressive exponential backoff
      const runWithRetry = async (fn: () => Promise<any>, agentName: string, maxRetries = 4) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error: any) {
            const isQuotaError = error.message?.includes('429') || 
                                error.message?.includes('RESOURCE_EXHAUSTED') ||
                                error.message?.includes('Quota Exceeded');
            
            if (isQuotaError && i < maxRetries - 1) {
              // Much more aggressive backoff: 30s, 60s, 90s
              const waitTime = (i + 1) * 30000; 
              console.warn(`[${agentName}] Quota exhausted. Cooling down for ${waitTime/1000}s... (Attempt ${i+1}/${maxRetries})`);
              
              await addDoc(collection(db, `projects/${id}/notifications`), {
                projectId: id, type: 'system', title: `Rate Limit`, message: `Gemini Search Quota reached. Waiting ${waitTime/1000}s...`, isRead: false, createdAt: serverTimestamp()
              });
              
              await new Promise(r => setTimeout(r, waitTime));
              continue;
            }
            throw error;
          }
        }
      };

      const safetyWait = (ms: number) => new Promise(r => setTimeout(r, ms));

      if (categoryFilter) {
        await addDoc(collection(db, `projects/${id}/notifications`), {
          projectId: id, type: 'system', title: `Running Subagent`, message: `Sourcing ${categoryFilter}...`, isRead: false, createdAt: serverTimestamp()
        });
        sourcingData = await runWithRetry(
          () => sourcing(scenes, project?.location, categoryFilter as any, budgetItems, project?.agentInstructions),
          `Sourcing ${categoryFilter}`
        );
      } else {
        if (sourcingAbortController.current?.signal.aborted) return false;
        
        await addDoc(collection(db, `projects/${id}/notifications`), {
          projectId: id, type: 'system', title: `Running Master Sourcing Agent`, message: `Sourcing venues, gear, props, wardrobe, and permits in one pass...`, isRead: false, createdAt: serverTimestamp()
        });

        try {
          // One single broad call is much friendlier for the Google Search quota
          const data = await runWithRetry(
            () => sourcing(scenes, project?.location, undefined, budgetItems, project?.agentInstructions),
            "Master Sourcing"
          );

          if (data) {
            sourcingData.venues = data.venues || [];
            sourcingData.gear = data.gear || [];
            sourcingData.props = data.props || [];
            sourcingData.wardrobe = data.wardrobe || [];
            if (data.permitContacts?.length > 0) sourcingData.permitContacts = data.permitContacts;
            if (data.permitSummary) sourcingData.permitSummary = data.permitSummary;
          }
          
          // Safety delay
          await safetyWait(15000);
        } catch (error: any) {
          console.error(`Master sourcing failed:`, error);
          await addDoc(collection(db, `projects/${id}/notifications`), {
            projectId: id, 
            type: 'system', 
            title: `Agent Failed`, 
            message: `Failed to execute master sourcing. ${error.message || ''}`, 
            isRead: false, 
            createdAt: serverTimestamp()
          });
        }

        /* 
        // Disabling travel and catering sub-agents as per user request to focus on marketplace items
        if (!sourcingAbortController.current?.signal.aborted) {
          await addDoc(collection(db, `projects/${id}/notifications`), {
            projectId: id, type: 'system', title: `Running Subagent`, message: `Sourcing travel & lodging...`, isRead: false, createdAt: serverTimestamp()
          });
          try {
            sourcingData.travel = await runWithRetry(
              () => travelLodging(scenes, project?.location),
              "Travel & Lodging"
            );
            // Safety delay - 45s
            await safetyWait(45000);
          } catch (error: any) {
            console.error(`Sourcing subagent travel failed:`, error);
          }
        }

        if (!sourcingAbortController.current?.signal.aborted) {
          await addDoc(collection(db, `projects/${id}/notifications`), {
            projectId: id, type: 'system', title: `Running Subagent`, message: `Sourcing craft services...`, isRead: false, createdAt: serverTimestamp()
          });
          try {
            sourcingData.catering = await runWithRetry(
              () => craftServices(scenes, project?.location),
              "Craft Services"
            );
          } catch (error: any) {
            console.error(`Sourcing subagent craft services failed:`, error);
          }
        }
        */
      }
      
      if (sourcingAbortController.current?.signal.aborted) {
        return false;
      }

      const totalResults = (sourcingData.venues?.length || 0) + (sourcingData.gear?.length || 0) + (sourcingData.props?.length || 0) + (sourcingData.wardrobe?.length || 0);
      
      if (totalResults === 0) {
        await updateAgentStatus('sourcing', 'failed', 'No sourcing results found. Check your Script Breakdown detail.');
        await addDoc(collection(db, `projects/${id}/notifications`), {
          projectId: id,
          type: 'system',
          title: 'Sourcing Incomplete',
          message: 'The agent could not find specific items to source. This usually happens if the breakdown categories are empty or too vague.',
          isRead: false,
          createdAt: serverTimestamp()
        });
        return false;
      }

      const sourcingBatch = writeBatch(db);
      
      // Clear existing sourcing items ONLY for the requested category or ALL if none
      const collections = categoryFilter ? [categoryFilter] : ['venues', 'gear', 'props', 'wardrobe'];
      for (const coll of collections) {
        const q = query(collection(db, `projects/${id}/${coll}`));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => sourcingBatch.delete(doc.ref));
      }

      const safeCategoryData = (cat: string) => {
        if (!categoryFilter) return sourcingData[cat] || [];
        return cat === categoryFilter ? (sourcingData[cat] || []) : [];
      };

      (safeCategoryData('venues')).forEach((v: any) => {
        const ref = doc(collection(db, `projects/${id}/venues`));
        sourcingBatch.set(ref, { 
          ...v, 
          projectId: id, 
          ownerId: user?.uid,
          status: 'research'
        });
      });
      (safeCategoryData('gear')).forEach((g: any) => {
        const ref = doc(collection(db, `projects/${id}/gear`));
        sourcingBatch.set(ref, { ...g, projectId: id, ownerId: user?.uid, status: 'needed' });
      });
      (safeCategoryData('props')).forEach((p: any) => {
        const ref = doc(collection(db, `projects/${id}/props`));
        sourcingBatch.set(ref, { 
          ...p, 
          projectId: id, 
          ownerId: user?.uid,
          status: 'needed'
        });
      });
      (safeCategoryData('wardrobe')).forEach((w: any) => {
        const ref = doc(collection(db, `projects/${id}/wardrobe`));
        sourcingBatch.set(ref, { 
          ...w, 
          projectId: id, 
          ownerId: user?.uid,
          status: 'needed'
        });
      });

      // Update project document with permit info if it was an "All" run or specifically permits
      if (!categoryFilter) {
        sourcingBatch.update(doc(db, 'projects', id), {
          permitSummary: sourcingData.permitSummary || '',
          permitContacts: sourcingData.permitContacts || []
        });
      }

      await sourcingBatch.commit();
      await updateAgentStatus('sourcing', 'completed');
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'approval',
        title: 'Task Completed: Sourcing',
        message: 'Marketplace sourcing complete.',
        isRead: false,
        createdAt: serverTimestamp()
      });
      success = true;
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Sourcing aborted');
        return false;
      }
      console.error('Sourcing failed:', error);
      return false;
    } finally {
      setIsGeneratingSourcing(false);
      sourcingAbortController.current = null;
      if (!success) {
        updateAgentStatus('sourcing', 'failed', 'Sourcing failed');
      }
    }
  };

  const runCallSheetStep = async () => {
    if (!id || scenes.length === 0) return false;
    await ensureApiKey();
    setIsGeneratingCallSheets(true);
    let success = false;
    await updateAgentStatus('callsheets', 'running');
    callSheetAbortController.current = new AbortController();
    
    try {
      const daysSnap = await getDocs(query(collection(db, `projects/${id}/schedule`), orderBy('dayNumber')));
      const scheduleDays = daysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleDay));
      
      const contactsSnap = await getDocs(query(collection(db, `projects/${id}/contacts`)));
      const contactsData = contactsSnap.docs.map(doc => doc.data());

      for (const day of scheduleDays) {
        if (callSheetAbortController.current?.signal.aborted) break;
        
        const dayScenes = (day.sceneIds || []).map((sid: string) => scenes.find(s => s.id === sid)).filter(Boolean);
        const sheetData = await callSheet(day, dayScenes, contactsData, project?.location || 'TBD', { isMicroDrama: project?.isMicroDrama, contentType: project?.contentType });
        
        await addDoc(collection(db, 'projects', id, 'call_sheets'), {
          projectId: id,
          dayId: day.id,
          ...sheetData,
          status: 'draft',
          createdAt: serverTimestamp()
        });
        
        await new Promise(r => setTimeout(r, 2000));
      }
      await updateAgentStatus('callsheets', 'completed');
      success = true;
      return true;
    } catch (error) {
      console.error('Call sheet generation failed:', error);
      return false;
    } finally {
      setIsGeneratingCallSheets(false);
      callSheetAbortController.current = null;
      if (!success) {
        updateAgentStatus('callsheets', 'failed', 'Call sheet generation failed');
      }
    }
  };

  useEffect(() => {
    if (isExecutingAll && !isPaused && currentStepIndex >= 0 && currentStepIndex < executionSteps.length) {
      const runStep = async () => {
        const step = executionSteps[currentStepIndex];
        
        // Approval Gate: Must approve breakdown before moving to subsequent steps
        if (step !== 'breakdown' && !project?.agentStatuses?.breakdown?.isApproved) {
          setIsPaused(true);
          alert("Sequence Paused: Please review and approve the Script Breakdown before proceeding with the rest of the production phases.");
          return;
        }

        let success = false;
        
        if (step === 'breakdown') success = await handleRunBreakdown();
        else if (step === 'shotlist') success = await runShotListStep();
        else if (step === 'schedule') success = await runScheduleStep();
        else if (step === 'budget') success = await runBudgetStep();
        else if (step === 'sourcing') success = await runSourcingStep();
        else if (step === 'outreach') success = await runOutreachStep();
        else if (step === 'callsheets') success = await runCallSheetStep();
        
        if (success) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsExecutingAll(false);
          setCurrentStepIndex(-1);
          alert(`Pipeline halted: The ${step} agent encountered an error and could not complete. This is usually caused by the Gemini API rejecting the connection (e.g., 403 Forbidden or Server Overloaded). Please check your browser's developer console for the exact "ApiError" message.`);
        }
      };
      runStep();
    } else if (isExecutingAll && currentStepIndex >= executionSteps.length) {
      setIsExecutingAll(false);
      setCurrentStepIndex(-1);
      
      // Update the project state directly
      if (id && project) {
        updateDoc(doc(db, 'projects', id), { isExecuting: false }).catch(console.error);
      }
      
      alert('Master Execution Complete: All Curbily agents have finished their tasks.');
      
      addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Master Execution Complete',
        message: 'All Curbily agents have finished their tasks.',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }
  }, [isExecutingAll, isPaused, currentStepIndex]);

  const handleExecuteAll = async () => {
    // This feature is removed to enforce strict sequential approval per user request.
    alert("Sequential sequence mode enabled. Please run and approve each stage individually for maximum precision.");
  };

  const stopExecution = () => {
    setIsExecutingAll(false);
    setCurrentStepIndex(-1);
    setIsPaused(false);
    
    // Abort all running agents
    if (sourcingAbortController.current) sourcingAbortController.current.abort();
    if (breakdownAbortController.current) breakdownAbortController.current.abort();
    if (shotListAbortController.current) shotListAbortController.current.abort();
    if (scheduleAbortController.current) scheduleAbortController.current.abort();
    if (budgetAbortController.current) budgetAbortController.current.abort();
    if (callSheetAbortController.current) callSheetAbortController.current.abort();
    if (outreachAbortController.current) outreachAbortController.current.abort();
    
    // Explicitly reset all loading states to ensure UI updates immediately
    setIsAnalyzing(false);
    setIsGeneratingShotList(false);
    setIsGeneratingSchedule(false);
    setIsGeneratingBudget(false);
    setIsGeneratingSourcing(false);
    setIsGeneratingCallSheets(false);
    setIsGeneratingOutreach(false);
    
    addDoc(collection(db, `projects/${id}/notifications`), {
      projectId: id,
      type: 'system',
      title: 'Execution Stopped',
      message: 'Master production execution was manually stopped.',
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleUpdateLocation = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'projects', id), { location: locationInput });
      setIsEditingLocation(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }
      setScriptText(text);
      setIsScriptImported(true);
      setIsUpdatingScript(false);
      
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'File Uploaded',
        message: `${file.name} has been processed and is ready for Master Execute.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSheetImport = async () => {
    if (!scriptUrl) return;
    
    setIsProcessing(true);
    try {
      const text = await fetchGoogleSheetText(scriptUrl);
      setScriptText(text);
      setIsScriptImported(true);
      setIsUpdatingScript(false);
      
      await updateDoc(doc(db, 'projects', id), { scriptText: text, scriptUrl });
      
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Sheet Imported',
        message: 'Google Sheet data has been imported and is ready for Master Execute.',
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Google Sheet import failed:', error);
      alert('Failed to import Google Sheet. Ensure it is shared with "Anyone with the link".');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleDocImport = async () => {
    if (!scriptUrl) return;
    
    setIsProcessing(true);
    try {
      const text = await fetchGoogleDocText(scriptUrl);
      setScriptText(text);
      setIsScriptImported(true);
      setIsUpdatingScript(false);

      await updateDoc(doc(db, 'projects', id), { scriptText: text, scriptUrl });
      
      // Add notification instead of alert
      await addDoc(collection(db, `projects/${id}/notifications`), {
        projectId: id,
        type: 'system',
        title: 'Script Imported',
        message: 'Google Doc script has been imported and is ready for Master Execute.',
        isRead: false,
        createdAt: serverTimestamp()
      });
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
    if (!file) return;
    
    setIsProcessing(true);
    setFileName(file.name);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }
      setScriptText(text);
      setIsScriptImported(true);
      setIsUpdatingScript(false);
    } catch (error) {
      console.error('File extraction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareProject = async () => {
    if (!shareEmail.trim() || !id) return;
    try {
      const emails = (project as any).sharedEmails || [];
      if (!emails.includes(shareEmail.trim().toLowerCase())) {
        await updateDoc(doc(db, 'projects', id || ''), {
          sharedEmails: [...emails, shareEmail.trim().toLowerCase()]
        });
      }
      setShareEmail('');
      setIsShareDialogOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to share project');
    }
  };

  const agentStatusInfo = (() => {
    let stepName = '';
    if (isExecutingAll && currentStepIndex >= 0 && currentStepIndex < executionSteps.length) {
      stepName = executionSteps[currentStepIndex];
    } else {
      if (isAnalyzing) stepName = 'breakdown';
      else if (isGeneratingShotList) stepName = 'shotlist';
      else if (isGeneratingSchedule) stepName = 'schedule';
      else if (isGeneratingBudget) stepName = 'budget';
      else if (isGeneratingSourcing) stepName = 'sourcing';
      else if (isGeneratingOutreach) stepName = 'outreach';
      else if (isGeneratingCallSheets) stepName = 'callsheet';
    }

    switch(stepName) {
      case 'breakdown': return { title: "Script Breakdown Agent",  desc: "Analyzing the script to identify scenes, characters, locations, and props. This creates the foundational elements for your production."};
      case 'shotlist': return { title: "Shot List Agent",  desc: "Planning camera angles, shot sizes, and equipment for each scene to ensure full coverage of the action."};
      case 'schedule': return { title: "Scheduling Agent",  desc: "Organizing scenes into efficient shooting days, optimizing for locations, cast availability, and day lengths."};
      case 'episodes': return { title: "Season Folder Agent", desc: "Organizing micro drama episodes and synchronizing the season's overall production strategy." };
      case 'budget': return { title: "Budgeting Agent",  desc: "Estimating production costs, line items, crew rates, and equipment rentals based on the schedule and breakdown."};
      case 'sourcing': return { title: "Sourcing Agent",  desc: "Searching the local database for available cast, crew, and vendors that match the needs of your production."};
      case 'outreach': return { title: "Crew Outreach Agent", desc: "Analyzing high-level production requirements from your breakdown and matching roles with qualified talent from your network." };
      case 'callsheet': return { title: "Call Sheet Agent",  desc: "Generating comprehensive daily call sheets for the cast and crew with accurate call times, locations, and weather."};
      default: return { title: "Central Intelligence Agent", desc: "Processing production data and synchronizing departments." };
    }
  })();

  if (loading) return <div className="flex items-center justify-center h-64">Loading project...</div>;
  if (!project) return null;

  return (
    <div className="flex gap-6 relative">
      
      {/* Main Content Area */}
      <div id="project-detail-content" className="flex-1 flex flex-col min-w-0">

        <div className="flex-1 flex gap-6 mt-4">
          <div className={`flex-1 min-w-0 ${showAssistant ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {profile && (
                    <div className="px-3 py-1 bg-black rounded-full flex items-center gap-2">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">
                        {profile.isSubscribed ? 'AI Unlocked' : `${profile.tokens || 0} Credits`}
                      </span>
                    </div>
                  )}
                  <Badge variant="outline" className="bg-white text-black border-2 border-black uppercase text-[9px] font-black px-4 py-0.5 rounded-full shadow-[3px_3px_0_0_#000]">
                    {project.status}
                  </Badge>
                  <NotificationCenter projectId={project.id} />
                </div>

                {isEditingTitle ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleUpdateTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="text-6xl md:text-[80px] font-black uppercase tracking-tighter h-24 w-full border-4 border-black rounded-[2rem] px-8 bg-white"
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-6xl md:text-[80px] font-black uppercase tracking-tighter text-black cursor-pointer hover:opacity-70 transition-all leading-[0.85] py-2"
                    onClick={() => project.ownerId === user?.uid && setIsEditingTitle(true)}
                  >
                    {project.title.split(' ').map((word, i) => (
                      <span key={i} className={i % 2 === 1 ? 'text-slate-200' : ''}>{word} </span>
                    ))}
                  </h1>
                )}
                
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] max-w-lg">
                  Prod ID: {project.id.substring(0, 8)} • AI Assisted Production Environment Active
                </p>
              </div>

              <div className="flex gap-4 print:hidden">
                <Button 
                  variant="outline" 
                  className="rounded-2xl border-[3px] border-black h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-3"
                  disabled={isExporting}
                  onClick={async () => {
                    if (window.self !== window.top) {
                      alert('To export as PDF, please open in a new tab.');
                      return;
                    }
                    
                    setIsExporting(true);
                    const element = document.getElementById('project-detail-content');
                    if (!element) return;
                    const opt = {
                      margin: 0.5,
                      filename: `${project.title || 'project'}-export.pdf`,
                      image: { type: 'jpeg' as const, quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
                    };
                    try {
                      await html2pdf().set(opt).from(element).save();
                    } catch (e) { console.error(e); } finally { setIsExporting(false); }
                  }}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                
                {project.ownerId === user?.uid && (
                  <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                    <DialogTrigger render={
                      <Button className="rounded-2xl bg-black text-white h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-slate-800 transition-all flex items-center gap-3">
                        <Users className="w-4 h-4" />
                        Share Hub
                      </Button>
                    } />
                    <DialogContent className="rounded-[2.5rem] border-4 border-black p-8">
                      <DialogHeader>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Collaborate</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team and client access controls</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <Input
                          placeholder="collaborator@example.com"
                          className="rounded-xl border-2 border-slate-200 h-12 px-4"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                        />
                        <Button onClick={handleShareProject} className="w-full bg-black text-white hover:bg-slate-800 rounded-xl h-12 font-black uppercase tracking-widest text-[10px]">Invite User</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {activeTab !== 'dashboard' && (
              <div className="mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-slate-500 hover:text-slate-900"
                  onClick={() => navigate(`/projects/${id}/dashboard`)}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col max-w-4xl mx-auto w-full">
                <div className="space-y-6">
                  {project.contentType === 'micro_drama' && (
                    <div className="mb-6 p-4 bg-slate-900 border-2 border-slate-900 rounded-2xl text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Film className="w-24 h-24 rotate-12" />
                      </div>
                      <div className="relative z-10">
                        <h2 className="text-xl font-black uppercase tracking-tighter mb-1 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          Micro Drama Mode Active
                        </h2>
                        <p className="text-xs font-medium text-slate-300 max-w-xl">
                          Your project is configured for bulk shooting (2-3 episodes/day) with skeleton crew rates. 
                          The budgeter will automatically apply Non-Union rates and spread costs across your season folders.
                        </p>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="mt-4 text-[10px] uppercase font-black tracking-widest h-8"
                          onClick={() => navigate(`/projects/${id}/episodes`)}
                        >
                          Open Season Folders
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <CardHeader className="pb-4 bg-slate-50 border-b-2 border-black">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Project Specs</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Status</span>
                          <Badge variant="outline" className="bg-black text-white border-none font-black text-[10px] uppercase px-3">{project.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Location</span>
                          <span className="font-black text-black">{project.location || 'TBD'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Content</span>
                          <span className="font-black text-black uppercase">{project.contentType?.replace('_', ' ')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <CardHeader className="pb-4 border-b-2 border-black bg-slate-50">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black">Production Health</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-32 p-6">
                        <div className="text-center">
                          <div className={cn(
                            "text-5xl font-black tracking-tighter",
                            (() => {
                              const stepsCount = [scenes.length > 0, hasShotListData, hasScheduleData, hasBudgetData, hasSourcingData, hasOutreachData, hasCallSheetData].filter(Boolean).length;
                              const percentage = (stepsCount / executionSteps.length) * 100;
                              return percentage >= 100 ? "text-green-600" : percentage >= 60 ? "text-blue-600" : "text-amber-600";
                            })()
                          )}>
                            {(() => {
                              const stepsCount = [scenes.length > 0, hasShotListData, hasScheduleData, hasBudgetData, hasSourcingData, hasOutreachData, hasCallSheetData].filter(Boolean).length;
                              const stepProgress = isExecutingAll ? (currentStepIndex / executionSteps.length) * 100 : (stepsCount / executionSteps.length) * 100;
                              return Math.round(stepProgress);
                            })()}%
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            {(() => {
                              const stepsCount = [scenes.length > 0, hasShotListData, hasScheduleData, hasBudgetData, hasSourcingData, hasOutreachData, hasCallSheetData].filter(Boolean).length;
                              const stepProgress = isExecutingAll ? (currentStepIndex / executionSteps.length) * 100 : (stepsCount / executionSteps.length) * 100;
                              return stepProgress >= 100 ? "Ready for Execution" : isExecutingAll ? `Executing: ${executionSteps[currentStepIndex].toUpperCase()}` : "System Breakdown Active";
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="col-span-1 md:col-span-2 bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <CardHeader className="bg-slate-50 border-b-2 border-black flex flex-row items-center justify-between py-4 px-6">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          Production Hub
                        </CardTitle>
                        {isExecutingAll && (
                          <Badge className="animate-pulse bg-black text-white border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                            Sequence Live
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y-2 divide-slate-100">
                          {executionSteps.map((stepKey, index) => {
                            const statusObj = project.agentStatuses?.[stepKey as keyof NonNullable<Project['agentStatuses']>] || { status: 'idle' };
                            const isApproved = !!statusObj.isApproved;
                            const prevStep = index > 0 ? executionSteps[index - 1] : null;
                            const isLocked = prevStep ? !(project.agentStatuses?.[prevStep as keyof NonNullable<Project['agentStatuses']>]?.isApproved) : false;
                            
                            const isRunning = (isExecutingAll && !isPaused && executionSteps[currentStepIndex] === stepKey) || 
                                              (stepKey === 'breakdown' && isAnalyzing) ||
                                              (stepKey === 'shotlist' && isGeneratingShotList) ||
                                              (stepKey === 'schedule' && isGeneratingSchedule) ||
                                              (stepKey === 'budget' && isGeneratingBudget) ||
                                              (stepKey === 'sourcing' && isGeneratingSourcing) ||
                                              (stepKey === 'outreach' && isGeneratingOutreach) ||
                                              (stepKey === 'callsheets' && isGeneratingCallSheets);
                            
                            const isStale = statusObj.status === 'completed' && (project.version || 0) > (statusObj.version || 0);
                            
                            return (
                              <div key={stepKey} className={cn(
                                "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors",
                                isLocked && "opacity-60 pointer-events-none bg-slate-50/10"
                              )}>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border-2",
                                    isRunning ? "bg-blue-100 border-blue-200 text-blue-600 animate-pulse" :
                                    statusObj.status === 'completed' ? (isApproved ? "bg-green-100 border-green-200 text-green-600" : "bg-amber-100 border-amber-200 text-amber-600") :
                                    statusObj.status === 'failed' ? "bg-red-100 border-red-200 text-red-600" :
                                    "bg-slate-100 border-slate-200 text-slate-400"
                                  )}>
                                    {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                     statusObj.status === 'completed' ? (isApproved ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />) :
                                     statusObj.status === 'failed' ? <AlertTriangle className="w-5 h-5" /> :
                                     <Clock className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold capitalize">{stepKey === 'shotlist' ? 'Shot List' : stepKey} Agent</h4>
                                      {isRunning && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200 uppercase font-black tracking-widest">Running</Badge>}
                                      {isStale && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">Outdated</Badge>}
                                      {isLocked && <Badge variant="secondary" className="text-[9px] bg-slate-200 text-slate-500 font-black px-2 py-0 border-none uppercase tracking-widest">Locked</Badge>}
                                      {statusObj.status === 'completed' && !isApproved && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 uppercase font-black tracking-widest">Review Req</Badge>}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      {isLocked ? `Complete and approve the ${prevStep} agent to unlock.` :
                                       isRunning ? "Production engine is actively processing..." :
                                       statusObj.status === 'completed' ? (isApproved ? `Synchronized: ${statusObj.lastRun?.toDate ? statusObj.lastRun.toDate().toLocaleTimeString() : 'Recent'}` : "Analysis complete. Awaiting production manager approval.") :
                                       "Ready for production pass."}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {statusObj.status === 'completed' && !isApproved && !isLocked && (
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      className="h-8 text-[10px] font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 gap-1.5 shadow-sm"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!id) return;
                                        await updateDoc(doc(db, 'projects', id), {
                                          [`agentStatuses.${stepKey}.isApproved`]: true
                                        });
                                      }}
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Approve
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-xs font-bold"
                                    onClick={() => navigate(`/projects/${id}/${stepKey}`)}
                                  >
                                    {statusObj.status === 'completed' ? 'Review' : 'View'}
                                  </Button>
                                  {!isLocked && (
                                    <Button 
                                      variant={statusObj.status === 'completed' && !isStale ? "outline" : "default"}
                                      size="sm" 
                                      className={cn(
                                        "h-8 text-[10px] font-black uppercase tracking-widest gap-2 min-w-[100px]",
                                        statusObj.status !== 'completed' && "bg-slate-900 border-slate-900 text-white hover:bg-black"
                                      )}
                                      disabled={isRunning || isAnyAgentRunning}
                                      onClick={() => {
                                        if (stepKey === 'breakdown') handleRunBreakdown();
                                        else if (stepKey === 'shotlist') runShotListStep();
                                        else if (stepKey === 'schedule') runScheduleStep();
                                        else if (stepKey === 'budget') runBudgetStep();
                                        else if (stepKey === 'sourcing') runSourcingStep();
                                        else if (stepKey === 'outreach') runOutreachStep();
                                        else if (stepKey === 'callsheets') runCallSheetStep();
                                      }}
                                    >
                                      {statusObj.status === 'completed' ? (isStale ? 'Sync Now' : 'Re-run') : 'Start Agent'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium italic">
                            <Sparkles className="w-3 h-3" />
                            Curbily Autonomous Production Engine
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                              disabled={isExporting}
                              onClick={async () => {
                                const isIframe = window.self !== window.top;
                                if (isIframe) {
                                  toast.info('For best results, click "Open App" in the top right to download from a new tab.', {
                                    duration: 6000
                                  });
                                }

                                setIsExporting(true);
                                const loadingToast = toast.loading('Gathering full project data for report...');
                                
                                try {
                                  // Fetch EVERYTHING with detailed error handling
                                  const fetchCollection = async (collName: string, queryRef?: any) => {
                                    try {
                                      const snap = await getDocs(queryRef || collection(db, `projects/${id}/${collName}`));
                                      return snap;
                                    } catch (err) {
                                      console.error(`Failed to fetch ${collName}:`, err);
                                      throw new Error(`Data access denied: ${collName}`);
                                    }
                                  };

                                  const [budgetSnap, scenesSnap, shotsSnap, venuesSnap, gearSnap, propsSnap, wardrobeSnap, scheduleSnap, callsheetsSnap] = await Promise.all([
                                    fetchCollection('budget'),
                                    fetchCollection('scenes'),
                                    fetchCollection('shots'),
                                    fetchCollection('venues'),
                                    fetchCollection('gear'),
                                    fetchCollection('props'),
                                    fetchCollection('wardrobe'),
                                    fetchCollection('schedule', query(collection(db, `projects/${id}/schedule`), orderBy('dayNumber', 'asc'))),
                                    fetchCollection('call_sheets')
                                  ]);

                                  const reportData = {
                                    project,
                                    budget: budgetSnap.docs.map(d => d.data()),
                                    scenes: scenesSnap.docs.map(d => d.data()),
                                    shots: shotsSnap.docs.map(d => d.data()),
                                    venues: venuesSnap.docs.map(d => d.data()),
                                    gear: gearSnap.docs.map(d => d.data()),
                                    props: propsSnap.docs.map(d => d.data()),
                                    wardrobe: wardrobeSnap.docs.map(d => d.data()),
                                    schedule: scheduleSnap.docs.map(d => d.data()),
                                    callsheets: callsheetsSnap.docs.map(d => d.data())
                                  };

                                  // Create a specialized report element
                                  const reportEl = document.createElement('div');
                                  reportEl.style.padding = '40px';
                                  reportEl.style.backgroundColor = '#ffffff';
                                  reportEl.style.color = '#000000';
                                  reportEl.style.fontFamily = 'Inter, sans-serif';
                                  reportEl.className = 'pdf-report-container';

                                  reportEl.innerHTML = `
                                    <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                                      <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; margin: 0;">${project.title}</h1>
                                      <p style="text-transform: uppercase; font-size: 12px; letter-spacing: 2px; color: #666; margin-top: 5px;">Production Master Report • ID: ${project.id}</p>
                                    </div>

                                    ${reportData.callsheets.length > 0 ? `
                                      <div style="margin-bottom: 40px;">
                                        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Daily Call Sheets</h2>
                                        ${reportData.callsheets.sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((cs:any) => `
                                          <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fff;">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                                              <div>
                                                <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">Production Date</div>
                                                <div style="font-size: 14px; font-weight: bold;">${cs.date}</div>
                                              </div>
                                              <div style="text-align: right;">
                                                <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase;">General Call</div>
                                                <div style="font-size: 14px; font-weight: bold;">${cs.callTime}</div>
                                              </div>
                                            </div>
                                            <div style="margin-bottom: 15px;">
                                              <div style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Location</div>
                                              <div style="font-size: 11px;">${cs.location}</div>
                                            </div>
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                              <div>
                                                <div style="font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 4px;">Cast Call</div>
                                                <div style="font-size: 10px;">
                                                  ${(cs.cast || []).map((c:any) => `
                                                    <div style="margin-bottom: 4px;">${c.name} (${c.character}) - ${c.callTime}</div>
                                                  `).join('') || 'No cast calls.'}
                                                </div>
                                              </div>
                                              <div>
                                                <div style="font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 4px;">Crew Call</div>
                                                <div style="font-size: 10px;">
                                                  ${(cs.crew || []).map((c:any) => `
                                                    <div style="margin-bottom: 4px;">${c.name} (${c.role}) - ${c.callTime}</div>
                                                  `).join('') || 'No crew calls.'}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        `).join('')}
                                      </div>
                                    ` : ''}

                                    <div style="margin-bottom: 40px; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Project Overview</h2>
                                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                        <div>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Status:</strong> ${project.status.toUpperCase()}</p>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Content Type:</strong> ${project.contentType || 'Not Specified'}</p>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Budget Tier:</strong> ${project.budgetTier || 'Not Specified'}</p>
                                        </div>
                                        <div>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Total Budget:</strong> $${reportData.budget.reduce((accValue:any, bItem:any) => accValue + (bItem.amount || 0), 0).toLocaleString()}</p>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Scenes:</strong> ${reportData.scenes.length}</p>
                                          <p style="font-size: 12px; margin: 4px 0;"><strong>Shots:</strong> ${reportData.shots.length}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div style="margin-bottom: 40px; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Script Breakdown (${reportData.scenes.length} Scenes)</h2>
                                      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                        <thead>
                                          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                            <th style="padding: 10px 8px; text-align: left; width: 40px;">SC#</th>
                                            <th style="padding: 10px 8px; text-align: left;">SLUGLINE & BREAKDOWN</th>
                                            <th style="padding: 10px 8px; text-align: left; width: 100px;">LOCATION</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${reportData.scenes.sort((a:any, b:any) => (a.sceneNumber || 0) - (b.sceneNumber || 0)).map((s:any) => `
                                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                              <td style="padding: 12px 8px; font-weight: 900; vertical-align: top;">${s.sceneNumber}</td>
                                              <td style="padding: 12px 8px; vertical-align: top;">
                                                <div style="font-weight: bold; margin-bottom: 8px;">${s.slugline}</div>
                                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9px; color: #475569;">
                                                  <div>
                                                    <span style="font-weight: bold; text-transform: uppercase; font-size: 8px; color: #64748b;">Cast:</span> ${s.cast?.join(', ') || 'None'}
                                                  </div>
                                                  <div>
                                                    <span style="font-weight: bold; text-transform: uppercase; font-size: 8px; color: #64748b;">Props:</span> ${s.props?.join(', ') || 'None'}
                                                  </div>
                                                </div>
                                                ${s.notes ? `<div style="margin-top: 8px; font-style: italic; color: #64748b;">Notes: ${s.notes}</div>` : ''}
                                              </td>
                                              <td style="padding: 12px 8px; vertical-align: top; font-weight: 600;">${s.location}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div style="margin-bottom: 40px; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Shot List (${reportData.shots.length} Shots)</h2>
                                      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                        <thead>
                                          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                            <th style="padding: 10px 8px; text-align: left; width: 60px;">SHOT#</th>
                                            <th style="padding: 10px 8px; text-align: left; width: 80px;">SIZE/ANGLE</th>
                                            <th style="padding: 10px 8px; text-align: left;">DESCRIPTION</th>
                                            <th style="padding: 10px 8px; text-align: left; width: 100px;">EQUIPMENT</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${reportData.shots.sort((a:any, b:any) => (a.sceneNumber || 0) - (b.sceneNumber || 0) || (a.shotNumber || 0) - (b.shotNumber || 0)).map((sh:any) => `
                                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                              <td style="padding: 10px 8px; font-weight: bold;">${sh.sceneNumber ? `Sc ${sh.sceneNumber}` : ''} ${sh.shotNumber}</td>
                                              <td style="padding: 10px 8px;">${sh.size} ${sh.angle}</td>
                                              <td style="padding: 10px 8px;">${sh.description}</td>
                                              <td style="padding: 10px 8px; color: #64748b;">${sh.equipment || ''}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div style="margin-bottom: 40px; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Production Schedule</h2>
                                      ${reportData.schedule.map((d:any) => `
                                        <div style="margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                          <div style="background: #0f172a; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                                            <span style="font-weight: 900; font-size: 14px; letter-spacing: 1px;">DAY ${d.dayNumber}</span>
                                            <span style="font-weight: 600; font-size: 10px; opacity: 0.8; text-transform: uppercase;">${d.date || 'To Be Determined'}</span>
                                          </div>
                                          <div style="padding: 16px;">
                                            <div style="margin-bottom: 10px;">
                                              <span style="text-transform: uppercase; font-size: 9px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Scenes to Shoot</span>
                                              <div style="font-size: 12px; font-weight: bold; display: flex; flex-wrap: wrap; gap: 8px;">
                                                ${(d.sceneNumbers || []).map((sn:any) => `
                                                  <div style="background: #f1f5f9; padding: 6px 12px; border-radius: 4px;">
                                                    <div>Sc ${sn}</div>
                                                    <div style="font-size: 8px; font-weight: normal; color: #64748b;">
                                                      ${(reportData.scenes.find((s:any) => s.sceneNumber === sn) as any)?.slugline?.substring(0, 30) || ''}...
                                                    </div>
                                                  </div>
                                                `).join('') || 'None'}
                                              </div>
                                            </div>
                                            <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px">
                                              <span style="text-transform: uppercase; font-size: 9px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Daily Notes & Goals</span>
                                              <p style="font-size: 11px; color: #334155; margin: 0; line-height: 1.5;">${d.notes || 'No specific notes for this day.'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      `).join('')}
                                    </div>

                                    <div style="margin-bottom: 40px; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Detailed Budget</h2>
                                      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        <thead>
                                          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                            <th style="padding: 10px 8px; text-align: left;">CATEGORY</th>
                                            <th style="padding: 10px 8px; text-align: left;">DESCRIPTION</th>
                                            <th style="padding: 10px 8px; text-align: right;">TOTAL</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${reportData.budget.map((bItem:any) => `
                                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                              <td style="padding: 10px 8px; font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 9px;">${bItem.category}</td>
                                              <td style="padding: 10px 8px;">${bItem.description}</td>
                                              <td style="padding: 10px 8px; text-align: right; font-weight: bold;">$${(bItem.amount || 0).toLocaleString()}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                        <tfoot>
                                          <tr style="background: #0f172a; color: #fff; font-weight: 900;">
                                            <td colspan="2" style="padding: 12px 8px; text-align: right; text-transform: uppercase;">Estimated Production Cost</td>
                                            <td style="padding: 12px 8px; text-align: right; font-size: 14px;">$${reportData.budget.reduce((accValue:any, bItem:any) => accValue + (bItem.amount || 0), 0).toLocaleString()}</td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>

                                    <div style="margin-bottom: 0; page-break-before: always;">
                                      <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Sourcing & Marketplace</h2>
                                      
                                      <div style="margin-bottom: 25px;">
                                        <h3 style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 12px;">Locations</h3>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                          ${reportData.venues.map((v:any) => `
                                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                              <div style="font-weight: bold; font-size: 12px;">${v.name}</div>
                                              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Status: ${v.status}</div>
                                              <div style="font-weight: 900; color: #0f172a; font-size: 11px; margin-top: 8px;">$${(v.cost || 0).toLocaleString()}</div>
                                            </div>
                                          `).join('') || '<div style="color: #94a3b8; font-size: 11px;">No locations sourced.</div>'}
                                        </div>
                                      </div>

                                      <div style="margin-bottom: 25px;">
                                        <h3 style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 12px;">Equipment & Gear</h3>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                          ${reportData.gear.map((g:any) => `
                                            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                                              <div style="font-weight: bold; font-size: 12px;">${g.name}</div>
                                              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">${g.category}</div>
                                              <div style="font-weight: 900; color: #0f172a; font-size: 11px; margin-top: 8px;">$${(g.cost || 0).toLocaleString()}</div>
                                            </div>
                                          `).join('') || '<div style="color: #94a3b8; font-size: 11px;">No gear sourced.</div>'}
                                        </div>
                                      </div>

                                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                        <div>
                                          <h3 style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 12px;">Props & Set Dress</h3>
                                          ${reportData.props.map((p:any) => `
                                            <div style="font-size: 10px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
                                              <strong>${p.name}</strong> - $${(p.cost || 0).toLocaleString()} (${p.source})
                                            </div>
                                          `).join('') || '<div style="color: #94a3b8; font-size: 11px;">No props sourced.</div>'}
                                        </div>
                                        <div>
                                          <h3 style="font-size: 11px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 12px;">Wardrobe</h3>
                                          ${reportData.wardrobe.map((w:any) => `
                                            <div style="font-size: 10px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
                                              <strong>${w.character}</strong> - $${(w.cost || 0).toLocaleString()} (${w.source})
                                            </div>
                                          `).join('') || '<div style="color: #94a3b8; font-size: 11px;">No wardrobe sourced.</div>'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div style="margin-top: 60px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                                      <p style="font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Generated by Curbily AI Production System</p>
                                    </div>
                                  `;

                                  document.body.appendChild(reportEl);

                                  const opt = {
                                    margin: 0.5,
                                    filename: `${project?.title || 'Production'}-Master-Report.pdf`,
                                    image: { type: 'jpeg' as const, quality: 1.0 },
                                    html2canvas: { 
                                      scale: 2,
                                      useCORS: true,
                                      allowTaint: true,
                                      logging: false,
                                      backgroundColor: '#ffffff'
                                    },
                                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
                                    pagebreak: { mode: ['css' as const, 'avoid-all' as const] }
                                  };
                                  
                                  await html2pdf().set(opt).from(reportEl).save();
                                  
                                  // Cleanup
                                  document.body.removeChild(reportEl);
                                  
                                  toast.success('Master Project Report exported successfully!', { id: loadingToast });
                                } catch (err) {
                                  console.error('PDF export failed:', err);
                                  const errMsg = err instanceof Error ? err.message : 'Unknown error';
                                  toast.error(`Export failed: ${errMsg}`, { id: loadingToast });
                                } finally {
                                  setIsExporting(false);
                                }
                              }}
                            >
                              {isExporting ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Exporting...
                                </>
                              ) : (
                                <>
                                  <Printer className="w-3 h-3" />
                                  Export Full PDF
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <CardHeader className="bg-slate-50 border-b-2 border-black py-4 px-6">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-black flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-3 h-12 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          onClick={() => setIsUpdatingScript(true)}
                        >
                          <FileText className="w-4 h-4" />
                          <div className="text-left">
                            <p className="text-sm font-bold leading-none">Update Script</p>
                            <p className="text-[10px] text-slate-400 mt-1">G-Doc, PDF or Text</p>
                          </div>
                        </Button>

                        {project.scriptUrl && (
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 h-12 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            onClick={project.scriptUrl.includes('spreadsheets') ? handleGoogleSheetImport : handleGoogleDocImport}
                            disabled={isProcessing}
                          >
                            <RefreshCw className={cn("w-4 h-4", isProcessing && "animate-spin")} />
                            <div className="text-left">
                              <p className="text-sm font-bold leading-none">Sync with Source</p>
                              <p className="text-[10px] text-slate-400 mt-1">Refresh script data</p>
                            </div>
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-3 h-12 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          onClick={() => navigate(`/projects/${id}/locations`)}
                        >
                          <MapPin className="w-4 h-4" />
                          <div className="text-left">
                            <p className="text-sm font-bold leading-none">Manage Locations</p>
                            <p className="text-[10px] text-slate-400 mt-1">Permits & scouting</p>
                          </div>
                        </Button>

                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-3 h-12 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          onClick={() => navigate(`/projects/${id}/org-chart`)}
                        >
                          <Users className="w-4 h-4" />
                          <div className="text-left">
                            <p className="text-sm font-bold leading-none">Organization Chart</p>
                            <p className="text-[10px] text-slate-400 mt-1">Crew structure & hierarchy</p>
                          </div>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'production' && project && (
              <ProductionHub project={project} days={days} scenes={scenes} />
            )}
            {activeTab === 'locations' && (
              <LocationManager project={project} />
            )}
            {activeTab === 'permits' && (
              <Permits project={project} />
            )}
            {activeTab === 'breakdown' && (
              <div className="flex flex-col gap-4">
                {project?.agentStatuses?.breakdown?.status === 'completed' && !project?.agentStatuses?.breakdown?.isApproved && (
                  <Card className="bg-amber-50 border-[3px] border-amber-400 rounded-3xl shadow-[6px_6px_0px_0px_rgba(251,191,36,0.2)] overflow-hidden">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 text-amber-900">
                        <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center border-2 border-amber-300">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-tighter text-xl">Approval Required</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Review extraction to unlock sequence</p>
                        </div>
                      </div>
                      <Button 
                        onClick={async () => {
                          if (!id) return;
                          await updateDoc(doc(db, 'projects', id), {
                            'agentStatuses.breakdown.isApproved': true
                          });
                        }}
                        className="bg-black text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-xl transition-all active:scale-95"
                      >
                        Approve Master Breakdown
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <Breakdown projectId={project.id} project={project} />
              </div>
            )}
            {activeTab === 'shotlist' && (
              <ShotList 
                projectId={project.id} 
                scenes={scenes} 
                onGenerate={runShotListStep}
                isGenerating={isGeneratingShotList}
              />
            )}
            {activeTab === 'schedule' && (
              <Schedule 
                projectId={project.id} 
                project={project}
                onGenerate={runScheduleStep}
                isGenerating={isGeneratingSchedule}
              />
            )}
            {activeTab === 'dood' && (
              <DayOutOfDays
                days={days}
                scenes={scenes.reduce((acc, s) => {
                    acc[s.sceneNumber] = s;
                    return acc;
                  }, {} as Record<string, Scene>)
                }
              />
            )}
            {activeTab === 'budget' && (
              <Budget 
                projectId={project.id} 
                project={project} 
                onGenerate={runBudgetStep}
                isGenerating={isGeneratingBudget}
                onBudgetLocked={() => {
                  // After budget is locked, flag missing permits for known locations
                  if (project.locations) {
                    const missingPermits = project.locations.filter(l => !l.requiresPermit && !l.isBase);
                    if (missingPermits.length > 0) {
                      const updatedLocations = project.locations.map(l => 
                        (!l.requiresPermit && !l.isBase) ? { ...l, requiresPermit: true, permitStatus: 'needed' as const } : l
                      );
                      updateDoc(doc(db, 'projects', project.id), { locations: updatedLocations });
                    }
                  }
                  navigate(`/projects/${project.id}/permits`);
                }}
              />
            )}
            {activeTab === 'sourcing' && (
              <Sourcing 
                projectId={project.id} 
                scenes={scenes} 
                project={project} 
                onGenerate={runSourcingStep}
                isGenerating={isGeneratingSourcing}
              />
            )}
            {activeTab === 'callsheets' && (
              <CallSheets projectId={project.id} project={project} />
            )}
            {activeTab === 'outreach' && (
              <OutreachAndComms projectId={project.id} project={project} />
            )}
            {activeTab === 'org-chart' && (
              <OrgChart projectId={project.id} project={project} />
            )}
            {activeTab === 'audit' && (
              <ChannelAudit project={project} />
            )}
            {activeTab === 'payments' && (
              <PaymentIntegration projectId={project.id} project={project} />
            )}
            {activeTab === 'export' && (
              <IndustryExport 
                project={project} 
                scenes={scenes} 
                days={days} 
                budget={budget} 
              />
            )}
          </div>

          {(project.status === 'wrap' || project.status === 'post-production' || project.status === 'completed') && (
            <section className="mt-12 space-y-6 flex-shrink-0">
              <div className="flex flex-col gap-1 px-4">
                <h2 className="text-xl font-black uppercase tracking-tight">Crew Reviews & Ratings</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Rate the hired crew performance for this project.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 pb-8">
                {contacts.filter(c => project.personnel?.some(p => p.id === c.id || p.contactId === c.id)).map(crew => (
                  <Card key={crew.id} className="border-none shadow-sm h-full">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase">
                          {crew.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{crew.name || 'Unnamed Member'}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{crew.roles?.[0] || 'Crew'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={cn(
                              "w-5 h-5 cursor-pointer transition-colors",
                              (crew.tempRating || 0) >= star ? "fill-amber-400 text-amber-400" : "text-slate-200 hover:text-amber-200"
                            )}
                            onClick={() => {
                              setContacts(prev => prev.map(c => c.id === crew.id ? { ...c, tempRating: star } : c));
                            }}
                          />
                        ))}
                      </div>
                      <Textarea 
                        placeholder="Write a brief review..." 
                        className="text-xs min-h-[60px]"
                        value={crew.tempComment || ''}
                        onChange={(e) => {
                          setContacts(prev => prev.map(c => c.id === crew.id ? { ...c, tempComment: e.target.value } : c));
                        }}
                      />
                      <Button 
                        size="sm" 
                        className="w-full text-[10px] font-black uppercase tracking-widest h-8"
                        onClick={async () => {
                          if (!crew.tempRating) {
                            toast.error('Please select a rating');
                            return;
                          }
                          try {
                            await addDoc(collection(db, 'ratings'), {
                              projectId: project.id,
                              raterId: user?.uid,
                              recipientId: crew.id,
                              score: crew.tempRating,
                              comment: crew.tempComment || '',
                              createdAt: serverTimestamp()
                            });
                            toast.success(`Review submitted for ${crew.name}`);
                          } catch (e) {
                            toast.error('Failed to submit review');
                          }
                        }}
                      >
                        Submit Review
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Assistant Sidebar */}
          <div className={`${showAssistant ? 'w-96' : 'w-0 overflow-hidden'} transition-all duration-300 relative shrink-0 flex flex-col h-[calc(100vh-4rem)] sticky top-2`}>
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute -left-4 top-4 z-10 h-8 w-8 rounded-full bg-white shadow-md border-slate-200"
              onClick={() => setShowAssistant(!showAssistant)}
            >
              {showAssistant ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            {showAssistant && (
              <div className="flex-1 overflow-hidden">
                <ProjectChat 
                  projectId={project.id} 
                  currentTab={activeTab} 
                  onHide={() => setShowAssistant(false)} 
                  onRunAgent={async (type, payload) => {
                    switch (type) {
                      case 'runSourcing':
                        await runSourcingStep(payload?.category);
                        break;
                      case 'runBudget':
                        await runBudgetStep();
                        break;
                      case 'runBreakdown':
                        await handleRunBreakdown();
                        break;
                      case 'runShotList':
                        await runShotListStep();
                        break;
                      case 'runSchedule':
                        await runScheduleStep();
                        break;
                      case 'syncSourcingToBudget':
                        await handleSyncBudgetFromSourcing();
                        break;
                    }
                  }}
                />
              </div>
            )}
          </div>

          {!showAssistant && (
            <Button 
              variant="outline" 
              size="sm" 
              className="fixed bottom-6 right-6 gap-2 shadow-lg bg-white border-slate-200 rounded-full py-6 px-6"
              onClick={() => setShowAssistant(true)}
            >
              <MessageSquare className="w-4 h-4" />
              Production Assistant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
