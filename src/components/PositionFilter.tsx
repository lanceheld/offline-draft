import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { POSITIONS, type Position } from '../@enums/Position';

interface PositionFilterProps {
  readonly value: Position[];
  readonly onChange: (value: Position[]) => void;
}

export const PositionFilter = ({ value, onChange }: PositionFilterProps) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  const isActive = value.length > 0 && value.length < POSITIONS.length;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuItemClick = () => {
    setFilterAnchor(menuAnchor);
    setMenuAnchor(null);
  };

  const togglePosition = (pos: Position) => {
    if (value.includes(pos)) {
      onChange(value.filter((p) => p !== pos));
    } else {
      onChange([...value, pos]);
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        aria-label="Open position filter menu"
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
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">Filter by position</Typography>
            <Button
              size="small"
              onClick={() => onChange([])}
              disabled={value.length === 0}
            >
              Clear
            </Button>
          </Stack>
          <FormGroup>
            {POSITIONS.map((pos) => (
              <FormControlLabel
                key={pos}
                control={
                  <Checkbox
                    size="small"
                    checked={value.includes(pos)}
                    onChange={() => togglePosition(pos)}
                  />
                }
                label={pos}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>
    </>
  );
};
