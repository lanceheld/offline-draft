import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Coach } from '../../@types/Coach';
import { useAppContext } from '../../hooks/useAppContext';
import { CoachManager } from '../CoachManager';

jest.mock('../../hooks/useAppContext');

const mockedUseAppContext = useAppContext as jest.Mock;

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
    importPlayers: jest.fn(),
    toggleDraftedByMe: jest.fn(),
    toggleDraftedOther: jest.fn(),
    addCoach: jest.fn(),
    renameCoach: jest.fn(),
    removeCoach: jest.fn(),
    setActiveCoach: jest.fn(),
    setCoachDraftPosition: jest.fn(),
    setTotalCoaches: jest.fn(),
    ...overrides,
  };
};

describe('CoachManager', () => {
  it('lists all coaches in the active-coach select', () => {
    mockedUseAppContext.mockReturnValue(makeContext());
    render(<CoachManager />);

    expect(screen.getByText('Coach 1')).toBeInTheDocument();
  });

  it('calls setActiveCoach when a different coach is selected', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Coach 2' }));

    expect(ctx.setActiveCoach).toHaveBeenCalledWith('c2');
  });

  it('opens the manage dialog and adds a new coach', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByPlaceholderText('Coach name'), 'Coach 3');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(ctx.addCoach).toHaveBeenCalledWith('Coach 3');
  });

  it('does not add a coach when the name is blank', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(ctx.addCoach).not.toHaveBeenCalled();
  });

  it('renames a coach when the name field is blurred', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');
    const nameField = within(dialog).getByDisplayValue('Coach 1');

    await user.clear(nameField);
    await user.type(nameField, 'Head Coach');
    await user.tab();

    expect(ctx.renameCoach).toHaveBeenCalledWith('c1', 'Head Coach');
  });

  it('calls setCoachDraftPosition when a coach draft position is changed', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: 'Draft position for Coach 1' }));
    await user.click(await screen.findByRole('option', { name: 'Pick #2 (Coach 2)' }));

    expect(ctx.setCoachDraftPosition).toHaveBeenCalledWith('c1', 2);
  });

  it('calls setTotalCoaches when the total number of coaches is changed', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const totalCoachesField = within(dialog).getByLabelText('Total number of coaches');
    fireEvent.change(totalCoachesField, { target: { value: '5' } });
    fireEvent.blur(totalCoachesField);

    expect(ctx.setTotalCoaches).toHaveBeenCalledWith(5);
  });

  it('allows typing a multi-digit total that would be clamped mid-edit', async () => {
    const ctx = makeContext({
      coaches: [{ id: 'c1', name: 'Coach 1', draftPosition: 7 }],
      totalCoaches: 7,
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const totalCoachesField = within(dialog).getByLabelText('Total number of coaches');
    fireEvent.change(totalCoachesField, { target: { value: '1' } });
    expect(totalCoachesField).toHaveValue(1);
    fireEvent.change(totalCoachesField, { target: { value: '10' } });
    expect(totalCoachesField).toHaveValue(10);
    expect(ctx.setTotalCoaches).not.toHaveBeenCalled();

    fireEvent.blur(totalCoachesField);
    expect(ctx.setTotalCoaches).toHaveBeenCalledWith(10);
  });

  it('sets the total-coaches minimum from the highest tracked draft position, not the coach count', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      coaches: [
        { id: 'c1', name: 'Coach 1', draftPosition: 1 },
        { id: 'c2', name: 'Coach 2', draftPosition: 7 },
      ],
      totalCoaches: 7,
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const totalCoachesField = within(dialog).getByLabelText('Total number of coaches');
    expect(totalCoachesField).toHaveAttribute('min', '7');
  });

  it('labels a draft slot not held by any tracked coach as "other"', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      coaches: [{ id: 'c1', name: 'Coach 1', draftPosition: 1 }],
      totalCoaches: 3,
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: 'Draft position for Coach 1' }));

    expect(await screen.findByRole('option', { name: 'Pick #2 (other)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pick #3 (other)' })).toBeInTheDocument();
  });

  it('lists coaches in draft-position order in the manage dialog', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      coaches: [
        { id: 'c1', name: 'Coach 1', draftPosition: 2 },
        { id: 'c2', name: 'Coach 2', draftPosition: 1 },
      ],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const nameFields = within(dialog).getAllByDisplayValue(/Coach [12]/);
    expect(nameFields.map((el) => (el as HTMLInputElement).value)).toEqual(['Coach 2', 'Coach 1']);
  });

  it('disables removal when only one coach remains', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      coaches: [{ id: 'c1', name: 'Coach 1', draftPosition: 1 }],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const deleteButtons = within(dialog).getAllByRole('button');
    const trashButton = deleteButtons.find((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    expect(trashButton).toBeDisabled();
  });

  it('removes a coach directly when it has no drafted players', async () => {
    const user = userEvent.setup();
    const ctx = makeContext();
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const dialog = await screen.findByRole('dialog');

    const deleteButtons = within(dialog)
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    await user.click(deleteButtons[0]);

    expect(ctx.removeCoach).toHaveBeenCalledWith('c1', 'undrafted');
  });

  it('asks how to resolve drafted players before removing a coach that has them', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      players: [
        {
          id: 'p1',
          rank: 1,
          position: 'QB',
          name: 'Josh Allen',
          team: 'BUF',
          bye: 12,
          draftedBy: 'c1',
          draftedOther: false,
        },
      ],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const manageDialog = await screen.findByRole('dialog');
    const deleteButtons = within(manageDialog)
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    await user.click(deleteButtons[0]);

    const confirmDialog = await screen.findByRole('dialog', {
      name: /Remove Coach 1/,
    });
    expect(ctx.removeCoach).not.toHaveBeenCalled();

    await user.click(
      within(confirmDialog).getByRole('button', {
        name: 'Mark drafted by other',
      }),
    );

    expect(ctx.removeCoach).toHaveBeenCalledWith('c1', 'other');
  });

  it("can resolve a pending removal by marking that coach's players undrafted", async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      players: [
        {
          id: 'p1',
          rank: 1,
          position: 'QB',
          name: 'Josh Allen',
          team: 'BUF',
          bye: 12,
          draftedBy: 'c1',
          draftedOther: false,
        },
      ],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const manageDialog = await screen.findByRole('dialog');
    const deleteButtons = within(manageDialog)
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    await user.click(deleteButtons[0]);

    const confirmDialog = await screen.findByRole('dialog', {
      name: /Remove Coach 1/,
    });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Mark undrafted' }));

    expect(ctx.removeCoach).toHaveBeenCalledWith('c1', 'undrafted');
  });

  it('does not remove a coach when the pending-removal dialog is cancelled', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({
      players: [
        {
          id: 'p1',
          rank: 1,
          position: 'QB',
          name: 'Josh Allen',
          team: 'BUF',
          bye: 12,
          draftedBy: 'c1',
          draftedOther: false,
        },
      ],
    });
    mockedUseAppContext.mockReturnValue(ctx);
    render(<CoachManager />);

    await user.click(screen.getByRole('button', { name: 'Manage coaches' }));
    const manageDialog = await screen.findByRole('dialog');
    const deleteButtons = within(manageDialog)
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    await user.click(deleteButtons[0]);

    const confirmDialog = await screen.findByRole('dialog', {
      name: /Remove Coach 1/,
    });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Cancel' }));

    expect(ctx.removeCoach).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /Remove Coach 1/ })).not.toBeInTheDocument();
  });
});
