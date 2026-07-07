import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockList from './StockList';

const mockMenuResponse = {
  categories: [{ id: 'local', name: 'Local', sortOrder: 1 }],
  items: [
    { id: 'l1', categoryId: 'local', name: 'Jollof Rice', description: '', price: 4500, isAvailable: true, dietaryTags: [] },
    { id: 'l2', categoryId: 'local', name: 'Egusi Soup', description: '', price: 5500, isAvailable: false, dietaryTags: [] },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/menu') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMenuResponse) });
      }
      if (url === '/api/admin/menu') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    })
  );
});

describe('StockList', () => {
  it('loads items from api/menu and shows availability state per item', async () => {
    render(<StockList />);

    await waitFor(() => expect(screen.getByText('Jollof Rice')).toBeInTheDocument());
    expect(screen.getByText('Egusi Soup')).toBeInTheDocument();
    expect(screen.getByText('Mark unavailable')).toBeInTheDocument(); // Jollof is available
    expect(screen.getByText('Mark available')).toBeInTheDocument();   // Egusi is unavailable
    expect(screen.getByText('In Stock')).toBeInTheDocument();     // Jollof's badge
    expect(screen.getByText('Out of Stock')).toBeInTheDocument(); // Egusi's badge
  });

  it('toggling availability calls PATCH /api/admin/menu with the flipped value and updates the button label', async () => {
    render(<StockList />);
    await waitFor(() => expect(screen.getByText('Jollof Rice')).toBeInTheDocument());

    screen.getByText('Mark unavailable').click();

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/menu',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ itemId: 'l1', isAvailable: false }),
        })
      )
    );
    await waitFor(() => expect(screen.getAllByText('Mark available')).toHaveLength(2));
    expect(screen.getAllByText('Out of Stock')).toHaveLength(2); // both items now unavailable
  });

  it('shows an error message if the fetch for the menu fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'nope' }) }));

    render(<StockList />);

    await waitFor(() => expect(screen.getByText('nope')).toBeInTheDocument());
  });
});
