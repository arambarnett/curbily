import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Project, Episode } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Film, 
  FileText, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Sparkles,
  Loader2,
  CheckCircle2,
  FileBox
} from 'lucide-react';
import { toast } from 'sonner';
import { MICRO_DRAMA_CREW_RATES, MICRO_DRAMA_PRODUCTION_DEFAULTS } from '../../constants/microDrama';

interface MicroDramaManagerProps {
  project: Project;
}

export default function MicroDramaManager({ project }: MicroDramaManagerProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seasonIdea, setSeasonIdea] = useState('');
  
  const [newEpisode, setNewEpisode] = useState({
    title: '',
    synopsis: '',
    episodeNumber: 1
  });

  useEffect(() => {
    if (!project.id) return;

    const q = query(
      collection(db, 'projects', project.id, 'episodes'),
      orderBy('episodeNumber', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEpisodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Episode)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [project.id]);

  const handleAddEpisode = async () => {
    if (!project.id || !newEpisode.title.trim()) return;

    try {
      await addDoc(collection(db, 'projects', project.id, 'episodes'), {
        ...newEpisode,
        projectId: project.id,
        status: 'idea',
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewEpisode({
        title: '',
        synopsis: '',
        episodeNumber: episodes.length + 1
      });
      toast.success('Episode added to season folders');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add episode');
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!project.id || !confirm('Remove this episode from the season?')) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'episodes', episodeId));
      toast.success('Episode removed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete episode');
    }
  };

  const spreadBudget = async () => {
    if (!project.id || episodes.length === 0 || !project.targetBudget) {
      toast.error('Need episodes and a target budget first');
      return;
    }

    setIsProcessing(true);
    try {
      const perEpisodeBudget = project.targetBudget / episodes.length;
      const batch = writeBatch(db);
      
      episodes.forEach(ep => {
        batch.update(doc(db, 'projects', project.id!, 'episodes', ep.id), {
          budget: perEpisodeBudget
        });
      });

      await batch.commit();
      toast.success(`Spread $${project.targetBudget.toLocaleString()} across ${episodes.length} episodes ($${Math.round(perEpisodeBudget).toLocaleString()}/ea)`);
    } catch (e) {
      console.error(e);
      toast.error('Budget spread failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateEpisodesFromIdea = async () => {
    if (!seasonIdea.trim()) {
      toast.error('Enter a season concept first');
      return;
    }
    
    setIsProcessing(true);
    // In a real scenario, we'd call an AI agent here.
    // For now, I'll mock a set of episodes or explain it's coming.
    toast.info('Analyzing season concept and generating episodes...');
    
    setTimeout(async () => {
      try {
        const batch = writeBatch(db);
        // Mocking 10 episodes
        for (let i = 1; i <= 10; i++) {
          const epRef = doc(collection(db, 'projects', project.id, 'episodes'));
          batch.set(epRef, {
            projectId: project.id,
            episodeNumber: i,
            title: `EP ${i}: ${seasonIdea.slice(0, 20)}...`,
            synopsis: `Continuous action for episode ${i} based on concept.`,
            status: 'idea',
            createdAt: serverTimestamp()
          });
        }
        await batch.commit();
        setIsProcessing(false);
        toast.success('Generated 10 episodes from concept!');
      } catch (e) {
        console.error(e);
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6" /> Season Folders
          </h2>
          <p className="text-xs text-slate-500 font-medium italic">Manage episodes, scripts, and bulk production logistics.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 text-[10px] uppercase font-black tracking-widest gap-2"
            onClick={spreadBudget}
            disabled={isProcessing || episodes.length === 0}
          >
            <DollarSign className="w-3.5 h-3.5" /> Spread Budget
          </Button>
          <Button 
            className="h-9 text-[10px] uppercase font-black tracking-widest gap-2 bg-slate-900"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Add Episode
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Season Concept & AI Generator */}
        <Card className="lg:col-span-1 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Season Concept
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Narrative / Logline</label>
              <Textarea 
                placeholder="Upload your season one-liner or series bible summary..."
                value={seasonIdea}
                onChange={(e) => setSeasonIdea(e.target.value)}
                className="min-h-[150px] text-sm"
              />
            </div>
            <Button 
              variant="secondary" 
              className="w-full gap-2 text-[10px] font-black uppercase h-10"
              onClick={generateEpisodesFromIdea}
              disabled={isProcessing || !seasonIdea.trim()}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Convert Concept to Episodes
            </Button>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
               <p className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Efficiency Rules Applied</p>
               <ul className="text-[10px] text-amber-800 space-y-1 font-medium list-disc ml-4">
                 <li>Bulk shooting: 2-3 episodes per day</li>
                 <li>Skeleton Crew defaults: DP, Sound, 2 Cast</li>
                 <li>Non-Union rates strictly enforced</li>
               </ul>
            </div>
          </CardContent>
        </Card>

        {/* Episode Folders */}
        <div className="lg:col-span-2 space-y-4">
          {episodes.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center">
               <FileBox className="w-12 h-12 text-slate-200 mb-4" />
               <h3 className="text-sm font-black uppercase text-slate-400">No episodes created</h3>
               <p className="text-[10px] text-slate-500 mt-1 italic">Start by adding your first episode or generating from concept.</p>
               <Button 
                variant="outline" 
                className="mt-6 font-black uppercase text-[10px] h-9"
                onClick={() => setIsAdding(true)}
               >
                 Create First Episode
               </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdding && (
                <Card className="border-2 border-blue-500 animate-in fade-in slide-in-from-top-4">
                   <CardContent className="pt-6 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Title</label>
                        <Input 
                          placeholder="Episode Title"
                          value={newEpisode.title}
                          onChange={(e) => setNewEpisode({...newEpisode, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Brief Synopsis</label>
                        <Textarea 
                          placeholder="What happens in this 90s episode?"
                          value={newEpisode.synopsis}
                          onChange={(e) => setNewEpisode({...newEpisode, synopsis: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1 h-9 text-[10px] font-black uppercase" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button className="flex-1 h-9 text-[10px] font-black uppercase bg-blue-600" onClick={handleAddEpisode}>Save Episode</Button>
                      </div>
                   </CardContent>
                </Card>
              )}
              
              {episodes.map((ep) => (
                <Card key={ep.id} className="group hover:border-slate-900 transition-all border-slate-100 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-900 text-white font-black text-[9px] px-1.5 h-5">EP {ep.episodeNumber}</Badge>
                        <Badge variant="outline" className="text-[8px] uppercase font-bold text-slate-400">{ep.status}</Badge>
                      </div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight truncate max-w-[150px]">{ep.title}</CardTitle>
                    </div>
                    <button 
                      onClick={() => handleDeleteEpisode(ep.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic leading-relaxed">
                      {ep.synopsis || "No synopsis provided."}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                           <DollarSign className="w-3 h-3" />
                           ${ep.budget ? Math.round(ep.budget).toLocaleString() : '0'}
                         </div>
                         <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                           <Clock className="w-3 h-3" />
                           90s
                         </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
                        Edit Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
