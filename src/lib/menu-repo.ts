import { supabase, supabaseReady } from '@/lib/supabase';
import { categories as staticCategories, menuItems as staticMenuItems } from '@/lib/menu-data';
import { MenuCategory, MenuItem } from '@/types';

type MenuData = { categories: MenuCategory[]; items: MenuItem[] };

function staticFallback(): MenuData {
  return { categories: staticCategories, items: staticMenuItems };
}

function mapCategory(row: Record<string, unknown>): MenuCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    price: Number(row.price),
    isAvailable: Boolean(row.is_available),
    rating: row.rating != null ? Number(row.rating) : undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    allergens: (row.allergens as string[] | null) ?? undefined,
    dietaryTags: (row.dietary_tags as string[] | null) ?? undefined,
  };
}

// Reads menu/category data from Supabase, mapping DB snake_case columns to
// the existing camelCase MenuItem/MenuCategory shape every consumer expects.
// Falls back to the static file if Supabase isn't configured, or if a query
// errors at runtime. This function must never throw.
export async function getMenu(): Promise<MenuData> {
  if (!supabaseReady) return staticFallback();

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('menu_items').select('*').order('name', { ascending: true }),
  ]);

  if (categoriesRes.error || itemsRes.error) {
    console.error('[menu-repo] Supabase query error, falling back to static menu:', categoriesRes.error ?? itemsRes.error);
    return staticFallback();
  }

  return {
    categories: (categoriesRes.data ?? []).map(mapCategory),
    items: (itemsRes.data ?? []).map(mapItem),
  };
}
