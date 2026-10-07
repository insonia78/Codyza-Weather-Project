import React from 'react';
import './App.css';
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import LoginRoute from './pages/login/route';
import RegistrationRoute from './pages/registration/route';
import ResetPasswordRoute from './pages/reset-password/route';
import ErrorPage from './pages/error';
import { appConfig } from './config/environment';
import { CodyzaBranding } from './components/CodyzaBranding';

const commercialHighlights = [
  {
    title: 'Fast access to every forecast',
    description:
      'Move from sign-in to live weather dashboards, saved places, and alerts in just a few clicks.',
  },
  {
    title: 'Designed for everyday confidence',
    description:
      'Clean account management, smooth recovery flows, and dependable access across devices.',
  },
  {
    title: 'Built to feel premium',
    description:
      'A polished Codyza experience that keeps the focus on people, places, and decisions.',
  },
];

const trustPoints = [
  'Personalized saved locations',
  'Quick password recovery',
  'Seamless Codyza account experience',
];

function Home() {
  return (
    <main className="appShell">
      <section className="heroPanel">
        <div className="heroHeader">
          <div>
            <p className="eyebrow">{appConfig.appName}</p>
            <p className="poweredBy">Powered by Codyza</p>
          </div>
          <p className="heroTagline">Premium weather access for modern teams and travelers.</p>
        </div>
        <h1>Plan every day with a weather experience that feels premium.</h1>
        <p className="heroCopy">
          Codyza Weather brings account access, saved places, and weather-ready planning
          into one refined entry point built for confidence and speed.
        </p>
        <ul className="trustList" aria-label="Customer benefits">
          {trustPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="heroBranding">
          <CodyzaBranding />
        </div>
        <div className="heroActions">
          <Link className="primaryLink" to="/login">
            Sign in
          </Link>
          <Link className="secondaryLink" to="/registration">
            Create account
          </Link>
          <Link className="ghostLink" to="/reset-password">
            Recover access
          </Link>
        </div>
        <section className="featureGrid" aria-label="Commercial highlights">
          {commercialHighlights.map((highlight) => (
            <article key={highlight.title} className="featureCard">
              <h2>{highlight.title}</h2>
              <p>{highlight.description}</p>
            </article>
          ))}
        </section>
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
