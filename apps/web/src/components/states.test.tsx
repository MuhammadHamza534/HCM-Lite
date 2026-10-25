import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, ErrorState } from './states';

describe('reusable foundation states', () => {
  it('renders an honest empty state', () => {
    render(<EmptyState title="No employees">No employee data has been created.</EmptyState>);
    expect(screen.getByRole('heading', { name: 'No employees' })).toBeInTheDocument();
    expect(screen.getByText('No employee data has been created.')).toBeInTheDocument();
  });

  it('exposes an error state to assistive technology', () => {
    render(<ErrorState>The API is unavailable.</ErrorState>);
    expect(screen.getByRole('alert')).toHaveTextContent('The API is unavailable.');
  });
});
