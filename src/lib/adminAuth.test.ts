import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateToken, verifyToken, cookieName, cookieOptions } from './adminAuth';

describe('generateToken', () => {
  it('is deterministic — same PIN produces the same token', async () => {
    const a = await generateToken('1234');
    const b = await generateToken('1234');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // hex SHA-256
  });

  it('different PINs produce different tokens', async () => {
    expect(await generateToken('1234')).not.toBe(await generateToken('5678'));
  });
});

describe('verifyToken', () => {
  const OLD = process.env.ADMIN_PIN;
  afterEach(() => { process.env.ADMIN_PIN = OLD; });

  it('returns true for a token generated from the matching ADMIN_PIN', async () => {
    process.env.ADMIN_PIN = '4242';
    expect(await verifyToken(await generateToken('4242'))).toBe(true);
  });

  it('returns false for a wrong token', async () => {
    process.env.ADMIN_PIN = '4242';
    expect(await verifyToken(await generateToken('0000'))).toBe(false);
  });

  it('returns false for an empty token', async () => {
    process.env.ADMIN_PIN = '4242';
    expect(await verifyToken('')).toBe(false);
  });

  it('returns false when ADMIN_PIN is unset', async () => {
    delete process.env.ADMIN_PIN;
    expect(await verifyToken(await generateToken('4242'))).toBe(false);
  });
});

describe('cookieName / cookieOptions', () => {
  it('cookieName is cnd_admin', () => {
    expect(cookieName()).toBe('cnd_admin');
  });

  it('cookieOptions() sets HttpOnly, SameSite=Strict and a positive Max-Age', () => {
    const opts = cookieOptions();
    expect(opts).toContain('HttpOnly');
    expect(opts).toContain('SameSite=Strict');
    const maxAge = Number(opts.match(/Max-Age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThan(0);
  });

  it('cookieOptions(true) clears with Max-Age=0', () => {
    expect(cookieOptions(true)).toContain('Max-Age=0');
  });
});
