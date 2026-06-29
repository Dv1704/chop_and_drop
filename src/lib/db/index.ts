import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? '';

// Only connect when a proper postgres:// URL is configured.
// If DATABASE_URL is blank or a Supabase API key, skip the pg driver.
const isPostgresUrl = url.startsWith('postgresql://') || url.startsWith('postgres://');

export const db = isPostgresUrl
  ? drizzle(postgres(url), { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export const dbReady = isPostgresUrl;
