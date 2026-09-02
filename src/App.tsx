import { AppBar, Box, Container, Grid, Toolbar, Typography } from '@mui/material';
import { CoachManager } from './components/CoachManager';
import { CsvUploader } from './components/CsvUploader';
import { DraftProgress } from './components/DraftProgress';
import { PlayerTable } from './components/PlayerTable';
import { RosterSettings } from './components/RosterSettings';
import { RosterSummary } from './components/RosterSummary';
import { useAppContext } from './hooks/useAppContext';

const AppShell = () => {
  const { loaded } = useAppContext();

  if (!loaded) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Offline Draft Tracker
          </Typography>
          <CsvUploader />
          <RosterSettings />
          <CoachManager />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 9 }}>
            <PlayerTable />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DraftProgress />
            <RosterSummary />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AppShell;
