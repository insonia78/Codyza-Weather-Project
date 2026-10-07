import type { ActionFunctionArgs } from 'react-router-dom';

jest.mock('./index', () => () => null);
jest.mock('react-router-dom', () => ({
  redirectDocument: jest.fn((url: string) => new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  })),
}));

import { loginAction } from './route';
import { redirectIfAdministrator } from '../admin-handoff';

jest.mock('../admin-handoff', () => ({
  redirectIfAdministrator: jest.fn(),
}));

function createActionRequest(formValues: Record<string, string>) {
  return new Request('https://app.example.com/login', {
    method: 'POST',
    body: new URLSearchParams(formValues),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

describe('loginAction', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();
  const redirectIfAdministratorMock = redirectIfAdministrator as jest.MockedFunction<typeof redirectIfAdministrator>;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      REACT_APP_API_BASE_URL: 'https://api.example.com',
      REACT_APP_API_KEY: 'test-key',
      REACT_APP_CODYZA_WEATHER_URL: 'https://weather.example.com/dashboard',
    };
    global.fetch = fetchMock as typeof fetch;
    localStorage.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('requires a Turnstile token before submitting login credentials', async () => {
    redirectIfAdministratorMock.mockResolvedValue(null);

    const result = await loginAction({
      request: createActionRequest({
        email: 'user@example.com',
        password: 'password123',
      }),
    } as ActionFunctionArgs);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      errors: ['Complete the security check before signing in.'],
      values: { email: 'user@example.com' },
    });
  });

  it('forwards the Turnstile token with the login request and stores the returned JWT', async () => {
    redirectIfAdministratorMock.mockResolvedValue(null);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      token: 'jwt-token',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await loginAction({
      request: createActionRequest({
        email: 'user@example.com',
        password: 'password123',
        turnstileToken: 'turnstile-token',
      }),
    } as ActionFunctionArgs);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/accounts/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
        turnstileToken: 'turnstile-token',
      }),
    }));
    expect(localStorage.getItem('jwt_token')).toBe('jwt-token');
  });
});
