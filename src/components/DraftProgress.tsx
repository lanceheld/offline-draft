import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import {
  getCoachForPick,
  getCurrentPickIndex,
  getDraftPositionForPick,
  getNextPickIndexForCoach,
  getTotalPicks,
} from '../draftOrder';
import { useAppContext } from '../hooks/useAppContext';

export const DraftProgress = () => {
  const { players, coaches, totalCoaches, activeCoachId, rosterLimits } = useAppContext();

  const totalPicks = useMemo(() => getTotalPicks(totalCoaches, rosterLimits), [totalCoaches, rosterLimits]);
  const currentPickIndex = useMemo(() => getCurrentPickIndex(players), [players]);
  const draftComplete = currentPickIndex >= totalPicks;

  const onTheClock = draftComplete ? undefined : getCoachForPick(coaches, currentPickIndex, totalCoaches);
  const round = Math.floor(currentPickIndex / Math.max(totalCoaches, 1));
  const pickInRound = draftComplete ? undefined : getDraftPositionForPick(currentPickIndex, totalCoaches);

  const nextPickIndex = activeCoachId
    ? getNextPickIndexForCoach(coaches, activeCoachId, currentPickIndex, totalCoaches)
    : undefined;
  const picksUntilNextTurn = nextPickIndex !== undefined ? nextPickIndex - currentPickIndex : undefined;

  let nextTurnMessage: string | undefined;
  if (picksUntilNextTurn === 0) {
    nextTurnMessage = "You're on the clock";
  } else if (picksUntilNextTurn !== undefined) {
    const pickLabel = picksUntilNextTurn === 1 ? 'pick' : 'picks';
    nextTurnMessage = `Your next pick: #${(nextPickIndex ?? 0) + 1} (${picksUntilNextTurn} ${pickLabel} away)`;
  }

  if (coaches.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Draft progress
      </Typography>
      <Box sx={{ mb: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {draftComplete
              ? 'Draft complete'
              : `Pick ${currentPickIndex + 1} of ${totalPicks} (Round ${round + 1}, #${pickInRound ?? '?'})`}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={totalPicks > 0 ? Math.min(100, (currentPickIndex / totalPicks) * 100) : 0}
        />
      </Box>

      {!draftComplete && (
        <Stack spacing={1}>
          <Typography variant="body2">
            On the clock: <strong>{onTheClock?.name ?? 'Another team (untracked)'}</strong>
          </Typography>
          {activeCoachId && picksUntilNextTurn !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {nextTurnMessage}
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  );
};
