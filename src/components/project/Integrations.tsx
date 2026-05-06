import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Integration } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

import { useAuth } from '../../lib/AuthProvider';

const PLATFORMS = [
  { id: 'movie-magic', name: 'Movie Magic', description: 'Import/Export scheduling (.msl) and budgeting (.mbd) files.', icon: '🎬', category: 'Industry Standard' },
  { id: 'final-draft', name: 'Final Draft', description: 'Import scripts (.fdx) and sync scene changes.', icon: '✍️', category: 'Industry Standard' },
  { id: 'adobe', name: 'Adobe Creative Cloud', description: 'Sync assets to Premiere Pro and Frame.io.', icon: '🎨', category: 'Industry Standard' },
  { id: 'airbnb', name: 'Airbnb', description: 'Source venues and manage rentals.', icon: '🏠', category: 'Marketplace' },
  { id: 'uber', name: 'Uber', description: 'Coordinate transport for crew and talent.', icon: '🚗', category: 'Marketplace' },
  { id: 'taskrabbit', name: 'TaskRabbit', description: 'Automate prop and gear pickups.', icon: '🐰', category: 'Marketplace' },
  { id: 'amazon', name: 'Amazon', description: 'Source props and wardrobe.', icon: '📦', category: 'Marketplace' },
  { id: 'temu', name: 'Temu', description: 'Budget-friendly prop sourcing.', icon: '🍊', category: 'Marketplace' },
  { id: 'alibaba', name: 'Alibaba', description: 'Bulk sourcing for custom builds.', icon: '🅰️', category: 'Marketplace' },
  { id: 'walmart', name: 'Walmart', description: 'Local pickup for production supplies.', icon: '✳️', category: 'Marketplace' },
  { id: 'target', name: 'Target', description: 'Quick sourcing for set dressing.', icon: '🎯', category: 'Marketplace' },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Manage payroll and receipt tracking.', icon: '💰', category: 'Financial' },
  { id: 'google-sheets', name: 'Google Sheets', description: 'Sync crew and vendor databases.', icon: '📊', category: 'Productivity' }
];

export default function Integrations({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const categories = Array.from(new Set(PLATFORMS.map(p => p.category)));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/integrations`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const integrationMap: Record<string, Integration> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Integration;
        integrationMap[data.platform] = { id: doc.id, ...data };
      });
      setIntegrations(integrationMap);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/integrations`);
    });

    return unsubscribe;
  }, [user]);

  const handleConnect = async (platform: string) => {
    if (!user) return;
    try {
      // Simulated OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const existing = integrations[platform];
      if (existing) {
        await updateDoc(doc(db, `users/${user.uid}/integrations`, existing.id), {
          status: 'connected',
          accountName: `${user.email} (${platform})`,
          lastSync: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, `users/${user.uid}/integrations`), {
          projectId, // Still track which project it was first connected from if needed
          platform,
          status: 'connected',
          accountName: `${user.email} (${platform})`,
          lastSync: serverTimestamp()
        });
      }

      // Add a notification
      await addDoc(collection(db, `projects/${projectId}/notifications`), {
        projectId,
        type: 'system',
        title: 'Integration Connected',
        message: `Successfully connected to ${platform}.`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}/integrations`);
    }
  };

  const handleDisconnect = async (platform: string) => {
    const integration = integrations[platform];
    if (!integration || !user) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/integrations`, integration.id), {
        status: 'disconnected',
        lastSync: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/integrations`);
    }
  };

  const handleSync = async (platform: string) => {
    if (!user) return;
    setSyncing(platform);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const integration = integrations[platform];
      if (integration) {
        await updateDoc(doc(db, `users/${user.uid}/integrations`, integration.id), {
          lastSync: serverTimestamp()
        });
      }
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading integrations...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-black text-white rounded-full px-3 py-0.5 text-[10px] uppercase tracking-tighter">System 1.0</Badge>
        </div>
        <h1 className="display-title text-6xl">Production Integrations</h1>
        <p className="text-slate-500 font-medium max-w-2xl text-lg">
          Curbily bridges the gap between AI analysis and physical production. Sync your workflow with industry standards and global marketplaces.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-1">
            <h4 className="label-caps px-1">Connect Channels</h4>
            <div className="flex flex-col gap-1">
              {categories.map(category => (
                <button 
                  key={category}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-between group"
                >
                  <span className="text-slate-600 group-hover:text-black">{category}</span>
                  <Badge variant="outline" className="text-[10px] opacity-50 group-hover:opacity-100 border-none px-0">
                    {PLATFORMS.filter(p => p.category === category).length}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          
          <Card className="bg-black text-white border-none p-6 rounded-[2rem]">
            <Sparkles className="w-6 h-6 mb-4 text-emerald-400" />
            <h4 className="font-bold text-lg leading-tight mb-2">Automated Sourcing</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enable marketplace integrations to allow Curbily agents to draft orders and reserve gear automatically.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-12">
          {categories.map(category => (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="label-caps flex-shrink-0">{category}</h3>
                <div className="h-px w-full bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLATFORMS.filter(p => p.category === category).map((platform) => {
                  const integration = integrations[platform.id];
                  const isConnected = integration?.status === 'connected';

                  return (
                    <Card key={platform.id} className={cn(
                      "border-2 transition-all group overflow-hidden",
                      isConnected ? "border-emerald-500/20 bg-emerald-50/5" : "border-slate-100 hover:border-black"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white border-2 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all">
                              {platform.icon}
                            </div>
                            <div className="space-y-1">
                              <CardTitle className="text-lg font-bold">{platform.name}</CardTitle>
                              <CardDescription className="text-xs font-medium leading-relaxed max-w-[200px]">{platform.description}</CardDescription>
                            </div>
                          </div>
                          {isConnected && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 pt-2">
                          {isConnected ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-emerald-100">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                                  <span>Active Account</span>
                                  <span>Last Sync: {integration.lastSync?.toDate ? integration.lastSync.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Recent'}</span>
                                </div>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {integration.accountName}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 h-10 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
                                  onClick={() => handleSync(platform.id)}
                                  disabled={syncing === platform.id}
                                >
                                  {syncing === platform.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                  Refresh
                                </Button>
                                {platform.id === 'movie-magic' && (
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="flex-1 h-10 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-slate-800"
                                    onClick={() => {/* Handled by ProjectDetail tab change */}}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Manage
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-10 rounded-xl px-4 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDisconnect(platform.id)}
                                >
                                  <Unlink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              className="w-full h-11 gap-2 rounded-xl font-bold transition-all hover:scale-[1.02] bg-slate-900 border-none text-white hover:bg-black" 
                              onClick={() => handleConnect(platform.id)}
                            >
                              <Link2 className="w-4 h-4" />
                              Connect Service
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="bg-blue-50/50 border-blue-100">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-bold">Pro Tip: Automation</p>
            <p className="mt-1">
              Connecting Airbnb allows the AI to automatically scout venues and draft rental agreements. 
              Connecting TaskRabbit enables autonomous prop pickups once items are approved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
