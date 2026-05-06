import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { executionOrchestrator } from '../lib/ExecutionOrchestrator';
import { saveProjectAsSampleTemplate, seedSampleProject } from '../lib/projectService';
import { toast } from 'sonner';
import { Loader2, Plus, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { deleteDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingSample, setProcessingSample] = useState(false);
  const [globalLimit, setGlobalLimit] = useState(20);
  const [viewModeFilter, setViewModeFilter] = useState<'all' | 'employer' | 'talent'>('all');

  // Sample Upload State
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleScript, setSampleScript] = useState('');
  const [promotionId, setPromotionId] = useState('');

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    if (auth.currentUser) {
      const unsubscribeProjects = onSnapshot(
        query(collection(db, 'projects'), where('ownerId', '==', auth.currentUser.uid)),
        (snapshot) => {
          setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      );

      const unsubscribeGlobal = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().defaultFreeProjectLimit !== undefined) {
          setGlobalLimit(docSnap.data().defaultFreeProjectLimit);
        }
      }, (error) => {
        console.error(error);
      });

      return () => {
        unsubscribeUsers();
        unsubscribeProjects();
        unsubscribeGlobal();
      };
    }

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const filteredUsers = React.useMemo(() => {
    if (viewModeFilter === 'all') return users;
    return users.filter(u => {
      const mode = u.viewMode === 'talent' ? 'talent' : 'employer';
      return mode === viewModeFilter;
    });
  }, [users, viewModeFilter]);

  const handleUpdateLimit = async (userId: string, currentLimit: number) => {
    const newLimit = window.prompt("Enter new free project limit for this user:", currentLimit.toString());
    if (newLimit && !isNaN(Number(newLimit))) {
      await updateDoc(doc(db, 'users', userId), { freeProjectLimit: Number(newLimit) });
    }
  };

  const handleUpdateAllLimits = async () => {
    if (window.confirm(`Are you sure you want to update the default global limit to ${globalLimit} and apply it to ALL existing users?`)) {
      setLoading(true);
      // Update global document
      try {
        await setDoc(doc(db, 'settings', 'global'), { defaultFreeProjectLimit: globalLimit }, { merge: true });
      } catch (e) {
        console.error("Failed to update global settings", e);
      }

      // Update existing users
      for (const user of users) {
        await updateDoc(doc(db, 'users', user.id), { freeProjectLimit: globalLimit });
      }
      setLoading(false);
    }
  };

  const handleCreateAndRunSample = async () => {
    if (!sampleTitle || !sampleScript) {
      toast.error("Please provide both a title and a script");
      return;
    }

    if (!auth.currentUser) return;

    setProcessingSample(true);
    try {
      const projectRef = await addDoc(collection(db, 'projects'), {
        title: sampleTitle,
        scriptText: sampleScript,
        ownerId: auth.currentUser.uid,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        budgetTier: 'Indie',
        contentType: 'feature'
      });

      toast.info("Project created. Running Curbily Agents...");
      await executionOrchestrator.runMasterExecute(projectRef.id);
      toast.success("Project processed successfully!");
      setPromotionId(projectRef.id);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process sample project");
    } finally {
      setProcessingSample(false);
    }
  };

  const handlePromoteToSample = async (id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    
    if (!window.confirm(`Promoting "${p.title}" will overwrite the existing Master Sample Template for ALL new users. Continue?`)) return;
    
    setProcessingSample(true);
    try {
      await saveProjectAsSampleTemplate(id);
      toast.success("Master Sample Template Updated!");
    } catch (error) {
      toast.error("Promotion failed");
    } finally {
      setProcessingSample(false);
    }
  };

  const handleTestSeeding = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm("This will delete your current sample projects and re-seed from the new Master Template to verify everything looks correct. Continue?")) return;
    
    setProcessingSample(true);
    try {
      // Find and delete current samples for this user
      const samples = projects.filter(p => p.isSample);
      for (const s of samples) {
        await deleteDoc(doc(db, 'projects', s.id));
      }
      
      // Re-seed
      await seedSampleProject(auth.currentUser.uid);
      toast.success("Dashboard reset and re-seeded with your new template!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to re-seed");
    } finally {
      setProcessingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle>Global Sample Management</CardTitle>
            </div>
            <CardDescription>Upload your own script to showcase. Running the agents will generate a full breakdown, budget, and schedule automatically. Then you can promote it below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              placeholder="Display Name (e.g. My Masterpiece)" 
              value={sampleTitle}
              onChange={(e) => setSampleTitle(e.target.value)}
            />
            <Textarea 
              placeholder="Paste your feature script here..."
              className="h-48 font-mono text-xs"
              value={sampleScript}
              onChange={(e) => setSampleScript(e.target.value)}
            />
            <Button 
              className="w-full font-bold uppercase py-6" 
              onClick={handleCreateAndRunSample}
              disabled={processingSample}
            >
              {processingSample ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Script...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Showcase Assets
                </>
              )}
            </Button>
            {promotionId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex justify-between items-center">
                    <span>Project Ready for Promotion</span>
                    <Button variant="link" size="sm" onClick={() => window.open(`/project/${promotionId}`, '_blank')}>
                        Review Project Assets
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              <CardTitle>Active Template Library</CardTitle>
            </div>
            <CardDescription>Select any of your processed projects to become the "Standard Sample" that new users receive upon signup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-[10px] font-bold uppercase tracking-widest gap-2 bg-slate-50"
                onClick={handleTestSeeding}
                disabled={processingSample}
              >
                <RotateCcw className="w-3 h-3" />
                Reset & Test Seeding
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {projects.length === 0 && <p className="text-center py-8 text-slate-400 text-sm italic">No source projects found.</p>}
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 transition-colors bg-white">
                  <div className="truncate pr-4">
                    <p className="font-bold truncate text-sm">{p.title}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-mono">{p.id}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant={promotionId === p.id ? "default" : "outline"}
                    className="h-8 text-[10px] font-bold uppercase"
                    onClick={() => handlePromoteToSample(p.id)}
                    disabled={processingSample}
                  >
                    {promotionId === p.id ? "Promote Now" : "Set as Master"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>Update settings for all users.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Input 
            type="number" 
            value={globalLimit} 
            onChange={(e) => setGlobalLimit(Number(e.target.value))}
            className="w-32"
          />
          <Button onClick={handleUpdateAllLimits}>Set Global Free Limit</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage individual user limits and subscriptions.</CardDescription>
          </div>
          <div>
            <select
              className="border border-slate-300 rounded-md text-sm px-3 py-2"
              value={viewModeFilter}
              onChange={(e) => setViewModeFilter(e.target.value as any)}
            >
              <option value="all">All Modes</option>
              <option value="employer">Employer / Production</option>
              <option value="talent">Talent / Crew</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 uppercase text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Used Runs</th>
                    <th className="px-4 py-3">Limit</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b">
                      <td className="px-4 py-3">{user.displayName || 'Unknown'}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.role || 'user'}</td>
                      <td className="px-4 py-3 font-medium uppercase">{user.viewMode === 'talent' ? 'talent' : 'employer'}</td>
                      <td className="px-4 py-3 font-medium uppercase">{user.subscription || 'free'}</td>
                      <td className="px-4 py-3">{user.projectsCreated || 0}</td>
                      <td className="px-4 py-3">{user.freeProjectLimit || 3}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => handleUpdateLimit(user.id, user.freeProjectLimit || 3)}>
                          Edit Limit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
