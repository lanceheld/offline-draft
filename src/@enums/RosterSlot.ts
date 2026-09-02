import type { Position } from './Position';

export const ROSTER_SLOTS = ['QB', 'RB', 'WR', 'FLEX', 'TE', 'K', 'DP', 'DST', 'HC'] as const;

export type RosterSlot = (typeof ROSTER_SLOTS)[number];

export const FLEX_ELIGIBLE_POSITIONS: readonly Position[] = ['RB', 'WR'];
