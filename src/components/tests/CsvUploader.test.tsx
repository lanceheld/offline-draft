import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../../@types/Player';
import { useAppContext } from '../../hooks/useAppContext';
import { CsvUploader } from '../CsvUploader';

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
  return {
    loaded: true,
    players: [],
    coaches: [],
    activeCoachId: null,
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

const makeCsvFile = (contents: string) => {
  const file = new File([contents], 'players.csv', { type: 'text/csv' });
  // jsdom's FileReader resolves on a real macrotask, which makes tests flaky under load.
  // Stub text() with a microtask-resolved promise so RTL's act() reliably flushes it.
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(contents),
  });
  return file;
};

const getFileInput = (container: HTMLElement) => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

describe('CsvUploader', () => {
  it('imports players directly when there is no existing data', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,12\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(ctx.importPlayers).toHaveBeenCalledTimes(1);
    expect(ctx.importPlayers).toHaveBeenCalledWith([expect.objectContaining({ name: 'Josh Allen', position: 'QB' })]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for confirmation before replacing existing players', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [makePlayer()] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n2,RB,Bijan Robinson,ATL,5\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(ctx.importPlayers).not.toHaveBeenCalled();
    expect(screen.getByText(/Uploading this CSV will replace all 1 existing player/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace' }));

    expect(ctx.importPlayers).toHaveBeenCalledWith([expect.objectContaining({ name: 'Bijan Robinson' })]);
  });

  it('does not import players when the replace confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [makePlayer()] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n2,RB,Bijan Robinson,ATL,5\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    expect(ctx.importPlayers).not.toHaveBeenCalled();
  });

  it('suppresses parsing errors while the replace confirmation is open, then clears them on cancel', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [makePlayer()] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n2,RB,Bijan Robinson,ATL,5\n3,ZZ,Bad Row,DAL,7\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(screen.getByText(/Uploading this CSV will replace all 1 existing player/)).toBeInTheDocument();
    expect(screen.queryByText('CSV parsing issues')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(ctx.importPlayers).not.toHaveBeenCalled();
    expect(screen.queryByText('CSV parsing issues')).not.toBeInTheDocument();
  });

  it('shows parsing errors after confirming the replacement', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [makePlayer()] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n2,RB,Bijan Robinson,ATL,5\n3,ZZ,Bad Row,DAL,7\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(screen.queryByText('CSV parsing issues')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace' }));

    expect(ctx.importPlayers).toHaveBeenCalledWith([expect.objectContaining({ name: 'Bijan Robinson' })]);
    expect(screen.getByText('CSV parsing issues')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
  });

  it('shows parsing errors and does not import when every row is invalid', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\nabc,QB,Josh Allen,BUF,12\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(ctx.importPlayers).not.toHaveBeenCalled();
    expect(screen.getByText('CSV parsing issues')).toBeInTheDocument();
    expect(screen.getByText('Row 2: invalid Rank "abc"')).toBeInTheDocument();
    expect(screen.getByText(/No rows were imported\./)).toBeInTheDocument();
  });

  it('imports valid rows and still surfaces errors for invalid ones in the same file', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,12\n2,ZZ,Bad Row,DAL,7\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));

    expect(ctx.importPlayers).toHaveBeenCalledWith([expect.objectContaining({ name: 'Josh Allen' })]);
    expect(screen.getByText('Row 3: invalid Position "ZZ"')).toBeInTheDocument();
    expect(screen.getByText(/Valid rows were still imported\./)).toBeInTheDocument();
  });

  it('closes the error dialog when Close is clicked', async () => {
    const user = userEvent.setup();
    const ctx = makeContext({ players: [] });
    mockedUseAppContext.mockReturnValue(ctx);
    const { container } = render(<CsvUploader />);

    const csv = 'Rank,Position,Name,Team,Bye\nabc,QB,Josh Allen,BUF,12\n';
    await user.upload(getFileInput(container), makeCsvFile(csv));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('CSV parsing issues')).not.toBeInTheDocument();
  });
});
