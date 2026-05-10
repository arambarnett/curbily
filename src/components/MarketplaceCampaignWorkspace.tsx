import React from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { useMarketplaceDeliverables } from '../hooks/useMarketplaceDeliverables';
import type { DeliverableWorkflowStatus, MarketplaceDeliverable } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

type MarketplacePersona = 'brand' | 'manager' | 'influencer';

const STATUS_STYLE: Partial<Record<DeliverableWorkflowStatus, string>> = {
  invited: 'bg-amber-100 text-amber-900',
  accepted: 'bg-blue-100 text-blue-900',
  working: 'bg-purple-100 text-purple-900',
  delivered: 'bg-sky-100 text-sky-900',
  complete: 'bg-emerald-100 text-emerald-900',
  declined: 'bg-slate-200 text-slate-700',
};

function DeliverableActions({ item, persona }: { item: MarketplaceDeliverable; persona: MarketplacePersona }) {
  const [submissionUrl, setSubmissionUrl] = React.useState(item.submissionUrl || '');
  const [notesManager, setNotesManager] = React.useState(item.notesManager || '');
  const [notesCreator, setNotesCreator] = React.useState(item.notesCreator || '');
  const [notesBrand, setNotesBrand] = React.useState(item.notesBrand || '');
  const [saving, setSaving] = React.useState(false);

  const patch = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'deliverables', item.id), {
        ...fields,
        updatedAt: serverTimestamp(),
      });
      toast.success('Saved');
    } catch (e) {
      console.error(e);
      toast.error('Could not update deliverable.');
    } finally {
      setSaving(false);
    }
  };

  if (persona === 'influencer') {
    if (item.workflowStatus === 'declined' || item.workflowStatus === 'complete') {
      return (
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
          No further updates for this lane.
        </p>
      );
    }
    return (
      <div className="space-y-3 mt-4">
        {item.workflowStatus === 'invited' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-xl" disabled={saving} onClick={() => void patch({ workflowStatus: 'accepted' })}>
              Accept brief
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void patch({ workflowStatus: 'declined' })}
            >
              Decline
            </Button>
          </div>
        ) : null}
        {item.workflowStatus === 'accepted' ? (
          <Button size="sm" className="rounded-xl" disabled={saving} onClick={() => void patch({ workflowStatus: 'working' })}>
            Mark in progress
          </Button>
        ) : null}
        {(item.workflowStatus === 'working' || item.workflowStatus === 'accepted') && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Submission link</label>
            <Input
              value={submissionUrl}
              onChange={(ev) => setSubmissionUrl(ev.target.value)}
              placeholder="https://…"
              className="rounded-xl"
            />
            <Button
              size="sm"
              className="rounded-xl mt-2"
              disabled={saving || item.workflowStatus !== 'working'}
              onClick={() =>
                void patch({
                  submissionUrl,
                  workflowStatus: 'delivered',
                })
              }
            >
              Deliver to brand
            </Button>
            {item.workflowStatus !== 'working' ? (
              <p className="text-[10px] text-slate-500 font-bold uppercase">Move to “in progress” first.</p>
            ) : null}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Creator notes</label>
          <Textarea rows={3} value={notesCreator} onChange={(ev) => setNotesCreator(ev.target.value)} />
          <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => void patch({ notesCreator })}>
            Save notes
          </Button>
        </div>
      </div>
    );
  }

  if (persona === 'manager') {
    return (
      <div className="space-y-2 mt-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Private manager notes</label>
        <Textarea rows={3} value={notesManager} onChange={(ev) => setNotesManager(ev.target.value)} />
        <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => void patch({ notesManager })}>
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      {item.workflowStatus === 'delivered' ? (
        <Button size="sm" className="rounded-xl bg-black text-white" disabled={saving} onClick={() => void patch({ workflowStatus: 'complete' })}>
          Mark complete / wrap
        </Button>
      ) : (
        <p className="text-xs text-slate-500">Wait for creator delivery; no escrow tooling here.</p>
      )}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brand notes</label>
        <Textarea rows={3} value={notesBrand} onChange={(ev) => setNotesBrand(ev.target.value)} />
        <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => void patch({ notesBrand })}>
          Save
        </Button>
      </div>
      {item.submissionUrl ? (
        <a href={item.submissionUrl} className="text-sm font-bold text-blue-600 underline" target="_blank" rel="noreferrer">
          Open submission
        </a>
      ) : null}
    </div>
  );
}

export function MarketplaceCampaignWorkspace() {
  const { user, profile } = useAuth();
  const mr = profile?.marketplaceRole || 'brand';
  const persona: MarketplacePersona = mr === 'influencer' ? 'influencer' : mr === 'manager' ? 'manager' : 'brand';
  const claimed = typeof profile?.claimedCreatorProfileId === 'string' ? profile.claimedCreatorProfileId : '';
  const { loading, items } = useMarketplaceDeliverables(profile?.marketplaceRole, user?.uid, claimed || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Campaign workspace</h2>
          <p className="text-sm text-slate-500 font-medium">
            Track deliverables after a brand confirms three creators. Compensation stays off-platform—no in-app wallet or escrow in this build.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="rounded-3xl border-dashed bg-white border-2 border-slate-100">
          <CardContent className="p-10 text-center text-slate-500 text-sm font-medium">
            No active workspaces yet—pick three creators from a manager shortlist to kick off lanes automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((item) => (
            <Card key={item.id} className="rounded-3xl border-2 border-slate-900/5 bg-white">
              <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{item.brandName || 'Brand'}</p>
                    <CardTitle className="text-lg font-black uppercase tracking-tighter mt-1">{item.title}</CardTitle>
                  </div>
                  <Badge className={`${STATUS_STYLE[item.workflowStatus] || ''} uppercase text-[10px]`}>
                    {item.workflowStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Creator: <span className="font-semibold">{item.creatorDisplayName}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <p className="text-sm text-slate-600">{item.deliverableSummary}</p>
                <p className="text-[10px] text-slate-500 font-bold">{item.agreementNote}</p>
                <DeliverableActions item={item} persona={persona} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
