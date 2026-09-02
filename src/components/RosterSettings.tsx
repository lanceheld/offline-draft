import SettingsIcon from '@mui/icons-material/Settings';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { ROSTER_SLOTS, type RosterSlot } from '../@enums/RosterSlot';
import type { RosterLimits } from '../@types/RosterLimits';
import { useAppContext } from '../hooks/useAppContext';

const SLOT_LABELS: Record<RosterSlot, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  FLEX: 'FLEX (WR/RB)',
  TE: 'TE',
  K: 'K',
  DP: 'DP',
  DST: 'DST',
  HC: 'HC',
};

export const RosterSettings = () => {
  const { rosterLimits, setRosterLimits } = useAppContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RosterLimits>(rosterLimits);

  const handleOpen = () => {
    setDraft(rosterLimits);
    setOpen(true);
  };

  const handleChange = (slot: RosterSlot, value: string) => {
    const parsed = Math.trunc(Number(value));
    setDraft((prev) => ({
      ...prev,
      [slot]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  };

  const handleSave = () => {
    setRosterLimits(draft);
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Configure roster">
        <IconButton
          color="inherit"
          aria-label="Configure roster"
          onClick={handleOpen}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Configure roster</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set how many players of each position a roster requires. A FLEX slot
            can be filled by either a WR or an RB.
          </Typography>
          <Stack spacing={2}>
            {ROSTER_SLOTS.map((slot) => (
              <TextField
                key={slot}
                label={SLOT_LABELS[slot]}
                type="number"
                size="small"
                fullWidth
                value={draft[slot]}
                slotProps={{ htmlInput: { min: 0 } }}
                onChange={(e) => handleChange(slot, e.target.value)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
