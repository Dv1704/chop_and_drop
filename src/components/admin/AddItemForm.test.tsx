import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddItemForm from './AddItemForm';

const categories = [
  { id: 'local', name: 'Local', sortOrder: 1 },
  { id: 'drinks', name: 'Drinks', sortOrder: 2 },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true, id: 'new-id' }) }));
});

function fetchBody() {
  return JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
}

describe('AddItemForm', () => {
  it('submits name/price/category and calls onAdded, resetting the form', async () => {
    const onAdded = vi.fn();
    render(<AddItemForm categories={categories} onAdded={onAdded} />);

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Suya' } });
    fireEvent.change(screen.getByPlaceholderText('Price (₦)'), { target: { value: '3000' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/admin/menu',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(fetchBody()).toEqual({
      name: 'Suya',
      price: 3000,
      categoryId: 'local',
      description: undefined,
      imageUrl: undefined,
      allergens: undefined,
      dietaryTags: undefined,
    });

    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect((screen.getByPlaceholderText('Name') as HTMLInputElement).value).toBe('');
  });

  it('parses comma-separated allergens/dietary tags into arrays', async () => {
    const onAdded = vi.fn();
    render(<AddItemForm categories={categories} onAdded={onAdded} />);

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Jollof' } });
    fireEvent.change(screen.getByPlaceholderText('Price (₦)'), { target: { value: '4500' } });
    fireEvent.change(screen.getByPlaceholderText(/Allergens/), { target: { value: 'fish, peanuts' } });
    fireEvent.change(screen.getByPlaceholderText(/Dietary tags/), { target: { value: 'spicy' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetchBody().allergens).toEqual(['fish', 'peanuts']);
    expect(fetchBody().dietaryTags).toEqual(['spicy']);
  });

  it('shows an inline error and does not call onAdded when the API rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'name and price required' }) }));
    const onAdded = vi.fn();
    render(<AddItemForm categories={categories} onAdded={onAdded} />);

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Suya' } });
    fireEvent.change(screen.getByPlaceholderText('Price (₦)'), { target: { value: '3000' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() => expect(screen.getByText('name and price required')).toBeInTheDocument());
    expect(onAdded).not.toHaveBeenCalled();
  });
});
