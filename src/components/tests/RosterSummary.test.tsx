import { render, screen } from '@testing-library/react';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { useAppContext } from '../../hooks/useAppContext';
import { RosterSummary } from '../RosterSummary';

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
  const coaches: Coach[] = [{ id: 'c1', name: 'Coach 1' }];
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

describe('RosterSummary', () => {
  it("shows the active coach's name in the title", () => {
    mockedUseAppContext.mockReturnValue(makeContext());
    render(<RosterSummary />);

    expect(screen.getByText('Coach 1')).toBeInTheDocument();
  });

  it('only counts players drafted by the active coach', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', draftedBy: 'c1' }),
          makePlayer({
            id: 'p2',
            name: 'Other Team QB',
            draftedBy: 'someone-else',
          }),
          makePlayer({
            id: 'p3',
            name: 'Undrafted WR',
            position: 'WR',
            draftedBy: null,
          }),
        ],
      }),
    );
    render(<RosterSummary />);

    expect(screen.getByText('Josh Allen (BUF)')).toBeInTheDocument();
    expect(screen.queryByText('Other Team QB (BUF)')).not.toBeInTheDocument();
    expect(screen.queryByText('Undrafted WR (BUF)')).not.toBeInTheDocument();
  });

  it('groups drafted players by position and shows counts against the roster limit', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [
          makePlayer({ id: 'p1', position: 'QB', draftedBy: 'c1' }),
          makePlayer({
            id: 'p2',
            name: 'Another QB',
            position: 'QB',
            draftedBy: 'c1',
          }),
        ],
      }),
    );
    render(<RosterSummary />);

    // QB limit is 2, so this position should read "2 / 2"
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    // Total roster progress bar reflects the 2 drafted players
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow');
  });

  it('shows the bye week for each drafted player', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1', bye: 9 })],
      }),
    );
    render(<RosterSummary />);

    expect(screen.getByText('Bye 9')).toBeInTheDocument();
  });
});
