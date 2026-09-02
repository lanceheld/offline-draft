import type { DBSchema } from 'idb';
import type { Coach } from './Coach';
import type { Player } from './Player';

export interface DraftDB extends DBSchema {
  players: {
    key: string;
    value: Player;
  };
  coaches: {
    key: string;
    value: Coach;
  };
  meta: {
    key: string;
    value: string;
  };
}
