import type { ActionFunctionArgs } from 'react-router-dom';

jest.mock('./index', () => () => null);

import { redirectIfAdministrator } from '../admin-handoff';
import { resetPasswordAction } from './route';

jest.mock('../admin-handoff', () => ({
  redirectIfAdministrator: jest.fn(),
}));

function createActionRequest(url: string, formValues: Record<string, string>) {
  return new Request(url, {
    method: 'POST',
    body: new URLSearchParams(formValues),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

describe('resetPasswordAction', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();
  const redirectIfAdministratorMock = redirectIfAdministrator as jest.MockedFunction<typeof redirectIfAdministrator>;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      REACT_APP_API_BASE_URL: 'https://api.example.com',
      REACT_APP_API_KEY: 'test-key',
    };
    global.fetch = fetchMock as typeof fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('requests a reset token for existing administrators without redirecting them away', async () => {
    redirectIfAdministratorMock.mockResolvedValue(null);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      message: 'Reset requested.',
      preview_url: 'https://mail.example.com/preview',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await resetPasswordAction({
      request: createActionRequest('https://app.example.com/reset-password', {
        email: 'admin@example.com',
      }),
    } as ActionFunctionArgs);

    expect(redirectIfAdministratorMock).toHaveBeenCalledWith('admin@example.com', 'reset-password');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/accounts/reset-password', expect.objectContaining({
      method: 'POST',
    }));
    expect(result).toEqual({
      success: 'Reset requested.',
      values: { email: 'admin@example.com' },
      previewUrl: 'https://mail.example.com/preview',
    });
  });

  it('confirms a password reset token and returns a completed state', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      reset: true,
      message: 'Password updated.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await resetPasswordAction({
      request: createActionRequest('https://app.example.com/reset-password?token=abc123abc123abc123abc123abc123ab', {
        password: 'new-password-123',
        confirmPassword: 'new-password-123',
      }),
    } as ActionFunctionArgs);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/accounts/reset-password/confirm', expect.objectContaining({
      method: 'POST',
    }));
    expect(result).toEqual({
      success: 'Your password has been reset. You can now sign in with the new password.',
      values: { email: '' },
      completed: true,
    });
  });
});
