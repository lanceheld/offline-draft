import { DEFAULT_ROSTER_LIMITS } from '../@types/RosterLimits';
import { hasOpenRosterSpot, hasRosterSpotForPosition } from '../rosterAssignment';

describe('hasOpenRosterSpot', () => {
  it('allows drafting when the dedicated position limit is not reached', () => {
    expect(hasOpenRosterSpot({ QB: 1 }, 'QB', DEFAULT_ROSTER_LIMITS)).toBe(true);
  });

  it('blocks drafting a non-flex-eligible position once its limit is reached', () => {
    expect(hasOpenRosterSpot({ QB: 2 }, 'QB', DEFAULT_ROSTER_LIMITS)).toBe(false);
  });

  it('allows a flex-eligible position to spill into an open FLEX slot', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 1, WR: 1, FLEX: 1 };
    expect(hasOpenRosterSpot({ RB: 1 }, 'RB', limits)).toBe(true);
  });

  it('blocks a flex-eligible position once its dedicated slot and FLEX are both full', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 1, WR: 1, FLEX: 1 };
    // One RB already occupies FLEX (1 over its own limit of 1).
    expect(hasOpenRosterSpot({ RB: 2 }, 'RB', limits)).toBe(false);
  });

  it('shares the FLEX pool across RB and WR', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 1, WR: 1, FLEX: 1 };
    // RB already used the only FLEX spot, so WR has no room left either.
    expect(hasOpenRosterSpot({ RB: 2, WR: 1 }, 'WR', limits)).toBe(false);
  });

  it('treats a missing count as zero', () => {
    expect(hasOpenRosterSpot({}, 'TE', DEFAULT_ROSTER_LIMITS)).toBe(true);
  });
});

describe('hasRosterSpotForPosition', () => {
  it('allows a non-flex-eligible position with a nonzero dedicated limit', () => {
    expect(hasRosterSpotForPosition('QB', DEFAULT_ROSTER_LIMITS)).toBe(true);
  });

  it('blocks a non-flex-eligible position with a zero dedicated limit', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, K: 0 };
    expect(hasRosterSpotForPosition('K', limits)).toBe(false);
  });

  it('allows a flex-eligible position with a zero dedicated limit when FLEX is open', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 0, WR: 0, FLEX: 1 };
    expect(hasRosterSpotForPosition('RB', limits)).toBe(true);
    expect(hasRosterSpotForPosition('WR', limits)).toBe(true);
  });

  it('blocks a flex-eligible position when both its dedicated limit and FLEX are zero', () => {
    const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 0, WR: 0, FLEX: 0 };
    expect(hasRosterSpotForPosition('RB', limits)).toBe(false);
  });
});
