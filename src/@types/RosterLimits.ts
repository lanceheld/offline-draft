import type { RosterSlot } from '../@enums/RosterSlot';

export type RosterLimits = Record<RosterSlot, number>;

export const DEFAULT_ROSTER_LIMITS: RosterLimits = {
  QB: 2,
  RB: 5,
  WR: 5,
  FLEX: 0,
  TE: 2,
  K: 2,
  DST: 2,
  DP: 2,
  HC: 2,
};

export const getRosterSize = (limits: RosterLimits): number => Object.values(limits).reduce((a, b) => a + b, 0);
