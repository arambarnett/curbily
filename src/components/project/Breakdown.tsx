import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Scene, Project } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, FileText, Wand2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Breakdown({ projectId, project, scriptText }: { projectId: string, project: Project, scriptText?: string }) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVfxOnly, setShowVfxOnly] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'scenes'), orderBy('sceneNumber', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sceneData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scene));
      setScenes(sceneData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/scenes`);
    });

    return unsubscribe;
  }, [projectId]);

  const updateLifecycleStatus = async (status: Project['status']) => {
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const statusPhases: { id: Project['status'], label: string }[] = [
    { id: 'development', label: 'Development' },
    { id: 'pre-production', label: 'Pre-Production' },
    { id: 'production', label: 'Production' },
    { id: 'wrap', label: 'Wrap' },
    { id: 'post-production', label: 'Post' },
  ];

  if (loading) return <div>Loading breakdown...</div>;

  const vfxCount = scenes.filter(s => s.vfx && s.vfx.length > 0).length;
  const displayScenes = showVfxOnly ? scenes.filter(s => s.vfx && s.vfx.length > 0) : scenes;
  const scriptForReview = scriptText || project.scriptText || '';

  const getSceneColor = (scene: Scene) => {
    const isNight = scene.timeOfDay === 'NIGHT' || scene.timeOfDay === 'EVENING';
    const isExt = scene.setting === 'EXT';
    
    if (isExt && !isNight) return 'bg-yellow-50/50 hover:bg-yellow-100/50 border-l-4 border-l-yellow-400';
    if (isExt && isNight) return 'bg-emerald-50/50 hover:bg-emerald-100/50 border-l-4 border-l-emerald-400';
    if (!isExt && isNight) return 'bg-blue-50/50 hover:bg-blue-100/50 border-l-4 border-l-blue-400';
    return 'bg-white hover:bg-slate-50 border-l-4 border-l-slate-200';
  };

  const moveScene = async (sceneId: string, direction: -1 | 1) => {
    const currentIndex = scenes.findIndex((scene) => scene.id === sceneId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= scenes.length) return;

    const currentScene = scenes[currentIndex];
    const nextScene = scenes[nextIndex];
    setScenes((prev) => {
      const next = [...prev];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next.map((scene, index) => ({ ...scene, sceneNumber: index + 1 }));
    });

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'projects', projectId, 'scenes', currentScene.id), { sceneNumber: nextScene.sceneNumber });
      batch.update(doc(db, 'projects', projectId, 'scenes', nextScene.id), { sceneNumber: currentScene.sceneNumber });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/scenes`);
    }
  };

  return (
    <div className={cn("space-y-6", scriptForReview && "xl:grid xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.35fr)] xl:gap-6 xl:space-y-0")}>
      {scriptForReview && (
        <Card className="border-none shadow-sm overflow-hidden rounded-[2rem] xl:sticky xl:top-4 xl:self-start">
          <CardHeader className="bg-slate-950 text-white border-b border-slate-800 p-6">
            <CardTitle className="text-xl font-display font-black tracking-tighter flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Source Script
            </CardTitle>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Side-by-side extraction review</p>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap bg-slate-950 p-6 text-xs leading-relaxed text-slate-200 font-mono">
              {scriptForReview}
            </pre>
          </CardContent>
        </Card>
      )}
      <Card className="border-none shadow-sm overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between p-8">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-display font-black tracking-tighter">Production Breakdown</CardTitle>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Cross-referencing {scenes.length} elements for production readiness</p>
          </div>
          <div className="flex items-center gap-2">
            {vfxCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowVfxOnly(!showVfxOnly)}
                className={cn(
                  "gap-2 font-black uppercase tracking-widest text-[10px] h-9 px-4 rounded-xl transition-all",
                  showVfxOnly ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "text-slate-600 hover:text-slate-900 border-slate-200"
                )}
              >
                <Wand2 className="w-3 h-3" />
                {showVfxOnly ? 'VFX Mode On' : `${vfxCount} VFX Scenes`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-16 h-12 text-[10px] font-black uppercase tracking-widest pl-8">#</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest">Scene / Context</TableHead>
                <TableHead className="w-[80px] h-12 text-[10px] font-black uppercase tracking-widest">Pages</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest">Location</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest">Cast & Resources</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest pr-8">Key Elements</TableHead>
                <TableHead className="w-20 h-12 text-[10px] font-black uppercase tracking-widest pr-8 text-right">Move</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayScenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 bg-slate-50/50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-slate-300">
                        <Wand2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        {showVfxOnly ? "No VFX elements found" : "No scenes detected"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayScenes.map((scene) => (
                  <TableRow key={scene.id} className={cn("transition-colors cursor-pointer group border-b border-slate-50", getSceneColor(scene))}>
                    <TableCell className="font-mono text-xs font-black pl-8 text-slate-400 group-hover:text-slate-900">{scene.sceneNumber}</TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-display font-black text-sm text-slate-900 tracking-tight leading-tight uppercase">{scene.slugline}</div>
                        {scene.synopsis && (
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-sm italic">"{scene.synopsis}"</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black tracking-widest uppercase px-2 py-0 border-2 rounded-lg",
                            scene.setting === 'EXT' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-700 border-slate-100"
                          )}>{scene.setting}</Badge>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black tracking-widest uppercase px-2 py-0 border-2 rounded-lg",
                            (scene.timeOfDay === 'NIGHT' || scene.timeOfDay === 'EVENING') ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-white text-slate-500 border-slate-100"
                          )}>{scene.timeOfDay}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-bold text-slate-500">{scene.pagesEighths ? `${scene.pagesEighths}` : '-'}</div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-700">{scene.location}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {scene.cast?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {scene.cast.map(c => (
                              <Badge key={c} variant="secondary" className="text-[9px] font-black uppercase tracking-tighter bg-slate-900 text-white rounded-md h-5">{c}</Badge>
                            ))}
                          </div>
                        )}
                        {scene.props?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {scene.props.map(p => (
                              <Badge key={p} variant="outline" className="text-[9px] font-bold border-blue-100 text-blue-700 bg-blue-50/50 rounded-md h-5">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {scene.stunts?.length > 0 && <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-black uppercase rounded-lg">Stunts</Badge>}
                        {scene.sfx?.length > 0 && <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[9px] font-black uppercase rounded-lg">SFX</Badge>}
                        {scene.vfx?.length > 0 && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase rounded-lg">VFX</Badge>}
                        {scene.picVeh?.length > 0 && <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-black uppercase rounded-lg">Vehicles</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={scenes.findIndex((s) => s.id === scene.id) === 0}
                          onClick={() => moveScene(scene.id, -1)}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={scenes.findIndex((s) => s.id === scene.id) === scenes.length - 1}
                          onClick={() => moveScene(scene.id, 1)}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
