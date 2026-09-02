import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { v4 as uuid } from 'uuid';
import { ActionType } from '../@enums/ActionType';
import { ResolutionType } from '../@enums/ResolutionType';
import { ROSTER_SLOTS } from '../@enums/RosterSlot';
import * as db from '../db';
import type { Actions } from '../@types/Actions';
import type { AppContextValue } from '../@types/AppContextValue';
import type { AppState } from '../@types/AppState';
import type { Coach } from '../@types/Coach';
import type { Player } from '../@types/Player';
import {
  DEFAULT_ROSTER_LIMITS,
  type RosterLimits,
} from '../@types/RosterLimits';
import { AppContext } from '../hooks/useAppContext';

const initialState: AppState = {
  loaded: false,
  players: [],
  coaches: [],
  activeCoachId: null,
  rosterLimits: DEFAULT_ROSTER_LIMITS,
};

const reducer = (state: AppState, action: Actions): AppState => {
  switch (action.type) {
    case ActionType.Hydrate:
      return {
        loaded: true,
        players: action.players,
        coaches: action.coaches,
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
    case ActionType.AddCoach:
      return {
        ...state,
        coaches: [...state.coaches, action.coach],
        activeCoachId: state.activeCoachId ?? action.coach.id,
      };
    case ActionType.RenameCoach:
      return {
        ...state,
        coaches: state.coaches.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c,
        ),
      };
    case ActionType.RemoveCoach: {
      const coaches = state.coaches.filter((c) => c.id !== action.id);
      const activeCoachId =
        state.activeCoachId === action.id
          ? (coaches[0]?.id ?? null)
          : state.activeCoachId;
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
    case ActionType.SetRosterLimits:
      return { ...state, rosterLimits: action.limits };
    default:
      return state;
  }
};

const ACTIVE_COACH_META_KEY = 'activeCoachId';
const ROSTER_LIMITS_META_KEY = 'rosterLimits';

const parseRosterLimits = (raw: string | undefined): RosterLimits => {
  if (!raw) {
    return DEFAULT_ROSTER_LIMITS;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_ROSTER_LIMITS;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_ROSTER_LIMITS;
  }
  const limits = { ...DEFAULT_ROSTER_LIMITS };
  for (const slot of ROSTER_SLOTS) {
    const value = (parsed as Record<string, unknown>)[slot];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      limits[slot] = value;
    }
  }
  return limits;
};

const persist = (promise: Promise<unknown>): void => {
  promise.catch((error) => {
    console.error('Failed to persist draft state', error);
  });
};

