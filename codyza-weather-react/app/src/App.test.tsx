import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders environment configuration details', () => {
  render(<App />);
  expect(screen.getByText(/weather updates without the clutter/i)).toBeInTheDocument();
  expect(screen.getByText(/environment/i)).toBeInTheDocument();
  expect(screen.getByText(/api base url/i)).toBeInTheDocument();
});
