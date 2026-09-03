import { render, screen } from '@testing-library/react';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { DEFAULT_ROSTER_LIMITS } from '../../@types/RosterLimits';
import { useAppContext } from '../../hooks/useAppContext';
import { DraftProgress } from '../DraftProgress';

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

const makeContext = (overrides: Partial<ReturnType<typeof useAppContext>> = {}) => {
  const coaches: Coach[] = [
    { id: 'c1', name: 'Coach 1', draftPosition: 1 },
    { id: 'c2', name: 'Coach 2', draftPosition: 2 },
  ];
  return {
    loaded: true,
    players: [],
    coaches,
    totalCoaches: 2,
    activeCoachId: 'c1',
    rosterLimits: DEFAULT_ROSTER_LIMITS,
    importPlayers: jest.fn(),
    toggleDraftedByMe: jest.fn(),
    toggleDraftedOther: jest.fn(),
    addCoach: jest.fn(),
    renameCoach: jest.fn(),
    removeCoach: jest.fn(),
    setActiveCoach: jest.fn(),
    setCoachDraftPosition: jest.fn(),
    setTotalCoaches: jest.fn(),
    setRosterLimits: jest.fn(),
    ...overrides,
  };
};

describe('DraftProgress', () => {
  it('shows who is on the clock and the overall pick count', () => {
    mockedUseAppContext.mockReturnValue(makeContext());
    render(<DraftProgress />);

    expect(screen.getByText(/On the clock:/)).toBeInTheDocument();
    expect(screen.getByText('Coach 1')).toBeInTheDocument();
    expect(screen.getByText(/Pick 1 of/)).toBeInTheDocument();
  });

  it("tells the active coach they're on the clock when it's their turn", () => {
    mockedUseAppContext.mockReturnValue(makeContext());
    render(<DraftProgress />);

    expect(screen.getByText("You're on the clock")).toBeInTheDocument();
  });

  it('shows how many picks stand between the active coach and their next turn', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
      }),
    );
    render(<DraftProgress />);

    // After c1's pick, c2 is on the clock; with 2 coaches, c2 also picks
    // first in the reversed round 2 (the snake "turn"), so c1's next pick
    // isn't until overall pick #4.
    expect(screen.getByText(/Your next pick:/)).toBeInTheDocument();
    expect(screen.getByText(/2 picks away/)).toBeInTheDocument();
  });

  it('shows a draft-complete message once every pick has been made', () => {
    const rosterSize = Object.values(DEFAULT_ROSTER_LIMITS).reduce((a, b) => a + b, 0);
    const players = Array.from({ length: 2 * rosterSize }, (_, i): Player =>
      makePlayer({ id: `p${i}`, draftedOther: true }),
    );
    mockedUseAppContext.mockReturnValue(makeContext({ players }));
    render(<DraftProgress />);

    expect(screen.getByText('Draft complete')).toBeInTheDocument();
    expect(screen.queryByText(/On the clock:/)).not.toBeInTheDocument();
  });

  it('shows an untracked "other" team when the current pick is not a tracked coach', () => {
    mockedUseAppContext.mockReturnValue(
      makeContext({
        coaches: [{ id: 'c1', name: 'Coach 1', draftPosition: 1 }],
        totalCoaches: 2,
        // c1 (position 1) already picked, so position 2 — untracked — is on the clock.
        players: [makePlayer({ id: 'p1', draftedBy: 'c1' })],
      }),
    );
    render(<DraftProgress />);

    expect(screen.getByText(/Another team \(untracked\)/)).toBeInTheDocument();
  });

  it('renders nothing when there are no coaches', () => {
    mockedUseAppContext.mockReturnValue(makeContext({ coaches: [] }));
    const { container } = render(<DraftProgress />);

    expect(container).toBeEmptyDOMElement();
  });
});
