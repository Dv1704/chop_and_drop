import { NextRequest, NextResponse } from 'next/server';
import { menuItems, categories, getItemsByCategory } from '@/lib/menu-data';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search   = searchParams.get('q')?.toLowerCase();
  const dietary  = searchParams.get('dietary');

  let items = category ? getItemsByCategory(category) : menuItems;

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
