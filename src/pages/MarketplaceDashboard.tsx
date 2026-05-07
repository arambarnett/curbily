import React from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Briefcase, Check, Send, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { BrandBrief, CreatorShortlist, InfluencerRoster } from '../types';

export default function MarketplaceDashboard() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [briefs, setBriefs] = React.useState<BrandBrief[]>([]);
  const [rosters, setRosters] = React.useState<InfluencerRoster[]>([]);
  const [shortlists, setShortlists] = React.useState<CreatorShortlist[]>([]);
  const [sendingBriefId, setSendingBriefId] = React.useState<string | null>(null);

  const role = profile?.marketplaceRole || 'brand';

  React.useEffect(() => {
    if (!user) return;

    const briefQuery = role === 'manager'
      ? query(collection(db, 'brandBriefs'), where('visibility', '==', 'marketplace'))
      : query(collection(db, 'brandBriefs'), where('brandId', '==', user.uid));
    const rosterQuery = role === 'manager'
      ? query(collection(db, 'influencerRosters'), where('managerId', '==', user.uid))
      : query(collection(db, 'influencerRosters'), where('visibility', '==', 'marketplace'));
    const shortlistQuery = role === 'manager'
      ? query(collection(db, 'creatorShortlists'), where('managerId', '==', user.uid))
      : query(collection(db, 'creatorShortlists'), where('brandId', '==', user.uid));

    const unsubBriefs = onSnapshot(briefQuery, (snapshot) => {
      setBriefs(snapshot.docs.map((brief) => ({ id: brief.id, ...brief.data() } as BrandBrief)));
    });
    const unsubRosters = onSnapshot(rosterQuery, (snapshot) => {
      setRosters(snapshot.docs.map((roster) => ({ id: roster.id, ...roster.data() } as InfluencerRoster)));
    });
    const unsubShortlists = onSnapshot(shortlistQuery, (snapshot) => {
      setShortlists(snapshot.docs.map((shortlist) => ({ id: shortlist.id, ...shortlist.data() } as CreatorShortlist)));
    });

    return () => {
      unsubBriefs();
      unsubRosters();
      unsubShortlists();
    };
  }, [user?.uid, role]);

  const switchRole = async (nextRole: 'brand' | 'manager') => {
    await updateProfile({ marketplaceRole: nextRole, viewMode: 'producer', onboarded: true });
  };

  const sendShortlist = async (brief: BrandBrief) => {
    const primaryRoster = rosters[0];
    if (!primaryRoster || primaryRoster.influencers.length === 0) {
      toast.error('Upload a manager roster before sending names');
      navigate('/managers');
      return;
    }

    setSendingBriefId(brief.id);
    try {
      const budgetPerCreator = Math.max(0, (Number(brief.budget) || 0) / 3);
      const creators = [...primaryRoster.influencers]
        .sort((a, b) => {
          const aFit = Math.abs((a.minimumRate || a.rate || 0) - budgetPerCreator);
          const bFit = Math.abs((b.minimumRate || b.rate || 0) - budgetPerCreator);
          return aFit - bFit;
        })
        .slice(0, 10);

      await addDoc(collection(db, 'creatorShortlists'), {
        briefId: brief.id,
        brandId: brief.brandId,
        managerId: user?.uid,
        managerName: primaryRoster.managerName || profile?.displayName || user?.email || 'Manager',
        creators,
        selectedCreatorIds: [],
        status: 'sent',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'brandBriefs', brief.id), { status: 'shortlisted' });
      toast.success('Sent 10 creator names to the brand');
    } catch (error) {
      console.error(error);
      toast.error('Could not send shortlist');
    } finally {
      setSendingBriefId(null);
    }
  };

  const toggleCreatorSelection = async (shortlist: CreatorShortlist, creatorId: string) => {
    const selected = shortlist.selectedCreatorIds || [];
    const next = selected.includes(creatorId)
      ? selected.filter((id) => id !== creatorId)
      : selected.length < 3
        ? [...selected, creatorId]
        : selected;

    if (!selected.includes(creatorId) && selected.length >= 3) {
      toast.error('Pick up to 3 creators from each shortlist');
      return;
    }

    await updateDoc(doc(db, 'creatorShortlists', shortlist.id), {
      selectedCreatorIds: next,
      status: next.length > 0 ? 'selected' : 'brand_review',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f8f7] flex items-center justify-center p-6">
        <Card className="max-w-md rounded-3xl">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="w-10 h-10 mx-auto text-blue-600" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">Log in required</h1>
            <p className="text-sm text-slate-500">Create a brand or manager account to use the creator marketplace dashboard.</p>
            <Button onClick={() => navigate('/login?mode=producer')} className="w-full bg-black text-white">Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f7]">
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge className="bg-blue-600 text-white border-none mb-4">Creator Marketplace</Badge>
            <h1 className="text-5xl font-black uppercase tracking-tighter">Marketplace Dashboard</h1>
            <p className="text-white/50 mt-2">Brands create briefs. Managers send real creator shortlists. Brands pick three.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={role === 'brand' ? 'secondary' : 'outline'} onClick={() => switchRole('brand')}>Brand View</Button>
            <Button variant={role === 'manager' ? 'secondary' : 'outline'} onClick={() => switchRole('manager')}>Manager View</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <Tabs defaultValue={role === 'manager' ? 'briefs' : 'shortlists'} className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1">
            <TabsTrigger value="shortlists" className="rounded-xl gap-2"><Users className="w-4 h-4" /> Shortlists</TabsTrigger>
            <TabsTrigger value="briefs" className="rounded-xl gap-2"><Briefcase className="w-4 h-4" /> Brand Briefs</TabsTrigger>
            <TabsTrigger value="rosters" className="rounded-xl gap-2"><Users className="w-4 h-4" /> Rosters</TabsTrigger>
          </TabsList>

          <TabsContent value="shortlists">
            <div className="grid gap-6">
              {shortlists.length === 0 ? (
                <EmptyState title="No shortlists yet" body={role === 'brand' ? 'Managers will send you 10 creator names per brief.' : 'Send creators to open brand briefs.'} />
              ) : shortlists.map((shortlist) => (
                <Card key={shortlist.id} className="rounded-3xl bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{shortlist.managerName}</span>
                      <Badge>{(shortlist.selectedCreatorIds || []).length}/3 picked</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {shortlist.creators.map((creator, index) => {
                      const creatorId = creator.id || `${creator.handle || creator.name}-${index}`;
                      const selected = shortlist.selectedCreatorIds?.includes(creatorId);
                      return (
                        <button
                          key={creatorId}
                          onClick={() => role === 'brand' && toggleCreatorSelection(shortlist, creatorId)}
                          className={`text-left rounded-2xl border p-4 bg-white hover:border-blue-300 transition ${selected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black uppercase tracking-tight">{creator.name || creator.handle}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">{creator.platform || creator.channels?.[0]?.platform || 'Creator'}</p>
                            </div>
                            {selected && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-3">{creator.niche || creator.contentGenre || creator.channels?.[0]?.genre || 'General creator'}</p>
                          <div className="mt-3 text-xs font-bold">
                            {(creator.followers || creator.channels?.[0]?.followers || 0).toLocaleString()} followers
                          </div>
                          <div className="text-xs text-slate-500">${creator.minimumRate || creator.rate || 0} minimum</div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="briefs">
            <div className="grid md:grid-cols-2 gap-5">
              {briefs.length === 0 ? (
                <EmptyState title="No brand briefs" body="Create a brand brief from the marketplace landing page." />
              ) : briefs.map((brief) => (
                <Card key={brief.id} className="rounded-3xl bg-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{brief.brandName}</p>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{brief.campaignName}</h3>
                      </div>
                      <Badge>${Number(brief.budget || 0).toLocaleString()}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{brief.goals || brief.deliverables || 'No goals provided yet.'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{brief.influencerType || 'Creators'}</Badge>
                      <Badge variant="outline">{brief.platforms || 'Any platform'}</Badge>
                      <Badge variant="outline">{brief.status}</Badge>
                    </div>
                    {role === 'manager' && (
                      <Button onClick={() => sendShortlist(brief)} disabled={sendingBriefId === brief.id} className="w-full bg-black text-white rounded-xl gap-2">
                        <Send className="w-4 h-4" />
                        Send 10 Names
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rosters">
            <div className="grid md:grid-cols-2 gap-5">
              {rosters.length === 0 ? (
                <EmptyState title="No rosters yet" body="Managers can upload a CSV roster from the manager account page." actionLabel="Upload Roster" onAction={() => navigate('/managers')} />
              ) : rosters.map((roster) => (
                <Card key={roster.id} className="rounded-3xl bg-white">
                  <CardContent className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{roster.managerName}</p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{roster.rosterName}</h3>
                    <p className="text-sm text-slate-500 mt-2">{roster.influencers.length} creators available</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {roster.influencers.slice(0, 6).map((creator, index) => (
                        <Badge key={`${creator.name}-${index}`} variant="outline">{creator.name || creator.handle}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card className="rounded-3xl border-dashed bg-white md:col-span-2">
      <CardContent className="p-12 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{body}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-5 bg-black text-white hover:bg-slate-800">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
