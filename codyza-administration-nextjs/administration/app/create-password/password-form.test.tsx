"use client";

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreatePasswordForm } from './password-form';

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

describe('CreatePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    useSearchParamsMock.mockReturnValue(new URLSearchParams('email=admin@example.com'));
  });

  it('validates matching passwords before submitting', async () => {
    render(<CreatePasswordForm />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password124' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the email query parameter', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<CreatePasswordForm />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create password' }));

    expect(await screen.findByText('Missing administrator email.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates the administrator password and refreshes the dashboard session', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ email: 'admin@example.com' }));

    render(<CreatePasswordForm />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create password' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/create-password', expect.objectContaining({
      method: 'POST',
    })));
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalled();
  });
});
