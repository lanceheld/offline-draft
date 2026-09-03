import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useRef, useState } from 'react';
import { parsePlayersCsv } from '../csv';
import { useAppContext } from '../hooks/useAppContext';
import type { Player } from '../@types/Player';

export const CsvUploader = () => {
  const { players, importPlayers } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingPlayers, setPendingPlayers] = useState<Player[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noRowsImported, setNoRowsImported] = useState(false);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    const text = await file.text();
    const result = parsePlayersCsv(text);
    setErrors(result.errors);
    setNoRowsImported(result.players.length === 0);
    if (result.players.length === 0) {
      return;
    }
    setPendingPlayers(result.players);
    if (players.length > 0) {
      setConfirmOpen(true);
    } else {
      importPlayers(result.players);
      setPendingPlayers(null);
    }
  };

  const confirmImport = () => {
    if (pendingPlayers) {
      importPlayers(pendingPlayers);
    }
    setPendingPlayers(null);
    setConfirmOpen(false);
  };

  const cancelImport = () => {
    setPendingPlayers(null);
    setConfirmOpen(false);
    setErrors([]);
    setNoRowsImported(false);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange} />
      <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handleButtonClick} color="primary">
        Upload CSV
      </Button>

      <Dialog open={confirmOpen} onClose={cancelImport}>
        <DialogTitle>Replace existing player data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Uploading this CSV will replace all {players.length} existing {players.length === 1 ? 'player' : 'players'}{' '}
            and clear all draft status for every coach. This cannot be undone. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelImport}>Cancel</Button>
          <Button onClick={confirmImport} color="error" variant="contained">
            Replace
          </Button>
        </DialogActions>
      </Dialog>

      {errors.length > 0 && !confirmOpen && (
        <Dialog open onClose={() => setErrors([])} maxWidth="sm" fullWidth>
          <DialogTitle>CSV parsing issues</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {errors.length} row(s) could not be imported.{' '}
              {noRowsImported ? 'No rows were imported.' : 'Valid rows were still imported.'}
            </Alert>
            <List dense>
              {errors.slice(0, 50).map((err) => (
                <ListItem key={err}>
                  <ListItemText primary={err} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrors([])}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};
