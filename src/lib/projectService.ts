import { collection, addDoc, serverTimestamp, writeBatch, doc, getDoc, getDocs, query, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function saveProjectAsSampleTemplate(projectId: string) {
  try {
    const projectSnap = await getDoc(doc(db, 'projects', projectId));
    if (!projectSnap.exists()) throw new Error('Project not found');
    
    const projectData = projectSnap.data();
    const subcollections = [
      'scenes', 'budget', 'shots', 'schedule', 'venues', 
      'gear', 'props', 'wardrobe', 'contacts', 'travel', 
      'catering', 'notifications', 'call_sheets'
    ];

    const template: any = {
      project: { ...projectData, isSample: true, ownerId: null },
      subcollections: {}
    };

    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, 'projects', projectId, sub));
      template.subcollections[sub] = snap.docs.map(d => {
        const data = d.data();
        delete data.projectId;
        return data;
      });
    }

    const threadsSnap = await getDocs(query(collection(db, 'outreachThreads'), where('projectId', '==', projectId)));
    template.outreachThreads = threadsSnap.docs.map(d => {
        const data = d.data();
        delete data.projectId;
        return data;
    });

    await setDoc(doc(db, 'settings', 'sample_template'), {
        ...template,
        updatedAt: serverTimestamp()
    });

    console.log('Project successfully promoted to Master Sample Template');
  } catch (error) {
    console.error('Error saving sample template:', error);
    throw error;
  }
}

async function getTemplate() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'sample_template'));
        if (snap.exists()) return snap.data();
    } catch (e) {
        console.warn('No master template found in DB:', e);
    }
    return null;
}

export async function seedSampleProject(userId: string) {
  try {
    const template = await getTemplate();
    
    if (!template) {
        console.warn("Skipping sample seeding: No Master Template has been set in the Admin Dashboard yet.");
        // Return null instead of crashing, so the user just starts with an empty dashboard
        return null;
    }

    const projectBase = template.project;
    const scenes = template.subcollections?.scenes || [];
    const budget = template.subcollections?.budget || [];
    const shots = template.subcollections?.shots || [];
    const schedule = template.subcollections?.schedule || [];
    const venues = template.subcollections?.venues || [];
    const gear = template.subcollections?.gear || [];
    const props = template.subcollections?.props || [];
    const wardrobe = template.subcollections?.wardrobe || [];
    const contacts = template.subcollections?.contacts || [];
    const travelData = template.subcollections?.travel || [];
    const catering = template.subcollections?.catering || [];
    const notifications = template.subcollections?.notifications || [];
    const threads = template.outreachThreads || [];
    const callSheets = template.subcollections?.call_sheets || [];

    // 1. Create the project document
    const projectRef = doc(collection(db, 'projects'));
    const projectId = projectRef.id;

    const batch = writeBatch(db);
    
    batch.set(projectRef, {
      ...projectBase,
      ownerId: userId,
      isSample: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Prepare subcollections
    const sceneToIdMap = new Map<number, string>();
    const contactRefs: string[] = [];
    const scheduleDayRefs: string[] = [];

    // Scenes
    for (const scene of scenes) {
      const sceneRef = doc(collection(db, `projects/${projectId}/scenes`));
      batch.set(sceneRef, { ...scene, projectId, createdAt: serverTimestamp() });
      sceneToIdMap.set(scene.sceneNumber, sceneRef.id);
    }

    // Budget
    for (const item of budget) {
      const budgetRef = doc(collection(db, `projects/${projectId}/budget`));
      batch.set(budgetRef, { ...item, projectId, createdAt: serverTimestamp() });
    }

    // Schedule
    for (const day of schedule) {
      const dayRef = doc(collection(db, `projects/${projectId}/schedule`));
      batch.set(dayRef, { ...day, projectId, createdAt: serverTimestamp() });
      scheduleDayRefs.push(dayRef.id);
    }

    // Contacts
    for (const contact of contacts) {
      const contactRef = doc(collection(db, `projects/${projectId}/contacts`));
      batch.set(contactRef, { ...contact, projectId, ownerId: userId, createdAt: serverTimestamp() });
      contactRefs.push(contactRef.id);
    }

    await batch.commit();

    // 3. Second batch for linked and auxiliary data
    const batch2 = writeBatch(db);

    // Shots
    for (const shot of shots) {
      const shotRef = doc(collection(db, `projects/${projectId}/shots`));
      const linkedSceneId = sceneToIdMap.get(shot.sceneNumber);
      batch2.set(shotRef, { 
        ...shot, 
        projectId, 
        sceneId: linkedSceneId || null,
        createdAt: serverTimestamp() 
      });
    }

    // Outreach Threads
    for (let i = 0; i < threads.length; i++) {
      if (contactRefs[i]) {
        const threadRef = doc(collection(db, 'outreachThreads'));
        batch2.set(threadRef, {
          ...threads[i],
          projectId,
          contactId: contactRefs[i],
          ownerId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    // Simple Sourcing Data
    const sourcingData = [
      { coll: 'venues', items: venues },
      { coll: 'gear', items: gear },
      { coll: 'props', items: props },
      { coll: 'wardrobe', items: wardrobe },
      { coll: 'travel', items: travelData },
      { coll: 'catering', items: catering },
      { coll: 'notifications', items: notifications }
    ];

    for (const group of sourcingData) {
      for (const item of group.items) {
        const ref = doc(collection(db, `projects/${projectId}/${group.coll}`));
        batch2.set(ref, { ...item, projectId, createdAt: serverTimestamp() });
      }
    }

    // Call Sheets
    for (let i = 0; i < callSheets.length; i++) {
      if (scheduleDayRefs[i]) {
        const sheetRef = doc(collection(db, 'projects', projectId, 'call_sheets'));
        batch2.set(sheetRef, {
          ...callSheets[i],
          projectId,
          dayId: scheduleDayRefs[i],
          createdAt: serverTimestamp()
        });
      }
    }

    await batch2.commit();
    return projectId;
  } catch (error) {
    console.error('Error seeding sample project:', error);
    throw error;
  }
}
