import type { Position } from '../@enums/Position';

export interface Player {
  id: string;
  rank: number;
  position: Position;
  name: string;
  team: string;
  bye: number;
  /** Coach id who drafted this player/team, or null if undrafted by a tracked coach. */
  draftedBy: string | null;
  /** Marked as taken by someone outside the tracked coaches (a generic "other"). */
  draftedOther: boolean;
}
