import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { POSITIONS } from '../../@enums/Position';
import { PositionFilter } from '../PositionFilter';

const openFilter = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button'));
  await user.click(await screen.findByRole('menuitem', { name: /filter/i }));
};

describe('PositionFilter', () => {
  it('renders a checkbox for every position', async () => {
    const user = userEvent.setup();
    render(<PositionFilter value={[]} onChange={jest.fn()} />);

    await openFilter(user);

    for (const pos of POSITIONS) {
      expect(screen.getByRole('checkbox', { name: pos })).not.toBeChecked();
    }
  });

  it('adds a position when its checkbox is checked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PositionFilter value={[]} onChange={onChange} />);

    await openFilter(user);
    await user.click(screen.getByRole('checkbox', { name: 'RB' }));

    expect(onChange).toHaveBeenCalledWith(['RB']);
  });

  it('removes a position when its checkbox is unchecked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PositionFilter value={['QB', 'RB']} onChange={onChange} />);

    await openFilter(user);
    await user.click(screen.getByRole('checkbox', { name: 'QB' }));

    expect(onChange).toHaveBeenCalledWith(['RB']);
  });

  it('clears all positions when Clear is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<PositionFilter value={['QB', 'RB']} onChange={onChange} />);

    await openFilter(user);
    await user.click(await screen.findByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
