import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MenuSection from './MenuSection';

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

// next/image doesn't render in jsdom; stub it as a plain <img>.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src: string; alt: string };
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} />;
  },
}));

// fullRowsOfThree() trims trailing partial rows, so a single item would render
// as an empty grid. Give a full row of 3 top-rated items so they survive trimming.
const mockResponse = {
  categories: [{ id: 'local', name: 'Local', sortOrder: 1 }],
  items: [
    {
      id: 'l1',
      categoryId: 'local',
      name: 'Jollof Rice',
      description: 'Party jollof.',
      price: 4500,
      isAvailable: true,
      rating: 5.0,
      imageUrl: 'https://example.com/jollof.jpg',
      dietaryTags: [],
    },
    {
      id: 'l2',
      categoryId: 'local',
      name: 'Egusi Soup',
      description: 'Melon seed stew.',
      price: 5000,
      isAvailable: true,
      rating: 4.9,
      imageUrl: 'https://example.com/egusi.jpg',
      dietaryTags: [],
    },
    {
      id: 'l3',
      categoryId: 'local',
      name: 'Suya Skewers',
      description: 'Spiced grilled beef.',
      price: 3500,
      isAvailable: true,
      rating: 4.8,
      imageUrl: 'https://example.com/suya.jpg',
      dietaryTags: [],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
  );
});

describe('MenuSection', () => {
  it('shows a loading state, then renders items from api/menu', async () => {
    render(<MenuSection />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Top picks render in both the spotlight and the full-menu grid, so match all.
    await waitFor(() => expect(screen.getAllByText('Jollof Rice').length).toBeGreaterThan(0));
    expect(fetch).toHaveBeenCalledWith('/api/menu');
  });

  it('shows an error state when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));

    render(<MenuSection />);

    await waitFor(() => expect(screen.getByText(/couldn't load the menu/i)).toBeInTheDocument());
  });
});
