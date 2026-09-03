import { Box, Chip, LinearProgress, List, ListItem, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { FLEX_ELIGIBLE_POSITIONS, ROSTER_SLOTS, type RosterSlot } from '../@enums/RosterSlot';
import { getRosterSize } from '../@types/RosterLimits';
import type { Player } from '../@types/Player';
import type { Position } from '../@enums/Position';

export const RosterSummary = () => {
  const { players, coaches, activeCoachId, rosterLimits } = useAppContext();
  const activeCoach = coaches.find((c) => c.id === activeCoachId);

  const myPlayers = useMemo(() => players.filter((p) => p.draftedBy === activeCoachId), [players, activeCoachId]);

  const bySlot = useMemo(() => {
    const byPosition = new Map<Position, Player[]>();
    for (const p of myPlayers) {
      const list = byPosition.get(p.position) ?? [];
      list.push(p);
      byPosition.set(p.position, list);
    }
    for (const list of byPosition.values()) {
      list.sort((a, b) => a.rank - b.rank);
    }

    const map = new Map<RosterSlot, Player[]>();
    const flexOverflow: Player[] = [];
    for (const slot of ROSTER_SLOTS) {
      if (slot === 'FLEX') {
        continue;
      }
      const list = byPosition.get(slot) ?? [];
      const limit = rosterLimits[slot];
      map.set(slot, list.slice(0, limit));
      if (FLEX_ELIGIBLE_POSITIONS.includes(slot)) {
        flexOverflow.push(...list.slice(limit));
      }
    }
    flexOverflow.sort((a, b) => a.rank - b.rank);
    map.set('FLEX', flexOverflow.slice(0, rosterLimits.FLEX));
    return map;
  }, [myPlayers, rosterLimits]);

  const totalDrafted = myPlayers.length;
  const rosterSize = useMemo(() => getRosterSize(rosterLimits), [rosterLimits]);

  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
      <Typography variant="h6" gutterBottom>
        {activeCoach ? activeCoach.name : 'Roster'}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Total roster
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalDrafted} / {rosterSize}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={rosterSize > 0 ? Math.min(100, (totalDrafted / rosterSize) * 100) : 0}
        />
      </Box>

      <Stack spacing={1.5}>
        {ROSTER_SLOTS.filter((slot) => rosterLimits[slot] > 0).map((slot) => {
          const list = bySlot.get(slot) ?? [];
          const limit = rosterLimits[slot];
          const full = list.length >= limit;
          return (
            <Box key={slot}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Chip
                  label={slot}
                  size="small"
                  color={full ? 'success' : 'default'}
                  variant={full ? 'filled' : 'outlined'}
                />
                <Typography variant="body2" color="text.secondary">
                  {list.length} / {limit}
                </Typography>
              </Stack>
              {list.length > 0 && (
                <List dense disablePadding sx={{ pl: 1 }}>
                  {list.map((p) => (
                    <ListItem key={p.id} disablePadding disableGutters>
                      <ListItemText primary={`${p.name} (${p.team})`} slotProps={{ primary: { variant: 'body2' } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 1, whiteSpace: 'nowrap' }}>
                        Bye {p.bye}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};
