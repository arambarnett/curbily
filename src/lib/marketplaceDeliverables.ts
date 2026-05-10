import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  BrandBrief,
  CreatorShortlist,
  DeliverableWorkflowStatus,
  InfluencerRoster,
} from '../types';
import { shortlistCreatorRowKey } from './marketplaceIds';

/**
 * When brand has chosen 3 creators, create `deliverables` docs (Phase B kickoff).
 * Idempotent via `deliverables.shortlistId` query. No payments / escrow.
 */
export async function finalizeShortlistToDeliverables(
  shortlist: CreatorShortlist,
  brief: BrandBrief,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const picks = shortlist.selectedCreatorIds || [];
  if (picks.length < 3) {
    return { ok: false, message: 'Pick all three creators first.' };
  }

  const existing = await getDocs(
    query(collection(db, 'deliverables'), where('shortlistId', '==', shortlist.id), limit(1)),
  );
  if (!existing.empty) {
    await updateDoc(doc(db, 'creatorShortlists', shortlist.id), {
      status: 'confirmed',
      deliverablesReadyAt: serverTimestamp(),
    });
    return { ok: true };
  }

  const pickedCreators: Array<{
    row: InfluencerRoster['influencers'][number];
    profileId: string;
  }> = [];

  for (const pid of picks) {
    const hit = shortlist.creators.find(
      (c, idx) => shortlistCreatorRowKey(c, idx) === pid,
    );
    if (!hit?.profileId) {
      return {
        ok: false,
        message:
          'Every pick must reference a roster row with an inventory profile ID. Compose a fresh shortlist from an uploaded CSV roster.',
      };
    }
    pickedCreators.push({ row: hit, profileId: hit.profileId });
  }

  const batch = writeBatch(db);

  for (const { row, profileId } of pickedCreators) {
    const pSnap = await getDoc(doc(db, 'creatorProfiles', profileId));
    const pdata = pSnap.data();
    const creatorUid =
      pdata?.status === 'claimed' && typeof pdata.claimedByUid === 'string'
        ? pdata.claimedByUid
        : '';

    const dRef = doc(collection(db, 'deliverables'));
    batch.set(dRef, {
      briefId: brief.id,
      shortlistId: shortlist.id,
      brandId: brief.brandId,
      brandName: brief.brandName || '',
      managerId: shortlist.managerId,
      managerName: shortlist.managerName || '',
      creatorProfileId: profileId,
      creatorUid,
      creatorDisplayName: row.name || row.handle || 'Creator',
      campaignName: brief.campaignName,
      title: `${brief.campaignName} · ${row.name || row.handle || 'Creator'}`,
      workflowStatus: 'invited' as DeliverableWorkflowStatus,
      deliverableSummary:
        (brief.deliverables || brief.goals || '').slice(0, 2000) || '',
      agreementNote:
        'No in-app escrow yet—compensation stays off-platform unless you negotiate separately.',
      submissionUrl: '',
      notesBrand: '',
      notesManager: '',
      notesCreator: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(doc(db, 'creatorShortlists', shortlist.id), {
    status: 'confirmed',
    deliverablesReadyAt: serverTimestamp(),
  });

  await batch.commit();
  return { ok: true };
}
