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

test('renders environment configuration details', () => {
  render(<App />);
  expect(screen.getByText(/weather updates without the clutter/i)).toBeInTheDocument();
  expect(screen.getByText(/environment/i)).toBeInTheDocument();
  expect(screen.getByText(/api base url/i)).toBeInTheDocument();
});
