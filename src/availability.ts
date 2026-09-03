import type { Player } from './@types/Player';

export const Availability = {
  Gone: 'gone',
  Contested: 'contested',
  Available: 'available',
} as const;

export type Availability = (typeof Availability)[keyof typeof Availability];

/** Extra cushion (in picks) treated as a toss-up rather than a hard cutoff, since other coaches won't draft strictly by rank. */
export const AVAILABILITY_BUFFER = 3;

export const predictAvailability = (rankAmongAvailable: number, picksUntilNextTurn: number): Availability => {
  if (picksUntilNextTurn <= 0) {
    return Availability.Available;
  }
  if (rankAmongAvailable < picksUntilNextTurn) {
    return Availability.Gone;
  }
  if (rankAmongAvailable < picksUntilNextTurn + AVAILABILITY_BUFFER) {
    return Availability.Contested;
  }
  return Availability.Available;
};

/**
 * Maps every undrafted player to a predicted availability at the active
 * coach's next pick, based purely on their rank relative to how many picks
 * will happen before that turn comes around.
 */
export const buildAvailabilityMap = (players: Player[], picksUntilNextTurn: number): Map<string, Availability> => {
  const available = players.filter((p) => p.draftedBy === null && !p.draftedOther).sort((a, b) => a.rank - b.rank);

  const map = new Map<string, Availability>();
  available.forEach((player, index) => {
    map.set(player.id, predictAvailability(index, picksUntilNextTurn));
  });
  return map;
};
