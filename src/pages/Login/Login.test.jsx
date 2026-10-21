import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Login from './Login.jsx';
import { json, mockFetch, renderWithProviders } from '../../test/utils.jsx';

const fill = async (email, password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
};

describe('Login', () => {
  it('rejects a too-short password before calling the API', async () => {
    const fetchMock = mockFetch({});
    renderWithProviders(<Login />, { route: '/login' });

    await fill('me@example.com', 'short');

    expect(screen.getByText(/Password must be 8-72 characters/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API validation message as text, not JSON', async () => {
    mockFetch({
      'POST /v1/auth/login': json({
        detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email' }],
      }, 422),
    });
    renderWithProviders(<Login />, { route: '/login' });

    await fill('me@example.com', 'longenough');

    expect(await screen.findByText('email: value is not a valid email')).toBeInTheDocument();
  });
});
