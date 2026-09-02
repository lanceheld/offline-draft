import LinkIcon from '@mui/icons-material/Link';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Checkbox,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import type { ColumnDef } from '../@types/ColumnDef';
import type { Player } from '../@types/Player';
import type { Position } from '../@enums/Position';
import { SortableColumn } from '../@enums/SortableColumn';
import { SortDirection } from '../@enums/SortDirection';
import { hasOpenRosterSpot } from '../rosterAssignment';
import { NameFilter } from './NameFilter';
import { PositionFilter } from './PositionFilter';

const COLUMNS: ColumnDef[] = [
  { id: SortableColumn.Rank, label: 'Rank', numeric: true },
  { id: SortableColumn.Position, label: 'Position' },
  { id: SortableColumn.Name, label: 'Name' },
  { id: SortableColumn.Team, label: 'Team' },
  { id: SortableColumn.Bye, label: 'Bye', numeric: true },
];

const compare = (a: Player, b: Player, column: SortableColumn): number => {
  const av = a[column];
  const bv = b[column];
  if (typeof av === 'number' && typeof bv === 'number') {
    return av - bv;
  }
  return String(av).localeCompare(String(bv));
};

export const PlayerTable = () => {
  const {
    players,
    coaches,
    activeCoachId,
    rosterLimits,
    toggleDraftedByMe,
    toggleDraftedOther,
  } = useAppContext();
  const [sortColumn, setSortColumn] = useState<SortableColumn>(
    SortableColumn.Rank,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SortDirection.Asc,
  );
  const [positionFilter, setPositionFilter] = useState<Position[]>([]);
  const [nameFilter, setNameFilter] = useState('');

  const coachNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of coaches) {
      map.set(c.id, c.name);
    }
    return map;
  }, [coaches]);

  const myPositionByeKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.draftedBy === activeCoachId) {
        set.add(`${p.position}|${p.bye}`);
      }
    }
    return set;
  }, [players, activeCoachId]);

  const myPositionTeamKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.draftedBy === activeCoachId) {
        set.add(`${p.position}|${p.team}`);
      }
    }
    return set;
  }, [players, activeCoachId]);

  const myPositionCounts = useMemo(() => {
    const counts: Partial<Record<Position, number>> = {};
    for (const p of players) {
      if (p.draftedBy === activeCoachId) {
        counts[p.position] = (counts[p.position] ?? 0) + 1;
      }
    }
    return counts;
  }, [players, activeCoachId]);

  const visiblePlayers = useMemo(() => {
    let list = players;
    if (positionFilter.length > 0) {
      const set = new Set(positionFilter);
      list = list.filter((p) => set.has(p.position));
    }
    const trimmedName = nameFilter.trim().toLowerCase();
    if (trimmedName.length > 0) {
      list = list.filter((p) => p.name.toLowerCase().includes(trimmedName));
    }
    const sorted = [...list].sort((a, b) => compare(a, b, sortColumn));
    if (sortDirection === SortDirection.Desc) {
      sorted.reverse();
    }
    return sorted;
  }, [players, positionFilter, nameFilter, sortColumn, sortDirection]);

  const handleSort = (column: SortableColumn) => {
    if (column === sortColumn) {
      setSortDirection((d) =>
        d === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc,
      );
    } else {
      setSortColumn(column);
      setSortDirection(SortDirection.Asc);
    }
  };

  if (players.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No players loaded yet. Upload a CSV to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: '70vh' }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                  {col.id === SortableColumn.Position ||
                  col.id === SortableColumn.Name ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <TableSortLabel
                        active={sortColumn === col.id}
                        direction={
                          sortColumn === col.id
                            ? sortDirection
                            : SortDirection.Asc
                        }
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                      {col.id === SortableColumn.Position ? (
                        <PositionFilter
                          value={positionFilter}
                          onChange={setPositionFilter}
                        />
                      ) : (
                        <NameFilter
                          value={nameFilter}
                          onChange={setNameFilter}
                        />
                      )}
                    </Stack>
                  ) : (
                    <TableSortLabel
                      active={sortColumn === col.id}
                      direction={
                        sortColumn === col.id
                          ? sortDirection
                          : SortDirection.Asc
                      }
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
              <TableCell align="center">Mine</TableCell>
              <TableCell align="center">Other</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visiblePlayers.map((player) => {
              const isMine =
                player.draftedBy === activeCoachId && player.draftedBy !== null;
              const draftedByOtherCoach =
                player.draftedBy !== null && player.draftedBy !== activeCoachId;
              const isRed = draftedByOtherCoach || player.draftedOther;
              const otherCoachName = draftedByOtherCoach
                ? coachNameById.get(player.draftedBy as string)
                : undefined;
              const isUndrafted =
                player.draftedBy === null && !player.draftedOther;
              const hasByeClash =
                isUndrafted &&
                myPositionByeKeys.has(`${player.position}|${player.bye}`);
              const hasTeamClash =
                isUndrafted &&
                myPositionTeamKeys.has(`${player.position}|${player.team}`);
              const rosterFull =
                !isMine &&
                !hasOpenRosterSpot(
                  myPositionCounts,
                  player.position,
                  rosterLimits,
                );

              return (
                <TableRow
                  key={player.id}
                  sx={{
                    bgcolor: (theme) => {
                      if (isMine) {
                        return alpha(theme.palette.success.main, 0.18);
                      }
                      if (isRed) {
                        return alpha(theme.palette.error.main, 0.18);
                      }
                      return undefined;
                    },
                  }}
                >
                  <TableCell align="right">{player.rank}</TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    {player.name}
                    {otherCoachName && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        (drafted by {otherCoachName})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {player.team}
                    {hasTeamClash && (
                      <Tooltip
                        title={`You already have a ${player.position} on ${player.team}`}
                      >
                        <LinkIcon
                          fontSize="inherit"
                          color="info"
                          sx={{ verticalAlign: 'middle', ml: 0.5 }}
                          aria-label={`You already have a ${player.position} on ${player.team}`}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {hasByeClash && (
                      <Tooltip
                        title={`You already have a ${player.position} on bye week ${player.bye}`}
                      >
                        <WarningAmberIcon
                          fontSize="inherit"
                          color="warning"
                          sx={{ verticalAlign: 'middle', mr: 0.5 }}
                          aria-label={`You already have a ${player.position} on bye week ${player.bye}`}
                        />
                      </Tooltip>
                    )}
                    {player.bye}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        draftedByOtherCoach
                          ? 'Already drafted by another coach'
                          : `No ${player.position} roster spots remaining`
                      }
                      disableHoverListener={!draftedByOtherCoach && !rosterFull}
                      disableFocusListener={!draftedByOtherCoach && !rosterFull}
                      disableTouchListener={!draftedByOtherCoach && !rosterFull}
                    >
                      <span>
                        <Checkbox
                          size="small"
                          checked={isMine}
                          disabled={draftedByOtherCoach || rosterFull}
                          onChange={(e) =>
                            toggleDraftedByMe(player.id, e.target.checked)
                          }
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title="Already on your roster"
                      disableHoverListener={!isMine}
                      disableFocusListener={!isMine}
                      disableTouchListener={!isMine}
                    >
                      <span>
                        <Checkbox
                          size="small"
                          checked={player.draftedOther || draftedByOtherCoach}
                          disabled={isMine || draftedByOtherCoach}
                          onChange={(e) =>
                            toggleDraftedOther(player.id, e.target.checked)
                          }
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary">
        {visiblePlayers.length} of {players.length} players
      </Typography>
    </Stack>
  );
};
