import { redirectDocument } from 'react-router-dom';

jest.mock('../config/environment', () => ({
  appConfig: {
    adminAppUrl: 'https://admin.example.com/',
  },
}));

import { redirectIfAdministrator } from './admin-handoff';

jest.mock('react-router-dom', () => ({
  redirectDocument: jest.fn((url: string) => new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  })),
}));

describe('redirectIfAdministrator', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();

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

  it('keeps existing administrators on the standard reset-password flow', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      email: 'admin@example.com',
      passwordSetupRequired: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(redirectIfAdministrator('admin@example.com', 'reset-password')).resolves.toBeNull();

    expect(redirectDocument).not.toHaveBeenCalled();
  });

  it('redirects bootstrap administrators to create-password during reset-password', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      email: 'admin@example.com',
      passwordSetupRequired: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await redirectIfAdministrator('admin@example.com', 'reset-password');

    expect(redirectDocument).toHaveBeenCalledWith(
      'https://admin.example.com/create-password?email=admin%40example.com',
    );
    expect(response).not.toBeNull();
  });

  it('redirects administrators with existing passwords to the admin login page', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      email: 'admin@example.com',
      passwordSetupRequired: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await redirectIfAdministrator('admin@example.com', 'login');

    expect(redirectDocument).toHaveBeenCalledWith(
      'https://admin.example.com/login?email=admin%40example.com',
    );
    expect(response).not.toBeNull();
  });
});
