import Image from 'next/image';
import { ArrowRight, Clock, Fire } from '@phosphor-icons/react/dist/ssr';

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{ background: 'var(--suya-smoke)', minHeight: '90vh', display: 'flex', alignItems: 'center' }}
    >
      {/* Suya glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 70% 50%, rgba(196,82,26,0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div className="container relative" style={{ zIndex: 2 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-20 md:py-28">

          {/* Left — text */}
          <div className="flex flex-col gap-7">
            <span
              className="pill"
              style={{ background: 'var(--stew-red)', color: 'var(--ash-white)', alignSelf: 'flex-start' }}
            >
              <Fire size={14} weight="fill" />
              NAIJA EATS
            </span>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(36px, 6vw, 68px)',
                lineHeight: 1.1,
                color: 'var(--ash-white)',
                letterSpacing: '-0.02em',
              }}
            >
              Real Naija Food.
              <br />
              <span style={{ color: 'var(--plantain-gold)' }}>Right At Your</span>
              <br />
              Door.
            </h1>

            <p style={{ color: 'var(--egusi-cream)', opacity: 0.85, fontSize: '17px', maxWidth: '480px', lineHeight: 1.7 }}>
              From smoky suya to creamy egusi, crispy wings to rich pasta — authentic flavours, fast delivery, every day.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <a href="#order" className="btn-primary">
                Order Now <ArrowRight size={18} weight="bold" />
              </a>
              <a href="#menu" className="btn-outline">
                See Menu
              </a>
            </div>

            <div className="flex flex-wrap gap-6 mt-4">
              {[
                { value: '30–45', label: 'min avg delivery' },
                { value: '4.9',   label: 'customer rating' },
                { value: '50+',   label: 'dishes on menu' },
              ].map((stat) => (
                <div key={stat.label}>
                  <span style={{ fontFamily: 'var(--font-price)', fontSize: '20px', fontWeight: 700, color: 'var(--plantain-gold)' }}>
                    {stat.value}
                  </span>
                  <p style={{ color: 'var(--ash-white)', opacity: 0.6, fontSize: '12px', marginTop: '2px' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — food image */}
          <div className="relative flex justify-center items-center">
            {/* Gold ring frame */}
            <div
              style={{
                width: 'clamp(280px, 40vw, 460px)',
                height: 'clamp(280px, 40vw, 460px)',
                borderRadius: '50%',
                border: '4px solid var(--plantain-gold)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 80px rgba(232,160,32,0.22), 0 0 0 1px rgba(232,160,32,0.1)',
                flexShrink: 0,
              }}
            >
              <Image
                src="https://plus.unsplash.com/premium_photo-1694141252026-3df1de888a21?w=900&h=900&q=85&auto=format&fit=crop"
                alt="Nigerian jollof rice and assorted dishes"
                fill
                priority
                sizes="(max-width: 768px) 280px, 460px"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
              {/* warm overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,16,8,0.15)' }} />
            </div>

            {/* Floating ETA badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '10%',
                right: '0',
                background: 'var(--egusi-cream)',
                color: 'var(--suya-smoke)',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-warm)',
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                zIndex: 3,
              }}
            >
              <Clock size={16} weight="bold" style={{ color: 'var(--palm-oil)' }} />
              30–45 min delivery
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
