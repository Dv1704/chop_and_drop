'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from '@phosphor-icons/react';

function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pin }),
    });

    if (res.ok) {
      const dest = params.get('from') ?? '/admin';
      router.replace(dest);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Wrong PIN');
      setPin('');
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--suya-smoke)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--ash-white)', borderRadius: '16px', padding: '40px 36px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(196,82,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={24} style={{ color: 'var(--palm-oil)' }} weight="fill" />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--suya-smoke)', marginBottom: '6px' }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--suya-smoke)', opacity: 0.5, marginBottom: '28px' }}>
          Chop & Drop
        </p>

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          autoFocus
          required
          style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: `2px solid ${error ? 'var(--stew-red)' : 'rgba(26,16,8,0.15)'}`, background: 'var(--egusi-cream)', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', color: 'var(--suya-smoke)', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
        />

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--stew-red)', fontWeight: 600, marginBottom: '12px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || pin.length === 0}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
