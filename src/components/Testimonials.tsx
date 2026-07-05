import { Star } from '@phosphor-icons/react/dist/ssr';

const reviews = [
  {
    name: 'Adaeze O.',
    location: 'Victoria Island, Lagos',
    rating: 5,
    text: "The egusi soup tasted exactly like my grandmother's. Delivered hot in 35 minutes. Chop & Drop is the real deal.",
  },
  {
    name: 'Emeka N.',
    location: 'Ikeja, Lagos',
    rating: 5,
    text: 'Ordered the jollof rice and suya platter for the family. Every single item was on point. The smoky jollof hit different.',
  },
  {
    name: 'Fatima B.',
    location: 'Wuse 2, Abuja',
    rating: 5,
    text: "I've tried every delivery app in Abuja — nothing comes close. The Continental options are restaurant-quality. Obsessed.",
  },
  {
    name: 'Damilola A.',
    location: 'Surulere, Lagos',
    rating: 5,
    text: 'Chicken wings with suya dry rub?! That\'s a cheat code. The cheeseburger is also stupid good. My new weekly order.',
  },
  {
    name: 'Ngozi C.',
    location: 'Lekki Phase 1, Lagos',
    rating: 5,
    text: 'The AI chat helped me find vegan options I didn\'t know existed on the menu. The kunu aya is incredible.',
  },
  {
    name: 'Tunde S.',
    location: 'Yaba, Lagos',
    rating: 4,
    text: 'Consistent quality every single time. The puff-puff and honey dessert is dangerous — I order it every week.',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" style={{ background: '#2E1A0A' }} className="py-28">
      <div className="container">
        <div className="text-center mb-16">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 40px)',
              color: 'var(--ash-white)',
            }}
          >
            What Our Customers Say
          </h2>
          <p style={{ color: 'var(--egusi-cream)', opacity: 0.65, marginTop: '14px', fontSize: '16px' }}>
            Over 10,000 satisfied orders across Lagos and Abuja
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((r) => (
            <div
              key={r.name}
              style={{
                background: 'var(--suya-smoke)',
                borderRadius: '20px',
                padding: '32px 28px',
                borderLeft: '3px solid var(--palm-oil)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div className="flex gap-1">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} size={14} weight="fill" style={{ color: 'var(--plantain-gold)' }} />
                ))}
              </div>
              <p style={{ color: 'var(--egusi-cream)', fontSize: '15px', lineHeight: 1.8, flex: 1 }}>
                &ldquo;{r.text}&rdquo;
              </p>
              <div>
                <p style={{ color: 'var(--plantain-gold)', fontWeight: 600, fontSize: '15px' }}>{r.name}</p>
                <p style={{ color: 'var(--ash-white)', opacity: 0.45, fontSize: '12px', marginTop: '2px' }}>{r.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
