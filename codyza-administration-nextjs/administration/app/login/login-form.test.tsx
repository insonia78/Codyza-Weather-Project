"use client";

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginForm } from './login-form';

const replaceMock = jest.fn();
const refreshMock = jest.fn();
const useSearchParamsMock = jest.fn();
const fetchMock = jest.fn();

function createJsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(body),
  };
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock('../components/turnstile-widget', () => ({
  TurnstileWidget: ({ onTokenChange }: { onTokenChange: (token: string) => void }) => {
    const React = jest.requireActual('react') as typeof import('react');
    React.useEffect(() => {
      onTokenChange('turnstile-token');
    }, [onTokenChange]);
    return <div data-testid="turnstile-widget" />;
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it('advances to the password step for an administrator who already has a password', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({
      email: 'admin@example.com',
      passwordSetupRequired: false,
    }));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByLabelText('Password')).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to create-password when the administrator must bootstrap a password', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({
      email: 'admin@example.com',
      passwordSetupRequired: true,
    }));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/create-password?email=admin%40example.com'));
  });

  it('submits the password step and sends the user back to the dashboard', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('email=admin@example.com&returnTo=%2Fdashboard'));
    fetchMock.mockResolvedValue(createJsonResponse({ email: 'admin@example.com' }));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
        turnstileToken: 'turnstile-token',
      }),
    })));
    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    expect(refreshMock).toHaveBeenCalled();
  });
});
