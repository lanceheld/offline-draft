import type { Player } from '../@types/Player';
import { Availability, AVAILABILITY_BUFFER, buildAvailabilityMap, predictAvailability } from '../availability';

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

describe('predictAvailability', () => {
  it('marks a player gone when enough picks remain before your turn to take them', () => {
    expect(predictAvailability(0, 2)).toBe(Availability.Gone);
    expect(predictAvailability(1, 2)).toBe(Availability.Gone);
  });

  it('marks a player contested within the buffer just past the cutoff', () => {
    expect(predictAvailability(2, 2)).toBe(Availability.Contested);
    expect(predictAvailability(2 + AVAILABILITY_BUFFER - 1, 2)).toBe(Availability.Contested);
  });

  it('marks a player available beyond the buffer', () => {
    expect(predictAvailability(2 + AVAILABILITY_BUFFER, 2)).toBe(Availability.Available);
  });

  it('treats a pick happening right now as everyone available', () => {
    expect(predictAvailability(0, 0)).toBe(Availability.Available);
    expect(predictAvailability(50, 0)).toBe(Availability.Available);
  });
});

describe('buildAvailabilityMap', () => {
  it('only rates undrafted players, ranked among themselves', () => {
    const players = [
      makePlayer({ id: 'p1', rank: 1, draftedBy: 'c1' }),
      makePlayer({ id: 'p2', rank: 2 }),
      makePlayer({ id: 'p3', rank: 3, draftedOther: true }),
      makePlayer({ id: 'p4', rank: 4 }),
    ];

    const map = buildAvailabilityMap(players, 0);

    expect(map.has('p1')).toBe(false);
    expect(map.has('p3')).toBe(false);
    // p2 is the best available (index 0), p4 the next (index 1).
    expect(map.get('p2')).toBe(Availability.Available);
    expect(map.get('p4')).toBe(Availability.Available);
  });

  it('marks the top of the board gone when several picks separate you from your turn', () => {
    const players = [
      makePlayer({ id: 'p1', rank: 1 }),
      makePlayer({ id: 'p2', rank: 2 }),
      makePlayer({ id: 'p3', rank: 3 }),
    ];

    const map = buildAvailabilityMap(players, 2);

    expect(map.get('p1')).toBe(Availability.Gone);
    expect(map.get('p2')).toBe(Availability.Gone);
    expect(map.get('p3')).toBe(Availability.Contested);
  });
});
