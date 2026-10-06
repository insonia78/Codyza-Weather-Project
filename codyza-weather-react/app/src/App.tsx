import React from 'react';
import './App.css';
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import LoginRoute from './pages/login/route';
import RegistrationRoute from './pages/registration/route';
import ResetPasswordRoute from './pages/reset-password/route';
import ErrorPage from './pages/error';
import { appConfig } from './config/environment';
import { CodyzaBranding } from './components/CodyzaBranding';

function Home() {
  return (
    <main className="appShell">
      <section className="heroPanel">
        <div className="heroHeader">
          <div>
            <p className="eyebrow">{appConfig.appName}</p>
            <p className="poweredBy">Powered by Codyza</p>
          </div>
          <span className="environmentBadge">{appConfig.environment}</span>
        </div>
        <h1>Weather updates without the clutter.</h1>
        <p className="heroCopy">
          Check conditions, manage your account, and recover access from a
          cleaner entry point.
        </p>
        <div className="heroBranding">
          <CodyzaBranding />
        </div>
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
          <Link className="primaryLink" to="/login">
            Login
          </Link>
          <Link className="secondaryLink" to="/registration">
            Create account
          </Link>
          <Link className="ghostLink" to="/reset-password">
            Reset password
          </Link>
        </div>
        <footer className="heroFooter">
          <span>Powered by Codyza</span>
          <a href="https://www.codyza.com" target="_blank" rel="noreferrer">
            Visit Codyza
          </a>
        </footer>
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
