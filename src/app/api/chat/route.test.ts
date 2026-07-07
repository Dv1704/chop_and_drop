import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted: these mocks must exist before vi.mock factories (which are
// hoisted above the imports) run, or they hit a TDZ error at module load.
const mocks = vi.hoisted(() => ({
  getMenu: vi.fn(),
  streamText: vi.fn(),
  dataStreamResponse: { __marker: 'data-stream-response' },
}));

vi.mock('@/lib/menu-repo', () => ({
  getMenu: mocks.getMenu,
}));

vi.mock('ai', () => ({
  streamText: mocks.streamText,
}));

vi.mock('@ai-sdk/openai', () => ({
  // createOpenAI(config) returns a factory; calling it with a model name
  // yields a sentinel "model" we can assert on later.
  createOpenAI: () => (modelName: string) => ({ __model: modelName }),
}));

import { POST } from './route';

// Two fixtures: item with dietaryTags, item with allergens, and one unavailable.
const fixtureA = {
  categories: [{ id: 'local', name: 'Local Dishes', sortOrder: 1 }],
  items: [
    {
      id: 'l1',
      categoryId: 'local',
      name: 'Jollof Rice',
      description: 'Party jollof.',
      price: 4500,
      isAvailable: true,
      dietaryTags: ['gluten-free'],
      allergens: [],
    },
    {
      id: 'l2',
      categoryId: 'local',
      name: 'Egusi Soup',
      description: 'Melon seed soup.',
      price: 5200,
      isAvailable: true,
      dietaryTags: [],
      allergens: ['fish'],
    },
    {
      id: 'l3',
      categoryId: 'local',
      name: 'Suya Platter',
      description: 'Spicy grilled beef.',
      price: 6000,
      isAvailable: false,
      dietaryTags: [],
      allergens: [],
    },
  ],
};

const fixtureB = {
  categories: [{ id: 'drinks', name: 'Drinks', sortOrder: 1 }],
  items: [
    {
      id: 'd1',
      categoryId: 'drinks',
      name: 'Chapman',
      description: 'Nigerian cocktail.',
      price: 2000,
      isAvailable: true,
      dietaryTags: [],
      allergens: [],
    },
  ],
};

function chatRequest(messages: unknown[]) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

// Pull the `system` string out of the (single) streamText call.
function systemPrompt() {
  return mocks.streamText.mock.calls[0][0].system as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMenu.mockResolvedValue(fixtureA);
  mocks.streamText.mockResolvedValue({
    toDataStreamResponse: () => mocks.dataStreamResponse,
  });
});

describe('POST /api/chat', () => {
  it('reads the menu per request via getMenu()', async () => {
    await POST(chatRequest([{ role: 'user', content: 'hi' }]));
    expect(mocks.getMenu).toHaveBeenCalledTimes(1);
  });

  it('builds the system prompt from getMenu() data (item name and price)', async () => {
    await POST(chatRequest([{ role: 'user', content: 'hi' }]));
    const system = systemPrompt();
    expect(system).toContain('Jollof Rice');
    expect(system).toContain('4,500');
  });

  it('includes dietary tags and allergens via conditional formatting', async () => {
    await POST(chatRequest([{ role: 'user', content: 'hi' }]));
    const system = systemPrompt();
    expect(system).toContain('gluten-free'); // from Jollof Rice
    expect(system).toContain('fish'); // allergen from Egusi Soup
  });

  it('still lists unavailable items in the prompt (no filtering)', async () => {
    await POST(chatRequest([{ role: 'user', content: 'hi' }]));
    expect(systemPrompt()).toContain('Suya Platter');
  });

  it('calls streamText with the right model and params', async () => {
    const messages = [{ role: 'user', content: 'recommend something' }];
    await POST(chatRequest(messages));

    const arg = mocks.streamText.mock.calls[0][0];
    expect(arg.model).toEqual({ __model: 'gpt-4o' });
    expect(arg.messages).toEqual(messages);
    expect(arg.maxTokens).toBe(400);
    expect(arg.temperature).toBe(0.7);
  });

  it('returns exactly what toDataStreamResponse() returns', async () => {
    const res = await POST(chatRequest([{ role: 'user', content: 'hi' }]));
    expect(res).toBe(mocks.dataStreamResponse);
  });

  it('does not cache menu data across requests', async () => {
    mocks.getMenu.mockReset();
    mocks.getMenu.mockResolvedValueOnce(fixtureA).mockResolvedValueOnce(fixtureB);

    await POST(chatRequest([{ role: 'user', content: 'first' }]));
    expect(mocks.streamText.mock.calls[0][0].system).toContain('Jollof Rice');

    await POST(chatRequest([{ role: 'user', content: 'second' }]));
    const secondSystem = mocks.streamText.mock.calls[1][0].system as string;
    expect(secondSystem).toContain('Chapman');
    expect(secondSystem).not.toContain('Jollof Rice');
    expect(mocks.getMenu).toHaveBeenCalledTimes(2);
  });
});
