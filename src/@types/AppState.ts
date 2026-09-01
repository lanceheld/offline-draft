import type { Coach } from './Coach';
import type { Player } from './Player';

export interface AppState {
  loaded: boolean;
  players: Player[];
  coaches: Coach[];
  activeCoachId: string | null;
}
