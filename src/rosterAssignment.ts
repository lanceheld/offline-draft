import type { Position } from './@enums/Position';
import { FLEX_ELIGIBLE_POSITIONS } from './@enums/RosterSlot';
import type { RosterLimits } from './@types/RosterLimits';

export const hasRosterSpotForPosition = (position: Position, rosterLimits: RosterLimits): boolean =>
  rosterLimits[position] > 0 || (FLEX_ELIGIBLE_POSITIONS.includes(position) && rosterLimits.FLEX > 0);

export const hasOpenRosterSpot = (
  draftedCounts: Partial<Record<Position, number>>,
  position: Position,
  rosterLimits: RosterLimits,
): boolean => {
  const count = draftedCounts[position] ?? 0;
  if (count < rosterLimits[position]) {
    return true;
  }
  if (!FLEX_ELIGIBLE_POSITIONS.includes(position)) {
    return false;
  }

  const flexUsed = FLEX_ELIGIBLE_POSITIONS.reduce(
    (sum, pos) => sum + Math.max(0, (draftedCounts[pos] ?? 0) - rosterLimits[pos]),
    0,
  );
  return flexUsed < rosterLimits.FLEX;
};
