import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  createBrowserRouter: jest.fn((routes) => routes),
  RouterProvider: ({ router }: { router: Array<{ element: React.ReactElement }> }) => router[0].element,
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import App from './App';

test('renders the commercial landing content', () => {
  render(<App />);
  expect(
    screen.getByText(/plan every day with a weather experience that feels premium/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/premium weather access for modern teams and travelers/i)).toBeInTheDocument();
  expect(screen.getByText(/fast access to every forecast/i)).toBeInTheDocument();
});
