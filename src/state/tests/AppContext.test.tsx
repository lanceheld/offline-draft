import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as db from '../../db';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { DEFAULT_ROSTER_LIMITS } from '../../@types/RosterLimits';
import { AppProvider } from '../AppContext';
import { useAppContext } from '../../hooks/useAppContext';

jest.mock('../../db');

const mockedDb = db as jest.Mocked<typeof db>;

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

const makeCoach = (overrides: Partial<Coach> = {}): Coach => {
  return { id: 'c1', name: 'Coach 1', draftPosition: 1, ...overrides };
};

const Probe = () => {
  const ctx = useAppContext();
  if (!ctx.loaded) {
    return <div>loading</div>;
  }
  return (
    <div>
      <div data-testid="active-coach">{ctx.activeCoachId}</div>
      <div data-testid="coach-count">{ctx.coaches.length}</div>
      <div data-testid="total-coaches">{ctx.totalCoaches}</div>
      <div data-testid="rb-limit">{ctx.rosterLimits.RB}</div>
      <div data-testid="flex-limit">{ctx.rosterLimits.FLEX}</div>
      <ul>
        {ctx.players.map((p) => (
          <li key={p.id} data-testid={`player-${p.id}`}>
            {p.name}:{p.draftedBy ?? 'undrafted'}:{String(p.draftedOther)}
          </li>
        ))}
      </ul>
      <ul>
        {ctx.coaches.map((c) => (
          <li key={c.id} data-testid={`coach-position-${c.id}`}>
            {c.draftPosition}
          </li>
        ))}
      </ul>
      <button onClick={() => ctx.toggleDraftedByMe('p1', true)}>draft mine</button>
      <button onClick={() => ctx.toggleDraftedByMe('p1', false)}>undraft mine</button>
      <button onClick={() => ctx.toggleDraftedOther('p1', true)}>draft other</button>
      <button onClick={() => ctx.toggleDraftedOther('p2', true)}>draft p2 other</button>
      <button onClick={() => ctx.addCoach('New Coach')}>add coach</button>
      <button onClick={() => ctx.setCoachDraftPosition('c2', 1)}>make c2 pick first</button>
      <button onClick={() => ctx.setTotalCoaches(10)}>set total coaches to 10</button>
      <button onClick={() => ctx.setTotalCoaches(0)}>set total coaches to 0</button>
      <button onClick={() => ctx.setTotalCoaches(2.5)}>set total coaches to 2.5</button>
      <button onClick={() => ctx.removeCoach(ctx.activeCoachId ?? '', 'undrafted')}>
        remove active coach (undrafted)
      </button>
      <button onClick={() => ctx.removeCoach(ctx.activeCoachId ?? '', 'other')}>remove active coach (other)</button>
      <button onClick={() => ctx.setActiveCoach('c2')}>switch to c2</button>
      <button onClick={() => ctx.setRosterLimits({ ...ctx.rosterLimits, RB: 3, FLEX: 2 })}>update roster limits</button>
    </div>
  );
};

