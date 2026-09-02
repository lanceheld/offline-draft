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
  return { id: 'c1', name: 'Coach 1', ...overrides };
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
      <div data-testid="rb-limit">{ctx.rosterLimits.RB}</div>
      <div data-testid="flex-limit">{ctx.rosterLimits.FLEX}</div>
      <ul>
        {ctx.players.map((p) => (
          <li key={p.id} data-testid={`player-${p.id}`}>
            {p.name}:{p.draftedBy ?? 'undrafted'}:{String(p.draftedOther)}
          </li>
        ))}
      </ul>
      <button onClick={() => ctx.toggleDraftedByMe('p1', true)}>
        draft mine
      </button>
      <button onClick={() => ctx.toggleDraftedByMe('p1', false)}>
        undraft mine
      </button>
      <button onClick={() => ctx.toggleDraftedOther('p1', true)}>
        draft other
      </button>
      <button onClick={() => ctx.addCoach('New Coach')}>add coach</button>
      <button
        onClick={() => ctx.removeCoach(ctx.activeCoachId ?? '', 'undrafted')}
      >
        remove active coach (undrafted)
      </button>
      <button onClick={() => ctx.removeCoach(ctx.activeCoachId ?? '', 'other')}>
        remove active coach (other)
      </button>
      <button onClick={() => ctx.setActiveCoach('c2')}>switch to c2</button>
      <button
        onClick={() =>
          ctx.setRosterLimits({ ...ctx.rosterLimits, RB: 3, FLEX: 2 })
        }
      >
        update roster limits
      </button>
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

    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );
    expect(screen.getByTestId('coach-count')).toHaveTextContent('1');
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:false',
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('coach-count')).toHaveTextContent('1'),
    );
    expect(mockedDb.saveCoaches).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Coach 1' }),
    ]);
    expect(mockedDb.saveMeta).toHaveBeenCalledWith(
      'activeCoachId',
      expect.any(String),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('draft mine'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:c1:false',
    );
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', draftedBy: 'c1' }),
    );

    await user.click(screen.getByText('undraft mine'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:false',
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('draft other'));
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:true',
    );
    expect(mockedDb.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', draftedOther: true }),
    );
  });

  it('marking a player drafted by me clears a previously set draftedOther flag', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([
      makePlayer({ draftedOther: true }),
    ]);
    mockedDb.loadCoaches.mockResolvedValue([makeCoach({ id: 'c1' })]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:true',
    );

    await user.click(screen.getByText('draft mine'));

    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:c1:false',
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:c1:false',
    );

    await user.click(screen.getByText('draft other'));

    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:true',
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('coach-count')).toHaveTextContent('1'),
    );

    await user.click(screen.getByText('add coach'));

    await waitFor(() =>
      expect(screen.getByTestId('coach-count')).toHaveTextContent('2'),
    );
    expect(screen.getByTestId('active-coach')).toHaveTextContent('c1');
  });

  it('removeCoach clears draftedBy for that coach and falls back active coach to another one', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([makePlayer({ draftedBy: 'c1' })]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1' }),
      makeCoach({ id: 'c2', name: 'Coach 2' }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('remove active coach (undrafted)'));

    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c2'),
    );
    expect(screen.getByTestId('coach-count')).toHaveTextContent('1');
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:false',
    );
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
      makeCoach({ id: 'c2', name: 'Coach 2' }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('remove active coach (other)'));

    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c2'),
    );
    expect(screen.getByTestId('player-p1')).toHaveTextContent(
      'Josh Allen:undrafted:true',
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('remove active coach (undrafted)'));

    await waitFor(() =>
      expect(screen.getByTestId('coach-count')).toHaveTextContent('0'),
    );
    expect(mockedDb.deleteMeta).toHaveBeenCalledWith('activeCoachId');
    expect(mockedDb.saveMeta).not.toHaveBeenCalled();
  });

  it('setActiveCoach updates the active coach and persists it', async () => {
    const user = userEvent.setup();
    mockedDb.loadPlayers.mockResolvedValue([]);
    mockedDb.loadCoaches.mockResolvedValue([
      makeCoach({ id: 'c1' }),
      makeCoach({ id: 'c2', name: 'Coach 2' }),
    ]);
    mockedDb.loadMeta.mockResolvedValue('c1');

    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

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

    await waitFor(() =>
      expect(screen.getByTestId('rb-limit')).toHaveTextContent('7'),
    );
    expect(screen.getByTestId('flex-limit')).toHaveTextContent(
      String(DEFAULT_ROSTER_LIMITS.FLEX),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('rb-limit')).toHaveTextContent(
        String(DEFAULT_ROSTER_LIMITS.RB),
      ),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('rb-limit')).toHaveTextContent(
        String(DEFAULT_ROSTER_LIMITS.RB),
      ),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('rb-limit')).toHaveTextContent(
        String(DEFAULT_ROSTER_LIMITS.RB),
      ),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('flex-limit')).toHaveTextContent('3'),
    );
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(
      String(DEFAULT_ROSTER_LIMITS.RB),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('flex-limit')).toHaveTextContent('4'),
    );
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(
      String(DEFAULT_ROSTER_LIMITS.RB),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('flex-limit')).toHaveTextContent('4'),
    );
    expect(screen.getByTestId('rb-limit')).toHaveTextContent(
      String(DEFAULT_ROSTER_LIMITS.RB),
    );
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

    await waitFor(() =>
      expect(screen.getByTestId('rb-limit')).toHaveTextContent('4'),
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('active-coach')).toHaveTextContent('c1'),
    );

    await user.click(screen.getByText('update roster limits'));

    expect(screen.getByTestId('rb-limit')).toHaveTextContent('3');
    expect(screen.getByTestId('flex-limit')).toHaveTextContent('2');
    expect(mockedDb.saveMeta).toHaveBeenCalledWith(
      'rosterLimits',
      JSON.stringify({ ...DEFAULT_ROSTER_LIMITS, RB: 3, FLEX: 2 }),
    );
  });

  it('throws when useAppContext is used outside of AppProvider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      'useAppContext must be used within AppProvider',
    );
    consoleError.mockRestore();
  });
});
