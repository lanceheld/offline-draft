import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

interface NameFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export const NameFilter = ({ value, onChange }: NameFilterProps) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  const isActive = value.trim().length > 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuItemClick = () => {
    setFilterAnchor(menuAnchor);
    setMenuAnchor(null);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        aria-label="Open name filter menu"
      >
        <MoreVertIcon
          fontSize="small"
          color={isActive ? 'primary' : 'inherit'}
        />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleFilterMenuItemClick}>
          <ListItemIcon>
            <FilterAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter</ListItemText>
        </MenuItem>
      </Menu>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 220 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">Filter by name</Typography>
            <Button
              size="small"
              onClick={() => onChange('')}
              disabled={value.length === 0}
            >
              Clear
            </Button>
          </Stack>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Search names..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </Box>
      </Popover>
    </>
  );
};
