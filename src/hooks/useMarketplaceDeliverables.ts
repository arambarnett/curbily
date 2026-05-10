import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where, type QuerySnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MarketplaceDeliverable, UserProfile } from '../types';

function mapDocs(snapshot: QuerySnapshot): MarketplaceDeliverable[] {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as MarketplaceDeliverable));
}

export function useMarketplaceDeliverables(
  persona: UserProfile['marketplaceRole'],
  uid: string | undefined,
  claimedProfileId: string | null | undefined,
): { loading: boolean; items: MarketplaceDeliverable[] } {
  const role = persona ?? 'brand';
  const [brand, setBrand] = useState<MarketplaceDeliverable[]>([]);
  const [mgr, setMgr] = useState<MarketplaceDeliverable[]>([]);
  const [byUid, setByUid] = useState<MarketplaceDeliverable[]>([]);
  const [byProf, setByProf] = useState<MarketplaceDeliverable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return undefined;
    }

    setBrand([]);
    setMgr([]);
    setByUid([]);
    setByProf([]);
    setLoading(true);

    const unsubs: (() => void)[] = [];
    let expected = 1;
    let done = 0;
    const tick = () => {
      done += 1;
      if (done >= expected) setLoading(false);
    };

    if (role === 'influencer') {
      const pid = typeof claimedProfileId === 'string' ? claimedProfileId.trim() : '';
      expected = pid ? 2 : 1;

      unsubs.push(
        onSnapshot(
          query(collection(db, 'deliverables'), where('creatorUid', '==', uid), orderBy('createdAt', 'desc')),
          (snap) => {
            setByUid(mapDocs(snap));
            tick();
          },
          () => tick(),
        ),
      );
      if (pid) {
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'deliverables'),
              where('creatorProfileId', '==', pid),
              orderBy('createdAt', 'desc'),
            ),
            (snap) => {
              setByProf(mapDocs(snap));
              tick();
            },
            () => tick(),
          ),
        );
      }
    } else if (role === 'brand') {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'deliverables'), where('brandId', '==', uid), orderBy('createdAt', 'desc')),
          (snap) => {
            setBrand(mapDocs(snap));
            tick();
          },
          () => tick(),
        ),
      );
    } else if (role === 'manager') {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'deliverables'), where('managerId', '==', uid), orderBy('createdAt', 'desc')),
          (snap) => {
            setMgr(mapDocs(snap));
            tick();
          },
          () => tick(),
        ),
      );
    } else {
      setLoading(false);
    }

    return () => unsubs.forEach((fn) => fn());
  }, [uid, role, claimedProfileId]);

  const items = useMemo(() => {
    if (role === 'brand') return brand;
    if (role === 'manager') return mgr;
    const m = new Map<string, MarketplaceDeliverable>();
    [...byUid, ...byProf].forEach((r) => {
      if (r.id) m.set(r.id, r);
    });
    return [...m.values()].sort((a, b) => {
      const ta =
        typeof (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis === 'function'
          ? (a.createdAt as { toMillis: () => number }).toMillis()
          : new Date((a.createdAt as string) || 0).getTime();
      const tb =
        typeof (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis === 'function'
          ? (b.createdAt as { toMillis: () => number }).toMillis()
          : new Date((b.createdAt as string) || 0).getTime();
      return tb - ta;
    });
  }, [role, brand, mgr, byUid, byProf]);

  return {
    loading,
    items,
  };
}
