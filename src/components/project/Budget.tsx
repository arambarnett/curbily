import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, writeBatch, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthProvider';
import { BudgetItem, Scene, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Sparkles, DollarSign, TrendingUp, TrendingDown, Minus, History, Edit2, Check, X, Percent, Settings2, ShieldCheck, Landmark, Download, Info, Trash2, Plus, Box, ShieldAlert, ChevronDown, ChevronUp, Zap, ExternalLink, RotateCcw, Users, RefreshCw, Loader2 } from 'lucide-react';
import { budget, budgetRecommendation } from '../../lib/gemini';
import { unionRateService } from '../../services/unionRateService';
import { getBudgetTier } from '../../utils/projectUtils';
import { Badge } from '../ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { RateValidation } from '../common/RateValidation';
import { UNION_ROLES, UNION_OCC_CODES } from '../../constants/unionData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import PersonnelAssignment from './PersonnelAssignment';
import { Contact } from '../../types';

const COLORS = [
  '#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

import { getTaxIncentives } from '../../lib/agents/finance/taxIncentives';

const EditableInput = ({ initialValue, onSave, className }: { initialValue: number, onSave: (val: number) => void, className?: string }) => {
  const [val, setVal] = useState<string | number>(initialValue);
  
  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <Input 
      type="number"
      className={className}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const num = Number(val);
        if (!isNaN(num) && num !== initialValue) {
          onSave(num);
        }
      }}
    />
  );
};

import { ensureApiKey } from '../../lib/apiKeyCheck';

