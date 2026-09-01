import {
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { POSITIONS } from '../@enums/Position';
import { ROSTER_LIMITS, ROSTER_SIZE } from '../@types/RosterLimits';

export const RosterSummary = () => {
  const { players, coaches, activeCoachId } = useAppContext();
  const activeCoach = coaches.find((c) => c.id === activeCoachId);

  const myPlayers = useMemo(
    () => players.filter((p) => p.draftedBy === activeCoachId),
    [players, activeCoachId],
  );

  const byPosition = useMemo(() => {
    const map = new Map<string, typeof myPlayers>();
    for (const pos of POSITIONS) map.set(pos, []);
    for (const p of myPlayers) map.get(p.position)?.push(p);
    return map;
  }, [myPlayers]);

  const totalDrafted = myPlayers.length;

  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
      <Typography variant="h6" gutterBottom>
        {activeCoach ? activeCoach.name : 'Roster'}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            Total roster
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalDrafted} / {ROSTER_SIZE}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (totalDrafted / ROSTER_SIZE) * 100)}
        />
      </Box>

      <Stack spacing={1.5}>
        {POSITIONS.map((pos) => {
          const list = byPosition.get(pos) ?? [];
          const limit = ROSTER_LIMITS[pos];
          const full = list.length >= limit;
          return (
            <Box key={pos}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', mb: 0.5 }}
              >
                <Chip
                  label={pos}
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
                      <ListItemText
                        primary={`${p.name} (${p.team})`}
                        slotProps={{ primary: { variant: 'body2' } }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ pl: 1, whiteSpace: 'nowrap' }}
                      >
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
