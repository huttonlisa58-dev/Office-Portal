'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => { if (typeof console !== 'undefined') console.error('Global error:', error); }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: 560, width: '100%', background: '#fff', border: '1px solid #fecaca', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>⚠️</div>
            <h2 style={{ margin: '12px 0 4px', fontSize: 18, color: '#0f172a' }}>Something went wrong</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>The app hit an unexpected error while loading. Try again — if it keeps happening, the details below help us fix it fast.</p>
            <pre style={{ marginTop: 16, maxHeight: 180, overflow: 'auto', background: '#fef2f2', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, textAlign: 'left', fontSize: 12, whiteSpace: 'pre-wrap' }}>{(error && (error.message || String(error))) || 'Unknown error'}{error && error.digest ? `\n\ndigest: ${error.digest}` : ''}</pre>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => reset()} style={{ background: '#0284c7', color: '#fff', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
              <a href="/dashboard" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 14, color: '#475569', textDecoration: 'none' }}>Reload</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
