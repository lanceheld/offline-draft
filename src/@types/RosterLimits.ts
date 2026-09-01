import type { Position } from '../@enums/Position';

export const ROSTER_LIMITS: Record<Position, number> = {
  QB: 2,
  RB: 5,
  WR: 5,
  TE: 2,
  K: 2,
  DST: 2,
  DP: 2,
  HC: 2,
};

export const ROSTER_SIZE = Object.values(ROSTER_LIMITS).reduce(
  (a, b) => a + b,
  0,
);
