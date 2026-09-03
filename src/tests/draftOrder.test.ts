import type { Coach } from '../@types/Coach';
import type { Player } from '../@types/Player';
import { DEFAULT_ROSTER_LIMITS } from '../@types/RosterLimits';
import {
  getCoachForPick,
  getCurrentPickIndex,
  getDraftPositionForPick,
  getNextPickIndexForCoach,
  getNextTrackedCoach,
  getTotalPicks,
  hasValidDraftPositions,
  maxDraftPosition,
  normalizeDraftPositions,
} from '../draftOrder';

const makeCoach = (overrides: Partial<Coach> = {}): Coach => ({
  id: 'c1',
  name: 'Coach 1',
  draftPosition: 1,
  ...overrides,
});

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  rank: 1,
  position: 'QB',
  name: 'Josh Allen',
  team: 'BUF',
  bye: 12,
  draftedBy: null,
  draftedOther: false,
  ...overrides,
});

const threeCoaches: Coach[] = [
  makeCoach({ id: 'c1', draftPosition: 1 }),
  makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
  makeCoach({ id: 'c3', name: 'Coach 3', draftPosition: 3 }),
];

describe('getDraftPositionForPick', () => {
  it('goes in ascending draft-position order for the first (odd) round', () => {
    expect(getDraftPositionForPick(0, 3)).toBe(1);
    expect(getDraftPositionForPick(1, 3)).toBe(2);
    expect(getDraftPositionForPick(2, 3)).toBe(3);
  });

  it('reverses order for the second (even) round, snaking', () => {
    expect(getDraftPositionForPick(3, 3)).toBe(3);
    expect(getDraftPositionForPick(4, 3)).toBe(2);
    expect(getDraftPositionForPick(5, 3)).toBe(1);
  });

  it('returns to ascending order for the third round', () => {
    expect(getDraftPositionForPick(6, 3)).toBe(1);
  });

  it('returns undefined for an invalid totalCoaches', () => {
    expect(getDraftPositionForPick(0, 0)).toBeUndefined();
    expect(getDraftPositionForPick(0, -1)).toBeUndefined();
    expect(getDraftPositionForPick(0, 2.5)).toBeUndefined();
  });
});

describe('getCoachForPick', () => {
  it('finds the coach holding the draft position on the clock for a pick', () => {
    expect(getCoachForPick(threeCoaches, 0, 3)?.id).toBe('c1');
    expect(getCoachForPick(threeCoaches, 1, 3)?.id).toBe('c2');
    expect(getCoachForPick(threeCoaches, 3, 3)?.id).toBe('c3');
    expect(getCoachForPick(threeCoaches, 5, 3)?.id).toBe('c1');
  });

  it('returns undefined when the pick belongs to an untracked "other" drafter', () => {
    const twoTracked = threeCoaches.filter((c) => c.id !== 'c2');
    // League of 3, but only c1 (pos 1) and c3 (pos 3) are tracked.
    expect(getCoachForPick(twoTracked, 1, 3)).toBeUndefined();
  });

  it('returns undefined when there are no draft slots', () => {
    expect(getCoachForPick([], 0, 0)).toBeUndefined();
  });
});

describe('getNextPickIndexForCoach', () => {
  it("returns the current pick index when it's already that coach's turn", () => {
    expect(getNextPickIndexForCoach(threeCoaches, 'c2', 1, 3)).toBe(1);
  });

  it('finds the next occurrence later in the same round', () => {
    expect(getNextPickIndexForCoach(threeCoaches, 'c3', 1, 3)).toBe(2);
  });

  it('wraps into the next (reversed) round when this round has passed', () => {
    // c1 (position 1) already had round 0's pick 0; next is round 1's snake-back slot.
    expect(getNextPickIndexForCoach(threeCoaches, 'c1', 1, 3)).toBe(5);
  });

  it('accounts for untracked "other" drafters when computing the period', () => {
    // League of 5, only c1 (pos 1) tracked: their next turn is 5 picks later.
    const soloCoach = [makeCoach({ id: 'c1', draftPosition: 1 })];
    expect(getNextPickIndexForCoach(soloCoach, 'c1', 1, 5)).toBe(9);
  });

  it('returns undefined for an unknown coach id', () => {
    expect(getNextPickIndexForCoach(threeCoaches, 'unknown', 0, 3)).toBeUndefined();
  });

  it('returns undefined for a non-integer or non-positive totalCoaches', () => {
    expect(getNextPickIndexForCoach(threeCoaches, 'c1', 0, 0)).toBeUndefined();
    expect(getNextPickIndexForCoach(threeCoaches, 'c1', 0, -1)).toBeUndefined();
    expect(getNextPickIndexForCoach(threeCoaches, 'c1', 0, 1.5)).toBeUndefined();
    expect(getNextPickIndexForCoach(threeCoaches, 'c1', 0, NaN)).toBeUndefined();
  });
});

