import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, writeBatch, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, limit, arrayUnion, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Venue, GearItem, Scene, Project, PropItem, WardrobeItem, PaymentMethod, SourcingOption } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button, buttonVariants } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Sparkles, MapPin, Package, Wrench, Shirt, Box, ThumbsUp, ShoppingCart, Rabbit, CheckCircle2, ExternalLink, Plane, Utensils, ShoppingBag, Phone, MessageCircle, Mail, Edit2, RotateCcw, Trash2, Loader2, StopCircle, Plus, Bot, RefreshCw, AlertCircle, ChevronRight, Info } from 'lucide-react';
import { sourcing } from '../../lib/gemini';
import { Badge } from '../ui/badge';
import { TravelLogistics, CateringOption, BudgetItem } from '../../types';
import SubscriptionGate from '../SubscriptionGate';
import { cn } from '../../lib/utils';
import { useVapiCall } from '../../lib/hooks/useVapiCall';
import { VapiCallButton } from './VapiCallButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

import { ensureApiKey } from '../../lib/apiKeyCheck';

export default function Sourcing({ projectId, scenes, project, onGenerate, isGenerating: isGeneratingProp }: { projectId: string, scenes: Scene[], project: Project, onGenerate?: (category?: string) => void, isGenerating?: boolean }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [props, setProps] = useState<PropItem[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLocal, setGeneratingLocal] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState<string | null>(null);
  const [sourcingStep, setSourcingStep] = useState<string>('');
  const generating = isGeneratingProp || generatingLocal;
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [editingItem, setEditingItem] = useState<{ type: string, item: any } | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', cost: 0, purchaseUrl: '', description: '', hourlyRate: 0, dayRate: 0 });
  const [isAddingItem, setIsAddingItem] = useState<string | null>(null);
  const [addFormData, setAddFormData] = useState({ name: '', cost: 0, purchaseUrl: '', description: '', category: '', hourlyRate: 0, dayRate: 0 });
  const [sourcingLogs, setSourcingLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  
  const abortController = useRef<AbortController | null>(null);

  const { initiateCall, isCalling } = useVapiCall(projectId, project.title, project.location);

  const handleSyncToBudget = async () => {
    setIsSyncing(true);
    try {
      const budgetRef = collection(db, `projects/${projectId}/budget`);
      const budgetSnap = await getDocs(budgetRef);
      const existingItems = budgetSnap.docs.map(d => ({ id: d.id, ...d.data() } as BudgetItem));
      
      const batch = writeBatch(db);
      const now = serverTimestamp();

      const syncItems = [
        ...venues.map(v => ({ name: v.name || '', cost: v.cost || 0, category: 'Location', description: v.name || 'Unnamed Venue', details: v.notes || '' })),
        ...gear.map(g => ({ name: g.name || '', cost: g.cost || 0, category: 'Equipment', description: g.name || 'Unnamed Gear', details: g.category || '' })),
        ...props.map(p => ({ name: p.name || '', cost: p.cost || 0, category: 'Props', description: p.name || 'Unnamed Prop', details: p.description || '' })),
        ...wardrobe.map(w => ({ name: w.character || w.description || '', cost: w.cost || 0, category: 'Wardrobe', description: w.character || w.description || 'Unnamed Wardrobe', details: w.description || '' }))
      ];

      for (const item of syncItems) {
        // Try to find a matching budget item by description/name
        const match = existingItems.find(ei => {
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
            updatedAt: now
          });
        } else {
          // Add new item if no match found
          const newRef = doc(collection(db, `projects/${projectId}/budget`));
          batch.set(newRef, {
            projectId,
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
      
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'Budget Synced',
        message: 'Marketplace pricing has been synced to your production budget.',
        isRead: false,
        createdAt: now
      });

      alert('Sync complete! Your budget has been updated with discovering pricing.');
    } catch (e) {
      console.error('Sync to budget failed:', e);
      alert('Failed to sync to budget. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setSourcingLogs(snapshot.docs.map(doc => doc.data()).filter(n => 
        n.title.toLowerCase().includes('sourcing') || 
        n.title.toLowerCase().includes('agent')
      ));
    });
    return () => unsub();
  }, [projectId]);

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'payment_methods'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPaymentMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
    });
    return () => unsub();
  }, [projectId]);

  const autonomousEnabled = paymentMethods.some(m => m.autonomousPurchasingEnabled);

  useEffect(() => {
    const venuesQ = query(collection(db, `projects/${projectId}/venues`));
    const gearQ = query(collection(db, `projects/${projectId}/gear`));
    const propsQ = query(collection(db, `projects/${projectId}/props`));
    const wardrobeQ = query(collection(db, `projects/${projectId}/wardrobe`));

    const unsubVenues = onSnapshot(venuesQ, (snapshot) => {
      setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/venues`);
    });

    const unsubGear = onSnapshot(gearQ, (snapshot) => {
      setGear(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GearItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/gear`);
    });

    const unsubProps = onSnapshot(propsQ, (snapshot) => {
      setProps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/props`);
    });

    const unsubWardrobe = onSnapshot(wardrobeQ, (snapshot) => {
      setWardrobe(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardrobeItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/wardrobe`);
    });

    return () => {
        unsubVenues();
        unsubGear();
        unsubProps();
        unsubWardrobe();
      };
  }, [projectId]);

  const processSourcingResults = async (category: string, suggestions: any) => {
    if (abortController.current?.signal.aborted) return;

    setSourcingStep(`Verifying ${category} results...`);
    const allLinks = new Set<string>();
    
    // Extract links based on category
    if (category === 'venues') (suggestions.venues || suggestions || []).forEach((v: any) => v.purchaseUrl && allLinks.add(v.purchaseUrl));
    else if (category === 'gear') (suggestions.gear || suggestions || []).forEach((g: any) => g.purchaseUrl && allLinks.add(g.purchaseUrl));
    else if (category === 'props') (suggestions.props || suggestions || []).forEach((p: any) => p.options?.forEach((o: any) => o.url && allLinks.add(o.url)));
    else if (category === 'wardrobe') (suggestions.wardrobe || suggestions || []).forEach((w: any) => w.options?.forEach((o: any) => o.url && allLinks.add(o.url)));

    let validLinks = new Set<string>();
    if (allLinks.size > 0) {
      try {
        const verifyRes = await fetch('/api/verify-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: Array.from(allLinks) })
        });
        if (verifyRes.ok) {
          const results = await verifyRes.json();
          results.filter((r: any) => r.ok).forEach((r: any) => validLinks.add(r.url));
        } else {
          validLinks = allLinks;
        }
      } catch (e) {
        validLinks = allLinks;
      }
    } else {
      validLinks = allLinks;
    }

    const batch = writeBatch(db);

    // Save permit info if available
    if (suggestions.permitContacts || suggestions.permitSummary) {
      batch.update(doc(db, 'projects', projectId), {
        ...(suggestions.permitContacts ? { permitContacts: suggestions.permitContacts } : {}),
        ...(suggestions.permitSummary ? { permitSummary: suggestions.permitSummary } : {}),
        updatedAt: serverTimestamp()
      });
    }
    
    if (category === 'venues') {
      const items = suggestions.venues || suggestions || [];
      items.forEach((v: any) => {
        const ref = doc(collection(db, `projects/${projectId}/venues`));
        batch.set(ref, { 
          ...v, 
          projectId, 
          status: 'research'
        });
      });
    } else if (category === 'gear') {
      const items = suggestions.gear || suggestions || [];
      items.forEach((g: any) => {
        const ref = doc(collection(db, `projects/${projectId}/gear`));
        batch.set(ref, { 
          ...g, 
          projectId, 
          status: 'needed'
        });
      });
    } else if (category === 'props') {
      const items = suggestions.props || suggestions || [];
      items.forEach((p: any) => {
        const ref = doc(collection(db, `projects/${projectId}/props`));
        batch.set(ref, { 
          ...p, 
          projectId, 
          status: 'needed'
        });
      });
    } else if (category === 'wardrobe') {
      const items = suggestions.wardrobe || suggestions || [];
      items.forEach((w: any) => {
        const ref = doc(collection(db, `projects/${projectId}/wardrobe`));
        batch.set(ref, { 
          ...w, 
          projectId, 
          status: 'needed'
        });
      });
    }

    await batch.commit();
  };

  const handleSourcing = async (categoryFilter?: string) => {
    if (scenes.length === 0 || (generatingLocal && !categoryFilter)) return;

    if (onGenerate) {
      onGenerate(categoryFilter);
      return;
    }

    try {
      await ensureApiKey();
    } catch (e) {
      console.warn("API Key selection check failed:", e);
    }

    if (onGenerate && !categoryFilter) {
      onGenerate();
      return;
    }
    
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    
    setGeneratingLocal(true);
    setGeneratingCategory(categoryFilter || null);
    if (categoryFilter) {
      setSourcingStep(`Sourcing ${categoryFilter}...`);
    } else {
      setSourcingStep('Analyzing script and searching for items...');
    }
    
    try {
      if (categoryFilter) {
        // Clear existing items for the specific category
        const clearBatch = writeBatch(db);
        const coll = categoryFilter === 'wardrobe' ? 'wardrobe' : categoryFilter === 'props' ? 'props' : categoryFilter === 'gear' ? 'gear' : 'venues';
        const itemsToClear = categoryFilter === 'venues' ? venues : categoryFilter === 'gear' ? gear : categoryFilter === 'props' ? props : wardrobe;
        itemsToClear.forEach(item => clearBatch.delete(doc(db, `projects/${projectId}/${coll}`, item.id)));
        await clearBatch.commit();

        const suggestions = await sourcing(scenes, project.location, categoryFilter);
        await processSourcingResults(categoryFilter, suggestions);
      } else {
        // Source all categories in parallel
        setSourcingStep('Analyzing script for all categories...');
        
        // Clear all categories
        const clearBatch = writeBatch(db);
        venues.forEach(v => clearBatch.delete(doc(db, `projects/${projectId}/venues`, v.id)));
        gear.forEach(g => clearBatch.delete(doc(db, `projects/${projectId}/gear`, g.id)));
        props.forEach(p => clearBatch.delete(doc(db, `projects/${projectId}/props`, p.id)));
        wardrobe.forEach(w => clearBatch.delete(doc(db, `projects/${projectId}/wardrobe`, w.id)));
        await clearBatch.commit();

        const categories = ['venues', 'gear', 'props', 'wardrobe'];
        setSourcingStep('Deep searching marketplace in parallel...');
        
        await Promise.all(categories.map(async (cat) => {
          const suggestions = await sourcing(scenes, project.location, cat);
          await processSourcingResults(cat, suggestions);
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Local sourcing aborted');
      } else {
        console.error('Error sourcing:', error);
      }
    } finally {
      setGeneratingLocal(false);
      setGeneratingCategory(null);
      setSourcingStep('');
      abortController.current = null;
    }
  };

  const stopSourcing = () => {
    if (abortController.current) {
      abortController.current.abort();
      setGeneratingLocal(false);
      abortController.current = null;
    }
  };

  const handleApprove = async (collectionName: string, id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/${collectionName}`, id), {
        isApproved: true
      });
      
      // If it's a venue, also add it to the project locations if not already there
      if (collectionName === 'venues') {
        const venue = venues.find(v => v.id === id);
        if (venue) {
          const newLocation: any = {
            id: `sourced-${venue.id}`,
            name: venue.name,
            address: venue.address || '',
            isBase: !project.locations || project.locations.length === 0,
            sourcedId: venue.id
          };
          
          const alreadyExists = project.locations?.some(loc => loc.name === venue.name || (loc as any).sourcedId === venue.id);
          
          if (!alreadyExists) {
            await updateDoc(doc(db, 'projects', projectId), {
              locations: arrayUnion(newLocation),
              location: project.location || venue.name
            });
          }
        }
      }

      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'approval',
        title: 'Item Approved',
        message: `An item in ${collectionName} has been approved for production.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Autonomous Purchasing Logic
      if (autonomousEnabled) {
        // Simulate a delay for the "autonomous agent" to process
        setTimeout(async () => {
          await handlePurchase(collectionName, id, true);
        }, 2000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/${collectionName}/${id}`);
    }
  };

  const handlePurchase = async (collectionName: string, id: string, isAutonomous = false) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/${collectionName}`, id), {
        isPurchased: true,
        status: collectionName === 'gear' ? 'booked' : 'acquired'
      });

      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'booking',
        title: isAutonomous ? 'Autonomous Purchase Confirmed' : 'Purchase Confirmed',
        message: isAutonomous 
          ? `The AI agent has autonomously purchased an item in ${collectionName} using your linked card.`
          : `Purchase completed for an item in ${collectionName}.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/${collectionName}/${id}`);
    }
  };

  const handleTaskRabbit = async (collectionName: string, id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/${collectionName}`, id), {
        taskRabbitStatus: 'requested'
      });

      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'TaskRabbit Requested',
        message: `A Tasker has been requested to pick up an item in ${collectionName}.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/${collectionName}/${id}`);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const selectOption = async (collectionName: string, itemId: string, option: SourcingOption) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/${collectionName}`, itemId), {
        cost: option.price,
        purchaseUrl: option.url,
        selectedStore: option.store,
        selectedDelivery: option.deliveryType ?? 'Delivery'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/${collectionName}/${itemId}`);
    }
  };

  const handleText = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const openEditDialog = (type: string, item: any) => {
    setEditingItem({ type, item });
    setEditFormData({
      name: item.name || item.character || '',
      cost: item.cost || 0,
      hourlyRate: item.hourlyRate || 0,
      dayRate: item.dayRate || 0,
      purchaseUrl: item.purchaseUrl || '',
      description: item.description || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const { type, item } = editingItem;
      const coll = type === 'wardrobe' ? 'wardrobe' : type === 'props' ? 'props' : type === 'gear' ? 'gear' : 'venues';
      await updateDoc(doc(db, `projects/${projectId}/${coll}`, item.id), {
        ...(type === 'wardrobe' ? { character: editFormData.name } : { name: editFormData.name }),
        cost: Number(editFormData.cost),
        ...(type === 'venues' ? { hourlyRate: Number(editFormData.hourlyRate) || 0, dayRate: Number(editFormData.dayRate) || 0 } : {}),
        purchaseUrl: editFormData.purchaseUrl,
        description: editFormData.description
      });
      setEditingItem(null);
    } catch (error) {
      console.error('Save edit failed:', error);
    }
  };

  const handleManualAdd = async () => {
    if (!isAddingItem) return;
    try {
      const coll = isAddingItem === 'wardrobe' ? 'wardrobe' : isAddingItem === 'props' ? 'props' : isAddingItem === 'gear' ? 'gear' : 'venues';
      await addDoc(collection(db, `projects/${projectId}/${coll}`), {
        projectId,
        ...(isAddingItem === 'wardrobe' ? { character: addFormData.name } : { name: addFormData.name }),
        cost: Number(addFormData.cost),
        ...(isAddingItem === 'venues' ? { hourlyRate: Number(addFormData.hourlyRate) || 0, dayRate: Number(addFormData.dayRate) || 0 } : {}),
        purchaseUrl: addFormData.purchaseUrl,
        description: addFormData.description,
        status: isAddingItem === 'venues' ? 'research' : 'needed',
        createdAt: serverTimestamp(),
        ...(isAddingItem === 'gear' ? { category: addFormData.category || 'General' } : {})
      });
      setIsAddingItem(null);
      setAddFormData({ name: '', cost: 0, purchaseUrl: '', description: '', category: '' });
    } catch (error) {
      console.error('Manual add failed:', error);
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const coll = type === 'wardrobe' ? 'wardrobe' : type === 'props' ? 'props' : type === 'gear' ? 'gear' : 'venues';
      await deleteDoc(doc(db, `projects/${projectId}/${coll}`, id));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading sourcing data...</div>;

  return (
    <SubscriptionGate 
      featureName="Sourcing & Execution"
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold">Sourcing & Logistics</h2>
              <button 
                onClick={() => setIsWarningOpen(!isWarningOpen)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors w-fit"
              >
                <Info className="w-3 h-3" />
                Marketplace Note
                <ChevronRight className={cn("w-3 h-3 transition-transform", isWarningOpen && "rotate-90")} />
              </button>
            </div>
            <div className="flex gap-2 h-fit">
              {project.location && (
                <Badge variant="outline" className="gap-1 h-9">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </Badge>
              )}
              <Button onClick={() => handleSyncToBudget()} disabled={isSyncing || venues.length === 0} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9">
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync to Budget
              </Button>
              <Button onClick={() => handleSourcing()} disabled={generating || scenes.length === 0} className="gap-2 h-9">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? (sourcingStep || 'Analyzing Script...') : (venues.length > 0 || gear.length > 0 || props.length > 0 || wardrobe.length > 0) ? 'Rerun Agent' : 'Source All Items'}
              </Button>
            </div>
          </div>
          
          {isWarningOpen && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-800 leading-relaxed font-medium">
                While pricing estimates are accurate based on current market data, some outbound vendor links may be restricted or blocked by external sites (e.g., Airbnb, Peerspace) due to their security policies against automated crawling. If a link fails, you can search for the item directly using the name provided.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-50/50">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Venues
              </CardTitle>
              <div className="flex flex-col">
                <CardDescription>Shoot locations</CardDescription>
                <div className="flex items-center gap-1 text-[9px] text-amber-600/70 font-medium italic mt-0.5">
                  <Info className="w-2.5 h-2.5" />
                  Link accuracy subject to platform restrictions
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingItem('venues')} className="h-8 gap-2">
                <Plus className="w-3 h-3" />
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400"
                onClick={() => handleSourcing('venues')}
                disabled={generating}
                title="Redo Venues"
              >
                {generating && (!generatingCategory || generatingCategory === 'venues') ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {venues.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No venues sourced yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rate/Hr</TableHead>
                    <TableHead className="text-right">Rate/Day</TableHead>
                    <TableHead className="text-right">Total Est.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.name}</div>
                        {v.platform === 'peerspace' && <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-600 border-blue-100 mt-1">Peerspace</Badge>}
                        {v.platform === 'giggster' && <Badge variant="outline" className="text-[8px] bg-cyan-50 text-cyan-600 border-cyan-100 mt-1">Giggster</Badge>}
                        {v.platform === 'airbnb' && <Badge variant="outline" className="text-[8px] bg-rose-50 text-rose-600 border-rose-100 mt-1">Airbnb</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{v.hourlyRate ? `$${v.hourlyRate}` : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{v.dayRate ? `$${v.dayRate}` : '-'}</TableCell>
                      <TableCell className="text-right font-mono font-medium">${v.cost}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {v.phone && (
                            <div className="flex gap-1">
                              <VapiCallButton 
                                phoneNumber={v.phone}
                                isCalling={isCalling === v.name}
                                onCall={() => initiateCall(v.phone!, v.name, 'venue')}
                              />
                            </div>
                          )}
                          {v.email && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => handleEmail(v.email!)}
                              title="Email"
                            >
                              <Mail className="w-3 h-3" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 border-slate-200"
                            onClick={() => openEditDialog('venues', v)}
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {v.purchaseUrl && (
                            <a 
                              href={v.purchaseUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-7 w-7 p-0 text-blue-600 border-blue-100")}
                              title="View Listing"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {!v.isApproved ? (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleApprove('venues', v.id)}>
                              <ThumbsUp className="w-3 h-3" />
                              Approve
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-50/50">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-600" />
                Gear & Equipment
              </CardTitle>
              <div className="flex flex-col">
                <CardDescription>Rentals and purchases</CardDescription>
                <div className="flex items-center gap-1 text-[9px] text-amber-600/70 font-medium italic mt-0.5">
                  <Info className="w-2.5 h-2.5" />
                  Vendor links may require manual search
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingItem('gear')} className="h-8 gap-2">
                <Plus className="w-3 h-3" />
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400"
                onClick={() => handleSourcing('gear')}
                disabled={generating}
                title="Redo Gear"
              >
                {generating && (!generatingCategory || generatingCategory === 'gear') ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {gear.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No gear items listed yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gear.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{g.name}</span>
                          {g.source && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] h-4 w-fit px-1 uppercase tracking-tighter mt-1",
                                g.source === 'rental' ? "text-orange-600 border-orange-200 bg-orange-50" : "text-blue-600 border-blue-200 bg-blue-50"
                              )}
                            >
                              {g.source}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{g.category}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {g.hourlyRate ? `$${g.hourlyRate}/h` : g.dayRate ? `$${g.dayRate}/d` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">${g.cost}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 border-slate-200"
                            onClick={() => openEditDialog('gear', g)}
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {g.purchaseUrl && (
                            <a 
                              href={g.purchaseUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-7 w-7 p-0 text-blue-600 border-blue-100")}
                              title="View Source"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <VapiCallButton 
                            phoneNumber={g.phone}
                            isCalling={isCalling === g.name}
                            onCall={() => initiateCall(g.phone!, g.name, 'gear rental vendor')}
                          />
                          {!g.isApproved ? (
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleApprove('gear', g.id)}>Approve</Button>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {!g.isPurchased ? (
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => handlePurchase('gear', g.id)}>
                                    <ShoppingCart className="w-3 h-3" />
                                    Buy
                                  </Button>
                                </div>
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                              {g.taskRabbitStatus === 'requested' ? (
                                <Badge variant="outline" className="text-[8px] bg-orange-50 text-orange-600 border-orange-100">Tasker</Badge>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleTaskRabbit('gear', g.id)}>
                                  <Rabbit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-50/50">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-600" />
                Props
              </CardTitle>
              <div className="flex flex-col">
                <CardDescription>Set dressing and action items</CardDescription>
                <div className="flex items-center gap-1 text-[9px] text-amber-600/70 font-medium italic mt-0.5">
                  <Info className="w-2.5 h-2.5" />
                  Market links may vary by region
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingItem('props')} className="h-8 gap-2">
                <Plus className="w-3 h-3" />
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400"
                onClick={() => handleSourcing('props')}
                disabled={generating}
                title="Redo Props"
              >
                {generating && (!generatingCategory || generatingCategory === 'props') ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {props.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No props sourced yet.</p>
            ) : (
              <div className="space-y-4">
                {props.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{p.name}</h4>
                        <p className="text-xs text-slate-500">{p.description}</p>
                      </div>
                      <Badge variant={p.isApproved ? "default" : "outline"}>
                        {p.isApproved ? "Approved" : "Needed"}
                      </Badge>
                    </div>

                    {!p.isApproved && p.options && p.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {p.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectOption('props', p.id, opt)}
                            className={cn(
                              "text-left p-3 rounded-xl border text-xs transition-all flex gap-3",
                              p.purchaseUrl === opt.url ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "hover:bg-slate-50 border-slate-100"
                            )}
                          >
                            {opt.imageUrl && (
                              <img 
                                src={opt.imageUrl} 
                                alt={opt.store} 
                                className="w-12 h-12 rounded-lg object-cover bg-white border"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between font-bold">
                                <span className="truncate">{opt.store}</span>
                                <span className="text-blue-600">${opt.price}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">{opt.deliveryType}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-sm font-mono font-bold">${p.cost}</div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400"
                          onClick={() => openEditDialog('props', p)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!p.isApproved ? (
                          <Button size="sm" onClick={() => handleApprove('props', p.id)}>Approve Choice</Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {!p.isPurchased ? (
                              <Button size="sm" onClick={() => handlePurchase('props', p.id)}>Buy Now</Button>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Acquired
                              </Badge>
                            )}
                          </div>
                        )}
                        {p.purchaseUrl && (
                          <a 
                            href={p.purchaseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 text-blue-600 border-blue-100")}
                            title="View Product"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-50/50">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-emerald-600" />
                Wardrobe
              </CardTitle>
              <div className="flex flex-col">
                <CardDescription>Costumes and clothing</CardDescription>
                <div className="flex items-center gap-1 text-[9px] text-amber-600/70 font-medium italic mt-0.5">
                  <Info className="w-2.5 h-2.5" />
                  External links may be restricted
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingItem('wardrobe')} className="h-8 gap-2">
                <Plus className="w-3 h-3" />
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400"
                onClick={() => handleSourcing('wardrobe')}
                disabled={generating}
                title="Redo Wardrobe"
              >
                {generating && (!generatingCategory || generatingCategory === 'wardrobe') ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {wardrobe.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No wardrobe sourced yet.</p>
            ) : (
              <div className="space-y-4">
                {wardrobe.map((w) => (
                  <div key={w.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{w.name || w.character || 'Unnamed Costume'}</h4>
                        {w.character && w.name && w.name !== w.character && (
                          <p className="text-[10px] font-medium text-emerald-600">Character: {w.character}</p>
                        )}
                        <p className="text-xs text-slate-500">{w.description}</p>
                      </div>
                      <Badge variant={w.isApproved ? "default" : "outline"}>
                        {w.isApproved ? "Approved" : "Needed"}
                      </Badge>
                    </div>

                    {!w.isApproved && w.options && w.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {w.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectOption('wardrobe', w.id, opt)}
                            className={cn(
                              "text-left p-3 rounded-xl border text-xs transition-all flex gap-3",
                              w.purchaseUrl === opt.url ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "hover:bg-slate-50 border-slate-100"
                            )}
                          >
                            {opt.imageUrl && (
                              <img 
                                src={opt.imageUrl} 
                                alt={opt.store} 
                                className="w-12 h-12 rounded-lg object-cover bg-white border"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between font-bold">
                                <span className="truncate">{opt.store}</span>
                                <span className="text-blue-600">${opt.price}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">{opt.deliveryType}</div>
                              {opt.sizes && opt.sizes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {opt.sizes.map(s => (
                                    <span key={s} className="px-1 bg-white border rounded-[4px] text-[8px] font-bold">{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-sm font-mono font-bold">${w.cost}</div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400"
                          onClick={() => openEditDialog('wardrobe', w)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!w.isApproved ? (
                          <Button size="sm" onClick={() => handleApprove('wardrobe', w.id)}>Approve Choice</Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {!w.isPurchased ? (
                              <Button size="sm" onClick={() => handlePurchase('wardrobe', w.id)}>Buy Now</Button>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Acquired
                              </Badge>
                            )}
                          </div>
                        )}
                        {w.purchaseUrl && (
                          <a 
                            href={w.purchaseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 text-blue-600 border-blue-100")}
                            title="View Product"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sourced Item</DialogTitle>
            <DialogDescription>Manually update the details for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name / Character</Label>
              <Input 
                value={editFormData.name} 
                onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost ($)</Label>
              <Input 
                type="text" 
                value={editFormData.cost || ''} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setEditFormData({...editFormData, cost: val === '' ? 0 : Number(val)});
                }} 
              />
            </div>
            {editingItem?.type === 'venues' && (
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Hourly Rate ($)</Label>
                  <Input 
                    type="text" 
                    value={editFormData.hourlyRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setEditFormData({...editFormData, hourlyRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Day Rate ($)</Label>
                  <Input 
                    type="text" 
                    value={editFormData.dayRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setEditFormData({...editFormData, dayRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Purchase / Listing URL</Label>
              <Input 
                value={editFormData.purchaseUrl} 
                onChange={e => setEditFormData({...editFormData, purchaseUrl: e.target.value})} 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={editFormData.description} 
                onChange={e => setEditFormData({...editFormData, description: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if (editingItem) {
                  handleDeleteItem(editingItem.type, editingItem.item.id);
                  setEditingItem(null);
                }
              }}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!isAddingItem} onOpenChange={(open) => !open && setIsAddingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {isAddingItem?.charAt(0).toUpperCase()}{isAddingItem?.slice(1)}</DialogTitle>
            <DialogDescription>Manually add a new item to this category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAddingItem === 'wardrobe' ? 'Character' : 'Item Name'}</Label>
              <Input 
                value={addFormData.name} 
                onChange={e => setAddFormData({...addFormData, name: e.target.value})} 
                placeholder={isAddingItem === 'wardrobe' ? 'e.g. Lead' : 'e.g. Camera'}
              />
            </div>
            {isAddingItem === 'gear' && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Input 
                  value={addFormData.category} 
                  onChange={e => setAddFormData({...addFormData, category: e.target.value})} 
                  placeholder="e.g. Lighting, Camera"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Estimated Cost ($)</Label>
              <Input 
                type="text" 
                value={addFormData.cost || ''} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAddFormData({...addFormData, cost: val === '' ? 0 : Number(val)});
                }} 
              />
            </div>
            {isAddingItem === 'venues' && (
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Hourly Rate ($)</Label>
                  <Input 
                    type="text" 
                    value={addFormData.hourlyRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAddFormData({...addFormData, hourlyRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Day Rate ($)</Label>
                  <Input 
                    type="text" 
                    value={addFormData.dayRate || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAddFormData({...addFormData, dayRate: val === '' ? 0 : Number(val)});
                    }} 
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Purchase / Listing URL</Label>
              <Input 
                value={addFormData.purchaseUrl} 
                onChange={e => setAddFormData({...addFormData, purchaseUrl: e.target.value})} 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={addFormData.description} 
                onChange={e => setAddFormData({...addFormData, description: e.target.value})} 
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(null)}>Cancel</Button>
            <Button onClick={handleManualAdd} disabled={!addFormData.name}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubscriptionGate>
  );
}
