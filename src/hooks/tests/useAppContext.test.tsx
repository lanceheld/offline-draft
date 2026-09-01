import { render, screen } from '@testing-library/react';
import type { AppContextValue } from '../../@types/AppContextValue';
import type { Coach } from '../../@types/Coach';
import type { Player } from '../../@types/Player';
import { AppContext, useAppContext } from '../useAppContext';

const makeContextValue = (
  overrides: Partial<AppContextValue> = {},
): AppContextValue => {
  return {
    loaded: true,
    players: [] as Player[],
    coaches: [] as Coach[],
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

const Probe = () => {
  const ctx = useAppContext();
  return <div data-testid="active-coach">{ctx.activeCoachId ?? 'none'}</div>;
};

describe('useAppContext', () => {
  it('returns the provided context value when rendered within AppContext.Provider', () => {
    const value = makeContextValue({ activeCoachId: 'c1' });

    render(
      <AppContext.Provider value={value}>
        <Probe />
      </AppContext.Provider>,
    );

    expect(screen.getByTestId('active-coach')).toHaveTextContent('c1');
  });

  it('reflects updates to the context value across re-renders', () => {
    const { rerender } = render(
      <AppContext.Provider value={makeContextValue({ activeCoachId: 'c1' })}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId('active-coach')).toHaveTextContent('c1');

    rerender(
      <AppContext.Provider value={makeContextValue({ activeCoachId: 'c2' })}>
        <Probe />
      </AppContext.Provider>,
    );
    expect(screen.getByTestId('active-coach')).toHaveTextContent('c2');
  });

  it('throws when used outside of an AppContext.Provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(
      'useAppContext must be used within AppProvider',
    );

    consoleError.mockRestore();
  });

  it('throws when the provided context value is explicitly null', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() =>
      render(
        <AppContext.Provider value={null}>
          <Probe />
        </AppContext.Provider>,
      ),
    ).toThrow('useAppContext must be used within AppProvider');

    consoleError.mockRestore();
  });
});
