import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted: the vi.mock factories below (and the ./menu-repo import that
// triggers them) are hoisted above this line, so the mock must be initialized
// even earlier or it hits a TDZ error at module load.
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseReady: true,
}));

vi.mock('@/lib/menu-data', () => ({
  categories: [{ id: 'local', name: 'Local', sortOrder: 1 }],
  menuItems: [
    {
      id: 'l1',
      categoryId: 'local',
      name: 'Jollof Rice',
      description: 'Party jollof.',
      price: 4500,
      isAvailable: true,
      rating: 5.0,
      imageUrl: 'https://example.com/jollof.jpg',
      dietaryTags: ['gluten-free'],
    },
  ],
}));

import { getMenu } from './menu-repo';

function tableResult(rows: unknown[] | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      then: undefined,
      order: vi.fn().mockResolvedValue({ data: rows, error }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMenu', () => {
  it('maps DB rows (snake_case) to the camelCase MenuItem/MenuCategory shape', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'menu_categories') {
        return tableResult([{ id: 'cat-uuid-1', name: 'Local', sort_order: 1 }]);
      }
      if (table === 'menu_items') {
        return tableResult([
          {
            id: 'item-uuid-1',
            category_id: 'cat-uuid-1',
            name: 'Jollof Rice',
            description: 'Party jollof.',
            price: '4500.00',
            is_available: true,
            rating: '5.0',
            image_url: 'https://example.com/jollof.jpg',
            allergens: null,
            dietary_tags: ['gluten-free'],
          },
        ]);
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await getMenu();

    expect(result.categories).toEqual([{ id: 'cat-uuid-1', name: 'Local', sortOrder: 1 }]);
    expect(result.items).toEqual([
      {
        id: 'item-uuid-1',
        categoryId: 'cat-uuid-1',
        name: 'Jollof Rice',
        description: 'Party jollof.',
        price: 4500,
        isAvailable: true,
        rating: 5.0,
        imageUrl: 'https://example.com/jollof.jpg',
        allergens: undefined,
        dietaryTags: ['gluten-free'],
      },
    ]);
  });

  it('does not filter out unavailable items', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'menu_categories') return tableResult([{ id: 'cat-uuid-1', name: 'Local', sort_order: 1 }]);
      if (table === 'menu_items') {
        return tableResult([
          { id: 'i1', category_id: 'cat-uuid-1', name: 'A', description: '', price: '1', is_available: false, rating: null, image_url: null, allergens: null, dietary_tags: null },
        ]);
      }
      throw new Error('unexpected table');
    });

    const result = await getMenu();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isAvailable).toBe(false);
  });

  it('falls back to the static file on a Supabase query error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'menu_categories') return tableResult(null, { message: 'connection refused' });
      return tableResult([]);
    });

    const result = await getMenu();
    expect(result.categories).toEqual([{ id: 'local', name: 'Local', sortOrder: 1 }]);
    expect(result.items[0].name).toBe('Jollof Rice');
  });
});

describe('getMenu when Supabase is not configured', () => {
  it('falls back to the static file without querying Supabase', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase', () => ({ supabase: mockSupabase, supabaseReady: false }));
    vi.doMock('@/lib/menu-data', () => ({
      categories: [{ id: 'local', name: 'Local', sortOrder: 1 }],
      menuItems: [{ id: 'l1', categoryId: 'local', name: 'Jollof Rice', description: '', price: 4500, isAvailable: true, rating: 5, imageUrl: '', dietaryTags: [] }],
    }));
    const { getMenu: getMenuFresh } = await import('./menu-repo');

    const result = await getMenuFresh();

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(result.items[0].name).toBe('Jollof Rice');
  });
});
