import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'LORO — HR, time tracking and workforce platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 45%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.04em',
          }}
        >
          LORO
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            marginTop: 20,
            textAlign: 'center',
            maxWidth: 920,
            lineHeight: 1.25,
          }}
        >
          HR, attendance, payroll & field performance — built for South Africa
        </div>
      </div>
    ),
    { ...size }
  );
}