describe('AppProvider / useAppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.saveCoaches.mockResolvedValue(undefined);
    mockedDb.savePlayer.mockResolvedValue(undefined);
    mockedDb.savePlayers.mockResolvedValue(undefined);
    mockedDb.saveMeta.mockResolvedValue(undefined);
    mockedDb.deleteMeta.mockResolvedValue(undefined);
    mockedDb.replaceAllPlayers.mockResolvedValue(undefined);
  });

  it('hydrates from the database on mount', async () => {
    mockedDb.loadPlayers.mockResolvedValue([makePlayer()]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach()]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));
    expect(screen.getByTestId('coach-count')).toHaveTextContent('1');
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:false');
  });

  it('creates a default coach when none exist', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([]);
    mockedDb.loadMeta.mockResolvedValue(undefined);

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('coach-count')).toHaveTextContent('1'));
    expect(mockedDb.saveCoaches).toHaveBeenCalledWith([expect.objectContaining({ name: 'Coach 1' })]);
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', expect.any(String));
  });

  it('falls back to the first coach when the stored active coach id is unknown, and persists the correction', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('missing-coach-id');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', 'c1');
  });

  it('toggleDraftedByMe sets and clears draftedBy for the active coach, and persists it', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer()]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('draft mine'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:c1:false');
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', draftedBy: 'c1' }));

    await user.click(screen.getByText('undraft mine'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:false');
  });

  it('toggleDraftedOther marks a player drafted by someone else and persists it', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer()]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('draft other'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:true');
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', draftedOther: true }));
  });

  it('marking a player drafted by me clears a previously set draftedOther flag', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedOther: true })]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:true');

    await user.click(screen.getByText('draft mine'));

    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:c1:false');
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        draftedBy: 'c1',
        draftedOther: false,
      }),
    );
  });

  it('marking a player drafted by someone else clears a previously set draftedBy coach', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedBy: 'c1' })]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:c1:false');

    await user.click(screen.getByText('draft other'));

    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:true');
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        draftedOther: true,
        draftedBy: null,
      }),
    );
  });

  it('addCoach appends a new coach without changing the active coach when one is already set', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('coach-count')).toHaveTextContent('1'));

    await user.click(screen.getByText('add coach'));

    await waitFor(() => expect(screen.getByTestId('coach-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('active-coach')).toHaveTextContent('c1');
  });

  it('removeCoach clears draftedBy for that coach and falls back active coach to another one', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedBy: 'c1' })]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1' }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('remove active coach (undrafted)'));

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c2'));
    expect(screen.getByTestId('coach-count')).toHaveTextContent('1');
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:false');
    expect(mockedDb.savePlayers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'p1',
        draftedBy: null,
        draftedOther: false,
      }),
    ]);
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', 'c2');
  });

  it("removeCoach can mark that coach's players as drafted by other instead", async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedBy: 'c1' })]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1' }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('remove active coach (other)'));

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c2'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent('Josh Allen:undrafted:true');
    expect(mockedDb.savePlayers).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'p1',
        draftedBy: null,
        draftedOther: true,
      }),
    ]);
  });

  it('removeCoach deletes the persisted active coach id when no coach remains to fall back to', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('remove active coach (undrafted)'));

    await waitFor(() => expect(screen.getByTestId('coach-count')).toHaveTextContent('0'));
    expect(mockedDb.deleteMeta).toHaveBeenCalledWith('activeCoachId');
    expect(mockedDb.saveMeta).not.toHaveBeenCalled();
  });

  it('setActiveCoach updates the active coach and persists it', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1' }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('switch to c2'));

    expect(screen.getByTestId('active-coach')).toHaveTextContent('c2');
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', 'c2');
  });

  it('hydrates roster limits stored in meta, falling back to defaults for unknown keys', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify({ RB: 7 });
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('rb-limit')).toHaveTextContent('7'));
    expect(screen.getByTestId('flex-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.FLEX));
  });

  it('falls back to default roster limits when stored meta is malformed', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return 'not-json';
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB)));
  });

  it('falls back to default roster limits when stored meta parses to a non-object', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return 'null';
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB)));
  });

  it('falls back to default roster limits when stored meta parses to an array', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify([1, 2, 3]);
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB)));
  });

  it('ignores non-numeric roster limit values and keeps the default for that slot', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify({ RB: 'oops', FLEX: 3 });
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('flex-limit')).toHaveTextContent('3'));
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB));
  });

  it('ignores negative and non-finite roster limit values, keeping the default for that slot', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify({ RB: -1, FLEX: 4 });
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('flex-limit')).toHaveTextContent('4'));
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB));
  });

  it('ignores non-integer roster limit values, keeping the default for that slot', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify({ RB: 2.5, FLEX: 4 });
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('flex-limit')).toHaveTextContent('4'));
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(String(DEFAULT_ROSTER_LIMITS.RB));
  });

  it('ignores unknown keys in stored roster limits', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'rosterLimits') {
        return JSON.stringify({ RB: 4, NOT_A_SLOT: 99 });
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('rb-limit')).toHaveTextContent('4'));
  });

  it('setRosterLimits updates state and persists the new limits', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    await user.click(screen.getByText('update roster limits'));

    expect(screen.getByTestId('rb-limit')).toHaveTextContent('3');
    expect(screen.getByTestId('flex-limit')).toHaveTextContent('2');
    expect(mockedDb.saveMeta).toHaveBeenCalledWith(
      'rosterLimits',
      JSON.stringify({ ...DEFAULT_ROSTER_LIMITS, RB: 3, FLEX: 2 }),
    );
  });

  it('setCoachDraftPosition swaps positions with whoever currently holds the target slot', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('coach-position-c1')).toHaveTextContent('1'));

    await user.click(screen.getByText('make c2 pick first'));

    expect(screen.getByTestId('coach-position-c2')).toHaveTextContent('1');
    expect(screen.getByTestId('coach-position-c1')).toHaveTextContent('2');
  });

  it('does not retroactively switch the active coach for picks made before this session started', async () => {
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedBy: 'c1' })]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('coach-count')).toHaveTextContent('2'));
    // Even though p1 is already drafted (so c2 is technically on the clock
    // for the next pick), loading the app shouldn't yank the active coach.
    expect(screen.getByTestId('active-coach')).toHaveTextContent('c1');
  });

  it('auto-advances the active coach to whoever is on the clock after a new pick is recorded', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', name: 'Bijan Robinson', rank: 2 }),
    ]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
      makeCoach({ id: 'c3', name: 'Coach 3', draftPosition: 3 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    // Pick 1 (index 0) goes to c1; the next pick on the clock is c2.
    await user.click(screen.getByText('draft mine'));

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c2'));
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', 'c2');

    // Pick 2 (index 1) goes to whoever else drafted p2; the next pick is c3.
    await user.click(screen.getByText('draft p2 other'));

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c3'));
  });

  it('setTotalCoaches expands the league size to account for untracked coaches, and persists it', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('1'));

    await user.click(screen.getByText('set total coaches to 10'));

    expect(screen.getByTestId('total-coaches')).toHaveTextContent('10');
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('totalCoaches', '10');
  });

  it('never lets the league size drop below the number of tracked coaches', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('2'));

    await user.click(screen.getByText('set total coaches to 0'));

    expect(screen.getByTestId('total-coaches')).toHaveTextContent('2');
  });

  it('never lets the league size drop below the highest tracked draft position, even with gaps', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 7 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('7'));

    await user.click(screen.getByText('set total coaches to 0'));

    expect(screen.getByTestId('total-coaches')).toHaveTextContent('7');
  });

  it('ignores a non-integer setTotalCoaches value and falls back to the current minimum', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 2 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('2'));

    await user.click(screen.getByText('set total coaches to 2.5'));

    expect(screen.getByTestId('total-coaches')).toHaveTextContent('2');
  });

  it('hydrates the league size to at least the highest tracked draft position, even with gaps', async () => {
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c2', name: 'Coach 2', draftPosition: 7 }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('7'));
  });

  it('expands the league size automatically once addCoach fills every existing slot', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('1'));

    await user.click(screen.getByText('add coach'));

    await waitFor(() => expect(screen.getByTestId('total-coaches')).toHaveTextContent('2'));
  });

  it('jumps ahead over an untracked "other" draft slot to the next tracked coach', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([
      makePlayer({ id: 'p1' }),
      makePlayer({ id: 'p2', name: 'Bijan Robinson', rank: 2 }),
    ]);
    // A 3-team league where only positions 1 and 3 are tracked coaches;
    // position 2 belongs to an untracked "other" drafter.
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1', draftPosition: 1 }),
      makeCoach({ id: 'c3', name: 'Coach 3', draftPosition: 3 }),
    ]);
    mockedDb.loadMeta.mockImplementation(async (key: string) => {
      if (key === 'activeCoachId') {
        return 'c1';
      }
      if (key === 'totalCoaches') {
        return '3';
      }
      return undefined;
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'));

    // Pick 1 (index 0) goes to c1. The next pick on the clock (index 1)
    // belongs to the untracked "other" slot, but c3 is the next tracked
    // coach up (index 2), so the active coach should jump straight to c3
    // rather than waiting for the "other" pick to be recorded first.
    await user.click(screen.getByText('draft mine'));

    await waitFor(() => expect(screen.getByTestId('active-coach')).toHaveTextContent('c3'));
    expect(mockedDb.saveMeta).toHaveBeenCalledWith('activeCoachId', 'c3');
  });

  it('throws when useAppContext is used outside of AppProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAppContext must be used within AppProvider');
    consoleError.mockRestore();
  });
});
