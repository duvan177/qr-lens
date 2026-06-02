import { createRoot } from 'react-dom/client';
import { useState, useRef } from 'react';
import { QRScanner } from '../src';
import type { ScanResult, QRScannerHandle } from '../src';

type Locale = 'es' | 'en' | 'pt';

function App() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [locale, setLocale] = useState<Locale>('es');
  const [paused, setPaused] = useState(false);
  const ref = useRef<QRScannerHandle>(null);

  const handleScan = (_value: string, result: ScanResult) => {
    setScans((prev) => [result, ...prev].slice(0, 5));
  };

  return (
    <div style={{ width: '100%', maxWidth: 520, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>
        qr-lens{' '}
        <span style={{ opacity: 0.35, fontSize: 14, fontWeight: 400 }}>demo</span>
      </h1>

      <QRScanner
        ref={ref}
        onScan={handleScan}
        onError={(e) => console.error('[qr-lens]', e)}
        locale={locale}
        paused={paused}
        scanDelay={600}
        showCameraSwitch
        showTorch
        style={{ borderRadius: 20 }}
        width="100%"
        height={300}
      />

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setPaused((p) => !p)}
          style={paused ? { ...btn, ...btnPrimary } : btn}
        >
          {paused ? (
            <><PlayIcon /> Reanudar</>
          ) : (
            <><PauseIcon /> Pausar</>
          )}
        </button>

        <div style={divider} />

        {(['es', 'en', 'pt'] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            style={locale === l ? { ...btn, ...btnActive } : btn}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Historial */}
      {scans.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <p style={sectionLabel}>Últimas lecturas</p>
          {scans.map((s, i) => (
            <div key={i} style={{ ...scanRow, opacity: 1 - i * 0.16 }}>
              <span style={scanFormat}>{s.format}</span>
              <span style={scanValue}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 36,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  letterSpacing: '-0.1px',
  cursor: 'pointer',
  transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
  outline: 'none',
  whiteSpace: 'nowrap',
};

const btnActive: React.CSSProperties = {
  background: 'rgba(255,255,255,0.13)',
  borderColor: 'rgba(255,255,255,0.22)',
  color: '#fff',
};

const btnPrimary: React.CSSProperties = {
  background: 'rgba(48,209,88,0.18)',
  borderColor: 'rgba(48,209,88,0.45)',
  color: '#30D158',
};

const divider: React.CSSProperties = {
  width: 1,
  height: 36,
  background: 'rgba(255,255,255,0.08)',
  margin: '0 2px',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  margin: '0 0 8px',
};

const scanRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  marginBottom: 4,
};

const scanFormat: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#30D158',
  flexShrink: 0,
};

const scanValue: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  wordBreak: 'break-all',
  lineHeight: 1.4,
};

// ─── Iconos SVG ──────────────────────────────────────────────────────────────

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="3" width="4" height="18" rx="1.5"/>
      <rect x="15" y="3" width="4" height="18" rx="1.5"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4.75a.75.75 0 0 1 1.14-.64l13 7.25a.75.75 0 0 1 0 1.28l-13 7.25A.75.75 0 0 1 6 19.25V4.75z"/>
    </svg>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
