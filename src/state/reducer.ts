import { ActionType } from '../@enums/ActionType';
import { ResolutionType } from '../@enums/ResolutionType';
import { maxDraftPosition } from '../draftOrder';
import type { Actions } from '../@types/Actions';
import type { AppState } from '../@types/AppState';
import type { Coach } from '../@types/Coach';
import { DEFAULT_ROSTER_LIMITS } from '../@types/RosterLimits';

export const initialState: AppState = {
  loaded: false,
  players: [],
  coaches: [],
  totalCoaches: 0,
  activeCoachId: null,
  rosterLimits: DEFAULT_ROSTER_LIMITS,
};

/** Smallest positive draft position not already held by a tracked coach. */
const nextFreeDraftPosition = (coaches: Coach[]): number => {
  const used = new Set(coaches.map((c) => c.draftPosition));
  let position = 1;
  while (used.has(position)) {
    position += 1;
  }
  return position;
};

export const reducer = (state: AppState, action: Actions): AppState => {
  switch (action.type) {
    case ActionType.Hydrate:
      return {
        loaded: true,
        players: action.players,
        coaches: action.coaches,
        totalCoaches: action.totalCoaches,
        activeCoachId: action.activeCoachId,
        rosterLimits: action.rosterLimits,
      };
    case ActionType.ImportPlayers:
      return { ...state, players: action.players };
    case ActionType.SetDraftedBy:
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                draftedBy: action.coachId,
                draftedOther: action.coachId ? false : p.draftedOther,
              }
            : p,
        ),
      };
    case ActionType.SetDraftedOther:
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                draftedOther: action.value,
                draftedBy: action.value ? null : p.draftedBy,
              }
            : p,
        ),
      };
    case ActionType.AddCoach: {
      const position = nextFreeDraftPosition(state.coaches);
      const coach: Coach = {
        id: action.id,
        name: action.name,
        draftPosition: position,
      };
      return {
        ...state,
        coaches: [...state.coaches, coach],
        totalCoaches: Math.max(state.totalCoaches, position),
        activeCoachId: state.activeCoachId ?? coach.id,
      };
    }
    case ActionType.RenameCoach:
      return {
        ...state,
        coaches: state.coaches.map((c) => (c.id === action.id ? { ...c, name: action.name } : c)),
      };
    case ActionType.RemoveCoach: {
      // Positions aren't renumbered here: a gap left behind is a meaningful
      // "other" draft slot, not something to collapse away.
      const coaches = state.coaches.filter((c) => c.id !== action.id);
      const activeCoachId = state.activeCoachId === action.id ? (coaches[0]?.id ?? null) : state.activeCoachId;
      return {
        ...state,
        coaches,
        activeCoachId,
        players: state.players.map((p) =>
          p.draftedBy === action.id
            ? {
                ...p,
                draftedBy: null,
                draftedOther: action.resolution === ResolutionType.Other,
              }
            : p,
        ),
      };
    }
    case ActionType.SetActiveCoach:
      return { ...state, activeCoachId: action.id };
    case ActionType.SetCoachDraftPosition: {
      if (!Number.isInteger(action.position) || action.position < 1 || action.position > state.totalCoaches) {
        return state;
      }
      const target = state.coaches.find((c) => c.id === action.id);
      const holder = state.coaches.find((c) => c.draftPosition === action.position);
      if (!target || target.draftPosition === action.position) {
        return state;
      }
      return {
        ...state,
        coaches: state.coaches.map((c) => {
          if (c.id === action.id) {
            return { ...c, draftPosition: action.position };
          }
          if (c.id === holder?.id) {
            return { ...c, draftPosition: target.draftPosition };
          }
          return c;
        }),
      };
    }
    case ActionType.SetTotalCoaches: {
      const minimum = Math.max(maxDraftPosition(state.coaches), 1);
      const count = Number.isInteger(action.count) ? action.count : minimum;
      return {
        ...state,
        totalCoaches: Math.max(count, minimum),
      };
    }
    case ActionType.SetRosterLimits:
      return { ...state, rosterLimits: action.limits };
    default:
      return state;
  }
};
