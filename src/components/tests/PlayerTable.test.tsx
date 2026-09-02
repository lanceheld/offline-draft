import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { useAppContext } from '../../hooks/useAppContext';
import { PlayerTable } from '../PlayerTable';

jest.mock('../../hooks/useAppContext');

const mockedUseAppContext = useAppContext as jest.Mock;

const makePlayer = (overrides: Partial<Player> = {}): Player => {
  return {
    id: 'p1',
    rank: 1,
    position: 'QB',
    name: 'Josh Allen',
    team: 'BUF',
    bye: 12,
    draftedBy: null,
    draftedOther: false,
    ...overrides,
  };
};

const makeContext = (
  overrides: Partial<ReturnType<typeof useAppContext>> = {},
) => {
  const coaches: Coach[] = [
    { id: 'c1', name: 'Coach 1' },
    { id: 'c2', name: 'Coach 2' },
  ];
  return {
    loaded: true,
    players: [],
    coaches,
    activeCoachId: 'c1',
    importPlayers: jest.fn(),
    toggleDraftedByMe: jest.fn(),
    toggleDraftedOther: jest.fn(),
    addCoach: jest.fn(),
    renameCoach: jest.fn(),
    removeCoach: jest.fn(),
    setActiveCoach: jest.fn(),
    ...overrides,
  };
};

const rowNames = () => {
  // hidden: true because an open MUI Popover marks the rest of the page aria-hidden
  const rows = screen.getAllByRole('row', { hidden: true }).slice(1); // drop header row
  return rows.map(
    (row) => within(row).getAllByRole('cell', { hidden: true })[2].textContent,
  );
};

describe('PlayerTable', () => {
  it('shows an empty state when there are no players', () => {
    mockedUseAppContext.mockReturnValue(makeContext({ players: [] }));
    render(<PlayerTable />);

    expect(
      screen.getByText('No players loaded yet. Upload a CSV to get started.'),
    ).toBeInTheDocument();
  });

  it('renders a row per player sorted by rank ascending by default', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Second', rank: 2 }),
          makePlayer({ id: 'p2', name: 'First', rank: 1 }),
        ],
      }),
    );
    render(<PlayerTable />);

    expect(rowNames()).toEqual(['First', 'Second']);
  });

  it('toggles sort direction when clicking the same column header twice', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Second', rank: 2 }),
          makePlayer({ id: 'p2', name: 'First', rank: 1 }),
        ],
      }),
    );
    render(<PlayerTable />);

    await user.click(screen.getByRole('button', { name: 'Rank' }));

    expect(rowNames()).toEqual(['Second', 'First']);
  });

  it('sorts by a different column when its header is clicked', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Zed', rank: 1 }),
          makePlayer({ id: 'p2', name: 'Ann', rank: 2 }),
        ],
      }),
    );
    render(<PlayerTable />);

    await user.click(screen.getByRole('button', { name: 'Name' }));

    expect(rowNames()).toEqual(['Ann', 'Zed']);
  });

  it('filters players by name', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Josh Allen' }),
          makePlayer({ id: 'p2', name: 'Patrick Mahomes' }),
        ],
      }),
    );
    render(<PlayerTable />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
    await user.click(
      within(nameHeader).getByRole('button', { name: 'Open name filter menu' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));
    const input = await screen.findByPlaceholderText('Search names...');
    await user.type(input, 'josh');

    expect(rowNames()).toEqual(['Josh Allen']);
  });

  it('filters players by position', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Josh Allen', position: 'QB' }),
          makePlayer({ id: 'p2', name: 'Bijan Robinson', position: 'RB' }),
        ],
      }),
    );
    render(<PlayerTable />);

    const positionHeader = screen.getByRole('columnheader', {
      name: /Position/,
    });
    await user.click(
      within(positionHeader).getByRole('button', {
        name: 'Open position filter menu',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'RB' }));

    expect(rowNames()).toEqual(['Bijan Robinson']);
  });

  it('checks the "Mine" checkbox for a player drafted by the active coach and calls toggleDraftedByMe', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<PlayerTable />);

    const row = screen.getAllByRole('row')[1];
    const mineCheckbox = within(row).getAllByRole('checkbox')[0];
    expect(mineCheckbox).toBeChecked();

    await user.click(mineCheckbox);
    expect(ctx.toggleDraftedByMe).toHaveBeenCalledWith('p1', false);
  });

  it('disables the "Mine" checkbox and checks "Other" when drafted by another coach', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({ players: [makePlayer({ id: 'p1', draftedBy: 'c2' })] }),
    );
    render(<PlayerTable />);

    const row = screen.getAllByRole('row')[1];
    const [mineCheckbox, otherCheckbox] = within(row).getAllByRole('checkbox');
    expect(mineCheckbox).toBeDisabled();
    expect(otherCheckbox).toBeChecked();
    expect(otherCheckbox).toBeDisabled();
    expect(within(row).getByText(/drafted by Coach 2/)).toBeInTheDocument();
  });

  it('calls toggleDraftedOther when the "Other" checkbox is toggled for an undrafted player', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [makePlayer({ id: 'p1' })] });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<PlayerTable />);

    const row = screen.getAllByRole('row')[1];
    const otherCheckbox = within(row).getAllByRole('checkbox')[1];
    await user.click(otherCheckbox);

    expect(ctx.toggleDraftedOther).toHaveBeenCalledWith('p1', true);
  });

  it('flags a bye-week clash for an undrafted player at the same position and bye as one already on the roster', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({
            id: 'p1',
            name: 'Josh Allen',
            position: 'QB',
            bye: 12,
            draftedBy: 'c1',
          }),
          makePlayer({
            id: 'p2',
            name: 'Lamar Jackson',
            position: 'QB',
            bye: 12,
            team: 'BAL',
          }),
        ],
      }),
    );
    render(<PlayerTable />);

    const row = screen.getAllByRole('row')[2];
    expect(
      within(row).getByLabelText(/already have a QB on bye week 12/),
    ).toBeInTheDocument();
  });

  it('flags a team clash for an undrafted player at the same position and team as one already on the roster', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({
            id: 'p1',
            name: 'Josh Allen',
            position: 'QB',
            team: 'BUF',
            draftedBy: 'c1',
          }),
          makePlayer({
            id: 'p2',
            name: 'Backup QB',
            position: 'QB',
            team: 'BUF',
            bye: 5,
          }),
        ],
      }),
    );
    render(<PlayerTable />);

    const row = screen.getAllByRole('row')[2];
    expect(
      within(row).getByLabelText(/already have a QB on BUF/),
    ).toBeInTheDocument();
  });

  it('shows the count of visible vs total players', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', name: 'Josh Allen', position: 'QB' }),
          makePlayer({ id: 'p2', name: 'Bijan Robinson', position: 'RB' }),
        ],
      }),
    );
    render(<PlayerTable />);

    expect(screen.getByText('2 of 2 players')).toBeInTheDocument();

    const positionHeader = screen.getByRole('columnheader', {
      name: /Position/,
    });
    await user.click(
      within(positionHeader).getByRole('button', {
        name: 'Open position filter menu',
      }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'RB' }));

    expect(screen.getByText('1 of 2 players')).toBeInTheDocument();
  });
});
