import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, cookieName } from '@/lib/adminAuth';
import { _clearMenuCache } from '@/lib/menu-repo';
import postgres from 'postgres';

// postgres.js needs Node's net/tls, not available in the edge runtime.
export const runtime = 'nodejs';

// PATCH /api/admin/menu  { itemId, isAvailable }
// Cookie-protected, same as api/admin/orders. Writes via DATABASE_URL
// directly (bypassing RLS as a privileged connection) rather than the
// anon-key supabase-js client, since menu_items intentionally has no anon
// write policy — the anon key ships in the browser bundle, so an anon write
// policy would let any site visitor rewrite the menu (see
// docs/ultraship/specs/2026-07-06-db-backed-menu-stock-design.md, "Write
// access for seeding").
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value ?? '';
  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId, isAvailable } = await req.json().catch(() => ({}));
  if (!itemId || typeof isAvailable !== 'boolean') {
    return NextResponse.json({ error: 'itemId and a boolean isAvailable are required' }, { status: 400 });
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const sql = postgres(url);
  try {
    await sql`update menu_items set is_available = ${isAvailable} where id = ${itemId}`;
  } catch (err) {
    console.error('[admin/menu] update error:', err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  } finally {
    await sql.end();
  }

  // Best-effort: picked up immediately if this route and api/menu happen to
  // share a warm serverless instance; otherwise the existing 60s TTL applies.
  _clearMenuCache();

  return NextResponse.json({ ok: true });
}

// POST /api/admin/menu  { name, price, categoryId, description?, imageUrl?, allergens?, dietaryTags? }
// Adds a new menu item. New items start available. imageUrl is stored as a
// plain string (a URL) — no file upload handling here, that's a separate,
// not-yet-built piece.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value ?? '';
  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, price, categoryId, description, imageUrl, allergens, dietaryTags } = await req.json().catch(() => ({}));

  if (typeof name !== 'string' || !name.trim() || typeof price !== 'number' || price < 0 || typeof categoryId !== 'string' || !categoryId) {
    return NextResponse.json({ error: 'name, a non-negative price, and categoryId are required' }, { status: 400 });
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const sql = postgres(url);
  let id: string;
  try {
    const [row] = await sql<{ id: string }[]>`
      insert into menu_items (name, description, price, category_id, image_url, allergens, dietary_tags, is_available)
      values (${name.trim()}, ${description ?? ''}, ${price}, ${categoryId}, ${imageUrl ?? null}, ${allergens ?? null}, ${dietaryTags ?? null}, true)
      returning id
    `;
    id = row.id;
  } catch (err) {
    console.error('[admin/menu] insert error:', err);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  } finally {
    await sql.end();
  }

  _clearMenuCache();

  return NextResponse.json({ ok: true, id });
}
