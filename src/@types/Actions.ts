import { ActionType } from '../@enums/ActionType';
import type { ResolutionType } from '../@enums/ResolutionType';
import type { Coach } from './Coach';
import type { Player } from './Player';
import type { RosterLimits } from './RosterLimits';

export type Actions =
  | {
      type: typeof ActionType.Hydrate;
      players: Player[];
      coaches: Coach[];
      totalCoaches: number;
      activeCoachId: string | null;
      rosterLimits: RosterLimits;
    }
  | { type: typeof ActionType.ImportPlayers; players: Player[] }
  | {
      type: typeof ActionType.SetDraftedBy;
      playerId: string;
      coachId: string | null;
    }
  | {
      type: typeof ActionType.SetDraftedOther;
      playerId: string;
      value: boolean;
    }
  | { type: typeof ActionType.AddCoach; id: string; name: string }
  | { type: typeof ActionType.RenameCoach; id: string; name: string }
  | {
      type: typeof ActionType.RemoveCoach;
      id: string;
      resolution: ResolutionType;
    }
  | { type: typeof ActionType.SetActiveCoach; id: string }
  | {
      type: typeof ActionType.SetCoachDraftPosition;
      id: string;
      position: number;
    }
  | { type: typeof ActionType.SetTotalCoaches; count: number }
  | { type: typeof ActionType.SetRosterLimits; limits: RosterLimits };
