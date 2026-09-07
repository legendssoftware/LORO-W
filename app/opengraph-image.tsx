import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'LORO — field sales software for South Africa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const logoBytes = await readFile(join(process.cwd(), 'public/logo.png'));
  const logoSrc = `data:image/png;base64,${Buffer.from(logoBytes).toString('base64')}`;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <img src={logoSrc} width={140} height={100} alt="" />
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
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            marginTop: 28,
            textAlign: 'center',
            maxWidth: 920,
            lineHeight: 1.25,
          }}
        >
          Field sales — visits, routes & pipeline, built for South Africa
        </div>
      </div>
    ),
    { ...size }
  );
}
