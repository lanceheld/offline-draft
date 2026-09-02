import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { ResolutionType } from '../@enums/ResolutionType';
import { maxDraftPosition } from '../draftOrder';
import { useAppContext } from '../hooks/useAppContext';
import type { Coach } from '../@types/Coach';

export const CoachManager = () => {
  const {
    coaches,
    totalCoaches,
    players,
    activeCoachId,
    setActiveCoach,
    addCoach,
    renameCoach,
    removeCoach,
    setCoachDraftPosition,
    setTotalCoaches,
  } = useAppContext();
  const [manageOpen, setManageOpen] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  const [pendingRemoval, setPendingRemoval] = useState<Coach | null>(null);
  const [totalCoachesInput, setTotalCoachesInput] = useState(String(totalCoaches));
  useEffect(() => {
    setTotalCoachesInput(String(totalCoaches));
  }, [totalCoaches]);

  const sortedCoaches = useMemo(() => [...coaches].sort((a, b) => a.draftPosition - b.draftPosition), [coaches]);

  const coachByPosition = useMemo(() => {
    const map = new Map<number, Coach>();
    for (const c of coaches) {
      map.set(c.draftPosition, c);
    }
    return map;
  }, [coaches]);

  const draftPositionOptions = Array.from({ length: totalCoaches }, (_, i) => i + 1);

  const minTotalCoaches = Math.max(maxDraftPosition(coaches), 1);

  const handleTotalCoachesCommit = () => {
    const value = Number(totalCoachesInput);
    if (Number.isInteger(value)) {
      setTotalCoaches(value);
    } else {
      setTotalCoachesInput(String(totalCoaches));
    }
  };

  const handleAddCoach = () => {
    const name = newCoachName.trim();
    if (!name) {
      return;
    }
    addCoach(name);
    setNewCoachName('');
  };

  const handleRemoveClick = (coach: Coach) => {
    const hasDraftedPlayers = players.some((p) => p.draftedBy === coach.id);
    if (hasDraftedPlayers) {
      setPendingRemoval(coach);
    } else {
      removeCoach(coach.id, ResolutionType.Undrafted);
    }
  };

  const handleResolveRemoval = (resolution: ResolutionType) => {
    if (!pendingRemoval) {
      return;
    }
    removeCoach(pendingRemoval.id, resolution);
    setPendingRemoval(null);
  };

  const handleRenameCommit = (id: string) => {
    const name = editNames[id]?.trim();
    if (name) {
      renameCoach(id, name);
    }
    setEditNames((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Select
        size="small"
        value={activeCoachId ?? ''}
        onChange={(e) => setActiveCoach(e.target.value as string)}
        sx={{ minWidth: 160, bgcolor: 'background.paper' }}
      >
        {coaches.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </Select>
      <Tooltip title="Manage coaches">
        <IconButton color="inherit" aria-label="Manage coaches" onClick={() => setManageOpen(true)}>
          <GroupIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Manage coaches</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Draft position sets each coach's slot in the snake draft order, used to auto-advance the active coach and
            predict player availability.
          </Typography>
          <TextField
            label="Total number of coaches"
            helperText="Include drafters you aren't tracking by name — their slots are treated as 'other' picks in the order."
            type="number"
            size="small"
            fullWidth
            value={totalCoachesInput}
            slotProps={{ htmlInput: { min: minTotalCoaches } }}
            onChange={(e) => setTotalCoachesInput(e.target.value)}
            onBlur={handleTotalCoachesCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTotalCoachesCommit();
              }
            }}
            sx={{ mb: 2 }}
          />
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {sortedCoaches.map((c) => (
              <Stack key={c.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Select
                  size="small"
                  value={c.draftPosition}
                  onChange={(e) => setCoachDraftPosition(c.id, Number(e.target.value))}
                  aria-label={`Draft position for ${editNames[c.id] ?? c.name}`}
                  sx={{ minWidth: 88 }}
                >
                  {draftPositionOptions.map((position) => {
                    const holder = coachByPosition.get(position);
                    let label: string;
                    if (holder && holder.id !== c.id) {
                      label = `Pick #${position} (${holder.name})`;
                    } else if (holder) {
                      label = `Pick #${position}`;
                    } else {
                      label = `Pick #${position} (other)`;
                    }
                    return (
                      <MenuItem key={position} value={position}>
                        {label}
                      </MenuItem>
                    );
                  })}
                </Select>
                <TextField
                  size="small"
                  fullWidth
                  value={editNames[c.id] ?? c.name}
                  onChange={(e) =>
                    setEditNames((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleRenameCommit(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameCommit(c.id);
                    }
                  }}
                />
                <Tooltip title={coaches.length <= 1 ? 'At least one coach is required' : 'Remove coach'}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={coaches.length <= 1}
                      onClick={() => handleRemoveClick(c)}
                      aria-label={`Remove ${c.name}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Add a coach
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Coach name"
              value={newCoachName}
              onChange={(e) => setNewCoachName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCoach();
                }
              }}
            />
            <Button variant="contained" onClick={handleAddCoach}>
              Add
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setManageOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingRemoval} onClose={() => setPendingRemoval(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove {pendingRemoval?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This coach has drafted players. What should happen to those picks?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRemoval(null)}>Cancel</Button>
          <Button onClick={() => handleResolveRemoval(ResolutionType.Undrafted)}>Mark undrafted</Button>
          <Button variant="contained" onClick={() => handleResolveRemoval(ResolutionType.Other)}>
            Mark drafted by other
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
