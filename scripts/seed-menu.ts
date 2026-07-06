import postgres from 'postgres';
import { categories, menuItems } from '@/lib/menu-data';

// Idempotent: upserts categories and items keyed on `name`, so re-running
// after editing menu-data.ts is safe. Requires migration 001 (unique
// constraints on menu_categories.name and menu_items.name) to have run first.
//
// Connects directly via DATABASE_URL rather than the anon-key supabase-js
// client, since menu_categories/menu_items intentionally have no anon write
// RLS policy.
export async function seedMenu() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_URL is not set. It is required to seed the menu.');
  }

  const sql = postgres(url);
  try {
    const categoryIdByName = new Map<string, string>();

    for (const cat of categories) {
      const [row] = await sql<{ id: string }[]>`
        insert into menu_categories (name, sort_order)
        values (${cat.name}, ${cat.sortOrder})
        on conflict (name) do update set sort_order = excluded.sort_order
        returning id
      `;
      categoryIdByName.set(cat.name, row.id);
    }

    for (const item of menuItems) {
      const staticCategory = categories.find((c) => c.id === item.categoryId);
      const categoryId = staticCategory ? categoryIdByName.get(staticCategory.name) : undefined;

      await sql`
        insert into menu_items (
          name, description, price, is_available, rating, image_url, allergens, dietary_tags, category_id
        )
        values (
          ${item.name}, ${item.description}, ${item.price}, ${item.isAvailable},
          ${item.rating ?? null}, ${item.imageUrl ?? null}, ${item.allergens ?? null},
          ${item.dietaryTags ?? null}, ${categoryId ?? null}
        )
        on conflict (name) do update set
          description  = excluded.description,
          price        = excluded.price,
          is_available = excluded.is_available,
          rating       = excluded.rating,
          image_url    = excluded.image_url,
          allergens    = excluded.allergens,
          dietary_tags = excluded.dietary_tags,
          category_id  = excluded.category_id
      `;
    }
  } finally {
    await sql.end();
  }
}

// CLI entry point, only runs when this file is executed directly
// (`npm run db:seed`), not when imported by tests.
if (require.main === module) {
  seedMenu()
    .then(() => {
      console.log('Menu seeded successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
