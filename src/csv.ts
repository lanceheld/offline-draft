import Papa from 'papaparse';
import { v4 as uuid } from 'uuid';
import type { CsvParseResult } from './@types/CsvParseResult';
import type { Player } from './@types/Player';
import { POSITIONS, type Position } from './@enums/Position';

const POSITION_SET = new Set<string>(POSITIONS);

const normalizeHeader = (header: string): string => {
  return header.trim().toLowerCase();
};

export const parsePlayersCsv = (csvText: string): CsvParseResult => {
  const errors: string[] = [];
  const players: Player[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Row ${err.row ?? '?'}: ${err.message}`);
    }
  }

  const requiredColumns = ['rank', 'position', 'name', 'team', 'bye'];
  const headers = parsed.meta.fields ?? [];
  const missing = requiredColumns.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    errors.push(`Missing required column(s): ${missing.join(', ')}`);
    return { players: [], errors };
  }

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2; // account for header row, 1-indexed
    const rankRaw = row.rank?.trim();
    const positionRaw = row.position?.trim().toUpperCase();
    const name = row.name?.trim();
    const team = row.team?.trim();
    const byeRaw = row.bye?.trim();

    const rank = Number(rankRaw);
    const bye = Number(byeRaw);

    if (!rankRaw || Number.isNaN(rank)) {
      errors.push(`Row ${rowNum}: invalid Rank "${rankRaw ?? ''}"`);
      return;
    }
    if (!positionRaw || !POSITION_SET.has(positionRaw)) {
      errors.push(`Row ${rowNum}: invalid Position "${positionRaw ?? ''}"`);
      return;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: missing Name`);
      return;
    }
    if (!team) {
      errors.push(`Row ${rowNum}: missing Team`);
      return;
    }
    if (!byeRaw || Number.isNaN(bye)) {
      errors.push(`Row ${rowNum}: invalid Bye "${byeRaw ?? ''}"`);
      return;
    }

    players.push({
      id: uuid(),
      rank,
      position: positionRaw as Position,
      name,
      team,
      bye,
      draftedBy: null,
      draftedOther: false,
    });
  });

  return { players, errors };
};
