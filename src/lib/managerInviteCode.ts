import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateManagerInviteCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Ensures `marketplaceAccounts/{uid}` has a stable `managerInviteCode` and matching `managerInviteCodes/{code}` doc. */
export async function ensureManagerInviteCode(managerUid: string): Promise<string> {
  const accRef = doc(db, 'marketplaceAccounts', managerUid);
  const existingSnap = await getDoc(accRef);
  const existing = existingSnap.data()?.managerInviteCode as string | undefined;
  if (existing && /^[A-Z0-9]{8}$/.test(existing)) {
    return existing;
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateManagerInviteCode();
    const codeRef = doc(db, 'managerInviteCodes', code);
    const taken = await getDoc(codeRef);
    if (taken.exists()) continue;
    await setDoc(codeRef, {
      code,
      managerId: managerUid,
      createdAt: serverTimestamp(),
    });
    await setDoc(accRef, { managerInviteCode: code }, { merge: true });
    return code;
  }
  throw new Error('Could not allocate a unique manager invite code');
}