export const AppProvider = ({ children }: { readonly children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const [players, coaches, activeCoachId, rosterLimitsRaw] =
        await Promise.all([
          db.loadPlayers(),
          db.loadCoaches(),
          db.loadMeta(ACTIVE_COACH_META_KEY),
          db.loadMeta(ROSTER_LIMITS_META_KEY),
        ]);
      if (cancelled) {
        return;
      }
      const finalRosterLimits = parseRosterLimits(rosterLimitsRaw);
      let finalCoaches = coaches;
      let finalActiveCoachId = activeCoachId ?? null;
      if (finalCoaches.length === 0) {
        const defaultCoach: Coach = { id: uuid(), name: 'Coach 1' };
        finalCoaches = [defaultCoach];
        finalActiveCoachId = defaultCoach.id;
        await db.saveCoaches(finalCoaches);
        if (cancelled) {
          return;
        }
        await db.saveMeta(ACTIVE_COACH_META_KEY, finalActiveCoachId);
        if (cancelled) {
          return;
        }
      } else if (
        !finalActiveCoachId ||
        !finalCoaches.some((c) => c.id === finalActiveCoachId)
      ) {
        finalActiveCoachId = finalCoaches[0].id;
        await db.saveMeta(ACTIVE_COACH_META_KEY, finalActiveCoachId);
        if (cancelled) {
          return;
        }
      }
      dispatch({
        type: ActionType.Hydrate,
        players,
        coaches: finalCoaches,
        activeCoachId: finalActiveCoachId,
        rosterLimits: finalRosterLimits,
      });
    };
    hydrate().catch((error) => {
      console.error('Failed to hydrate draft state', error);
      if (cancelled) {
        return;
      }
      const defaultCoach: Coach = { id: uuid(), name: 'Coach 1' };
      dispatch({
        type: ActionType.Hydrate,
        players: [],
        coaches: [defaultCoach],
        activeCoachId: defaultCoach.id,
        rosterLimits: DEFAULT_ROSTER_LIMITS,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const importPlayers = useCallback((players: Player[]) => {
    dispatch({ type: ActionType.ImportPlayers, players });
    persist(db.replaceAllPlayers(players));
  }, []);

  const toggleDraftedByMe = useCallback(
    (playerId: string, checked: boolean) => {
      const coachId = checked ? state.activeCoachId : null;
      dispatch({ type: ActionType.SetDraftedBy, playerId, coachId });
      const player = state.players.find((p) => p.id === playerId);
      if (player) {
        persist(
          db.savePlayer({
            ...player,
            draftedBy: coachId,
            draftedOther: coachId ? false : player.draftedOther,
          }),
        );
      }
    },
    [state.activeCoachId, state.players],
  );

  const toggleDraftedOther = useCallback(
    (playerId: string, value: boolean) => {
      dispatch({ type: ActionType.SetDraftedOther, playerId, value });
      const player = state.players.find((p) => p.id === playerId);
      if (player) {
        persist(
          db.savePlayer({
            ...player,
            draftedOther: value,
            draftedBy: value ? null : player.draftedBy,
          }),
        );
      }
    },
    [state.players],
  );

  const addCoach = useCallback(
    (name: string) => {
      const coach: Coach = { id: uuid(), name };
      dispatch({ type: ActionType.AddCoach, coach });
      if (!state.activeCoachId) {
        persist(db.saveMeta(ACTIVE_COACH_META_KEY, coach.id));
      }
    },
    [state.activeCoachId],
  );

  const renameCoach = useCallback((id: string, name: string) => {
    dispatch({ type: ActionType.RenameCoach, id, name });
  }, []);

  const removeCoach = useCallback(
    (id: string, resolution: ResolutionType) => {
      dispatch({ type: ActionType.RemoveCoach, id, resolution });

      const newActiveCoachId =
        state.activeCoachId === id
          ? (state.coaches.find((c) => c.id !== id)?.id ?? null)
          : state.activeCoachId;
      if (newActiveCoachId !== state.activeCoachId) {
        if (newActiveCoachId) {
          persist(db.saveMeta(ACTIVE_COACH_META_KEY, newActiveCoachId));
        } else {
          persist(db.deleteMeta(ACTIVE_COACH_META_KEY));
        }
      }

      const affectedPlayers = state.players
        .filter((p) => p.draftedBy === id)
        .map((p) => ({
          ...p,
          draftedBy: null,
          draftedOther: resolution === ResolutionType.Other,
        }));
      if (affectedPlayers.length > 0) {
        persist(db.savePlayers(affectedPlayers));
      }
    },

    [state.coaches, state.activeCoachId, state.players],
  );

  const setActiveCoach = useCallback((id: string) => {
    dispatch({ type: ActionType.SetActiveCoach, id });
    persist(db.saveMeta(ACTIVE_COACH_META_KEY, id));
  }, []);

  const setRosterLimits = useCallback((limits: RosterLimits) => {
    dispatch({ type: ActionType.SetRosterLimits, limits });
    persist(db.saveMeta(ROSTER_LIMITS_META_KEY, JSON.stringify(limits)));
  }, []);

  // Persist coach list whenever it changes (after initial hydration).
  useEffect(() => {
    if (!state.loaded) {
      return;
    }
    persist(db.saveCoaches(state.coaches));
  }, [state.loaded, state.coaches]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      importPlayers,
      toggleDraftedByMe,
      toggleDraftedOther,
      addCoach,
      renameCoach,
      removeCoach,
      setActiveCoach,
      setRosterLimits,
    }),
    [
      state,
      importPlayers,
      toggleDraftedByMe,
      toggleDraftedOther,
      addCoach,
      renameCoach,
      removeCoach,
      setActiveCoach,
      setRosterLimits,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
