import type { Player } from './Player';

export interface CsvParseResult {
  players: Player[];
  errors: string[];
}
