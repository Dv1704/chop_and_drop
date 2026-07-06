import { NextRequest, NextResponse } from 'next/server';
import { getMenu } from '@/lib/menu-repo';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search   = searchParams.get('q')?.toLowerCase();
  const dietary  = searchParams.get('dietary');

  const { categories, items: allItems } = await getMenu();
  let items = category ? allItems.filter((i) => i.categoryId === category) : allItems;

  if (search) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search)
    );
  }

  if (dietary) {
    items = items.filter((i) => i.dietaryTags?.includes(dietary));
  }

  return NextResponse.json({ categories, items });
}
