import {
  Motorcycle,
  Phone,
  InstagramLogo,
  WhatsappLogo,
  TwitterLogo,
  MapPin,
  EnvelopeSimple,
} from '@phosphor-icons/react/dist/ssr';

const navLinks = [
  { label: 'Menu',         href: '#menu' },
  { label: 'Order Online', href: '#order' },
  { label: 'Delivery',     href: '#delivery' },
  { label: 'About',        href: '#about' },
  { label: 'Contact',      href: '#contact' },
  { label: 'Catering',     href: '#contact' },
];

export default function Footer() {
  return (
    <footer id="contact" style={{ background: 'var(--suya-smoke)' }}>
      <div className="container pt-28 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="flex flex-col gap-5">
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: 'var(--plantain-gold)', display: 'block' }}>
                CHOP
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--ash-white)', letterSpacing: '0.15em' }}>
                &amp; DROP
              </span>
            </div>
            <p style={{ color: 'var(--egusi-cream)', opacity: 0.65, fontSize: '14px', lineHeight: 1.7 }}>
              Authentic Nigerian flavours, continental favourites and everything in between — delivered fast across Lagos and Abuja.
            </p>
            <div className="flex items-start gap-2" style={{ color: 'var(--ash-white)', opacity: 0.55, fontSize: '13px' }}>
              <Motorcycle size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--palm-oil)' }} />
              Lagos Island · Mainland · Abuja
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <h4 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ash-white)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Quick Links
            </h4>
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                style={{ color: 'var(--egusi-cream)', opacity: 0.65, fontSize: '14px', textDecoration: 'none' }}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h4 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ash-white)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Contact
            </h4>
            <a href="tel:+2348012345678" className="flex items-center gap-2.5"
              style={{ color: 'var(--egusi-cream)', opacity: 0.65, fontSize: '14px', textDecoration: 'none' }}>
              <Phone size={15} style={{ color: 'var(--palm-oil)' }} />
              +234 801 234 5678
            </a>
            <a href="mailto:hello@chopanddrop.ng" className="flex items-center gap-2.5"
              style={{ color: 'var(--egusi-cream)', opacity: 0.65, fontSize: '14px', textDecoration: 'none' }}>
              <EnvelopeSimple size={15} style={{ color: 'var(--palm-oil)' }} />
              hello@chopanddrop.ng
            </a>
            <div className="flex items-start gap-2.5" style={{ color: 'var(--egusi-cream)', opacity: 0.65, fontSize: '14px' }}>
              <MapPin size={15} style={{ color: 'var(--palm-oil)', flexShrink: 0, marginTop: '2px' }} />
              14 Balarabe Musa Crescent, Victoria Island, Lagos
            </div>
            <p style={{ color: 'var(--egusi-cream)', opacity: 0.45, fontSize: '12px', marginTop: '4px' }}>
              Mon–Sun: 9 AM – 11 PM
            </p>
          </div>

          {/* Socials + Newsletter */}
          <div className="flex flex-col gap-5">
            <h4 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ash-white)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Follow Us
            </h4>
            <div className="flex gap-3">
              {[
                { icon: <InstagramLogo size={20} />, href: '#', label: 'Instagram' },
                { icon: <TwitterLogo size={20} />,   href: '#', label: 'Twitter/X' },
                { icon: <WhatsappLogo size={20} />,  href: '#', label: 'WhatsApp' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(196,82,26,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--palm-oil)',
                    textDecoration: 'none',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <p style={{ color: 'var(--ash-white)', fontSize: '13px', fontWeight: 600 }}>Get weekly deals</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(250,246,240,0.15)',
                    background: 'rgba(250,246,240,0.06)',
                    color: 'var(--ash-white)',
                    fontSize: '13px',
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                <button className="btn-primary" style={{ padding: '10px 14px', fontSize: '13px', flexShrink: 0 }}>
                  Join
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--stew-red)' }}>
        <div className="container py-4 flex flex-wrap items-center justify-between gap-3">
          <p style={{ color: 'var(--ash-white)', opacity: 0.4, fontSize: '12px' }}>
            &copy; {new Date().getFullYear()} Chop &amp; Drop. All rights reserved.
          </p>
          <p style={{ color: 'var(--ash-white)', opacity: 0.35, fontSize: '12px' }}>
            Made in Lagos &nbsp;&middot;&nbsp; Powered by Paystack
          </p>
        </div>
      </div>
    </footer>
  );
}
