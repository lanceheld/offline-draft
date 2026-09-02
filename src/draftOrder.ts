import type { Coach } from './@types/Coach';
import type { Player } from './@types/Player';
import { getRosterSize } from './@types/RosterLimits';
import type { RosterLimits } from './@types/RosterLimits';

/**
 * Renumbers coaches to hold contiguous draft positions 1..N, preserving
 * their relative order. Only used to migrate legacy coach data that
 * predates draft positions (or totalCoaches) existing at all — once a
 * league size is established, gaps between tracked coaches' positions are
 * meaningful (they're "other", untracked drafters) and must not be closed.
 */
const sortableDraftPosition = (c: Coach): number =>
  Number.isFinite(c.draftPosition) ? c.draftPosition : Number.POSITIVE_INFINITY;

export const normalizeDraftPositions = (coaches: Coach[]): Coach[] =>
  [...coaches]
    .sort((a, b) => sortableDraftPosition(a) - sortableDraftPosition(b))
    .map((c, index) => ({ ...c, draftPosition: index + 1 }));

/** The highest draft position among tracked coaches, or 0 when there are none. */
export const maxDraftPosition = (coaches: Coach[]): number =>
  coaches.reduce((max, c) => (Number.isFinite(c.draftPosition) ? Math.max(max, c.draftPosition) : max), 0);

/**
 * True when every coach has a distinct, positive integer draft position.
 * Gaps between them are fine (those are "other" slots) — only missing,
 * non-integer, or duplicate positions count as invalid, since normalizing
 * those away would otherwise erase intentional gaps on every load.
 */
export const hasValidDraftPositions = (coaches: Coach[]): boolean => {
  const seen = new Set<number>();
  for (const c of coaches) {
    if (!Number.isInteger(c.draftPosition) || c.draftPosition < 1) {
      return false;
    }
    if (seen.has(c.draftPosition)) {
      return false;
    }
    seen.add(c.draftPosition);
  }
  return true;
};

/**
 * The 1-indexed draft slot on the clock for a given 0-indexed overall pick,
 * snaking each round, or undefined if totalCoaches isn't a positive integer.
 */
export const getDraftPositionForPick = (pickIndex: number, totalCoaches: number): number | undefined => {
  if (!Number.isInteger(totalCoaches) || totalCoaches < 1) {
    return undefined;
  }
  const round = Math.floor(pickIndex / totalCoaches);
  const slotInRound = pickIndex % totalCoaches;
  return round % 2 === 0 ? slotInRound + 1 : totalCoaches - slotInRound;
};

/**
 * The tracked coach on the clock for a given pick, or undefined if that
 * draft slot belongs to an untracked "other" drafter.
 */
export const getCoachForPick = (coaches: Coach[], pickIndex: number, totalCoaches: number): Coach | undefined => {
  const position = getDraftPositionForPick(pickIndex, totalCoaches);
  return position === undefined ? undefined : coaches.find((c) => c.draftPosition === position);
};

/** The 0-indexed overall pick number at which a coach in the given draft slot is next on the clock. */
const getNextPickIndexForDraftPosition = (
  draftPosition: number,
  fromPickIndex: number,
  totalCoaches: number,
): number | undefined => {
  if (!Number.isInteger(totalCoaches) || totalCoaches < 1) {
    return undefined;
  }
  const n = totalCoaches;
  const round = Math.floor(fromPickIndex / n);
  const slotForRound = (r: number): number => (r % 2 === 0 ? draftPosition - 1 : n - draftPosition);

  const pickInCurrentRound = round * n + slotForRound(round);
  return pickInCurrentRound >= fromPickIndex ? pickInCurrentRound : (round + 1) * n + slotForRound(round + 1);
};

/** The 0-indexed overall pick number at which the given coach is next on the clock. */
export const getNextPickIndexForCoach = (
  coaches: Coach[],
  coachId: string,
  fromPickIndex: number,
  totalCoaches: number,
): number | undefined => {
  const coach = coaches.find((c) => c.id === coachId);
  return coach ? getNextPickIndexForDraftPosition(coach.draftPosition, fromPickIndex, totalCoaches) : undefined;
};

/**
 * The tracked coach whose turn comes soonest at or after the given pick,
 * skipping over any untracked "other" slots in between — unlike
 * getCoachForPick, which only looks at the single pick given.
 */
export const getNextTrackedCoach = (coaches: Coach[], fromPickIndex: number, totalCoaches: number): Coach | undefined =>
  coaches.reduce<{ coach: Coach; pickIndex: number } | undefined>((best, coach) => {
    const pickIndex = getNextPickIndexForDraftPosition(coach.draftPosition, fromPickIndex, totalCoaches);
    if (pickIndex === undefined) {
      return best;
    }
    return !best || pickIndex < best.pickIndex ? { coach, pickIndex } : best;
  }, undefined)?.coach;

/** Count of players already off the board (drafted by a tracked coach or marked drafted elsewhere). */
export const getCurrentPickIndex = (players: Player[]): number =>
  players.filter((p) => p.draftedBy !== null || p.draftedOther).length;

/** Total picks across the whole league (tracked coaches and others alike). */
export const getTotalPicks = (totalCoaches: number, rosterLimits: RosterLimits): number =>
  totalCoaches * getRosterSize(rosterLimits);
