import type { Coach } from './Coach';
import type { Player } from './Player';
import type { RosterLimits } from './RosterLimits';

export interface AppState {
  loaded: boolean;
  players: Player[];
  coaches: Coach[];
  /**
   * Total number of drafters in the snake draft, including any not tracked
   * individually as a Coach here (lumped together as "other"). Always >=
   * coaches.length.
   */
  totalCoaches: number;
  activeCoachId: string | null;
  rosterLimits: RosterLimits;
}
