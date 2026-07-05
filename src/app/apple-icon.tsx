import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#1A1008',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          border: '4px solid #E8A020',
        }}
      >
        <div style={{ fontFamily: 'sans-serif', fontWeight: 900, fontSize: 58, color: '#E8A020', lineHeight: 1.1, letterSpacing: '-2px' }}>
          C&D
        </div>
        <div style={{ fontFamily: 'sans-serif', fontWeight: 600, fontSize: 18, color: '#FAF6F0', letterSpacing: '4px', opacity: 0.7, marginTop: 2 }}>
          NAIJA
        </div>
      </div>
    ),
    { ...size }
  );
}
