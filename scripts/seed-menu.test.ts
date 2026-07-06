import { describe, it, expect, vi, beforeEach } from 'vitest';

type Call = { strings: readonly string[]; values: unknown[] };

const { calls, queuedResults, mockSql } = vi.hoisted(() => {
  const calls: { strings: readonly string[]; values: unknown[] }[] = [];
  const queuedResults: unknown[][] = [];
  function mockSql(strings: TemplateStringsArray, ...values: unknown[]) {
    calls.push({ strings, values });
    return Promise.resolve(queuedResults.shift() ?? []);
  }
  mockSql.end = vi.fn().mockResolvedValue(undefined);
  return { calls, queuedResults, mockSql };
});

vi.mock('postgres', () => ({ default: vi.fn(() => mockSql) }));
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

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

import { seedMenu } from './seed-menu';

beforeEach(() => {
  calls.length = 0;
  queuedResults.length = 0;
  vi.clearAllMocks();
});

describe('seedMenu', () => {
  it('upserts each category, then each item with the resolved category id', async () => {
    queuedResults.push([{ id: 'cat-uuid-1' }]); // category upsert returns its id

    await seedMenu();

    // Call 0: category upsert — values are (name, sortOrder)
    expect(calls[0].values).toEqual(['Local', 1]);
    // Call 1: item upsert — values include the resolved category id from call 0
    expect(calls[1].values).toEqual([
      'Jollof Rice',
      'Party jollof.',
      4500,
      true,
      5.0,
      'https://example.com/jollof.jpg',
      null,
      ['gluten-free'],
      'cat-uuid-1',
    ]);
    expect(mockSql.end).toHaveBeenCalled();
  });

  it('throws a clear error if DATABASE_URL is not set', async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    const { seedMenu: seedMenuFresh } = await import('./seed-menu');
    await expect(seedMenuFresh()).rejects.toThrow(/DATABASE_URL/);
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });
});
