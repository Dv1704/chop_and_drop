// HMAC-SHA256 helpers — run in Edge Runtime (no Node crypto module)

const COOKIE_NAME = 'cnd_admin';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

function hexFromBuffer(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generates a deterministic token from the PIN — no session store needed.
// The token is unguessable without knowing the PIN.
export async function generateToken(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(pin),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('cnd-admin-authenticated'));
  return hexFromBuffer(sig);
}

export async function verifyToken(token: string): Promise<boolean> {
  const pin = process.env.ADMIN_PIN;
  if (!pin || !token) return false;
  const expected = await generateToken(pin);
  // Constant-time comparison
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function cookieName() { return COOKIE_NAME; }

export function cookieOptions(clear = false) {
  return [
    `${COOKIE_NAME}=${clear ? '' : ''}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    clear ? `Max-Age=0` : `Max-Age=${COOKIE_MAX_AGE}`,
    process.env.NODE_ENV === 'production' ? `Secure` : '',
  ].filter(Boolean).join('; ');
}
