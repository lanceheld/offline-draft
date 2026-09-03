import { ActionType } from '../../@enums/ActionType';
import { ResolutionType } from '../../@enums/ResolutionType';
import type { AppState } from '../../@types/AppState';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { DEFAULT_ROSTER_LIMITS } from '../../@types/RosterLimits';
import { initialState, reducer } from '../reducer';

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

const makeCoach = (overrides: Partial<Coach> = {}): Coach => ({
  id: 'c1',
  name: 'Coach 1',
  draftPosition: 1,
  ...overrides,
});

const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  loaded: true,
  players: [],
  coaches: [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 })],
  totalCoaches: 2,
  activeCoachId: 'c1',
  rosterLimits: DEFAULT_ROSTER_LIMITS,
  ...overrides,
});

describe('reducer', () => {
  it('returns unmodified state for an unknown action', () => {
    const state = makeState();

    const next = reducer(state, {
      type: 'not-a-real-action',
    } as unknown as Parameters<typeof reducer>[1]);

    expect(next).toBe(state);
  });

  describe('Hydrate', () => {
    it('replaces the entire state, including loaded', () => {
      const coaches = [makeCoach()];
      const players = [makePlayer()];

      const next = reducer(initialState, {
        type: ActionType.Hydrate,
        players,
        coaches,
        totalCoaches: 4,
        activeCoachId: 'c1',
        rosterLimits: DEFAULT_ROSTER_LIMITS,
      });

      expect(next).toEqual({
        loaded: true,
        players,
        coaches,
        totalCoaches: 4,
        activeCoachId: 'c1',
        rosterLimits: DEFAULT_ROSTER_LIMITS,
      });
    });
  });

  describe('ImportPlayers', () => {
    it('replaces the player list', () => {
      const state = makeState({ players: [makePlayer({ id: 'old' })] });
      const players = [makePlayer({ id: 'new' })];

      const next = reducer(state, { type: ActionType.ImportPlayers, players });

      expect(next.players).toBe(players);
    });
  });

  describe('SetDraftedBy', () => {
    it('sets draftedBy and clears draftedOther on the matching player', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedOther: true })],
      });

      const next = reducer(state, {
        type: ActionType.SetDraftedBy,
        playerId: 'p1',
        coachId: 'c1',
      });

      expect(next.players[0]).toMatchObject({
        draftedBy: 'c1',
        draftedOther: false,
      });
    });

    it('clearing draftedBy leaves draftedOther untouched', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1', draftedOther: false })],
      });

      const next = reducer(state, {
        type: ActionType.SetDraftedBy,
        playerId: 'p1',
        coachId: null,
      });

      expect(next.players[0]).toMatchObject({
        draftedBy: null,
        draftedOther: false,
      });
    });

    it('leaves other players unchanged', () => {
      const other = makePlayer({ id: 'p2' });
      const state = makeState({ players: [makePlayer({ id: 'p1' }), other] });

      const next = reducer(state, {
        type: ActionType.SetDraftedBy,
        playerId: 'p1',
        coachId: 'c1',
      });

      expect(next.players[1]).toBe(other);
    });
  });

  describe('SetDraftedOther', () => {
    it('sets draftedOther and clears draftedBy when true', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
      });

      const next = reducer(state, {
        type: ActionType.SetDraftedOther,
        playerId: 'p1',
        value: true,
      });

      expect(next.players[0]).toMatchObject({
        draftedOther: true,
        draftedBy: null,
      });
    });

    it('clearing draftedOther leaves draftedBy untouched', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedOther: true, draftedBy: null })],
      });

      const next = reducer(state, {
        type: ActionType.SetDraftedOther,
        playerId: 'p1',
        value: false,
      });

      expect(next.players[0]).toMatchObject({
        draftedOther: false,
        draftedBy: null,
      });
    });
  });

  describe('AddCoach', () => {
    it('assigns the smallest free draft position', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 3 })],
      });

      const next = reducer(state, {
        type: ActionType.AddCoach,
        id: 'c3',
        name: 'New Coach',
      });

      expect(next.coaches).toEqual([...state.coaches, { id: 'c3', name: 'New Coach', draftPosition: 2 }]);
    });

    it('grows totalCoaches when the new position exceeds it', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1', draftPosition: 1 })],
        totalCoaches: 1,
      });

      const next = reducer(state, {
        type: ActionType.AddCoach,
        id: 'c2',
        name: 'New Coach',
      });

      expect(next.totalCoaches).toBe(2);
    });

    it('sets the new coach as active when none was set', () => {
      const state = makeState({ coaches: [], activeCoachId: null });

      const next = reducer(state, {
        type: ActionType.AddCoach,
        id: 'c1',
        name: 'New Coach',
      });

      expect(next.activeCoachId).toBe('c1');
    });

    it('does not change the active coach when one is already set', () => {
      const state = makeState({ activeCoachId: 'c1' });

      const next = reducer(state, {
        type: ActionType.AddCoach,
        id: 'c3',
        name: 'New Coach',
      });

      expect(next.activeCoachId).toBe('c1');
    });
  });

  describe('RenameCoach', () => {
    it('renames the matching coach and leaves others unchanged', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.RenameCoach,
        id: 'c1',
        name: 'Renamed',
      });

      expect(next.coaches[0]).toMatchObject({ id: 'c1', name: 'Renamed' });
      expect(next.coaches[1]).toBe(state.coaches[1]);
    });
  });

  describe('RemoveCoach', () => {
    it('removes the coach without renumbering the remaining positions', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 7 })],
      });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.coaches).toEqual([makeCoach({ id: 'c2', draftPosition: 7 })]);
    });

    it('falls back the active coach to another one when the active coach is removed', () => {
      const state = makeState({ activeCoachId: 'c1' });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.activeCoachId).toBe('c2');
    });

    it('falls back the active coach to null when no coach remains', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1' })],
        activeCoachId: 'c1',
      });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.activeCoachId).toBeNull();
    });

    it('leaves the active coach untouched when a different coach is removed', () => {
      const state = makeState({ activeCoachId: 'c2' });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.activeCoachId).toBe('c2');
    });

    it('clears draftedBy for that coach, marking players undrafted when resolved as undrafted', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
      });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.players[0]).toMatchObject({
        draftedBy: null,
        draftedOther: false,
      });
    });

    it('clears draftedBy for that coach, marking players draftedOther when resolved as other', () => {
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
      });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Other,
      });

      expect(next.players[0]).toMatchObject({
        draftedBy: null,
        draftedOther: true,
      });
    });

    it('leaves players drafted by other coaches unchanged', () => {
      const other = makePlayer({ id: 'p2', draftedBy: 'c2' });
      const state = makeState({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' }), other],
      });

      const next = reducer(state, {
        type: ActionType.RemoveCoach,
        id: 'c1',
        resolution: ResolutionType.Undrafted,
      });

      expect(next.players[1]).toBe(other);
    });
  });

  describe('SetActiveCoach', () => {
    it('sets the active coach id', () => {
      const state = makeState({ activeCoachId: 'c1' });

      const next = reducer(state, {
        type: ActionType.SetActiveCoach,
        id: 'c2',
      });

      expect(next.activeCoachId).toBe('c2');
    });
  });

  describe('SetCoachDraftPosition', () => {
    it('swaps positions with whoever currently holds the target slot', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c2',
        position: 1,
      });

      expect(next.coaches).toEqual([
        makeCoach({ id: 'c1', draftPosition: 2 }),
        makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 1 }),
      ]);
    });

    it('moves into an empty slot without disturbing other coaches', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 2 })],
        totalCoaches: 5,
      });

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c2',
        position: 5,
      });

      expect(next.coaches).toEqual([
        makeCoach({ id: 'c1', draftPosition: 1 }),
        makeCoach({ id: 'c2', draftPosition: 5 }),
      ]);
    });

    it('ignores a non-integer draft position', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c1',
        position: 1.5,
      });

      expect(next).toBe(state);
    });

    it('ignores a position below 1', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c1',
        position: 0,
      });

      expect(next).toBe(state);
    });

    it('ignores a position beyond totalCoaches', () => {
      const state = makeState({ totalCoaches: 2 });

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c1',
        position: 3,
      });

      expect(next).toBe(state);
    });

    it('is a no-op when the coach is already at that position', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'c1',
        position: 1,
      });

      expect(next).toBe(state);
    });

    it('is a no-op for an unknown coach id', () => {
      const state = makeState();

      const next = reducer(state, {
        type: ActionType.SetCoachDraftPosition,
        id: 'does-not-exist',
        position: 2,
      });

      expect(next).toBe(state);
    });
  });

  describe('SetTotalCoaches', () => {
    it('sets the count when it is at least the current minimum', () => {
      const state = makeState({ totalCoaches: 2 });

      const next = reducer(state, {
        type: ActionType.SetTotalCoaches,
        count: 10,
      });

      expect(next.totalCoaches).toBe(10);
    });

    it('never drops below the number of tracked coaches', () => {
      const state = makeState({ totalCoaches: 2 });

      const next = reducer(state, {
        type: ActionType.SetTotalCoaches,
        count: 0,
      });

      expect(next.totalCoaches).toBe(2);
    });

    it('never drops below the highest tracked draft position, even with gaps', () => {
      const state = makeState({
        coaches: [makeCoach({ id: 'c1', draftPosition: 1 }), makeCoach({ id: 'c2', draftPosition: 7 })],
        totalCoaches: 7,
      });

      const next = reducer(state, {
        type: ActionType.SetTotalCoaches,
        count: 3,
      });

      expect(next.totalCoaches).toBe(7);
    });

    it('falls back to the current minimum for a non-integer count', () => {
      const state = makeState({ totalCoaches: 2 });

      const next = reducer(state, {
        type: ActionType.SetTotalCoaches,
        count: 2.5,
      });

      expect(next.totalCoaches).toBe(2);
    });
  });

  describe('SetRosterLimits', () => {
    it('replaces the roster limits', () => {
      const state = makeState();
      const limits = { ...DEFAULT_ROSTER_LIMITS, RB: 3, FLEX: 2 };

      const next = reducer(state, {
        type: ActionType.SetRosterLimits,
        limits,
      });

      expect(next.rosterLimits).toBe(limits);
    });
  });
});
