import Image from 'next/image';
import { Fire, Motorcycle, SealCheck } from '@phosphor-icons/react/dist/ssr';

const features = [
  {
    icon: <Fire size={22} weight="duotone" style={{ color: 'var(--plantain-gold)' }} />,
    title: 'Fresh Daily',
    body: 'Every dish is cooked to order. No reheats, no shortcuts — from our kitchen to your door the same day.',
  },
  {
    icon: <Motorcycle size={22} weight="duotone" style={{ color: 'var(--plantain-gold)' }} />,
    title: 'Fast Delivery',
    body: 'Lagos Island, Mainland and Abuja covered. Average 30–45 minutes from confirmation to your doorstep.',
  },
  {
    icon: <SealCheck size={22} weight="duotone" style={{ color: 'var(--plantain-gold)' }} />,
    title: 'Authentic Recipes',
    body: 'Family recipes passed down through generations — jollof, egusi, suya, and everything in between, made right.',
  },
];

export default function FeatureCallout() {
  return (
    <section id="about" style={{ background: 'var(--suya-smoke)' }} className="py-28">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* Left — food image */}
          <div
            style={{
              borderRadius: '20px',
              border: '1px solid rgba(232,160,32,0.15)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '400px',
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1638436684761-7e59f8a9072f?w=800&h=600&q=80&auto=format&fit=crop"
              alt="Spread of authentic Nigerian dishes"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(26,16,8,0.35) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Right — text */}
          <div className="flex flex-col gap-10">
            <div>
              <span className="pill" style={{ background: 'var(--palm-oil)', color: 'var(--ash-white)', display: 'inline-flex' }}>
                Our Story
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  color: 'var(--ash-white)',
                  lineHeight: 1.2,
                  marginTop: '12px',
                }}
              >
                Why We&apos;re Different
              </h2>
              <p style={{ color: 'var(--egusi-cream)', opacity: 0.8, marginTop: '20px', fontSize: '17px', lineHeight: 1.8 }}>
                We started Chop &amp; Drop because great Nigerian food deserved the same speed and care as any world-class delivery brand.
              </p>
            </div>

            <div className="flex flex-col gap-8">
              {features.map((f) => (
                <div key={f.title} className="flex gap-5 items-start">
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'rgba(196,82,26,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--ash-white)', fontWeight: 600, fontSize: '17px', marginBottom: '8px' }}>
                      {f.title}
                    </h3>
                    <p style={{ color: 'var(--egusi-cream)', opacity: 0.7, fontSize: '15px', lineHeight: 1.75 }}>
                      {f.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
