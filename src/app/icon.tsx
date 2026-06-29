import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1A1008',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #E8A020',
        }}
      >
        <div
          style={{
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fontSize: 14,
            color: '#E8A020',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          C&D
        </div>
      </div>
    ),
    { ...size }
  );
}
