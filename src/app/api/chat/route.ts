import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getMenu } from '@/lib/menu-repo';
import { MenuCategory, MenuItem } from '@/types';

export const runtime = 'edge';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildMenuContext(categories: MenuCategory[], menuItems: MenuItem[]): string {
  return categories
    .map((cat) => {
      const items = menuItems.filter((i) => i.categoryId === cat.id);
      const lines = items.map(
        (i) =>
          `  - ${i.name} (₦${i.price.toLocaleString('en-NG')})${i.dietaryTags?.length ? ` [${i.dietaryTags.join(', ')}]` : ''}${i.allergens?.length ? ` | Allergens: ${i.allergens.join(', ')}` : ''}: ${i.description}`
      );
      return `${cat.name}:\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

function buildSystemPrompt(menuContext: string): string {
  return `You are the friendly AI assistant for Chop & Drop, a Nigerian restaurant that delivers across Lagos and Abuja.
You help customers with:
1. Menu recommendations based on preferences, mood or dietary needs
2. Dietary filtering — vegan, gluten-free, allergen-aware guidance
3. Order status queries (tell them to use the Track Order input on the site with their order ID)
4. Delivery zone and ETA questions (Lagos Island 25–35 min, Lagos Mainland 30–45 min, Abuja 40–55 min)
5. General questions about the restaurant

Keep responses concise (2–4 sentences max unless listing items). Speak warmly and with Nigerian cultural awareness.
Never make up information not in the menu below.

Current Menu:
${menuContext}

Free delivery on orders above ₦5,000. Payment via Paystack.`;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Menu context comes from getMenu(), which caches successful DB reads for
  // a short TTL (see menu-repo.ts) rather than hitting Supabase every message.
  const { categories, items } = await getMenu();
  const menuContext = buildMenuContext(categories, items);

  const result = await streamText({
    model: openai('gpt-4o'),
    system: buildSystemPrompt(menuContext),
    messages,
    maxTokens: 400,
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
