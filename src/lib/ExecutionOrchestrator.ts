import { collection, doc, getDocs, getDoc, writeBatch, serverTimestamp, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { breakdown, shotList, sourcing, schedule, budgetRecommendation, travelLodging, craftServices } from './gemini';
import { Scene, ScheduleDay } from '../types';

class Orchestrator {
  private executions = new Map<string, AbortController>();

  getController(projectId: string) {
    return this.executions.get(projectId);
  }

  isExecuting(projectId: string) {
    return this.executions.has(projectId);
  }

  abort(projectId: string) {
    const controller = this.executions.get(projectId);
    if (controller) {
      controller.abort();
      this.executions.delete(projectId);
      updateDoc(doc(db, 'projects', projectId), { isExecuting: false }).catch(console.error);
    }
  }

  async runMasterExecute(projectId: string) {
    if (this.executions.has(projectId)) return;
    
    // We get the controller directly set to 'executions' so we can cleanly abort.
    const controller = new AbortController();
    this.executions.set(projectId, controller);
    await updateDoc(doc(db, 'projects', projectId), { isExecuting: true });

    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) return;
      const project = projectSnap.data();

      // Step 1: Breakdown
      if (!controller.signal.aborted) await this.runBreakdown(projectId, project, controller);
      
      // Step 2: Shot List
      if (!controller.signal.aborted) await this.runShotlist(projectId, controller);
      
      // Step 3: Sourcing
      if (!controller.signal.aborted) await this.runSourcing(projectId, project, controller);

      // Step 4: Schedule
      if (!controller.signal.aborted) await this.runSchedule(projectId, controller);

      // Step 5: Budget
      if (!controller.signal.aborted) await this.runBudget(projectId, project, controller);

      // Step 6: Call Sheets
      if (!controller.signal.aborted) await this.runCallSheets(projectId, project, controller);

      if (!controller.signal.aborted) {
        await addDoc(collection(db, `projects/${projectId}/notifications`), {
          projectId, type: 'system', title: 'Master Execution Complete', message: 'All Curbily agents have finished their tasks.', isRead: false, createdAt: serverTimestamp()
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Execution failed:', e);
      }
    } finally {
      this.executions.delete(projectId);
      // Wait to ensure we didn't miss latest project updates
      if (typeof window !== 'undefined') {
        await updateDoc(doc(db, 'projects', projectId), { isExecuting: false }).catch(console.error);
      }
    }
  }

  async runBreakdown(projectId: string, project: any, controller?: AbortController) {
    if (!project.scriptText) return;
    await addDoc(collection(db, `projects/${projectId}/notifications`), {
      projectId, type: 'system', title: 'Agent Running: Additive Breakdown', message: 'Synchronizing script changes with existing production data...', isRead: false, createdAt: serverTimestamp()
    });
    
    const breakdownData = await breakdown(project.scriptText, project.agentInstructions);
    if (controller?.signal.aborted) return;

    // Fetch existing scenes to merge
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const existingScenesMap = new Map<number, Scene>();
    scenesSnap.docs.forEach(d => {
       const s = { id: d.id, ...d.data() } as Scene;
       existingScenesMap.set(s.sceneNumber, s);
    });

    const batch = writeBatch(db);
    breakdownData.forEach((newScene: any) => {
      const existing = existingScenesMap.get(newScene.sceneNumber);
      if (existing) {
        batch.update(doc(db, 'projects', projectId, 'scenes', existing.id), {
          ...newScene, projectId, notes: existing.notes || newScene.notes || '', duration: existing.duration || newScene.duration || 0
        });
      } else {
        const sceneRef = doc(collection(db, 'projects', projectId, 'scenes'));
        batch.set(sceneRef, { ...newScene, projectId, duration: newScene.duration || 0 });
      }
    });

    if (!controller?.signal.aborted) await batch.commit();
  }

  async runShotlist(projectId: string, controller?: AbortController) {
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const scenes = scenesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Scene));
    if (scenes.length === 0) return;

    await addDoc(collection(db, `projects/${projectId}/notifications`), {
      projectId, type: 'system', title: 'Agent Running: Shot List', message: 'Generating shot list from breakdown...', isRead: false, createdAt: serverTimestamp()
    });

    const simplifiedScenes = scenes.map(s => ({ id: s.id, sceneNumber: s.sceneNumber, slugline: s.slugline, location: s.location, cast: s.cast, props: s.props }));
    const suggestedShots = await shotList(simplifiedScenes);
    if (controller?.signal.aborted) return;

    const batch = writeBatch(db);
    const snapshot = await getDocs(query(collection(db, `projects/${projectId}/shots`)));
    snapshot.docs.forEach(d => batch.delete(d.ref));
    
    suggestedShots.forEach((shot: any) => {
      const newShotRef = doc(collection(db, `projects/${projectId}/shots`));
      batch.set(newShotRef, { ...shot, projectId, createdAt: serverTimestamp() });
    });
    
    if (!controller?.signal.aborted) await batch.commit();
  }

  async runSourcing(projectId: string, project: any, controller?: AbortController) {
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const scenes = scenesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Scene));
    if (scenes.length === 0) return;

    await addDoc(collection(db, `projects/${projectId}/notifications`), {
      projectId, type: 'system', title: `Running Master Sourcing Agent`, message: `Sourcing all categories...`, isRead: false, createdAt: serverTimestamp()
    });

    const budgetSnap = await getDocs(collection(db, 'projects', projectId, 'budget'));
    const budgetItems = budgetSnap.docs.map(d => d.data());

    let sourcingData: any = {};
    const categoriesToSource = ['venues', 'gear', 'props', 'wardrobe', 'permits'];
    for (const cat of categoriesToSource) {
      if (controller?.signal.aborted) return;
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId, type: 'system', title: `Running Subagent`, message: `Sourcing ${cat}...`, isRead: false, createdAt: serverTimestamp()
      });
      const data = await sourcing(scenes, project.location, cat as any, budgetItems, project.agentInstructions);
      if (cat === 'venues') sourcingData.venues = data.venues || [];
      if (cat === 'gear') sourcingData.clothing = data.clothing || []; // wait clothing vs gear
      if (cat === 'props') sourcingData.props = data.props || [];
      if (cat === 'wardrobe') sourcingData.wardrobe = data.wardrobe || [];
      if (cat === 'permits') sourcingData.permits = data.permits || [];
    }

    if (!controller?.signal.aborted) {
      sourcingData.travel = await travelLodging(scenes, project.location);
    }
    if (!controller?.signal.aborted) {
      sourcingData.catering = await craftServices(scenes, project.location);
    }

    if (controller?.signal.aborted) return;

    const batch = writeBatch(db);
    const existingSnap = await getDocs(collection(db, 'projects', projectId, 'locations'));
    existingSnap.docs.forEach(d => batch.delete(d.ref));

    ['venues', 'clothing', 'props', 'wardrobe', 'permits', 'travel', 'catering'].forEach(cat => {
      const items = sourcingData[cat] || [];
      items.forEach((item: any) => {
         const newRef = doc(collection(db, 'projects', projectId, 'locations'));
         batch.set(newRef, { ...item, type: cat, projectId, createdAt: serverTimestamp() });
      });
    });

    if (!controller?.signal.aborted) await batch.commit();
  }

  async runSchedule(projectId: string, controller?: AbortController) {
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const scenes = scenesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Scene));
    if (scenes.length === 0) return;

    const shotsSnap = await getDocs(collection(db, `projects/${projectId}/shots`));
    const shots = shotsSnap.docs.map(d => d.data());

    await addDoc(collection(db, `projects/${projectId}/notifications`), {
      projectId, type: 'system', title: 'Agent Running: Schedule Master', message: 'AD is distributing scenes into a shooting schedule...', isRead: false, createdAt: serverTimestamp()
    });

    const simplifiedScenes = scenes.map((s: any) => ({ id: s.id, sceneNumber: s.sceneNumber, slugline: s.slugline, cast: s.cast, pages: s.pages, pagesEighths: s.pagesEighths }));
    const suggestedSchedule = await schedule(simplifiedScenes, shots, 10, 'feature', '', (msg) => {
      addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId, type: 'system', title: 'Scheduling Progress', message: msg, isRead: false, createdAt: serverTimestamp()
      }).catch(console.error);
    });
    
    if (controller?.signal.aborted) return;
    
    const batch = writeBatch(db);
    const snapshot = await getDocs(query(collection(db, `projects/${projectId}/schedule`)));
    snapshot.docs.forEach(d => batch.delete(d.ref));

    suggestedSchedule.forEach((day: any) => {
       const newDayRef = doc(collection(db, `projects/${projectId}/schedule`));
       batch.set(newDayRef, { ...day, projectId, createdAt: serverTimestamp() });
    });
    
    if (!controller?.signal.aborted) await batch.commit();
  }

  async runBudget(projectId: string, project: any, controller?: AbortController) {
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const scenes = scenesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Scene));
    if (scenes.length === 0) return;

    // Fetch schedule for budget context
    const scheduleQ = query(collection(db, `projects/${projectId}/schedule`));
    const scheduleSnap = await getDocs(scheduleQ);
    const scheduleDays = scheduleSnap.docs.map(doc => doc.data());

    // Minimal fetch for sourcing
    const getCol = async (col: string) => {
      const snap = await getDocs(query(collection(db, `projects/${projectId}/${col}`)));
      return snap.docs.map(doc => doc.data());
    }
    const sourcingData = {
      venues: await getCol('venues'),
      gear: await getCol('gear'),
      props: await getCol('props'),
      wardrobe: await getCol('wardrobe'),
      travel: await getCol('travel'),
      catering: await getCol('catering'),
    };
    
    const { budget } = await import('./agents/budget');
    const { unionRateService } = await import('../services/unionRateService');
    const customRates = await unionRateService.getRatesForAgent();
    const canonicalRates = await unionRateService.getCanonicalRatesForAgent();
    
    const contactsSnap = await getDocs(collection(db, `projects/${projectId}/contacts`));
    const contacts = contactsSnap.docs.map(d => d.data());

    const suggestedBudget = await budget(
      scenes, 
      project?.isSAG, 
      project?.location, 
      contacts, 
      project?.contentType,
      project?.permitSummary,
      scheduleDays,
      [...customRates, ...canonicalRates],
      project?.targetBudget || 0,
      sourcingData,
      project?.budgetTier,
      (msg) => {
        addDoc(collection(db, `projects/${projectId}/notifications`), {
          projectId, type: 'system', title: 'Budget Progress', message: msg, isRead: false, createdAt: serverTimestamp()
        }).catch(console.error);
      }
    );
    if (controller?.signal.aborted) return;

    const batch = writeBatch(db);
    const snapshot = await getDocs(query(collection(db, `projects/${projectId}/budget`)));
    snapshot.docs.forEach(d => batch.delete(d.ref));

    if (Array.isArray(suggestedBudget)) {
       suggestedBudget.forEach((item: any) => {
          const newRef = doc(collection(db, `projects/${projectId}/budget`));
          const sanitizedItem = {
            category: item.category || 'Other',
            description: item.description || 'Unnamed Item',
            details: item.details || '',
            rate: Number(item.rate) || 0,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'flat',
            amount: (Number(item.rate) || 0) * (Number(item.quantity) || 1),
            status: item.status || 'estimated',
            ...item,
            projectId,
            createdAt: serverTimestamp()
          };
          // Ensure no undefined values override the sanitized defaults
          Object.keys(sanitizedItem).forEach(key => {
            if (sanitizedItem[key] === undefined) delete sanitizedItem[key];
          });
          batch.set(newRef, sanitizedItem);
       });
    }
    
    if (!controller?.signal.aborted) await batch.commit();
  }

  async runOutreach(projectId: string, project: any, controller?: AbortController) {
    await addDoc(collection(db, `projects/${projectId}/notifications`), {
      projectId, type: 'system', title: 'Agent Running: Crew Outreach', message: 'Analyzing talent network and suggesting matches...', isRead: false, createdAt: serverTimestamp()
    });

    const contactsSnap = await getDocs(collection(db, 'contacts'));
    const contacts = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const { crewRecommendations } = await import('./agents/operations/staffing');
    const result = await crewRecommendations(project, contacts);

    if (controller?.signal.aborted) return;

    const batch = writeBatch(db);
    
    // We store outreach recommendations in outreachThreads or a similar structure
    // but the Orchestrator should probably just pre-populate suggestions
    if (result && Array.isArray(result.recommendations)) {
      for (const rec of result.recommendations) {
        if (!rec.role || !Array.isArray(rec.matches)) continue;
        
        for (const match of rec.matches) {
          const threadRef = doc(collection(db, 'outreachThreads'));
          batch.set(threadRef, {
            projectId,
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

    if (!controller?.signal.aborted) await batch.commit();
  }

  async runCallSheets(projectId: string, project: any, controller?: AbortController) {
    const scenesSnap = await getDocs(collection(db, 'projects', projectId, 'scenes'));
    const scenes = scenesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Scene));
    
    const daysSnap = await getDocs(query(collection(db, `projects/${projectId}/schedule`), orderBy('dayNumber')));
    const scheduleDays = daysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleDay));
    
    if (scenes.length === 0 || scheduleDays.length === 0) return;

    const contactsSnap = await getDocs(collection(db, `projects/${projectId}/contacts`));
    const contacts = contactsSnap.docs.map(d => d.data());

    const { callSheet } = await import('./agents/operations/callSheet');

    for (const day of scheduleDays) {
      if (controller?.signal.aborted) break;
      const dayScenes = (day.sceneIds || []).map((sid: string) => scenes.find(s => s.id === sid)).filter(Boolean);
      const sheetData = await callSheet(day, dayScenes as Scene[], contacts, project.location || 'TBD', { isMicroDrama: project.isMicroDrama, contentType: project.contentType }, (msg) => {
        addDoc(collection(db, `projects/${projectId}/notifications`), {
          projectId, type: 'system', title: `Call Sheet Progress (Day ${day.dayNumber})`, message: msg, isRead: false, createdAt: serverTimestamp()
        }).catch(console.error);
      });
      
      const sheetRef = await addDoc(collection(db, 'projects', projectId, 'call_sheets'), {
        projectId, dayId: day.id, ...sheetData, status: 'draft', createdAt: serverTimestamp()
      });
      
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

export const executionOrchestrator = new Orchestrator();
