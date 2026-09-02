import type { Coach } from './Coach';
import type { Player } from './Player';
import type { RosterLimits } from './RosterLimits';

export interface AppState {
  loaded: boolean;
  players: Player[];
  coaches: Coach[];
  activeCoachId: string | null;
  rosterLimits: RosterLimits;
}
