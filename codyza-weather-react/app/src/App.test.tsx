import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => {
  window.localStorage.clear();
});

test('renders environment configuration details', () => {
  render(<App />);
  expect(screen.getByText(/weather updates without the clutter/i)).toBeInTheDocument();
  expect(screen.getByText(/environment/i)).toBeInTheDocument();
  expect(screen.getByText(/api base url/i)).toBeInTheDocument();
});

test('removes the jwt token on logout', () => {
  window.localStorage.setItem('jwt_token', 'test-token');

  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /logout/i }));

  expect(window.localStorage.getItem('jwt_token')).toBeNull();
  expect(screen.getByText(/login/i)).toBeInTheDocument();
});