export default function Budget({ projectId, project, onGenerate, isGenerating: isGeneratingProp, onBudgetLocked }: { projectId: string, project: Project, onGenerate?: () => void, isGenerating?: boolean, onBudgetLocked?: () => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const hasSubscription = profile?.subscription === 'pro' || profile?.subscription === 'agency' || profile?.subscription === 'enterprise';

  const currentData = React.useMemo(() => {
    const data = [...items];
    if (!hasSubscription) {
      const curbilyItem: BudgetItem = {
        id: 'curbily-upsell',
        category: 'Software & Technology',
        description: 'Curbily Production Suite (One-time cost)',
        rate: 39,
        amount: 39,
        quantity: 1,
        unit: 'flat',
        status: 'estimated',
        details: 'Upsell to subscription to waive this fee!',
        projectId: projectId,
        isCurbilyUpsell: true
      } as any;
      data.push(curbilyItem);
    }
    return data;
  }, [items, hasSubscription, projectId]);
  const [scheduleDays, setScheduleDays] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [agentProgress, setAgentProgress] = useState<string>('');
  const [isReverting, setIsReverting] = useState(false);
  const isGenerating = isGeneratingProp || isGeneratingLocal;
  const [taxData, setTaxData] = useState<any>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [targetInput, setTargetInput] = useState(project.targetBudget || 0);
  const [isGlobalRatesOpen, setIsGlobalRatesOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState<{ isOpen: boolean, itemId: string | null, role: string, category: string }>({ isOpen: false, itemId: null, role: '', category: '' });
  const [globalTier, setGlobalTier] = useState<'budget' | 'rateLow' | 'rateMedium' | 'rateHigh'>('budget');
  const [activeTab, setActiveTab] = useState<'top-sheet' | 'line-items' | 'incentives' | 'history'>('top-sheet');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof BudgetItem | 'total', direction: 'asc' | 'desc' } | null>(null);

  const uniqueRoles = Array.from(new Set(items.map(i => i.description))) as string[];

  const handleUpdateGlobalRate = async (description: string, newRate: number) => {
    const matchingItems = items.filter(i => i.description === description);
    
    // Batch update all items
    const batch = writeBatch(db);
    matchingItems.forEach(item => {
      const itemRef = doc(db, `projects/${projectId}/budget`, item.id);
      batch.update(itemRef, {
        rate: newRate,
        amount: newRate * (item.quantity || 1)
      });
    });

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}/budget (batch global rate update)`);
    }
  };
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSourcing = async () => {
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      const fetchCol = async (col: string) => {
        const snap = await getDocs(collection(db, `projects/${projectId}/${col}`));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      };

      const venues = await fetchCol('venues');
      const gear = await fetchCol('gear');
      const props = await fetchCol('props');
      const wardrobe = await fetchCol('wardrobe');

      const syncItems = [
        ...venues.map((v: any) => ({ name: v.name || '', cost: v.cost || 0, category: 'Location', description: v.name || 'Unnamed Venue', details: v.notes || '' })),
        ...gear.map((g: any) => ({ name: g.name || '', cost: g.cost || 0, category: 'Equipment', description: g.name || 'Unnamed Gear', details: g.category || '' })),
        ...props.map((p: any) => ({ name: p.name || '', cost: p.cost || 0, category: 'Props', description: p.name || 'Unnamed Prop', details: p.description || '' })),
        ...wardrobe.map((w: any) => ({ name: w.character || w.description || '', cost: w.cost || 0, category: 'Wardrobe', description: w.character || w.description || 'Unnamed Wardrobe', details: w.description || '' }))
      ];

      for (const item of syncItems) {
        const match = items.find(ei => {
          const eiDesc = (ei.description || '').toLowerCase();
          const itemDesc = (item.description || '').toLowerCase();
          if (!eiDesc || !itemDesc) return false;
          return eiDesc.includes(itemDesc) || itemDesc.includes(eiDesc);
        });

        if (match) {
          batch.update(doc(db, `projects/${projectId}/budget`, match.id), {
            rate: item.cost || 0,
            amount: (item.cost || 0) * (match.quantity || 1),
            details: item.details || (match as any).details || '',
            status: 'sourced',
            ownerId: profile?.uid,
            updatedAt: now
          });
        } else {
          const newRef = doc(collection(db, `projects/${projectId}/budget`));
          batch.set(newRef, {
            projectId,
            ownerId: profile?.uid,
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
      toast.success('Sourcing data synced to budget');
    } catch (e) {
      console.error('Sync failed:', e);
      toast.error('Failed to sync sourcing data');
    } finally {
      setIsSyncing(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSheetsDialogOpen, setIsSheetsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    category: 'Crew',
    description: '',
    rate: 0,
    quantity: 1,
    unit: 'daily',
    status: 'estimated'
  });

  const baseCategories = [
    "Cast", "Stunts", "Producers", "Directors", "Writers", 
    "Camera", "Grip", "Electric", "Art Department", "Wardrobe", 
    "Hair & Makeup", "Sound", "Locations", "Editing", "VFX", 
    "Coloring", "Sound Mixing", "Permits", "Insurance", "Legal", 
    "Production Operations & Supplies", "Contingency"
  ];
  const categories = Array.from(new Set([...baseCategories, ...currentData.map(i => i.category || 'Other')]));

  const stateIncentives: Record<string, { rate: number, description: string }> = {
    'GA': { rate: 0.30, description: 'Georgia: 20% base + 10% for logo' },
    'NY': { rate: 0.25, description: 'New York: 25% fully refundable' },
    'CA': { rate: 0.20, description: 'California: 20-25% non-refundable' },
    'NM': { rate: 0.25, description: 'New Mexico: 25-30% refundable' },
    'LA': { rate: 0.25, description: 'Louisiana: 25% base + 5% for local labor' },
    'TX': { rate: 0.22, description: 'Texas: 5-22% cash grant' },
    'IL': { rate: 0.30, description: 'Illinois: 30% tax credit' },
    'NC': { rate: 0.25, description: 'North Carolina: 25% grant' },
    'OH': { rate: 0.30, description: 'Ohio: 30% refundable tax credit' },
    'OTHER': { rate: 0, description: 'Other State / International / Multi-location' }
  };

  const [selectedState, setSelectedState] = useState<string>(() => {
    const loc = project.location?.toUpperCase() || '';
    const found = Object.keys(stateIncentives).find(key => 
      loc.includes(key) || (key !== 'OTHER' && project.location?.includes(key))
    );
    return found || 'OTHER';
  });
  const [customIncentive, setCustomIncentive] = useState(0);

  useEffect(() => {
    setTargetInput(project.targetBudget || 0);
  }, [project.targetBudget]);

  useEffect(() => {
    const qBudget = query(collection(db, 'projects', projectId, 'budget'));
    const unsubBudget = onSnapshot(qBudget, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/budget`);
    });

    const qSchedule = query(collection(db, 'projects', projectId, 'schedule'));
    const unsubSchedule = onSnapshot(qSchedule, (snapshot) => {
      setScheduleDays(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/schedule`);
    });

    const qScenes = query(collection(db, 'projects', projectId, 'scenes'));
    const unsubScenes = onSnapshot(qScenes, (snapshot) => {
      setScenes(snapshot.docs.map(doc => doc.data() as Scene));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    const qContacts = query(collection(db, 'contacts'));
    const unsubContactsScroll = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    return () => {
        unsubBudget();
        unsubSchedule();
        unsubScenes();
        unsubContactsScroll();
      };
  }, [projectId]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const qHistory = query(collection(db, 'projects', projectId, 'budget_history'), firestoreOrderBy('createdAt', 'desc'), limit(20));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('History Snapshot Error:', error);
      if (error.message.includes('requires an index')) {
        toast.error('History index is being built. Please wait a moment.');
      }
    });
    return () => unsubHistory();
  }, [projectId]);

  const saveToHistory = async (itemsToSave: BudgetItem[], note: string = "Automatic snapshot") => {
    if (itemsToSave.length === 0) return;
    try {
      const dataToSave = {
        items: itemsToSave.map(item => ({
          category: item.category || 'Other',
          description: item.description || '',
          amount: item.amount || 0,
          rate: item.rate || 0,
          quantity: item.quantity || 1,
          unit: item.unit || 'flat',
          status: item.status || 'estimated',
          details: item.details || ''
        })),
        total: itemsToSave.reduce((sum, i) => sum + (i.amount || 0), 0),
        note,
        createdAt: serverTimestamp()
      };
      
      console.log('Saving snapshot:', dataToSave);
      await addDoc(collection(db, 'projects', projectId, 'budget_history'), dataToSave);
      toast.success('Budget snapshot saved');
    } catch (e) {
      console.error('Failed to save budget history:', e);
      toast.error('Failed to save snapshot: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleRestoreVersion = async (version: any) => {
    setIsReverting(true);
    try {
      // Save current as a "Pre-restore" snapshot first
      await saveToHistory(items, "Automatically saved before restoring a previous version");

      const clearBatch = writeBatch(db);
      items.forEach(item => {
        clearBatch.delete(doc(db, `projects/${projectId}/budget`, item.id));
      });
      await clearBatch.commit();

      const batch = writeBatch(db);
      version.items.forEach((item: any) => {
        const ref = doc(collection(db, 'projects', projectId, 'budget'));
        const { id, ...dataToRestore } = item;
        batch.set(ref, { ...dataToRestore, projectId });
      });
      await batch.commit();
      setIsHistoryOpen(false);
    } catch (err) {
      console.error('Failed to restore budget version:', err);
    } finally {
      setIsReverting(false);
    }
  };

  const handleGenerateBudget = async () => {
    if (items.length > 0) {
      await saveToHistory(items, "Before regeneration");
    }
    if (onGenerate) {
      onGenerate();
      return;
    }
    await ensureApiKey();
    setIsGeneratingLocal(true);
    try {
      // Pass simplified contact data to help AI with real rates
      const personnelInfo = contacts.map(c => ({
        id: c.id,
        name: c.name,
        roles: c.roles,
        rate: c.rate,
        type: c.type
      }));

      const fetchCollectionData = async (col: string) => {
        const snap = await getDocs(query(collection(db, `projects/${projectId}/${col}`)));
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
      };

      const customRates = await unionRateService.getRatesForAgent();
      const canonicalRates = await unionRateService.getCanonicalRatesForAgent();
      
      const newBudgetItems = await budget(
        scenes, 
        !!project.isSAG, 
        project.location, 
        personnelInfo, 
        project.contentType, 
        project.permitSummary, 
        scheduleDays,
        [...customRates, ...canonicalRates],
        project.targetBudget || 0,
        sourcingData,
        project.budgetTier,
        setAgentProgress,
        items
      );
      
      const budgetBatch = writeBatch(db);
      const manualItems = items.filter(i => i.status === 'manual');

      // Clear only non-manual items
      items.forEach(item => {
        if (item.status !== 'manual') {
          budgetBatch.delete(doc(db, `projects/${projectId}/budget`, item.id));
        }
      });
      
      if (Array.isArray(newBudgetItems)) {
        newBudgetItems.forEach((item: any) => {
          if (!item) return;
          
          // Check for conflicts with manual items
          const itemDescLower = (item.description || item.item || item.name || '').toString().toLowerCase();
          const isConflict = manualItems.some((mi: any) => {
            const miDescLower = (mi.description || mi.item || mi.name || '').toString().toLowerCase();
            return miDescLower === itemDescLower && miDescLower !== '';
          });
          
          if (isConflict) return;

          const ref = doc(collection(db, 'projects', projectId, 'budget'));
          budgetBatch.set(ref, { 
            projectId,
            category: item.category || 'Other',
            description: item.description || item.item || item.name || 'Unspecified Line Item',
            details: item.details || item.notes || '',
            rate: Number(item.rate || item.amount || item.cost || 0),
            rateLow: Number(item.rateLow || item.rate || item.amount || 0),
            rateMedium: Number(item.rateMedium || item.rate || item.amount || 0),
            rateHigh: Number(item.rateHigh || item.rate || item.amount || 0),
            amount: Number(item.amount || item.total || (Number(item.rate || 0) * Number(item.quantity || 1)) || 0),
            unit: item.unit || 'flat',
            quantity: Number(item.quantity || 1),
            sourcingLink: item.sourcingLink || '',
            hourlyRate: Number(item.hourlyRate || 0),
            dayRate: Number(item.dayRate || 0),
            status: 'estimated',
            createdAt: serverTimestamp()
          });
        });
      }
      await budgetBatch.commit();
      setActiveTab('line-items');
    } catch (error) {
      console.error('Budget generation failed:', error);
    } finally {
      setIsGeneratingLocal(false);
      setAgentProgress('');
    }
  };

  const handleUpdateContingencyRate = async (rate: number) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { 
        contingencyRate: rate / 100
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Category', 'Description', 'Rate', 'Quantity', 'Unit', 'Amount', 'Status'];
    const rows = items.map(item => [
      item.category,
      item.description,
      item.rate || item.amount,
      item.quantity,
      item.unit,
      item.amount,
      item.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.title || 'Project'}_Budget.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateTargetBudget = async () => {
    try {
      const tier = getBudgetTier(targetInput, project.contentType);
      await updateDoc(doc(db, 'projects', projectId), { 
        targetBudget: targetInput,
        budgetTier: tier
      });
      setIsEditingTarget(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const toggleContingency = async (checked: boolean) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { 
        useContingency: checked,
        contingencyRate: checked ? 0.1 : 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const toggleSAG = async (checked: boolean) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { isSAG: checked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const handleUpdateBudget = async (item: BudgetItem) => {
    const newAmount = editRate * editQuantity;
    if (newAmount === item.amount && editQuantity === item.quantity && editRate === item.rate) {
      setEditingId(null);
      return;
    }

    try {
      const historyEntry = {
        date: new Date().toISOString(),
        oldAmount: item.amount,
        newAmount: newAmount,
        oldQuantity: item.quantity,
        newQuantity: editQuantity,
        oldRate: item.rate,
        newRate: editRate,
        note: editNote || 'Manual adjustment'
      };

      await updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
        rate: editRate,
        amount: newAmount,
        quantity: editQuantity,
        history: [...(item.history || []), historyEntry]
      });

      // Add notification
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'approval',
        title: 'Budget Updated',
        message: `Budget item "${item.description}" updated from $${item.amount} to $${newAmount}.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      setEditingId(null);
      setEditNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/budget/${item.id}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, `projects/${projectId}/budget`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/budget/${id}`);
    }
  };

  const handleApproveBudget = async () => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        budgetStatus: 'approved',
        budgetApprovedAt: serverTimestamp(),
        budgetApprovedBy: 'AI Studio Producer' // In a real app, this would be the logged in user's name
      });
      
      // Add notification
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'Budget Approved',
        message: 'The production budget has been officially approved and locked.',
        isRead: false,
        createdAt: serverTimestamp()
      });

      if (onBudgetLocked) {
        onBudgetLocked();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const loadTaxIncentives = async () => {
    if (taxData) return;
    setIsLoadingTax(true);
    try {
      const data = await getTaxIncentives(project.location || 'Georgia', total, project.contentType || 'feature');
      setTaxData(data);
    } catch (error) {
      console.error('Failed to load tax incentives:', error);
    } finally {
      setIsLoadingTax(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'incentives') {
      loadTaxIncentives();
    }
  }, [activeTab]);

  const handleAddManualItem = async () => {
    if (!newItem.description || !newItem.category) return;
    
    try {
      const amount = (newItem.rate || 0) * (newItem.quantity || 1);
      await addDoc(collection(db, 'projects', projectId, 'budget'), {
        ...newItem,
        amount,
        projectId,
        ownerId: profile?.uid,
        sortOrder: items.length,
        status: 'manual',
        createdAt: serverTimestamp()
      });
      setIsAddingItem(false);
      setNewItem({
        category: 'Crew',
        description: '',
        rate: 0,
        quantity: 1,
        unit: 'daily',
        status: 'estimated'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}/budget`);
    }
  };

  const sortedItems = React.useMemo(() => {
    let sortableItems = [...currentData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'total') {
          const aAmt = getEffectiveAmount(a);
          const bAmt = getEffectiveAmount(b);
          return sortConfig.direction === 'asc' ? aAmt - bAmt : bAmt - aAmt;
        }
        
        const aValue = a[sortConfig.key as keyof BudgetItem];
        const bValue = b[sortConfig.key as keyof BudgetItem];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      sortableItems.sort((a, b) => {
        const aOrder = typeof (a as any).sortOrder === 'number' ? (a as any).sortOrder : currentData.indexOf(a);
        const bOrder = typeof (b as any).sortOrder === 'number' ? (b as any).sortOrder : currentData.indexOf(b);
        return aOrder - bOrder;
      });
    }
    return sortableItems;
  }, [currentData, sortConfig]);

  const requestSort = (key: keyof BudgetItem | 'total') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getEffectiveAmount = (item: any) => {
    if (item.amount && item.amount !== 0) return Number(item.amount);
    return (Number(item.rate) || 0) * (Number(item.quantity) || 1);
  };

  const subtotal = currentData.reduce((sum, item) => {
    const amount = getEffectiveAmount(item);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const contingencyAmount = project.useContingency ? subtotal * (project.contingencyRate || 0.1) : 0;
  
  const incentiveRate = selectedState === 'OTHER' ? customIncentive / 100 : (stateIncentives[selectedState]?.rate || 0);
  const incentive = subtotal * incentiveRate;
  
  const total = subtotal + contingencyAmount - incentive;

  useEffect(() => {
    // Only update if it's materially different to avoid unnecessary writes
    if (Math.abs(total - ((project as any).estimatedBudget || 0)) > 1) {
      const timeoutId = setTimeout(() => {
        updateDoc(doc(db, 'projects', projectId), { estimatedBudget: total }).catch(console.error);
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [total, projectId, (project as any).estimatedBudget]);

  const categoryTotals = Array.from(new Set(currentData.map(i => i.category || 'Other'))).map(cat => {
    const amount = currentData.filter(i => (i.category || 'Other') === cat).reduce((sum, i) => {
      const itemAmount = getEffectiveAmount(i);
      return sum + (isNaN(itemAmount) ? 0 : itemAmount);
    }, 0);
    return { category: cat, amount };
  }).sort((a,b) => b.amount - a.amount);

  const filteredItems = sortedItems.filter(item => {
    const cat = item.category || 'Other';
    // Hide Categories as requested by user
    if (['Travel', 'Catering', 'Travel & Lodging', 'Craft Services'].includes(cat)) return false;
    
    if (categoryFilter === 'All') return true;
    return cat === categoryFilter;
  });

  const shouldGroup = sortConfig === null || sortConfig.key === 'category';

  const groupedItems = React.useMemo(() => {
    if (!shouldGroup) {
      return { 'All Items': filteredItems };
    }
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems, shouldGroup]);

  const moveBudgetItem = async (itemId: string, direction: -1 | 1) => {
    const movableItems = filteredItems.filter((item) => !(item as any).isCurbilyUpsell);
    const currentIndex = movableItems.findIndex((item) => item.id === itemId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= movableItems.length) return;

    const reordered = [...movableItems];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    setSortConfig(null);

    try {
      const batch = writeBatch(db);
      reordered.forEach((item, index) => {
        batch.update(doc(db, `projects/${projectId}/budget`, item.id), { sortOrder: index });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/budget reorder`);
    }
  };

  if (loading) return <div>Loading budget...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-sm">
              {project.budgetTier === 'Non-Union Skeleton Crew' 
                ? 'Rates Applied: Non-Union / Digital Freelance'
                : `UNION COMPLIANT: Automatically syncing standard rates based on ${project.budgetTier} tier.`}
            </h3>
            <p className="text-xs text-blue-700">The AI is cross-referencing real-time guild standards and market rates.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Budget
        </h2>
        
        <div className="flex flex-col items-end gap-1">
          {project.budgetTier && (
            <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 uppercase font-bold text-[9px] tracking-widest px-2 h-5 mb-1">
              Classified: {project.budgetTier}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/40 p-2 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('line-items')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase transition-all rounded-xl",
              activeTab === 'line-items' ? "bg-slate-900 text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            List
          </button>
          <button
            onClick={() => setActiveTab('top-sheet')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase transition-all rounded-xl",
              activeTab === 'top-sheet' ? "bg-slate-900 text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('visuals')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase transition-all rounded-xl flex items-center gap-2",
              activeTab === 'visuals' ? "bg-blue-600 text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Box className="w-3 h-3" />
            Charts
          </button>
          <button
            onClick={() => setActiveTab('incentives')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase transition-all rounded-xl flex items-center gap-2",
              activeTab === 'incentives' ? "bg-emerald-500 text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Landmark className="w-3 h-3" />
            Incentives
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase transition-all rounded-xl flex items-center gap-2",
              activeTab === 'history' ? "bg-amber-500 text-white shadow-lg scale-105" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <History className="w-3 h-3" />
            History
            {history.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[8px] min-w-[16px] flex items-center justify-center bg-slate-200 ml-1">
                {history.length}
              </Badge>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSyncSourcing} 
            disabled={isSyncing}
            className="gap-2 rounded-xl h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold uppercase"
          >
            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sync Sourcing
          </Button>

          <Dialog open={isGlobalRatesOpen} onOpenChange={setIsGlobalRatesOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="gap-2 rounded-xl h-9 border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold uppercase"><Settings2 className="w-3 h-3" /> Global Rates</Button>} />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Global Rate Builder</DialogTitle>
                <DialogDescription>Apply a base rate across all items matching the same role or description.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 py-4 pr-4">
                  {uniqueRoles.map(role => {
                    const matching = items.filter(i => i.description === role);
                    const avgRate = matching.reduce((sum, item) => sum + (item.rate || ((item.amount||0)/(item.quantity||1))), 0) / matching.length || 0;
                    return (
                      <div key={role} className="flex flex-col gap-2 p-3 border rounded-xl hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-slate-800">{role}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{matching.length} Items Found</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400">CURRENT RATE</span>
                            <div className="flex items-center bg-white border rounded-lg px-2 shadow-sm">
                              <span className="text-slate-400 font-mono text-sm mr-1">$</span>
                              <EditableInput 
                                className="w-24 h-9 text-right font-mono font-bold border-none shadow-none focus-visible:ring-0 p-0 text-sm"
                                initialValue={Math.round(avgRate)}
                                onSave={(newRate) => handleUpdateGlobalRate(role, newRate)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 border-slate-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300 text-[10px] font-bold uppercase"><Zap className="w-3 h-3 text-emerald-500" /> Sheets Sync</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Google Sheets 2-Way Sync</DialogTitle>
                <DialogDescription>
                  Sync this budget to a dynamic Google Sheet. Changes made in the sheet will automatically update this budget in Curbily.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sheet"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/><line x1="15" x2="15" y1="9" y2="21"/></svg>
                </div>
                <h3 className="font-bold text-center">Google Workspace Connection Required</h3>
                <p className="text-center text-sm text-slate-500 max-w-sm">
                  To enable real-time 2-way syncing, you must connect your Google Workspace account so we can automatically manage the connection to your Drive.
                </p>
                <Button className="w-full mt-4 bg-[#0a0a0a] text-white hover:bg-slate-800">
                  Connect Google Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={items.length === 0} className="gap-2 rounded-xl h-9 border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold uppercase">
            <Download className="w-3 h-3" />
            CSV
          </Button>

          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="gap-2 rounded-xl h-9 border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold uppercase"><History className="w-3 h-3" /> Versions</Button>} />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>Budget Version History</DialogTitle>
                    <DialogDescription>View changes or revert to a previous snapshot of your budget.</DialogDescription>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const note = prompt("Enter a name for this snapshot:");
                      if (note) saveToHistory(items, note);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl text-[10px] font-bold uppercase"
                  >
                    <Plus className="w-3 h-3" /> Create Snapshot
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="h-[400px] mt-4">
                <div className="space-y-3 pr-4">
                  {history.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No historical versions found yet.</p>
                    </div>
                  )}
                  {history.map((version) => (
                    <div key={version.id} className="p-4 border rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div>
                        <p className="font-bold text-slate-900">{version.note || 'Untitled Version'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {version.createdAt?.toDate ? version.createdAt.toDate().toLocaleString() : 'Just now'}
                          </span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                            {version.items?.length || 0} ITEMS
                          </span>
                          <span className="text-xs font-black text-slate-900 italic">
                            ${(version.total || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        disabled={isReverting}
                        onClick={() => handleRestoreVersion(version)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase h-8"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger render={<Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl h-9 px-4 text-[10px] font-bold uppercase"><Plus className="w-3 h-3" /> Add Item</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
                <DialogDescription>Manually add a line item or crew member expense.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                        value={newItem.category || ''} 
                        onChange={e => {
                          if (e.target.value === 'custom') {
                            const name = prompt('Enter custom category name:');
                            if (name) setNewItem({...newItem, category: name});
                          } else {
                            setNewItem({...newItem, category: e.target.value});
                          }
                        }}
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value="custom">+ Add Custom Category...</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role / Description</Label>
                    {newItem.union && UNION_ROLES[newItem.union] ? (
                      <select 
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={newItem.description || ''} 
                        onChange={e => {
                          const role = e.target.value;
                          const occCode = (newItem.union && UNION_OCC_CODES[newItem.union]?.[role]) || '';
                          setNewItem({...newItem, description: role, occCode});
                        }}
                      >
                        <option value="">Select industry role...</option>
                        {UNION_ROLES[newItem.union].map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    ) : (
                      <Input 
                        placeholder="e.g. Director of Photography" 
                        value={newItem.description} 
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Union</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={newItem.union || ''} 
                      onChange={e => {
                        const union = e.target.value;
                        const roles = UNION_ROLES[union];
                        setNewItem({
                          ...newItem, 
                          union, 
                          description: roles ? roles[0] : (newItem.description || ''), 
                          occCode: (union && roles && UNION_OCC_CODES[union]?.[roles[0]]) || (newItem.occCode || '')
                        });
                      }}
                    >
                      <option value="">Non-Union</option>
                      <option value="SAG-AFTRA">SAG-AFTRA</option>
                      <option value="DGA">DGA</option>
                      <option value="WGA">WGA</option>
                      <option value="IATSE">IATSE</option>
                      <option value="TEAMSTERS">TEAMSTERS</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Occ Code</Label>
                    <Input 
                      placeholder="e.g. 600-DP" 
                      value={newItem.occCode || ''} 
                      onChange={e => setNewItem({...newItem, occCode: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Rate</Label>
                    <Input 
                      type="text" 
                      placeholder="0"
                      value={newItem.rate || ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNewItem({...newItem, rate: val === '' ? 0 : Number(val)});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="text" 
                      placeholder="0"
                      value={newItem.quantity || ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNewItem({...newItem, quantity: val === '' ? 0 : Number(val)});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={newItem.unit}
                      onChange={e => setNewItem({...newItem, unit: e.target.value as any})}
                    >
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="flat">Flat</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                {newItem.union && (
                  <div className="border-t pt-4">
                    <RateValidation 
                      rate={newItem.rate || 0} 
                      params={{
                        union: newItem.union,
                        occCode: newItem.occCode,
                        positionTitle: newItem.description
                      }}
                    />
                  </div>
                )}
                <Button className="w-full mt-4" onClick={handleAddManualItem}>Add to Budget</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card className="bg-slate-900 text-white border-none shadow-xl col-span-1 md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Budget</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black">${total.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Estimated Cost</p>
          </CardContent>
        </Card>

        
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Line Items</span>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black">{items.length}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Total entries</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Budget</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setIsEditingTarget(!isEditingTarget)}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
            {isEditingTarget ? (
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={targetInput || ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setTargetInput(val === '' ? 0 : Number(val));
                  }}
                  className="h-8 text-lg font-bold"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdateTargetBudget}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-3xl font-black text-slate-400 font-mono">
                {project.targetBudget ? `$${project.targetBudget.toLocaleString()}` : '—'}
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Production Goal</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Advanced Tools</span>
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" size="sm" className="w-full font-bold uppercase tracking-tighter text-[10px]">Production Settings</Button>} />
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-primary" />
                      Advanced Budgeting Tools
                    </DialogTitle>
                    <DialogDescription>
                      Configure union rates, local incentives, and risk overhead.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        Crew & Component Tiers
                      </h4>
                      <div className="flex flex-col gap-2 mb-4">
                        <Label className="text-sm">Content Type</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-slate-200"
                          value={project.contentType || 'feature'}
                          onChange={(e) => updateDoc(doc(db, 'projects', projectId), { contentType: e.target.value })}
                        >
                          <option value="feature">Feature Film</option>
                          <option value="short">Short Film</option>
                          <option value="tv_series">TV Series / Pilot</option>
                          <option value="digital_series">Digital Series / Web</option>
                          <option value="commercial">Commercial</option>
                          <option value="music_video">Music Video</option>
                          <option value="documentary">Documentary</option>
                          <option value="social_media">Social Media / Creator Content</option>
                          <option value="branded_content">Branded Content</option>
                        </select>
                        <p className="text-[10px] text-slate-500">Recalculate budget to apply formatting for this content type.</p>
                      </div>
                      <div className="flex flex-col gap-2 mb-4">
                        <Label className="text-sm">Production Tier Setup</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-slate-200"
                        value={project.budgetTier || 'Non-Union Skeleton Crew'}
                        onChange={(e) => updateDoc(doc(db, 'projects', projectId), { budgetTier: e.target.value })}
                      >
                        <option value="Non-Union Skeleton Crew">Non-Union Skeleton Crew</option>
                        <option value="Micro-Budget">SAG-AFTRA Micro-Budget</option>
                        <option value="Ultra Low">SAG-AFTRA Ultra Low / IATSE Tier 1</option>
                        <option value="Moderate Low">SAG-AFTRA Moderate Low / IATSE Tier 2</option>
                        <option value="Low Budget">SAG-AFTRA Low Budget / IATSE Tier 3</option>
                        <option value="Major Studio">Major Studio / Basic Agreement</option>
                      </select>
                      <p className="text-[10px] text-slate-500">This strictly forces the AI to use these specific union rates.</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">SAG-AFTRA Production</Label>
                        <p className="text-[10px] text-slate-500">Enable union minimum rates</p>
                      </div>
                      <Switch 
                        checked={!!project.isSAG} 
                        onCheckedChange={toggleSAG}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                      <Landmark className="w-4 h-4 text-green-500" />
                      Location Incentives
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Primary Production Location</Label>
                        <select 
                          value={selectedState} 
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white"
                        >
                          {Object.keys(stateIncentives).map(s => <option key={s} value={s}>{s === 'OTHER' ? 'Other / International / Multi' : s}</option>)}
                        </select>
                        <p className="text-[10px] text-green-600 font-bold px-1">
                          {stateIncentives[selectedState]?.description}
                        </p>
                      </div>

                      {selectedState === 'OTHER' && (
                        <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <Label className="text-[10px] uppercase text-slate-500">Custom Incentive Rate</Label>
                            <span className="text-green-600">{customIncentive}%</span>
                          </div>
                          <Input 
                            type="range"
                            min="0"
                            max="50"
                            step="0.5"
                            value={customIncentive}
                            onChange={(e) => setCustomIncentive(Number(e.target.value))}
                            className="accent-green-500"
                          />
                          <p className="text-[9px] text-slate-400 italic">
                            For multi-location shoots, enter a weighted average of your expected tax credits or grants.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                      <Percent className="w-4 h-4 text-orange-500" />
                      Risk Management
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Apply Contingency</Label>
                          <p className="text-[10px] text-slate-500">Overhead for unexpected costs</p>
                        </div>
                        <Switch 
                          checked={!!project.useContingency} 
                          onCheckedChange={toggleContingency}
                        />
                      </div>
                      {project.useContingency && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span>Contingency Rate</span>
                            <span>{Math.round((project.contingencyRate || 0) * 100)}%</span>
                          </div>
                          <Input 
                            type="range"
                            min="0"
                            max="25"
                            step="1"
                            value={Math.round((project.contingencyRate || 0) * 100)}
                            onChange={(e) => handleUpdateContingencyRate(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Budget Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Your Target</p>
                <p className="text-2xl font-black">${(project.targetBudget || 0).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-400">AI Estimated</p>
                <p className={cn("text-2xl font-black", total > (project.targetBudget || 0) ? "text-red-500" : "text-green-500")}>
                  ${total.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", total > (project.targetBudget || 0) ? "bg-red-500" : "bg-green-500")}
                style={{ width: `${Math.min(100, (total / (project.targetBudget || 1)) * 100)}%` }}
              />
            </div>
            

          </CardContent>
        </Card>
      </div>

      {isGenerating && (
        <div className="bg-blue-50 border-2 border-blue-200 text-blue-700 p-4 rounded-xl flex items-center justify-between mb-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 animate-pulse text-blue-600" />
            <div>
              <p className="font-bold uppercase tracking-widest text-xs">CFO Intelligence Active</p>
              <p className="text-sm">{agentProgress || 'Generating budget...'}</p>
            </div>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-50">Please wait...</div>
        </div>
      )}

      {activeTab === 'visuals' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 p-8">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-display font-black tracking-tighter">Budget Allocation</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Resource Distribution</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Budget</p>
                  <p className="text-2xl font-display font-black text-blue-600">${subtotal.toLocaleString()}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center gap-12">
                {/* Chart Section */}
                <div className="relative w-full lg:w-1/2 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryTotals}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={135}
                        paddingAngle={8}
                        dataKey="amount"
                        nameKey="category"
                        stroke="none"
                      >
                        {categoryTotals.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Allocation']}
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                          padding: '12px 16px' 
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Subtotal</span>
                    <span className="text-xl font-display font-black text-slate-900">${(subtotal / 1000).toFixed(1)}K</span>
                  </div>
                </div>

                {/* Custom Organized Legend */}
                <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoryTotals.map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={item.category} 
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-blue-200 hover:bg-white transition-all"
                    >
                      <div className="w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center text-white shadow-sm font-black text-[10px]" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {((item.amount / subtotal) * 100).toFixed(0)}%
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{item.category}</span>
                        <span className="text-xs font-black text-slate-900">${item.amount.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 p-8">
              <CardTitle className="text-lg font-display font-black tracking-tighter">Priority Expenses</CardTitle>
              <CardDescription className="text-[10px] uppercase font-black tracking-widest text-slate-400">Largest Line Items</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {categoryTotals.slice(0, 6).map((item, i) => (
                  <div key={item.category} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.category}</p>
                        <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">Resources & Labor</p>
                      </div>
                      <span className="text-sm font-black text-blue-600">${item.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.amount / subtotal) * 100}%` }}
                        transition={{ duration: 1.5, ease: "circOut", delay: i * 0.1 }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium">No budget items yet</h3>
            <p className="text-slate-500 max-w-xs mb-6">
              Generate a draft budget based on your scene breakdown.
            </p>
            <Button onClick={handleGenerateBudget} disabled={isGenerating || scenes.length === 0}>
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate AI Budget'}
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === 'history' ? (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  Budget Version History
                </CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-widest text-slate-400">Restore previous snapshots of your production budget.</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  const note = prompt("Enter a name for this snapshot:");
                  if (note) saveToHistory(items, note);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl text-[10px] font-bold uppercase h-9"
              >
                <Plus className="w-3 h-3" /> Create New Snapshot
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <History className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                  <h3 className="font-bold text-slate-900">No History Found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">Snapshots are automatically created before you regenerate the budget, or you can create one manually.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((version) => (
                    <div key={version.id} className="p-5 border-2 border-slate-50 rounded-3xl hover:border-blue-100 hover:bg-blue-50/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border shadow-sm text-slate-400">
                          <History className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{version.note || 'Untitled Version'}</p>
                            {version.items?.some((i: any) => i.status === 'manual') && (
                              <Badge variant="outline" className="text-[8px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">Has Manual Work</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              {version.createdAt?.toDate ? version.createdAt.toDate().toLocaleString() : 'Just now'}
                            </span>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600 uppercase tracking-widest">
                              {version.items?.length || 0} Line Items
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Snapshot Total</div>
                          <div className="text-lg font-black text-slate-900 tracking-tighter">${(version.total || 0).toLocaleString()}</div>
                        </div>
                        <Button 
                          disabled={isReverting}
                          onClick={() => handleRestoreVersion(version)}
                          className="bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 shadow-md transition-all active:scale-95"
                        >
                          {isReverting ? <RotateCcw className="w-4 h-4 animate-spin" /> : 'Restore Snapshot'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'incentives' ? (
        <Card className="border-none shadow-xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="bg-slate-800/50 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                  Tax Credits & Production Incentives
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Specialized AI analysis for {project.location || 'your location'}.
                </CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                PRO Analysis
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTax ? (
              <div className="py-20 text-center animate-pulse">
                <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Consulting Regional Agents...</p>
              </div>
            ) : taxData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                <div className="p-8 space-y-6 bg-slate-900">
                  <div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1.5">Primary Incentive</p>
                    <h3 className="text-4xl font-black">{taxData.primaryCredit}</h3>
                    <p className="text-slate-400 mt-2 text-sm">Targeting {taxData.percentage}% {taxData.type} credit.</p>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Eligibility Requirements</p>
                    <ul className="space-y-2">
                      {taxData.eligibility?.map((item: string) => (
                        <li key={item} className="text-xs text-slate-300 flex items-start gap-2">
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-8 space-y-6 bg-slate-800/20">
                   <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Estimated Rebate</p>
                      <p className="text-5xl font-black text-white">${taxData.estimatedRebate?.toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-500/70 font-bold uppercase mt-2">Potential ROI based on project scope</p>
                   </div>

                   <div className="space-y-4 pt-4">
                      <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Maximization Suggestions
                      </p>
                      <div className="space-y-3">
                        {taxData.suggestions?.map((s: string) => (
                          <div key={s} className="p-3 bg-white/5 rounded-xl text-xs text-slate-300 border border-white/5">
                            {s}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                 <Button onClick={loadTaxIncentives} className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase px-8">
                   Analyze Production Incentives
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'top-sheet' ? (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              Top Sheet Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Account#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTotals.map((cat, catIdx) => (
                  <TableRow key={cat.category} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => {
                    setCategoryFilter(cat.category);
                    setActiveTab('line-items');
                  }}>
                    <TableCell className="font-mono text-xs text-slate-500">{(1000 + (catIdx * 100))}</TableCell>
                    <TableCell className="font-bold text-sm">{cat.category}</TableCell>
                    <TableCell className="text-right font-mono font-bold">${(cat.amount || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold border-t-2">
                  <TableCell></TableCell>
                  <TableCell className="uppercase">Subtotal</TableCell>
                  <TableCell className="text-right font-mono">${subtotal.toLocaleString()}</TableCell>
                </TableRow>
                {project.useContingency && (
                  <TableRow className="bg-slate-50/50 italic text-slate-500">
                    <TableCell></TableCell>
                    <TableCell>Contingency ({Math.round((project.contingencyRate || 0) * 100)}%)</TableCell>
                    <TableCell className="text-right font-mono">${contingencyAmount.toLocaleString()}</TableCell>
                  </TableRow>
                )}
                {incentive > 0 && (
                  <TableRow className="bg-green-50/50 italic text-green-600">
                    <TableCell></TableCell>
                    <TableCell>State Incentives ({Math.round(incentiveRate * 100)}%)</TableCell>
                    <TableCell className="text-right font-mono">-${incentive.toLocaleString()}</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-slate-900 text-white font-black">
                  <TableCell></TableCell>
                  <TableCell className="uppercase text-lg">Grand Total</TableCell>
                  <TableCell className="text-right font-mono text-lg">${total.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
               <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    project.budgetStatus === 'approved' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {project.budgetStatus === 'approved' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">
                      Budget Status: {project.budgetStatus === 'approved' ? 'Officially Approved' : 'Under Review / Draft'}
                    </h4>
                    {project.budgetApprovedAt && (
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Approved on {new Date(project.budgetApprovedAt?.seconds * 1000).toLocaleDateString()} by {project.budgetApprovedBy}</p>
                    )}
                  </div>
               </div>
               
               {project.budgetStatus !== 'approved' ? (
                 <Button 
                   onClick={handleApproveBudget} 
                   className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest px-8 shadow-lg shadow-green-500/20"
                 >
                   Approve & Lock Budget
                 </Button>
               ) : (
                 <div className="flex gap-4">
                   <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                     <Info className="w-4 h-4 text-blue-600" />
                     Budget Locked. Proceed to 'Permits' or 'Calling & Outreach' to finalize execution.
                   </div>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-3">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Box className="w-4 h-4 text-slate-600" />
                  Line Budget Detail
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4 border-r pr-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Global Rate Tier</Label>
                  <select 
                    value={globalTier}
                    onChange={(e) => {
                      const tier = e.target.value as 'budget' | 'rateLow' | 'rateMedium' | 'rateHigh';
                      setGlobalTier(tier);
                      // Update all items globally
                      const updates = items.map(item => {
                        let newRate = item.rate || 0;
                        if (tier === 'rateLow' && item.rateLow) newRate = item.rateLow;
                        if (tier === 'rateMedium' && item.rateMedium) newRate = item.rateMedium;
                        if (tier === 'rateHigh' && item.rateHigh) newRate = item.rateHigh;
                        
                        return updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
                          rate: newRate,
                          selectedTier: tier === 'budget' ? 'medium' : tier.replace('rate', '').toLowerCase(),
                          amount: newRate * (item.quantity || 1)
                        });
                      });
                      Promise.all(updates);
                    }}
                    className="h-8 text-[10px] font-bold uppercase px-2 rounded-md border border-slate-200 bg-white"
                  >
                    <option value="budget">Default Budget</option>
                    <option value="rateLow">Low Estimates</option>
                    <option value="rateMedium">Medium Estimates</option>
                    <option value="rateHigh">High Estimates</option>
                  </select>
                </div>
                <Label className="text-[10px] font-black uppercase text-slate-400">Filter By Category</Label>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 text-[10px] font-bold uppercase px-2 rounded-md border border-slate-200 bg-white"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            
            <Alert className="bg-blue-50/50 border-blue-100 py-3 mt-1">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800 font-bold text-xs uppercase tracking-widest pl-1">Understanding Rate Modifiers</AlertTitle>
              <AlertDescription className="text-blue-900/80 text-xs mt-1 pl-1 flex flex-col gap-2">
                <p><strong>Low / Medium / High Tiers:</strong> These are AI-researched estimates. Low is non-union or indie minimum scale, Medium is standard independent, and High assumes experienced or premium tier scales (or union standard). Select a specific tier above to apply it globally.</p>
                <p><strong>Union Minimums:</strong> If a role falls under a union (SAG-AFTRA, DGA, WGA, IATSE), the agent automatically attempts to source the current minimum scale and incorporates it into the estimates. For more precise numbers under specific agreements, manually adjust the custom rate directly.</p>
                <p><strong>Unit vs Qty:</strong> The <strong>Unit</strong> describes how the rate is charged (e.g., 'day', 'week', 'flat'). <strong>Qty</strong> is the multiplier (e.g., 5 days, 1 flat fee). Adjust these to instantly update the Total Amount.</p>
              </AlertDescription>
            </Alert>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead 
                    className="w-[150px] cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      Category
                      {sortConfig?.key === 'category' && (
                        sortConfig.direction === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('description')}
                  >
                    <div className="flex items-center gap-1">
                      Line Item Description
                      {sortConfig?.key === 'description' && (
                        sortConfig.direction === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Selected Rate</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total Amount
                      {sortConfig?.key === 'total' && (
                        sortConfig.direction === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[96px] text-right">Move</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedItems).map(([groupKey, groupItems]: [string, any[]]) => (
                  <React.Fragment key={groupKey}>
                    {shouldGroup && categoryFilter === 'All' && (
                      <TableRow 
                        className="bg-slate-100 hover:bg-slate-200/80 cursor-pointer" 
                        onClick={() => setCollapsedCategories(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                      >
                         <TableCell colSpan={8} className="font-bold text-slate-800 text-xs py-2 uppercase tracking-wider">
                           <div className="flex items-center gap-2">
                             {collapsedCategories[groupKey] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                             {groupKey} - <span className="font-mono text-emerald-600">${(groupItems.reduce((sum, item) => sum + (item.amount || 0), 0)).toLocaleString()}</span>
                           </div>
                         </TableCell>
                      </TableRow>
                    )}
                    {(!shouldGroup || categoryFilter !== 'All' || !collapsedCategories[groupKey]) && groupItems.map((item) => (
                      <React.Fragment key={item.id}>
                    <TableRow className={cn("group hover:bg-slate-50/50 cursor-pointer", expandedRows[item.id] ? "bg-slate-50/50" : "", (item as any).isCurbilyUpsell ? "bg-purple-50 hover:bg-purple-100 border-purple-200" : "")} onClick={() => setExpandedRows(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                      <TableCell className={cn("font-bold text-[10px] uppercase tracking-wider text-slate-400", (item as any).isCurbilyUpsell ? "text-purple-600" : "")}>
                        <div className="flex items-center gap-1">
                          {expandedRows[item.id] ? <ChevronUp className={cn("w-3 h-3 text-blue-500", (item as any).isCurbilyUpsell ? "text-purple-500" : "")} /> : <ChevronDown className={cn("w-3 h-3 text-slate-300", (item as any).isCurbilyUpsell ? "text-purple-300" : "")} />}
                          {item.category}
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-sm font-semibold text-slate-900 max-w-[300px] truncate", (item as any).isCurbilyUpsell ? "text-purple-900" : "")} title={item.description} onClick={e => e.stopPropagation()}>
                        {item.description}
                        {(item.category === 'Crew' || item.category === 'Cast') && !(item as any).isCurbilyUpsell ? (
                          <div className="mt-2" onClick={e => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={cn(
                                "h-7 text-[10px] font-bold uppercase gap-1.5 px-3 rounded-lg border",
                                item.personName ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"
                              )}
                              onClick={() => setAssignmentOpen({ isOpen: true, itemId: item.id, role: item.description, category: item.category })}
                            >
                              <Users className="w-3 h-3" />
                              {item.personName || "Assign Personnel"}
                            </Button>
                          </div>
                        ) : (
                          item.personName && (
                            <div className="text-[10px] text-blue-600 font-bold uppercase mt-1">
                              Personnel: {item.personName}
                            </div>
                          )
                        )}
                        {item.characterName && (
                          <div className="text-[10px] text-emerald-600 font-bold uppercase mt-1">
                            Character: {item.characterName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {(item as any).isCurbilyUpsell ? (
                          <div className="font-mono text-sm font-semibold text-purple-600">
                            ${item.rate} (Flat)
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <select
                              className="h-6 text-[10px] bg-slate-50 border rounded text-slate-600 max-w-[120px]"
                              value={item.selectedTier || 'custom'}
                              onChange={(e) => {
                                const tier = e.target.value;
                                let newRate = item.rate || 0;
                                if (tier === 'low' && item.rateLow) newRate = item.rateLow;
                                if (tier === 'medium' && item.rateMedium) newRate = item.rateMedium;
                                if (tier === 'high' && item.rateHigh) newRate = item.rateHigh;
                                updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
                                  rate: newRate,
                                  selectedTier: tier,
                                  amount: newRate * (item.quantity || 1)
                                });
                              }}
                            >
                              <option value="custom">Custom</option>
                              {item.rateLow && <option value="low">Low: ${item.rateLow}</option>}
                              {item.rateMedium && <option value="medium">Med: ${item.rateMedium}</option>}
                              {item.rateHigh && <option value="high">High: ${item.rateHigh}</option>}
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-mono text-xs">$</span>
                              <EditableInput 
                                className="w-20 h-7 text-xs font-mono p-1"
                                initialValue={item.rate || (item.amount / (item.quantity || 1))}
                                onSave={(newRate) => {
                                  updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
                                    rate: newRate,
                                    selectedTier: 'custom',
                                    amount: newRate * (item.quantity || 1)
                                  });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="font-mono text-xs text-slate-500 uppercase">
                          {(item as any).isCurbilyUpsell ? 'FLAT' : (
                            <select
                              className="h-7 w-20 text-[10px] font-mono bg-slate-50 border rounded text-slate-600 px-1"
                              value={item.unit || 'day'}
                              onChange={(e) => {
                                const newUnit = e.target.value;
                                const oldUnit = item.unit || 'day';
                                let newRate = item.rate || 0;
                                let newQty = item.quantity || 1;

                                if (oldUnit === 'day' && newUnit === 'week') {
                                  newRate = newRate * 5;
                                  newQty = newQty >= 5 ? newQty / 5 : 1;
                                } else if (oldUnit === 'week' && newUnit === 'day') {
                                  newRate = newRate / 5;
                                  newQty = newQty * 5;
                                } else if (newUnit === 'flat') {
                                  newQty = 1;
                                }

                                updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
                                  unit: newUnit,
                                  rate: newRate,
                                  quantity: newQty,
                                  amount: newRate * newQty
                                });
                              }}
                            >
                              <option value="day">Day</option>
                              <option value="week">Week (5 Day)</option>
                              <option value="flat">Flat Fee</option>
                              <option value="item">Per Item</option>
                              <option value="hour">Hour</option>
                              <option value="month">Month</option>
                            </select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {(item as any).isCurbilyUpsell ? (
                          <div className="font-mono text-sm font-semibold text-purple-600 pl-2">
                            x 1
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-mono text-xs">x</span>
                            <EditableInput 
                              className="w-16 h-7 text-xs font-mono p-1"
                              initialValue={item.quantity || 1}
                              onSave={(newQty) => {
                                updateDoc(doc(db, `projects/${projectId}/budget`, item.id), {
                                  quantity: newQty,
                                  amount: (item.rate || 0) * newQty
                                });
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Total</div>
                        <div className="text-right font-mono font-bold text-slate-900">
                          ${(item.amount && item.amount !== 0 
                            ? Number(item.amount) 
                            : (Number(item.rate) || 0) * (Number(item.quantity) || 1)
                          ).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{item.status}</Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <div className="flex gap-1 items-center">
                            {!(item as any).isCurbilyUpsell && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-900"
                                  disabled={filteredItems.filter((i) => !(i as any).isCurbilyUpsell).findIndex((i) => i.id === item.id) === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveBudgetItem(item.id, -1);
                                  }}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-900"
                                  disabled={filteredItems.filter((i) => !(i as any).isCurbilyUpsell).findIndex((i) => i.id === item.id) === filteredItems.filter((i) => !(i as any).isCurbilyUpsell).length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveBudgetItem(item.id, 1);
                                  }}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {item.history && item.history.length > 0 && (
                              <Dialog>
                                <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500" />}>
                                  <History className="w-3 h-3" />
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Budget History: {item.description}</DialogTitle>
                                    <DialogDescription>Tracking all changes to this budget line item.</DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-4 py-4">
                                      {item.history.slice().reverse().map((entry) => (
                                        <div key={entry.date} className="border-l-2 border-slate-100 pl-4 py-1">
                                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                            <span>{new Date(entry.date).toLocaleString()}</span>
                                            <div className="text-right">
                                              <div className="font-bold text-slate-900">
                                                ${entry.oldAmount.toLocaleString()} → ${entry.newAmount.toLocaleString()}
                                              </div>
                                              {(entry as any).oldQuantity !== undefined && (
                                                <div className="text-[10px] text-blue-600">
                                                  x{(entry as any).oldQuantity} → x{(entry as any).newQuantity}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-sm text-slate-600">{entry.note}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            )}

                            {!(item as any).isCurbilyUpsell && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows[item.id] && (
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={8} className="border-l-4 border-l-blue-500 p-6 bg-blue-50/20 shadow-inner rounded-r-2xl">
                           <div className="flex flex-col gap-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                <div>
                                  <h4 className="font-bold uppercase tracking-widest text-[9px] text-slate-400 mb-1 flex items-center gap-2">
                                    Item Description
                                  </h4>
                                  <p className="text-sm font-bold text-slate-900">{item.description}</p>
                                </div>
                                <div className="border-t border-slate-50 pt-3">
                                  <h4 className="font-bold uppercase tracking-widest text-[9px] text-blue-600 mb-1 flex items-center gap-2">
                                    <Info className="w-3 h-3" />
                                    Usage & Reasoning
                                  </h4>
                                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {item.details || 'No extended reasoning provided.'}
                                  </p>
                                </div>
                              </div>

                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                               <div>
                                 <div className="text-[10px] font-bold uppercase text-slate-400">Target Level</div>
                                 <div className="text-sm font-black text-rose-500">${(item.rateLow || item.rate || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ minimum</span></div>
                               </div>
                               <div>
                                 <div className="text-[10px] font-bold uppercase text-slate-400">Medium Level</div>
                                 <div className="text-sm font-black text-amber-500">${(item.rateMedium || item.rate || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ standard</span></div>
                               </div>
                               <div>
                                 <div className="text-[10px] font-bold uppercase text-slate-400">High Level</div>
                                 <div className="text-sm font-black text-emerald-500">${(item.rateHigh || item.rate || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ premium</span></div>
                               </div>
                               {(item.hourlyRate || item.dayRate) ? (
                                 <div>
                                   <div className="text-[10px] font-bold uppercase text-blue-400">Extracted Rates</div>
                                   <div className="text-sm font-black text-blue-600">
                                     {item.dayRate ? `$${item.dayRate.toLocaleString()} / day` : ''}
                                     {item.dayRate && item.hourlyRate ? ' | ' : ''}
                                     {item.hourlyRate ? `$${item.hourlyRate.toLocaleString()} / hr` : ''}
                                   </div>
                                 </div>
                               ) : null}
                             </div>

                             {item.sourcingLink && (
                               <div className="flex items-center gap-2 mt-2">
                                 <span className="text-[10px] font-bold uppercase text-slate-400">Source:</span>
                                 <a href={item.sourcingLink} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                   <ExternalLink className="w-3 h-3" />
                                   View Original Source
                                 </a>
                               </div>
                             )}

                             {(item.union || item.tier || item.occCode) && (
                               <div className="flex flex-wrap items-center gap-2">
                                 {item.union && <Badge className="bg-white border text-blue-600 shadow-sm">{item.union}</Badge>}
                                 {item.tier && <Badge className="bg-white border text-amber-600 shadow-sm">{item.tier}</Badge>}
                                 {item.occCode && <span className="text-xs font-mono text-slate-500">OCC: {item.occCode}</span>}
                               </div>
                             )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <PersonnelAssignment 
        isOpen={assignmentOpen.isOpen}
        onOpenChange={(open) => setAssignmentOpen(prev => ({ ...prev, isOpen: open }))}
        roleDescription={assignmentOpen.role}
        category={assignmentOpen.category}
        contacts={contacts}
        onAssign={async (contact) => {
          if (!assignmentOpen.itemId) return;
          try {
            await updateDoc(doc(db, `projects/${projectId}/budget`, assignmentOpen.itemId), {
              personName: contact.name,
              personId: contact.id,
              actualRate: contact.rate || 0,
              status: 'contracted'
            });
            setAssignmentOpen(prev => ({ ...prev, isOpen: false }));
          } catch (err) {
            console.error("Failed to assign personnel:", err);
          }
        }}
        onRequestBid={async (contact) => {
          if (!assignmentOpen.itemId) return;
          try {
            await addDoc(collection(db, 'outreachThreads'), {
              projectId,
              contactId: contact.id,
              ownerId: project.ownerId || '',
              budgetItemId: assignmentOpen.itemId,
              role: assignmentOpen.role,
              status: 'awaiting_bid',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setAssignmentOpen(prev => ({ ...prev, isOpen: false }));
          } catch (err) {
            console.error("Failed to request bid:", err);
          }
        }}
      />
    </div>
  );
}
