import React, { useCallback, useState } from 'react';
import './App.css';
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import LoginRoute from './pages/login/route';
import RegistrationRoute from './pages/registration/route';
import ResetPasswordRoute from './pages/reset-password/route';
import ErrorPage from './pages/error';
import { appConfig } from './config/environment';

function Home() {
  const [hasJwtToken, setHasJwtToken] = useState(
    () => typeof window !== 'undefined' && Boolean(window.localStorage.getItem('jwt_token')),
  );

  const handleLogout = useCallback(async () => {
    const token = window.localStorage.getItem('jwt_token');
    const finalizeLogout = () => {
      window.localStorage.removeItem('jwt_token');
      setHasJwtToken(false);
    };

    if (!token) {
      finalizeLogout();
      return;
    }

    try {
      await fetch(`${appConfig.gatewayBaseUrl.replace(/\/+$/, '')}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apiKey: process.env.REACT_APP_API_KEY ?? '',
        },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error('Logout revocation request failed:', error);
    } finally {
      finalizeLogout();
    }
  }, []);

  return (
    <main className="appShell">
      <section className="heroPanel">
        <div className="heroHeader">
          <p className="eyebrow">{appConfig.appName}</p>
          <span className="environmentBadge">{appConfig.environment}</span>
        </div>
        <h1>Weather updates without the clutter.</h1>
        <p className="heroCopy">
          Check conditions, manage your account, and recover access from a
          cleaner entry point.
        </p>
        <dl className="environmentDetails" aria-label="Environment configuration">
          <div>
            <dt>Environment</dt>
            <dd>{appConfig.environment}</dd>
          </div>
          <div>
            <dt>API base URL</dt>
            <dd>{appConfig.apiBaseUrl}</dd>
          </div>
        </dl>
        <div className="heroActions">
          {hasJwtToken ? (
            <button className="primaryLink" type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link className="primaryLink" to="/login">
                Login
              </Link>
              <Link className="secondaryLink" to="/registration">
                Create account
              </Link>
              <Link className="ghostLink" to="/reset-password">
                Reset password
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  LoginRoute,
  RegistrationRoute,
  ResetPasswordRoute,
  {
    path: '*',
    element: <ErrorPage />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
