import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, writeBatch, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Shot, Scene } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Sparkles, Camera, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { shotList } from '../../lib/gemini';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

import { ensureApiKey } from '../../lib/apiKeyCheck';

export default function ShotList({ projectId, scenes, onGenerate, isGenerating: isGeneratingProp }: { projectId: string, scenes: Scene[], onGenerate?: () => void, isGenerating?: boolean }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLocal, setGeneratingLocal] = useState(false);
  const generating = isGeneratingProp || generatingLocal;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShot, setEditShot] = useState<Partial<Shot>>({});
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [newShot, setNewShot] = useState<Partial<Shot>>({
    shotNumber: '',
    description: '',
    size: 'MS',
    angle: 'Eye Level',
    movement: 'Static',
    equipment: ''
  });

  useEffect(() => {
    const q = query(collection(db, `projects/${projectId}/shots`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shotData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shot));
      
      // Improved sorting by scene number then shot number
      setShots(shotData.sort((a, b) => {
        // First by scene number
        const sceneA = a.sceneNumber || 0;
        const sceneB = b.sceneNumber || 0;
        if (sceneA !== sceneB) return sceneA - sceneB;
        
        // Then by shot number (natural sort for 1, 1A, 2...)
        return a.shotNumber.localeCompare(b.shotNumber, undefined, { numeric: true, sensitivity: 'base' });
      }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/shots`);
    });

    return unsubscribe;
  }, [projectId]);

  const generateShotList = async () => {
    if (scenes.length === 0) return;
    if (onGenerate) {
      onGenerate();
      return;
    }
    await ensureApiKey();
    setGeneratingLocal(true);
    try {
      // Clear existing shots
      const clearBatch = writeBatch(db);
      shots.forEach(s => clearBatch.delete(doc(db, `projects/${projectId}/shots`, s.id)));
      await clearBatch.commit();

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
      
      suggestedShots.forEach((shot: any) => {
        const newShotRef = doc(collection(db, `projects/${projectId}/shots`));
        batch.set(newShotRef, {
          ...shot,
          projectId,
          createdAt: new Date()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error generating shot list:', error);
    } finally {
      setGeneratingLocal(false);
    }
  };

  const handleUpdateShot = async (id: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/shots`, id), {
        ...editShot,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/shots/${id}`);
    }
  };

  const handleDeleteShot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shot?')) return;
    try {
      await deleteDoc(doc(db, `projects/${projectId}/shots`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/shots/${id}`);
    }
  };

  const handleAddShot = async () => {
    if (!newShot.shotNumber || !newShot.description) return;
    try {
      await addDoc(collection(db, `projects/${projectId}/shots`), {
        ...newShot,
        projectId,
        createdAt: serverTimestamp()
      });
      setIsAddingShot(false);
      setNewShot({
        shotNumber: '',
        description: '',
        size: 'MS',
        angle: 'Eye Level',
        movement: 'Static',
        equipment: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/shots`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading shots...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Shot List
        </h2>
        <div className="flex gap-2">
          <Dialog open={isAddingShot} onOpenChange={setIsAddingShot}>
            <DialogTrigger render={
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Shot
              </Button>
            } />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Manual Shot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label>Shot #</Label>
                    <Input value={newShot.shotNumber} onChange={e => setNewShot({...newShot, shotNumber: e.target.value})} placeholder="1A" />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label>Description</Label>
                    <Input value={newShot.description} onChange={e => setNewShot({...newShot, description: e.target.value})} placeholder="Close up of John" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Size</Label>
                    <Input value={newShot.size} onChange={e => setNewShot({...newShot, size: e.target.value})} placeholder="CU, MS..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Angle</Label>
                    <Input value={newShot.angle} onChange={e => setNewShot({...newShot, angle: e.target.value})} placeholder="High, Low..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Movement</Label>
                    <Input value={newShot.movement} onChange={e => setNewShot({...newShot, movement: e.target.value})} placeholder="Static, Pan..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Equipment</Label>
                  <Input value={newShot.equipment} onChange={e => setNewShot({...newShot, equipment: e.target.value})} placeholder="Tripod, Handheld..." />
                </div>
                <Button className="w-full mt-4" onClick={handleAddShot}>Save Shot</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            onClick={generateShotList} 
            disabled={generating || scenes.length === 0}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : shots.length > 0 ? 'Rerun Agent' : 'Generate Shot List'}
          </Button>
        </div>
      </div>

      {shots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-500">
            No shots defined yet. Use the AI agent to generate a first draft based on your scenes.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px]">Size</TableHead>
                <TableHead className="w-[100px]">Angle</TableHead>
                <TableHead className="w-[100px]">Movement</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                let currentSceneId: string | null = null;
                return shots.map((shot, idx) => {
                  const showHeader = shot.sceneId !== currentSceneId;
                  currentSceneId = shot.sceneId;
                  const scene = scenes.find(s => s.id === shot.sceneId);
                  
                  return (
                    <React.Fragment key={shot.id}>
                      {showHeader && (
                        <TableRow className="bg-slate-900 border-y-2 border-slate-900 hover:bg-slate-800 transition-colors">
                          <TableCell colSpan={7} className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-mono text-[11px] bg-white text-slate-900 border-none px-3 py-0.5 rounded-sm">
                                  SCENE {scene?.sceneNumber}
                                </Badge>
                                <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-200">
                                  {scene?.slugline}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-700 uppercase font-bold tracking-widest px-2">
                                {shots.filter(s => s.sceneId === shot.sceneId).length} Shots Total
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="group hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-slate-900 italic">
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.shotNumber} 
                              onChange={e => setEditShot({...editShot, shotNumber: e.target.value})}
                              className="h-8 w-16"
                            />
                          ) : shot.shotNumber}
                        </TableCell>
                        <TableCell>
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.description} 
                              onChange={e => setEditShot({...editShot, description: e.target.value})}
                              className="h-8"
                            />
                          ) : (
                            <div className="text-sm font-medium">{shot.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.size} 
                              onChange={e => setEditShot({...editShot, size: e.target.value})}
                              className="h-8 w-16"
                            />
                          ) : (
                            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-widest">{shot.size}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.angle} 
                              onChange={e => setEditShot({...editShot, angle: e.target.value})}
                              className="h-8 w-24"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{shot.angle}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.movement} 
                              onChange={e => setEditShot({...editShot, movement: e.target.value})}
                              className="h-8 w-24"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{shot.movement}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === shot.id ? (
                            <Input 
                              value={editShot.equipment} 
                              onChange={e => setEditShot({...editShot, equipment: e.target.value})}
                              className="h-8"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{shot.equipment}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingId === shot.id ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateShot(shot.id)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                  onClick={() => {
                                    setEditingId(shot.id);
                                    setEditShot(shot);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  onClick={() => handleDeleteShot(shot.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
