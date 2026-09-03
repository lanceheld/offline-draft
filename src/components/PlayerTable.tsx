import LinkIcon from '@mui/icons-material/Link';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Checkbox,
  Chip,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Availability, buildAvailabilityMap } from '../availability';
import type { ColumnDef } from '../@types/ColumnDef';
import type { Player } from '../@types/Player';
import type { Position } from '../@enums/Position';
import { getCurrentPickIndex, getNextPickIndexForCoach } from '../draftOrder';
import { SortableColumn } from '../@enums/SortableColumn';
import { SortDirection } from '../@enums/SortDirection';
import { hasOpenRosterSpot, hasRosterSpotForPosition } from '../rosterAssignment';
import { NameFilter } from './NameFilter';
import { PositionFilter } from './PositionFilter';

const AVAILABILITY_COLOR: Record<Availability, 'error' | 'warning' | 'success'> = {
  [Availability.Gone]: 'error',
  [Availability.Contested]: 'warning',
  [Availability.Available]: 'success',
};

const AVAILABILITY_LABEL: Record<Availability, string> = {
  [Availability.Gone]: 'Likely gone',
  [Availability.Contested]: 'Contested',
  [Availability.Available]: 'Likely available',
};

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
  const { players, coaches, totalCoaches, activeCoachId, rosterLimits, toggleDraftedByMe, toggleDraftedOther } =
    useAppContext();
  const [sortColumn, setSortColumn] = useState<SortableColumn>(SortableColumn.Rank);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Asc);
  const [positionFilter, setPositionFilter] = useState<Position[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const didInitialScroll = useRef(false);

  const coachNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of coaches) {
      map.set(c.id, c.name);
    }
    return map;
  }, [coaches]);

  const availabilityByPlayerId = useMemo(() => {
    if (!activeCoachId) {
      return new Map<string, Availability>();
    }
    const currentPickIndex = getCurrentPickIndex(players);
    const nextPickIndex = getNextPickIndexForCoach(coaches, activeCoachId, currentPickIndex, totalCoaches);
    if (nextPickIndex === undefined) {
      return new Map<string, Availability>();
    }
    return buildAvailabilityMap(players, nextPickIndex - currentPickIndex);
  }, [players, coaches, totalCoaches, activeCoachId]);

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
    let list = players.filter((p) => hasRosterSpotForPosition(p.position, rosterLimits));
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
  }, [players, rosterLimits, positionFilter, nameFilter, sortColumn, sortDirection]);

  const highestAvailablePlayerId = useMemo(() => {
    let best: Player | undefined;
    for (const p of visiblePlayers) {
      const isUndrafted = p.draftedBy === null && !p.draftedOther;
      if (isUndrafted && (!best || p.rank < best.rank)) {
        best = p;
      }
    }
    return best?.id;
  }, [visiblePlayers]);

  useEffect(() => {
    // Deliberately excludes highestAvailablePlayerId/visiblePlayers: scrolling
    // should follow the initial load and sort/filter changes only, not every
    // draft pick (which also shifts who's highest-available).
    if (highestAvailablePlayerId) {
      rowRefs.current.get(highestAvailablePlayerId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Runs before the initial-scroll effect below on mount, so mark it done
      // here too to avoid a redundant second scroll when players are already
      // loaded on first render.
      didInitialScroll.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortDirection, positionFilter, nameFilter]);

  useEffect(() => {
    // Handles the case where players arrive asynchronously after mount
    // (AppContext hydration, CSV upload): fires once as soon as a highest
    // available player exists, then never again, so later picks don't
    // trigger a scroll.
    if (didInitialScroll.current || !highestAvailablePlayerId) {
      return;
    }
    rowRefs.current.get(highestAvailablePlayerId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    didInitialScroll.current = true;
  }, [highestAvailablePlayerId]);

  const handleSort = (column: SortableColumn) => {
    if (column === sortColumn) {
      setSortDirection((d) => (d === SortDirection.Asc ? SortDirection.Desc : SortDirection.Asc));
    } else {
      setSortColumn(column);
      setSortDirection(SortDirection.Asc);
    }
  };

  if (players.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No players loaded yet. Upload a CSV to get started.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                  {col.id === SortableColumn.Position || col.id === SortableColumn.Name ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <TableSortLabel
                        active={sortColumn === col.id}
                        direction={sortColumn === col.id ? sortDirection : SortDirection.Asc}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                      {col.id === SortableColumn.Position ? (
                        <PositionFilter value={positionFilter} onChange={setPositionFilter} />
                      ) : (
                        <NameFilter value={nameFilter} onChange={setNameFilter} />
                      )}
                    </Stack>
                  ) : (
                    <TableSortLabel
                      active={sortColumn === col.id}
                      direction={sortColumn === col.id ? sortDirection : SortDirection.Asc}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
              <TableCell align="center">Mine</TableCell>
              <TableCell align="center">Other</TableCell>
              <TableCell>At your next pick</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visiblePlayers.map((player) => {
              const isMine = player.draftedBy === activeCoachId && player.draftedBy !== null;
              const draftedByOtherCoach = player.draftedBy !== null && player.draftedBy !== activeCoachId;
              const isRed = draftedByOtherCoach || player.draftedOther;
              const otherCoachName = draftedByOtherCoach ? coachNameById.get(player.draftedBy as string) : undefined;
              const isUndrafted = player.draftedBy === null && !player.draftedOther;
              const availability = isUndrafted ? availabilityByPlayerId.get(player.id) : undefined;
              const hasByeClash = isUndrafted && myPositionByeKeys.has(`${player.position}|${player.bye}`);
              const hasTeamClash = isUndrafted && myPositionTeamKeys.has(`${player.position}|${player.team}`);
              const rosterFull = !isMine && !hasOpenRosterSpot(myPositionCounts, player.position, rosterLimits);

              return (
                <TableRow
                  key={player.id}
                  ref={(el: HTMLTableRowElement | null) => {
                    if (el) {
                      rowRefs.current.set(player.id, el);
                    } else {
                      rowRefs.current.delete(player.id);
                    }
                  }}
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
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (drafted by {otherCoachName})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {player.team}
                    {hasTeamClash && (
                      <Tooltip title={`You already have a ${player.position} on ${player.team}`}>
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
                      <Tooltip title={`You already have a ${player.position} on bye week ${player.bye}`}>
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
                          onChange={(e) => toggleDraftedByMe(player.id, e.target.checked)}
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
                          onChange={(e) => toggleDraftedOther(player.id, e.target.checked)}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {availability && (
                      <Chip
                        label={AVAILABILITY_LABEL[availability]}
                        color={AVAILABILITY_COLOR[availability]}
                        size="small"
                        variant="outlined"
                      />
                    )}
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
