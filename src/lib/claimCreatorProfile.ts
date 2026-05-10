import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

function normalizeCreatorCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Links signed-in Talent user to canonical `creatorProfiles` row + merges `contacts`. */
export async function claimCreatorProfileWithCode(args: {
  uid: string;
  email: string;
  displayName: string;
  code: string;
}): Promise<{ profileId: string; managerId: string }> {
  const code = normalizeCreatorCode(args.code);
  if (code.length < 6) throw new Error('Enter the full roster invite code from your manager.');
  const codeRef = doc(db, 'creatorClaimCodes', code);
  const codeSnap = await getDoc(codeRef);
  if (!codeSnap.exists()) throw new Error('That code was not found. Confirm with your manager and try again.');
  const { profileId, managerId } = codeSnap.data() as {
    profileId?: string;
    managerId?: string;
  };
  if (!profileId || !managerId) throw new Error('Invalid roster invite.');

  const profileRef = doc(db, 'creatorProfiles', profileId);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) throw new Error('Roster slot is missing.');
  const pdata = profileSnap.data() as Record<string, unknown>;
  if (pdata.status !== 'unclaimed') throw new Error('This roster slot has already been claimed.');
  const channels = pdata.channels;

  const batch = writeBatch(db);
  batch.update(profileRef, {
    status: 'claimed',
    claimedByUid: args.uid,
    claimedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'users', args.uid),
    {
      marketplaceRole: 'influencer',
      linkedManagerId: managerId,
      claimedCreatorProfileId: profileId,
      viewMode: 'talent',
      onboarded: true,
    },
    { merge: true }
  );

  batch.set(
    doc(db, 'contacts', args.uid),
    {
      uid: args.uid,
      name: typeof pdata.name === 'string' && pdata.name ? pdata.name : args.displayName,
      email: args.email || (pdata.email as string) || '',
      linkedManagerId: managerId,
      claimedCreatorProfileId: profileId,
      type: ['influencer'],
      ownerId: args.uid,
      isGlobal: false,
      ...(Array.isArray(channels) && channels.length > 0 ? { channels } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await batch.commit();

  const linkedDeals = await getDocs(
    query(collection(db, 'deliverables'), where('creatorProfileId', '==', profileId)),
  );
  if (!linkedDeals.empty) {
    const relink = writeBatch(db);
    linkedDeals.forEach((snap) => {
      const payload = snap.data() as Record<string, unknown>;
      if (!payload.creatorUid || payload.creatorUid === '') {
        relink.update(snap.ref, { creatorUid: args.uid, updatedAt: serverTimestamp() });
      }
    });
    await relink.commit();
  }

  return { profileId, managerId };
}
