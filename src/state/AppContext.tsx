import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { ActionType } from '../@enums/ActionType';
import { ResolutionType } from '../@enums/ResolutionType';
import { ROSTER_SLOTS } from '../@enums/RosterSlot';
import * as db from '../db';
import {
  getCurrentPickIndex,
  getNextTrackedCoach,
  getTotalPicks,
  hasValidDraftPositions,
  maxDraftPosition,
  normalizeDraftPositions,
} from '../draftOrder';
import type { AppContextValue } from '../@types/AppContextValue';
import type { Coach } from '../@types/Coach';
import type { Player } from '../@types/Player';
import { DEFAULT_ROSTER_LIMITS, type RosterLimits } from '../@types/RosterLimits';
import { AppContext } from '../hooks/useAppContext';
import { initialState, reducer } from './reducer';

const ACTIVE_COACH_META_KEY = 'activeCoachId';
const ROSTER_LIMITS_META_KEY = 'rosterLimits';
const TOTAL_COACHES_META_KEY = 'totalCoaches';

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

/**
 * Total league size (tracked coaches plus untracked "others"), falling back
 * to the highest tracked draft position when unset or malformed, and never
 * allowed below it — a gap between tracked positions (e.g. 1 and 7) still
 * requires a league at least that large for snake-draft math to reach the
 * higher position.
 */
const parseTotalCoaches = (raw: string | undefined, coaches: Coach[]): number => {
  const minimum = Math.max(maxDraftPosition(coaches), 1);
  const parsed = raw !== undefined ? Number(raw) : Number.NaN;
  const value = Number.isInteger(parsed) && parsed > 0 ? parsed : minimum;
  return Math.max(value, minimum);
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
      const [players, coaches, activeCoachId, rosterLimitsRaw, totalCoachesRaw] = await Promise.all([
        db.loadPlayers(),
        db.loadCoaches(),
        db.loadMeta(ACTIVE_COACH_META_KEY),
        db.loadMeta(ROSTER_LIMITS_META_KEY),
        db.loadMeta(TOTAL_COACHES_META_KEY),
      ]);
      if (cancelled) {
        return;
      }
      const finalRosterLimits = parseRosterLimits(rosterLimitsRaw);
      let finalCoaches = coaches;
      let finalActiveCoachId = activeCoachId ?? null;
      if (finalCoaches.length === 0) {
        const defaultCoach: Coach = {
          id: uuid(),
          name: 'Coach 1',
          draftPosition: 1,
        };
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
      } else if (!hasValidDraftPositions(finalCoaches)) {
        // Only genuinely broken data (missing/non-integer/duplicate
        // positions, e.g. from before draft positions existed) gets
        // renumbered here — an existing gap between valid positions is a
        // meaningful "other" slot and must be left alone.
        finalCoaches = normalizeDraftPositions(finalCoaches);
        await db.saveCoaches(finalCoaches);
        if (cancelled) {
          return;
        }
      }
      if (!finalActiveCoachId || !finalCoaches.some((c) => c.id === finalActiveCoachId)) {
        finalActiveCoachId = finalCoaches[0].id;
        await db.saveMeta(ACTIVE_COACH_META_KEY, finalActiveCoachId);
        if (cancelled) {
          return;
        }
      }
      // Not persisted here even when it falls back/clamps — it's cheap to
      // recompute from the coaches' max draft position on every load (which
      // can exceed coach count when there are intentional "other" slot
      // gaps), and the "removeCoach deletes persisted active coach id"
      // style guarantees stay simple when hydration never writes on its own.
      const finalTotalCoaches = parseTotalCoaches(totalCoachesRaw, finalCoaches);
      dispatch({
        type: ActionType.Hydrate,
        players,
        coaches: finalCoaches,
        totalCoaches: finalTotalCoaches,
        activeCoachId: finalActiveCoachId,
        rosterLimits: finalRosterLimits,
      });
    };
    hydrate().catch((error) => {
      console.error('Failed to hydrate draft state', error);
      if (cancelled) {
        return;
      }
      const defaultCoach: Coach = {
        id: uuid(),
        name: 'Coach 1',
        draftPosition: 1,
      };
      dispatch({
        type: ActionType.Hydrate,
        players: [],
        coaches: [defaultCoach],
        totalCoaches: 1,
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
      const id = uuid();
      dispatch({ type: ActionType.AddCoach, id, name });
      if (!state.activeCoachId) {
        persist(db.saveMeta(ACTIVE_COACH_META_KEY, id));
      }
    },
    [state.activeCoachId],
  );

  const renameCoach = useCallback((id: string, name: string) => {
    dispatch({ type: ActionType.RenameCoach, id, name });
  }, []);

  const setCoachDraftPosition = useCallback((id: string, position: number) => {
    dispatch({ type: ActionType.SetCoachDraftPosition, id, position });
  }, []);

  const setTotalCoaches = useCallback((count: number) => {
    dispatch({ type: ActionType.SetTotalCoaches, count });
  }, []);

  const removeCoach = useCallback(
    (id: string, resolution: ResolutionType) => {
      dispatch({ type: ActionType.RemoveCoach, id, resolution });

      const newActiveCoachId =
        state.activeCoachId === id ? (state.coaches.find((c) => c.id !== id)?.id ?? null) : state.activeCoachId;
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

  // Persist the league size whenever it changes after load (adding a coach
  // can grow it automatically; setTotalCoaches can change it directly).
  // Skips the transition into `loaded` itself so a value merely recomputed
  // during hydration (never written back there) doesn't trigger a write.
  const totalCoachesHydratedRef = useRef(false);
  useEffect(() => {
    if (!state.loaded) {
      return;
    }
    if (!totalCoachesHydratedRef.current) {
      totalCoachesHydratedRef.current = true;
      return;
    }
    persist(db.saveMeta(TOTAL_COACHES_META_KEY, String(state.totalCoaches)));
  }, [state.loaded, state.totalCoaches]);

  // Auto-advance the active coach to whoever is tracked and up next whenever
  // a new pick is recorded during this session, based on each coach's draft
  // position. Deliberately does not jump retroactively on load (only when
  // the pick count rises above the last-seen baseline), so reopening the
  // app doesn't yank the active coach away from wherever it was left. Jumps
  // ahead over any untracked "other" slots immediately rather than waiting
  // for each of them to be recorded individually, so the active coach
  // always reflects the next tracked coach coming up, not just who happens
  // to be on the clock right now.
  const lastPickIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state.loaded || state.coaches.length === 0) {
      return;
    }
    const currentPickIndex = getCurrentPickIndex(state.players);
    const lastPickIndex = lastPickIndexRef.current;
    lastPickIndexRef.current = currentPickIndex;
    if (lastPickIndex === null || currentPickIndex <= lastPickIndex) {
      return;
    }
    const totalPicks = getTotalPicks(state.totalCoaches, state.rosterLimits);
    if (currentPickIndex >= totalPicks) {
      return;
    }
    const upNext = getNextTrackedCoach(state.coaches, currentPickIndex, state.totalCoaches);
    if (upNext && upNext.id !== state.activeCoachId) {
      dispatch({ type: ActionType.SetActiveCoach, id: upNext.id });
      persist(db.saveMeta(ACTIVE_COACH_META_KEY, upNext.id));
    }
  }, [state.loaded, state.players, state.coaches, state.totalCoaches, state.rosterLimits, state.activeCoachId]);

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
      setCoachDraftPosition,
      setTotalCoaches,
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
      setCoachDraftPosition,
      setTotalCoaches,
      setRosterLimits,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
