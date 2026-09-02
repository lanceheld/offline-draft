import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NameFilter } from '../NameFilter';

describe('NameFilter', () => {
  it('opens the filter popover from the menu and lets the user type a search term', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<NameFilter value="" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));

    const input = await screen.findByPlaceholderText('Search names...');
    await user.type(input, 'Al');

    expect(onChange).toHaveBeenCalledWith('A');
    expect(onChange).toHaveBeenCalledWith('l');
  });

  it('clears the value when Clear is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<NameFilter value="Allen" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));
    await user.click(await screen.findByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('disables the Clear button when there is no value', async () => {
    const user = userEvent.setup();
    render(<NameFilter value="" onChange={jest.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.click(await screen.findByRole('menuitem', { name: /filter/i }));

    expect(await screen.findByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});
