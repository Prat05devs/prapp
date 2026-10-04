import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 72,
        background: '#f7f5ef',
        color: '#162a35',
      }}
    >
      <div style={{ fontSize: 42, fontWeight: 700 }}>NewsVio</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 66, fontWeight: 700 }}>Check the facts. Share your story.</div>
        <div style={{ fontSize: 30 }}>Fact checking with sources. Self-service PR in India.</div>
      </div>
      <div style={{ fontSize: 25 }}>News portals · Instagram · Live publication links</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
