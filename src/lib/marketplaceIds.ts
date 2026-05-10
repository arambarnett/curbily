import type { CreatorShortlist, InfluencerRoster } from '../types';

/** Stable row id for a creator on a shortlist (matches selection toggles). */
export function shortlistCreatorRowKey(
  c: InfluencerRoster['influencers'][number],
  index: number,
): string {
  return (
    (c.profileId as string | undefined) ||
    c.id ||
    `${c.handle ?? c.name ?? 'creator'}-${index}`
  );
}

export function rosterRowStableKey(
  row: InfluencerRoster['influencers'][number],
  rosterId: string,
  index: number,
): string {
  return row.profileId || `${rosterId}:${row.id ?? `legacy-${index}`}`;
}