describe('maxDraftPosition', () => {
  it('returns the highest draft position among the coaches', () => {
    const coaches = [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 7 })];
    expect(maxDraftPosition(coaches)).toBe(7);
  });

  it('returns 0 when there are no coaches', () => {
    expect(maxDraftPosition([])).toBe(0);
  });
});

describe('getNextTrackedCoach', () => {
  it("returns the coach on the clock when it's already a tracked coach's turn", () => {
    expect(getNextTrackedCoach(threeCoaches, 1, 3)?.id).toBe('c2');
  });

  it('skips over an untracked "other" slot to find the next tracked coach', () => {
    // League of 3, but only c1 (pos 1) and c3 (pos 3) are tracked.
    const twoTracked = threeCoaches.filter((c) => c.id !== 'c2');
    expect(getNextTrackedCoach(twoTracked, 1, 3)?.id).toBe('c3');
  });

  it('skips a tracked coach whose turn already passed this round', () => {
    // League of 3, only c1 (pos 1) and c3 (pos 3) tracked. In round 1
    // (reversed), c3 goes at index 3 and c1 at index 5 — from index 4, c3
    // has already passed, so c1 is next.
    const twoTracked = threeCoaches.filter((c) => c.id !== 'c2');
    expect(getNextTrackedCoach(twoTracked, 4, 3)?.id).toBe('c1');
  });

  it('returns undefined when there are no tracked coaches', () => {
    expect(getNextTrackedCoach([], 0, 3)).toBeUndefined();
  });
});

describe('getCurrentPickIndex', () => {
  it('counts players drafted by a tracked coach or marked drafted elsewhere', () => {
    const players = [
      makePlayer({ id: 'p1', draftedBy: 'c1' }),
      makePlayer({ id: 'p2', draftedOther: true }),
      makePlayer({ id: 'p3' }),
    ];
    expect(getCurrentPickIndex(players)).toBe(2);
  });
});

describe('getTotalPicks', () => {
  it('multiplies the total league size (tracked coaches and others) by roster size', () => {
    const rosterSize = Object.values(DEFAULT_ROSTER_LIMITS).reduce((a, b) => a + b, 0);
    expect(getTotalPicks(3, DEFAULT_ROSTER_LIMITS)).toBe(3 * rosterSize);
  });
});

describe('hasValidDraftPositions', () => {
  it('accepts distinct positive positions even with gaps between them', () => {
    const coaches = [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 7 })];
    expect(hasValidDraftPositions(coaches)).toBe(true);
  });

  it('rejects duplicate positions', () => {
    const coaches = [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 1 })];
    expect(hasValidDraftPositions(coaches)).toBe(false);
  });

  it('rejects a non-integer or non-positive position', () => {
    expect(hasValidDraftPositions([makeCoach({ draftPosition: 0 })])).toBe(false);
    expect(hasValidDraftPositions([makeCoach({ draftPosition: 1.5 })])).toBe(false);
    expect(hasValidDraftPositions([makeCoach({ draftPosition: undefined as unknown as number })])).toBe(false);
  });
});

describe('normalizeDraftPositions', () => {
  it('renumbers coaches to be contiguous starting at 1, preserving relative order', () => {
    const coaches = [makeCoach({ id: 'c1', draftPosition: 5 }), makeCoach({ id: 'c2', draftPosition: 2 })];
    const normalized = normalizeDraftPositions(coaches);
    expect(normalized.map((c) => [c.id, c.draftPosition])).toEqual([
      ['c2', 1],
      ['c1', 2],
    ]);
  });

  it('sorts coaches with a missing/non-finite draft position to the end', () => {
    const coaches = [
      makeCoach({ id: 'c1', draftPosition: Number.NaN }),
      makeCoach({ id: 'c2', draftPosition: 3 }),
      makeCoach({ id: 'c3', draftPosition: undefined as unknown as number }),
      makeCoach({ id: 'c4', draftPosition: 1 }),
    ];
    const normalized = normalizeDraftPositions(coaches);
    expect(normalized.map((c) => c.id)).toEqual(['c4', 'c2', 'c1', 'c3']);
    expect(normalized.map((c) => c.draftPosition)).toEqual([1, 2, 3, 4]);
  });
});
