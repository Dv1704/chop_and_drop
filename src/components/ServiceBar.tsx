import { DeviceMobile, ForkKnife, Users, Motorcycle } from '@phosphor-icons/react/dist/ssr';

const services = [
  { icon: <DeviceMobile size={24} weight="duotone" />, label: 'Online Booking' },
  { icon: <ForkKnife size={24} weight="duotone" />,    label: 'Catering Service' },
  { icon: <Users size={24} weight="duotone" />,        label: 'Membership' },
  { icon: <Motorcycle size={24} weight="duotone" />,   label: 'Fast Delivery' },
];

export default function ServiceBar() {
  return (
    <section style={{ background: 'var(--palm-oil)' }}>
      <div className="container py-5">
        <div className="flex justify-center items-center flex-wrap gap-0">
          {services.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div
                className="flex items-center gap-3 px-8 py-4"
                style={{ color: 'var(--ash-white)' }}
              >
                {s.icon}
                <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < services.length - 1 && (
                <div style={{ width: '1px', height: '24px', background: 'var(--stew-red)', opacity: 0.6 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
