import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, addDoc, serverTimestamp, updateDoc, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { ScheduleDay, Scene, Project } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Sparkles, Calendar as CalendarIcon, MapPin, Clock, Gauge, MessageSquare, Send, AlertTriangle, Timer, Footprints, Package, FileText } from 'lucide-react';
import { schedule } from '../../lib/agents/operations/schedule';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

import { Textarea } from '../ui/textarea';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';

import { ensureApiKey } from '../../lib/apiKeyCheck';

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

function SortableScene({ sceneNum, scene, sceneTimes, projectId, dayId }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `scene-${dayId}-${sceneNum}`, data: { type: 'scene', sceneNum, dayId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  if (!scene) return null;

  return (
    <div ref={setNodeRef} style={style} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors bg-white">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded">
          <span className="font-mono text-xs font-bold text-slate-400 w-8 inline-block text-center">{scene.sceneNumber}</span>
        </div>
        <div>
          <p className="font-bold text-sm">{scene.slugline}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {scene.location}
            </span>
            <span className="flex items-center gap-1 border-l pl-3 ml-1 border-slate-200">
              <Clock className="w-3 h-3" />
              <span className="mr-2 uppercase font-bold text-[10px] bg-slate-100 px-1 rounded">{scene.timeOfDay}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-all">
          <Gauge className="w-3 h-3 text-indigo-400" />
          <Input 
              type="number"
              step="0.25"
              className="h-6 w-14 text-[10px] py-0 px-1 bg-slate-50 border-slate-200" 
              value={sceneTimes?.[sceneNum] || 0.5}
              onChange={(e) => updateDoc(doc(db, 'projects', projectId, 'schedule', dayId), { [`sceneTimes.${sceneNum}`]: parseFloat(e.target.value) || 0 })}
          />
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">HRS</span>
        </div>
        <div className="flex gap-1">
          {(scene.cast || []).slice(0, 2).map((c: string) => (
            <div key={c} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold" title={c}>
              {c.charAt(0)}
            </div>
          ))}
          {(scene.cast || []).length > 2 && (
            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-slate-500">
              +{(scene.cast || []).length - 2}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableDay({ day, scenes, projectId, hourMode, dayLengthPreference, handleUpdateDate, handlePushToCalendar }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: day.id, data: { type: 'day', dayId: day.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const sceneIds = day.sceneIds || [];

  const totalSceneTime = sceneIds.reduce((acc: number, sceneNum: string) => {
    return acc + (day.sceneTimes?.[sceneNum] || 0.5);
  }, 0);
  const totalDayTime = totalSceneTime + (day.setupTime || 0) + (day.wrapTime || 0) + (day.travelTime || 0);
  const isOvertime = totalDayTime > (dayLengthPreference || 10);

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <Card className={cn("border-none shadow-sm", isDragging && "ring-2 ring-blue-500", isOvertime && "ring-2 ring-red-500")}>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-white">
          <div className="flex items-center gap-3">
            <div 
              {...attributes} 
              {...listeners} 
              className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold cursor-grab active:cursor-grabbing"
            >
              {day.dayNumber}
            </div>
            <div>
              <CardTitle className="text-lg">Shoot Day {day.dayNumber}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  type="date" 
                  className="h-6 w-32 text-[10px] py-0 px-2" 
                  value={day.date || ''} 
                  onChange={(e) => handleUpdateDate(day, e.target.value)}
                />
                <div className="flex items-center gap-1 border-l pl-2 mr-1 border-slate-200">
                   <span className="text-[10px] font-bold text-slate-400">CALL:</span>
                   <Input
                     type="time"
                     className="h-6 w-24 text-[10px] py-0 px-2 font-bold"
                     value={day.callTime || ''}
                     onChange={(e) => updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), { callTime: e.target.value })}
                   />
                </div>
                <div className="flex items-center gap-1 border-l pl-2 mr-1 border-slate-200">
                  <Input 
                    type="number" 
                    step="0.25"
                    min="0"
                    className="h-6 w-16 text-[10px] py-0 px-2 font-bold" 
                    value={day.dayLength ?? day.estimatedLength ?? 0} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), { 
                        dayLength: val,
                        estimatedLength: val 
                      })
                    }}
                  />
                  <span className="text-[10px] font-bold text-slate-500">HRS/DAY</span>
                </div>
                <p className="text-xs text-slate-500 border-l pl-2">{sceneIds.length} scenes</p>
                <div className={cn(
                  "flex items-center gap-1.5 border-l pl-2 px-2 py-0.5 rounded",
                  isOvertime ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                )}>
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{totalDayTime.toFixed(2)} HRS TOTAL</span>
                  {isOvertime && <AlertTriangle className="w-3 h-3 animate-pulse" title="Exceeds daily hour preference" />}
                </div>
              </div>
              <div className="flex gap-4 mt-2 border-t border-slate-50 pt-2">
                  <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                      <Timer className="w-3 h-3 text-blue-500" />
                      <span className="text-[9px] font-black uppercase text-slate-400">Setup:</span>
                      <Input 
                          type="number"
                          step="0.25"
                          className="h-5 w-14 text-[10px] py-0 px-1 bg-transparent border-slate-200" 
                          value={day.setupTime || 0}
                          onChange={(e) => updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), { setupTime: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">HRS</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                      <Package className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-black uppercase text-slate-400">Wrap:</span>
                      <Input 
                          type="number"
                          step="0.25"
                          className="h-5 w-14 text-[10px] py-0 px-1 bg-transparent border-slate-200" 
                          value={day.wrapTime || 0}
                          onChange={(e) => updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), { wrapTime: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">HRS</span>
                  </div>
                  <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                      <Footprints className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-black uppercase text-slate-400">Travel:</span>
                      <Input 
                          type="number"
                          step="0.25"
                          className="h-5 w-14 text-[10px] py-0 px-1 bg-transparent border-slate-200" 
                          value={day.travelTime || 0}
                          onChange={(e) => updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), { travelTime: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">HRS</span>
                  </div>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => handlePushToCalendar(day)} className="gap-2">
            <CalendarIcon className="w-3 h-3" />
            Push to Calendar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <SortableContext 
            items={sceneIds.map((s: string) => `scene-${day.id}-${s}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-slate-50">
              {sceneIds.map((sceneNum: string) => (
                <SortableScene 
                  key={`scene-${day.id}-${sceneNum}`}
                  sceneNum={sceneNum}
                  scene={scenes[sceneNum]}
                  sceneTimes={day.sceneTimes}
                  projectId={projectId}
                  dayId={day.id}
                />
              ))}
            </div>
          </SortableContext>
          {day.weather && (
            <div className="p-4 bg-orange-50/50 border-t border-orange-100/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 flex items-center gap-2">
                 Weather Logistics
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{day.weather}</p>
            </div>
          )}
          {day.sidesOverview && (
            <div className="p-4 bg-emerald-50/30 border-t border-emerald-100/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-2">
                <FileText className="w-3 h-3 text-emerald-500" />
                Daily Sides Overview
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-bold">{day.sidesOverview}</p>
            </div>
          )}
          {day.adNotes && (
            <div className="p-4 bg-blue-50/30 border-t border-blue-100/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-blue-500" />
                1st AD Notes & Rationale
              </p>
              <p className="text-xs text-slate-600 leading-relaxed italic">{day.adNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Trash2, PlusCircle, LayoutGrid, List as ListIcon, Maximize2, Minimize2 } from 'lucide-react';

function Boneyard({ scenes, projectId }: { scenes: Scene[], projectId: string }) {
  return (
    <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-[2rem] mt-8">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white/50 rounded-t-[2rem]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-bold">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">The Boneyard</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unscheduled scenes & deleted sequences</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white">{scenes.length} Scenes</Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {scenes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
              Boneyard is empty. All scenes are currently scheduled.
            </div>
          ) : (
            scenes.map(scene => (
              <div key={scene.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-black text-slate-400">#{scene.sceneNumber}</span>
                  <Badge variant="outline" className="text-[8px] py-0">{scene.timeOfDay}</Badge>
                </div>
                <h4 className="font-black uppercase text-[11px] leading-tight mb-1">{scene.slugline}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-2 italic mb-3">
                  {scene.synopsis || 'No synopsis provided.'}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                   <span className="text-[10px] font-bold text-slate-400">{scene.pagesEighths || '0'} pgs</span>
                   <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity">
                     <PlusCircle className="w-3 h-3 mr-1" /> Re-Schedule
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Schedule({ projectId, project, onGenerate, isGenerating: isGeneratingProp }: { projectId: string, project: Project, onGenerate?: (dayLength?: number, availabilityConstraint?: string) => void, isGenerating?: boolean }) {
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [scenes, setScenes] = useState<Record<string, Scene>>({});
  const [loading, setLoading] = useState(true);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [dayLengthPreference, setDayLengthPreference] = useState<number>(10);
  const [availabilityConstraint, setAvailabilityConstraint] = useState("");
  const [crewThreads, setCrewThreads] = useState<any[]>([]);
  const isGenerating = isGeneratingProp || isGeneratingLocal;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'day') {
      const oldIndex = days.findIndex((d) => d.id === active.id);
      const newIndex = days.findIndex((d) => d.id === over.id);

      const newDays = arrayMove(days, oldIndex, newIndex) as ScheduleDay[];
      setDays(newDays);

      try {
        const batch = writeBatch(db);
        newDays.forEach((day, index) => {
          const dayRef = doc(db, 'projects', projectId, 'schedule', day.id);
          batch.update(dayRef, { 
            dayNumber: index + 1,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      } catch (error) {
        console.error('Failed to reorder days:', error);
        setDays(days);
      }
    } else if (activeData?.type === 'scene') {
      const activeDayId = activeData.dayId;
      const overDayId = overData?.dayId || over.id; // Handle dropping on a day card too

      if (activeDayId === overDayId) {
        // Reorder within same day
        const day = days.find(d => d.id === activeDayId);
        if (!day) return;

        const oldIndex = day.sceneIds?.indexOf(activeData.sceneNum);
        const newIndex = day.sceneIds?.indexOf(overData?.sceneNum) ?? (day.sceneIds?.length - 1);

        if (oldIndex === -1 || newIndex === -1) return;

        const newSceneIds = arrayMove(day.sceneIds, oldIndex, newIndex);
        
        // Update local state
        setDays(days.map(d => d.id === activeDayId ? { ...d, sceneIds: newSceneIds } : d));

        try {
          await updateDoc(doc(db, 'projects', projectId, 'schedule', activeDayId), {
            sceneIds: newSceneIds,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Failed to reorder scenes:', error);
          setDays(days);
        }
      } else {
        // Move between days
        const activeDay = days.find(d => d.id === activeDayId);
        const overDay = days.find(d => d.id === overDayId);
        if (!activeDay || !overDay) return;

        const newActiveSceneIds = activeDay.sceneIds.filter(id => id !== activeData.sceneNum);
        const newOverSceneIds = [...(overDay.sceneIds || [])];
        
        const overIndex = overData?.sceneNum ? overDay.sceneIds.indexOf(overData.sceneNum) : newOverSceneIds.length;
        newOverSceneIds.splice(overIndex, 0, activeData.sceneNum);

        // Update local state
        setDays(days.map(d => {
          if (d.id === activeDayId) return { ...d, sceneIds: newActiveSceneIds };
          if (d.id === overDayId) return { ...d, sceneIds: newOverSceneIds };
          return d;
        }));

        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'projects', projectId, 'schedule', activeDayId), {
            sceneIds: newActiveSceneIds,
            updatedAt: serverTimestamp()
          });
          batch.update(doc(db, 'projects', projectId, 'schedule', overDayId), {
            sceneIds: newOverSceneIds,
            updatedAt: serverTimestamp()
          });
          await batch.commit();
        } catch (error) {
          console.error('Failed to move scene between days:', error);
          setDays(days);
        }
      }
    }
  };

  const [hourMode, setHourMode] = useState<'8' | '10' | '12' | 'custom'>(() => {
    if ([8, 10, 12].includes(dayLengthPreference)) return String(dayLengthPreference) as '8' | '10' | '12';
    return 'custom';
  });

  const handleHourSelection = async (mode: '8' | '10' | '12' | 'custom', val?: number) => {
    setHourMode(mode);
    const length = mode === 'custom' ? (val || dayLengthPreference) : Number(mode);
    setDayLengthPreference(length);
    
    // Update existing days if they exist to be truly "dynamic"
    if (days.length > 0) {
      const batch = writeBatch(db);
      days.forEach(day => {
        batch.update(doc(db, 'projects', projectId, 'schedule', day.id), {
          dayLength: length,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    }

    if (mode !== 'custom' && days.length === 0) {
      if (onGenerate) {
        onGenerate(length, availabilityConstraint);
      } else {
        setTimeout(() => {
           const button = document.getElementById('generate-schedule-btn');
           if (button) button.click();
        }, 0);
      }
    }
  };

  useEffect(() => {
    // Fetch crew threads
    const qThreads = query(collection(db, 'outreachThreads'), where('projectId', '==', projectId));
    const unsubThreads = onSnapshot(qThreads, (snapshot) => {
      setCrewThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubThreads();
  }, [projectId]);

  useEffect(() => {
    // Fetch schedule days
    const qDays = query(collection(db, 'projects', projectId, 'schedule'), orderBy('dayNumber', 'asc'));
    const unsubDays = onSnapshot(qDays, (snapshot) => {
      setDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleDay)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/schedule`);
    });

    // Fetch all scenes for reference
    const qScenes = query(collection(db, 'projects', projectId, 'scenes'));
    const unsubScenes = onSnapshot(qScenes, (snapshot) => {
      const sceneMap: Record<string, Scene> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Scene;
        sceneMap[data.sceneNumber] = { id: doc.id, ...data };
      });
      setScenes(sceneMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    return () => {
        unsubDays();
        unsubScenes();
      };
  }, [projectId]);

  const handleGenerateSchedule = async () => {
    if (onGenerate) {
      onGenerate(dayLengthPreference, availabilityConstraint);
      return;
    }
    await ensureApiKey();
    setIsGeneratingLocal(true);
    try {
      // Clear existing schedule
      const clearBatch = writeBatch(db);
      days.forEach(day => {
        clearBatch.delete(doc(db, `projects/${projectId}/schedule`, day.id));
      });
      await clearBatch.commit();

      // Fetch shots
      const shotsQ = query(collection(db, `projects/${projectId}/shots`));
      const shotsSnap = await getDocs(shotsQ);
      const shotsData = shotsSnap.docs.map(doc => doc.data());

      // Fetch budget data for smarter scheduling
      const budgetQ = query(collection(db, `projects/${projectId}/budget`));
      const budgetSnap = await getDocs(budgetQ);
      const budgetData = budgetSnap.docs.map(doc => doc.data());

      const sceneList = Object.values(scenes);
      const scheduleData = await schedule(
        sceneList, 
        shotsData, 
        Number(dayLengthPreference), 
        project.contentType, 
        availabilityConstraint,
        undefined,
        budgetData
      );
      
      const batch = writeBatch(db);
      scheduleData.forEach((day: any) => {
        const dayRef = doc(collection(db, 'projects', projectId, 'schedule'));
        batch.set(dayRef, {
          projectId,
          dayNumber: day.dayNumber,
          date: day.date || '',
          sceneIds: day.sceneNumbers ? day.sceneNumbers.map((n: number) => String(n)) : day.scenesScheduled.map((n: number) => String(n)),
          notes: day.notes || '',
          rationale: day.rationale || '',
          dayLength: day.estimatedLength || day.dayLength || 10,
          setupTime: day.setupTime || 1.0,
          wrapTime: day.wrapTime || 0.5,
          travelTime: day.travelTime || 0,
          sceneTimes: day.sceneTimes || {},
          adNotes: day.adNotes || '',
          sidesOverview: day.sidesOverview || '',
          weather: day.weather || ''
        });
      });
      await batch.commit();
    } catch (error) {
      console.error('Schedule generation failed:', error);
    } finally {
      setIsGeneratingLocal(false);
    }
  };

  const handlePushToCalendar = async (day: ScheduleDay) => {
    try {
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'Calendar Invite Sent',
        message: `Calendar invites for Shoot Day ${day.dayNumber} have been sent to all cast and crew.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to send calendar invite:', error);
    }
  };

  const handleUpdateDate = async (day: ScheduleDay, date: string) => {
    if (day.date === date) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'schedule', day.id), {
        date,
        updatedAt: serverTimestamp()
      });

      // Notification logic for date shift
      if (day.date) {
        await addDoc(collection(db, `projects/${projectId}/notifications`), {
          projectId,
          type: 'alert',
          title: 'Schedule Shift Detected',
          message: `Shoot Day ${day.dayNumber} moved from ${day.date} to ${date}. Notifying crew...`,
          isRead: false,
          createdAt: serverTimestamp()
        });

        // "Reach out to crew" logic
        // In a real app, this would trigger emails/SMS. 
        // Here we add it to our internal outreach threads as a system update.
        const batch = writeBatch(db);
        crewThreads.forEach(thread => {
          const msgRef = doc(collection(db, 'outreachThreads', thread.id, 'messages'));
          batch.set(msgRef, {
            role: 'system',
            content: `SCHEDULE UPDATE: Shoot Day ${day.dayNumber} has been rescheduled to ${date}. Please confirm your availability.`,
            createdAt: serverTimestamp()
          });
          batch.update(doc(db, 'outreachThreads', thread.id), {
            status: 'action_required',
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to update date:', error);
    }
  };

  if (loading) return <div>Loading schedule...</div>;

  const allScheduledSceneIds = days.reduce((acc, day) => [...acc, ...(day.sceneIds || [])], [] as string[]);
  const unscheduledScenes = Object.values(scenes).filter((s: Scene) => !allScheduledSceneIds.includes(String(s.sceneNumber)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Production Schedule
          </h2>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
            {['8', '10', '12'].map((len) => (
              <Button
                key={len}
                variant="ghost"
                size="sm"
                onClick={() => handleHourSelection(len as any)}
                className={cn(
                  "h-7 px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                  hourMode === len 
                    ? "bg-white shadow-sm text-slate-900 border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {len}H
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHourSelection('custom')}
              className={cn(
                "h-7 px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                hourMode === 'custom' 
                  ? "bg-white shadow-sm text-slate-900 border border-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              CUSTOM
            </Button>

            {hourMode === 'custom' && (
              <div className="flex items-center gap-1 border-l pl-1 ml-1 border-slate-200 animate-in fade-in slide-in-from-left-2 duration-300">
                <Input 
                  type="number"
                  className="h-7 w-10 text-[10px] py-0 px-1 font-bold bg-white"
                  placeholder="HRS"
                  value={dayLengthPreference}
                  onChange={(e) => setDayLengthPreference(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (onGenerate) onGenerate(dayLengthPreference, availabilityConstraint);
                      else handleGenerateSchedule();
                    }
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => {
                    if (onGenerate) onGenerate(dayLengthPreference, availabilityConstraint);
                    else handleGenerateSchedule();
                  }}
                >
                  SET
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings2 className="w-4 h-4" />
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Scheduling Variables</DialogTitle>
                <DialogDescription>
                  Determine logical constraints for the agent to consider before generating the schedule.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Cast & Team Availability Constraints</Label>
                <Textarea 
                  placeholder="e.g. Lead Actor is unavailable on May 4th. Team must wrap by 5pm on Fridays... (Keep it concise)" 
                  value={availabilityConstraint}
                  onChange={e => setAvailabilityConstraint(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button id="generate-schedule-btn" onClick={handleGenerateSchedule} disabled={isGenerating || Object.keys(scenes).length === 0} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : days.length > 0 ? 'Rerun Agent' : 'Generate Schedule'}
          </Button>
        </div>
      </div>

      {days.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium">No schedule yet</h3>
            <p className="text-slate-500 max-w-xs mb-6">
              Generate a shooting schedule based on your breakdown data.
            </p>
            <Button onClick={handleGenerateSchedule} disabled={isGenerating || Object.keys(scenes).length === 0}>
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate AI Schedule'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext 
            items={days.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-0">
              {days.map((day) => (
                <SortableDay 
                  key={day.id} 
                  day={day} 
                  scenes={scenes}
                  projectId={projectId}
                  hourMode={hourMode}
                  dayLengthPreference={dayLengthPreference}
                  handleUpdateDate={handleUpdateDate}
                  handlePushToCalendar={handlePushToCalendar}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {days.length > 0 && <Boneyard scenes={unscheduledScenes as Scene[]} projectId={projectId} />}

      {days.length > 0 && crewThreads.length > 0 && (
        <Card className="bg-slate-900 border-none shadow-xl overflow-hidden mt-12">
          <CardHeader className="bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Crew Sync Status
              </CardTitle>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[9px] uppercase">
                {crewThreads.length} Crew Online
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {crewThreads.map(thread => (
                <div key={thread.id} className="p-4 flex items-center justify-between group hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      thread.status === 'action_required' ? "bg-amber-500 animate-pulse" : "bg-green-500"
                    )} />
                    <div>
                      <p className="text-slate-100 text-xs font-bold">{thread.role}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">
                        Status: {thread.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {thread.status === 'action_required' && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] text-amber-500 font-bold uppercase">Date Shift Notification Sent</span>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white hover:bg-slate-800">
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
