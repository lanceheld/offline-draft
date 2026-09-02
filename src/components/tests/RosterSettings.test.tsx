import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ROSTER_LIMITS } from '../../@types/RosterLimits';
import { useAppContext } from '../../hooks/useAppContext';
import { RosterSettings } from '../RosterSettings';

jest.mock('../../hooks/useAppContext');

const mockedUseAppContext = useAppContext as jest.Mock;

const makeContext = (overrides: Partial<ReturnType<typeof useAppContext>> = {}) => {
  return {
    loaded: true,
    players: [],
    coaches: [],
    activeCoachId: null,
    rosterLimits: DEFAULT_ROSTER_LIMITS,
    importPlayers: jest.fn(),
    toggleDraftedByMe: jest.fn(),
    toggleDraftedOther: jest.fn(),
    addCoach: jest.fn(),
    renameCoach: jest.fn(),
    removeCoach: jest.fn(),
    setActiveCoach: jest.fn(),
    setRosterLimits: jest.fn(),
    ...overrides,
  };
};

describe('RosterSettings', () => {
  it('opens a dialog with a field for every roster slot, including FLEX', async () => {
    const user = userEvent.setup();
    mockedUseAppContext.mockReturnValue(makeContext());
    render(<RosterSettings />);

    await user.click(screen.getByLabelText('Configure roster'));

    expect(screen.getByRole('spinbutton', { name: 'FLEX (WR/RB)' })).toHaveValue(DEFAULT_ROSTER_LIMITS.FLEX);
    expect(screen.getByRole('spinbutton', { name: 'RB' })).toHaveValue(DEFAULT_ROSTER_LIMITS.RB);
  });

  it('saves edited limits and closes the dialog', async () => {
    const user = userEvent.setup();
    const setRosterLimits = jest.fn();
    mockedUseAppContext.mockReturnValue(makeContext({ setRosterLimits }));
    render(<RosterSettings />);

    await user.click(screen.getByLabelText('Configure roster'));
    const flexField = screen.getByRole('spinbutton', { name: 'FLEX (WR/RB)' });
    await user.clear(flexField);
    await user.type(flexField, '2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(setRosterLimits).toHaveBeenCalledWith({
      ...DEFAULT_ROSTER_LIMITS,
      FLEX: 2,
    });
    await waitFor(() => expect(screen.queryByRole('spinbutton', { name: 'FLEX (WR/RB)' })).not.toBeInTheDocument());
  });

  it('truncates a fractional value before saving', async () => {
    const user = userEvent.setup();
    const setRosterLimits = jest.fn();
    mockedUseAppContext.mockReturnValue(makeContext({ setRosterLimits }));
    render(<RosterSettings />);

    await user.click(screen.getByLabelText('Configure roster'));
    const flexField = screen.getByRole('spinbutton', { name: 'FLEX (WR/RB)' });
    await user.clear(flexField);
    await user.type(flexField, '2.7');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(setRosterLimits).toHaveBeenCalledWith({
      ...DEFAULT_ROSTER_LIMITS,
      FLEX: 2,
    });
  });

  it('evaluates numeric expressions like scientific notation rather than stopping at the first non-digit', async () => {
    const user = userEvent.setup();
    const setRosterLimits = jest.fn();
    mockedUseAppContext.mockReturnValue(makeContext({ setRosterLimits }));
    render(<RosterSettings />);

    await user.click(screen.getByLabelText('Configure roster'));
    const flexField = screen.getByRole('spinbutton', { name: 'FLEX (WR/RB)' });
    fireEvent.change(flexField, { target: { value: '2e1' } });
    expect(flexField).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(setRosterLimits).toHaveBeenCalledWith({
      ...DEFAULT_ROSTER_LIMITS,
      FLEX: 20,
    });
  });

  it('discards edits when cancelled', async () => {
    const user = userEvent.setup();
    const setRosterLimits = jest.fn();
    mockedUseAppContext.mockReturnValue(makeContext({ setRosterLimits }));
    render(<RosterSettings />);

    await user.click(screen.getByLabelText('Configure roster'));
    const flexField = screen.getByRole('spinbutton', { name: 'FLEX (WR/RB)' });
    await user.clear(flexField);
    await user.type(flexField, '3');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(setRosterLimits).not.toHaveBeenCalled();
  });
});
