import type { ResolutionType } from '../@enums/ResolutionType';
import type { AppState } from './AppState';
import type { Player } from './Player';
import type { RosterLimits } from './RosterLimits';

export interface AppContextValue extends AppState {
  importPlayers: (players: Player[]) => void;
  toggleDraftedByMe: (playerId: string, checked: boolean) => void;
  toggleDraftedOther: (playerId: string, checked: boolean) => void;
  addCoach: (name: string) => void;
  renameCoach: (id: string, name: string) => void;
  removeCoach: (id: string, resolution: ResolutionType) => void;
  setActiveCoach: (id: string) => void;
  setCoachDraftPosition: (id: string, position: number) => void;
  setTotalCoaches: (count: number) => void;
  setRosterLimits: (limits: RosterLimits) => void;
}
