import React from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Briefcase, Check, ClipboardList, Send, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
import { BrandBrief, CreatorShortlist, InfluencerRoster } from '../types';
import { ensureManagerInviteCode } from '../lib/managerInviteCode';
import { finalizeShortlistToDeliverables } from '../lib/marketplaceDeliverables';
import { MarketplaceCampaignWorkspace } from '../components/MarketplaceCampaignWorkspace';
import { StripeConnectCallout } from '../components/StripeConnectCallout';

export default function MarketplaceDashboard() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [briefs, setBriefs] = React.useState<BrandBrief[]>([]);
  const [rosters, setRosters] = React.useState<InfluencerRoster[]>([]);
  const [shortlists, setShortlists] = React.useState<CreatorShortlist[]>([]);
  const [sendingBriefId, setSendingBriefId] = React.useState<string | null>(null);
  const [managerInviteCode, setManagerInviteCode] = React.useState<string | null>(null);
  const [composeBrief, setComposeBrief] = React.useState<BrandBrief | null>(null);
  const [composeRosterId, setComposeRosterId] = React.useState('');
  const [composeSelection, setComposeSelection] = React.useState<Record<string, true>>({});

  const role = profile?.marketplaceRole || 'brand';

  React.useEffect(() => {
    if (!user || role !== 'manager') return;
    (async () => {
      const snap = await getDoc(doc(db, 'marketplaceAccounts', user.uid));
      let code = snap.data()?.managerInviteCode as string | undefined;
      if (!code) {
        try {
          code = await ensureManagerInviteCode(user.uid);
        } catch {
          code = undefined;
        }
      }
      setManagerInviteCode(code || null);
    })();
  }, [user?.uid, role]);

  React.useEffect(() => {
    if (!user) return;
    if (role === 'influencer') {
      setBriefs([]);
      setRosters([]);
      setShortlists([]);
      return undefined;
    }

    const briefQuery = role === 'manager'
      ? query(
          collection(db, 'brandBriefs'),
          where('visibility', '==', 'marketplace'),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'brandBriefs'),
          where('brandId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
    const rosterQuery = role === 'manager'
      ? query(
          collection(db, 'influencerRosters'),
          where('managerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'influencerRosters'),
          where('visibility', '==', 'marketplace'),
          orderBy('createdAt', 'desc')
        );
    const shortlistQuery = role === 'manager'
      ? query(
          collection(db, 'creatorShortlists'),
          where('managerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'creatorShortlists'),
          where('brandId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

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

  const switchMarketplacePersona = async (nextRole: 'brand' | 'manager' | 'influencer') => {
    await updateProfile({
      marketplaceRole: nextRole,
      viewMode: nextRole === 'influencer' ? 'talent' : 'producer',
      onboarded: true,
    });
  };

  const stableRosterRowId = (
    influencer: InfluencerRoster['influencers'][number],
    rosterId: string,
    index: number,
  ) => influencer.profileId || `${rosterId}:${influencer.id ?? `legacy-${index}`}`;

  const openCompose = (brief: BrandBrief) => {
    const firstId = rosters[0]?.id || '';
    if (!firstId) {
      toast.error('Upload a manager roster before sending names');
      navigate('/managers');
      return;
    }
    setComposeBrief(brief);
    setComposeRosterId(firstId);
    setComposeSelection({});
  };

  const rosterForCompose = rosters.find((r) => r.id === composeRosterId);

  const sortedComposeInfluencers = React.useMemo(() => {
    if (!composeBrief || !rosterForCompose) return [];
    const budgetPerCreator = Math.max(
      0,
      (Number(composeBrief.budget) || 0) /
        Math.max(1, Number(composeBrief.influencerCount) || 3),
    );
    return [...rosterForCompose.influencers].sort((a, b) => {
      const aFit = Math.abs((a.minimumRate || a.rate || 0) - budgetPerCreator);
      const bFit = Math.abs((b.minimumRate || b.rate || 0) - budgetPerCreator);
      return aFit - bFit;
    });
  }, [composeBrief, rosterForCompose]);

  const composeSelectedEntries = sortedComposeInfluencers
    .map((inf, index) => ({
      influencer: inf,
      index,
      sid: rosterForCompose ? stableRosterRowId(inf, rosterForCompose.id, index) : '',
    }))
    .filter((row) => row.sid && composeSelection[row.sid]);

  const toggleComposeRow = (sid: string) => {
    setComposeSelection((prev) => {
      if (prev[sid]) {
        const { [sid]: _, ...rest } = prev;
        return rest;
      }
      const count = Object.keys(prev).length;
      if (count >= 10) {
        toast.error('Pick up to 10 creators per shortlist');
        return prev;
      }
      return { ...prev, [sid]: true };
    });
  };

  const sendComposedShortlist = async () => {
    if (!composeBrief || !user || !rosterForCompose) return;
    if (composeSelectedEntries.length === 0) {
      toast.error('Select at least one creator');
      return;
    }

    setSendingBriefId(composeBrief.id);
    try {
      const creators = composeSelectedEntries.map((row) => row.influencer);
      await addDoc(collection(db, 'creatorShortlists'), {
        briefId: composeBrief.id,
        brandId: composeBrief.brandId,
        managerId: user.uid,
        managerName:
          rosterForCompose.managerName ||
          profile?.displayName ||
          user.email ||
          'Manager',
        creators,
        selectedCreatorIds: [],
        status: 'sent',
        rosterIdUsed: rosterForCompose.id,
        createdAt: serverTimestamp(),
      });
      setComposeBrief(null);
      toast.success(`Sent ${creators.length} creator name${creators.length === 1 ? '' : 's'} to the brand`);
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

    if (role === 'brand' && next.length === 3) {
      const brief = briefs.find((b) => b.id === shortlist.briefId);
      if (brief) {
        const merged: CreatorShortlist = { ...shortlist, selectedCreatorIds: next };
        const outcome = await finalizeShortlistToDeliverables(merged, brief);
        if (outcome.ok === false) toast.error(outcome.message);
        else toast.success('Campaign workspaces opened for three creators.');
      }
    }
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
          <div className="flex flex-col items-end gap-3">
            {role === 'manager' && managerInviteCode && (
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-right max-w-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Creator invite code</p>
                <p className="font-mono text-lg font-black tracking-widest text-white">{managerInviteCode}</p>
                <p className="text-xs text-white/45 mt-1">
                  Creators still sign into Curbily here, then open <strong className="text-white/65">Talent</strong> and claim their roster row with their <strong className="text-white/65">personal code</strong> from your CSV upload—not the standalone join page.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    void navigator.clipboard.writeText(managerInviteCode);
                    toast.success('Code copied');
                  }}
                >
                  Copy code
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant={role === 'brand' ? 'secondary' : 'outline'} onClick={() => switchMarketplacePersona('brand')}>Brand View</Button>
              <Button variant={role === 'manager' ? 'secondary' : 'outline'} onClick={() => switchMarketplacePersona('manager')}>Manager View</Button>
              <Button variant={role === 'influencer' ? 'secondary' : 'outline'} onClick={() => switchMarketplacePersona('influencer')}>Influencer View</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {(role === 'manager' || role === 'influencer') && <StripeConnectCallout />}
        {role === 'influencer' ? (
          <MarketplaceCampaignWorkspace />
        ) : (
        <Tabs defaultValue={role === 'manager' ? 'briefs' : 'shortlists'} className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 flex flex-wrap gap-1">
            <TabsTrigger value="shortlists" className="rounded-xl gap-2"><Users className="w-4 h-4" /> Shortlists</TabsTrigger>
            <TabsTrigger value="briefs" className="rounded-xl gap-2"><Briefcase className="w-4 h-4" /> Brand Briefs</TabsTrigger>
            <TabsTrigger value="rosters" className="rounded-xl gap-2"><Users className="w-4 h-4" /> Rosters</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-xl gap-2"><ClipboardList className="w-4 h-4" /> Campaign workspace</TabsTrigger>
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
                      <Badge>
                        {(shortlist.selectedCreatorIds || []).length}/3 picked
                        {shortlist.status === 'confirmed' ? ' · workspaces live' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {shortlist.creators.map((creator, index) => {
                      const creatorId =
                        creator.profileId ||
                        creator.id ||
                        `${creator.handle ?? creator.name ?? 'creator'}-${index}`;
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
                      {brief.influencerCount != null ? (
                        <Badge variant="outline">{brief.influencerCount} slots</Badge>
                      ) : null}
                      {typeof brief.minFollowers === 'number' ? (
                        <Badge variant="outline">{brief.minFollowers.toLocaleString()}+ followers</Badge>
                      ) : null}
                    </div>
                    {(brief.categories?.length || brief.subcategories?.length) ? (
                      <div className="flex flex-wrap gap-1">
                        {[...(brief.categories || []), ...(brief.subcategories || [])].slice(0, 8).map((item) => (
                          <Badge key={item} className="rounded-full bg-slate-900 text-[9px] text-white">{item}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {(brief.timelineStart || brief.timelineEnd) ? (
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {brief.timelineStart || '—'} → {brief.timelineEnd || '—'}
                      </p>
                    ) : null}
                    {role === 'manager' && (
                      <Button onClick={() => openCompose(brief)} disabled={sendingBriefId === brief.id} className="w-full bg-black text-white rounded-xl gap-2">
                        <Send className="w-4 h-4" />
                        Compose Shortlist…
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

          <TabsContent value="campaigns">
            <MarketplaceCampaignWorkspace />
          </TabsContent>
        </Tabs>
        )}
      </main>

      <Dialog open={composeBrief !== null} onOpenChange={(open) => { if (!open) setComposeBrief(null); }}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[85vh] overflow-y-auto bg-white border-2 border-black">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {composeBrief?.campaignName}
            </DialogTitle>
            <p className="text-xs text-slate-500">{composeBrief?.brandName}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Roster</Label>
              <select
                className="w-full h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold bg-white"
                value={composeRosterId}
                onChange={(e) => {
                  setComposeRosterId(e.target.value);
                  setComposeSelection({});
                }}
              >
                {rosters.map((roster) => (
                  <option key={roster.id} value={roster.id}>
                    {roster.rosterName} ({roster.influencers.length} creators)
                  </option>
                ))}
              </select>
            </div>

            {!rosterForCompose ? (
              <p className="text-xs text-red-600 font-bold uppercase">Pick a roster to continue.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Creators ({Object.keys(composeSelection).length}/10 selected)
                  </Label>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Rows without profiles still send, but creators must re-upload roster to claim slots
                  </span>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto rounded-2xl border border-slate-200 p-2">
                  {sortedComposeInfluencers.map((inf, index) => {
                    const sid = stableRosterRowId(inf, rosterForCompose.id, index);
                    const hasProfileSlot = !!inf.profileId;
                    const checked = !!composeSelection[sid];
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={sid}
                        onClick={() => toggleComposeRow(sid)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleComposeRow(sid)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left cursor-pointer ${checked ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}
                      >
                        <Checkbox checked={checked} className="mt-1 pointer-events-none" />
                        <span>
                          <span className="block font-black uppercase text-sm">{inf.name || inf.handle}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{inf.platform || inf.channels?.[0]?.platform}</span>
                          {!hasProfileSlot ? (
                            <span className="block text-[10px] text-amber-600 font-bold uppercase mt-1">No claim code — only for shortlist display</span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setComposeBrief(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-black text-white"
              disabled={!composeBrief || sendingBriefId === composeBrief.id}
              onClick={() => void sendComposedShortlist()}
            >
              Send to Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
