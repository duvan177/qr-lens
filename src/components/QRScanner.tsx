import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  type CSSProperties,
} from 'react';
import { useQRScanner } from '../hooks/useQRScanner';
import { getMessages } from '../i18n/messages';
import type { QRScannerHandle, QRScannerProps, QRScannerTheme } from '../types';

// ─── Estilos globales (keyframes) ────────────────────────────────────────────

let _stylesInjected = false;

function injectGlobalStyles() {
  if (typeof document === 'undefined' || _stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.dataset['qrLens'] = '1';
  style.textContent = `
    @keyframes _qrl-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes _qrl-fade-up {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes _qrl-flash {
      0%   { opacity: 0; }
      15%  { opacity: 0.35; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Tema por defecto ─────────────────────────────────────────────────────────

const DEFAULT_THEME: Required<QRScannerTheme> = {
  accent: '#30D158',
  primary: '#FFFFFF',
  bg: 'rgba(10, 10, 12, 0.92)',
  overlay: 'rgba(0, 0, 0, 0.60)',
  text: '#FFFFFF',
  radius: '18px',
};

// ─── Estilos base ─────────────────────────────────────────────────────────────

const BASE: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 320,
    background: 'var(--qr-bg)',
    borderRadius: 'var(--qr-radius)',
    color: 'var(--qr-text)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    WebkitFontSmoothing: 'antialiased',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  stateOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    background: 'var(--qr-overlay)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    animation: '_qrl-fade-up 280ms ease-out',
  },
  stateIcon: {
    fontSize: 40,
    lineHeight: 1,
    marginBottom: 4,
  },
  stateTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.3px',
    textAlign: 'center',
    color: 'var(--qr-text)',
  },
  stateSubtitle: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    opacity: 0.72,
    textAlign: 'center',
    maxWidth: 280,
    color: 'var(--qr-text)',
  },
  hint: {
    position: 'absolute',
    bottom: 56,
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '-0.2px',
    color: 'rgba(255,255,255,0.82)',
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '6px 14px',
    borderRadius: 999,
    animation: '_qrl-fade-up 300ms ease-out',
    pointerEvents: 'none',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'flex',
    gap: 10,
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    cursor: 'pointer',
    fontSize: 18,
    transition: 'background 160ms ease, transform 120ms ease',
    outline: 'none',
  },
  controlBtnText: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 34,
    padding: '0 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    letterSpacing: '-0.1px',
    transition: 'background 160ms ease',
    outline: 'none',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.18)',
    borderTopColor: 'var(--qr-primary)',
    animation: '_qrl-spin 800ms linear infinite',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    color: 'var(--qr-text)',
    fontSize: 14,
    opacity: 0.85,
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const QRScanner = forwardRef<QRScannerHandle, QRScannerProps>(
  function QRScanner(
    {
      onScan,
      onError,
      onPermissionChange,
      onCameraChange,
      onReady,
      facingMode = 'environment',
      deviceId,
      paused = false,
      scanDelay = 500,
      formats = ['qr_code'],
      theme = {},
      locale = 'en',
      messages: messageOverrides,
      width,
      height,
      showCameraSwitch = true,
      showTorch = true,
      className,
      style,
    },
    ref
  ) {
    useEffect(injectGlobalStyles, []);

    const msgs = getMessages(locale, messageOverrides);
    const t = { ...DEFAULT_THEME, ...theme };

    const cssVars = {
      '--qr-accent': t.accent,
      '--qr-primary': t.primary,
      '--qr-bg': t.bg,
      '--qr-overlay': t.overlay,
      '--qr-text': t.text,
      '--qr-radius': t.radius,
    } as CSSProperties;

    const scanner = useQRScanner({
      onScan,
      onError,
      onPermissionChange,
      onCameraChange,
      onReady,
      facingMode,
      deviceId,
      paused,
      scanDelay,
      formats,
    });

    useImperativeHandle(
      ref,
      () => ({
        start: scanner.start,
        stop: scanner.stop,
        pause: scanner.pause,
        resume: scanner.resume,
        switchCamera: scanner.switchCamera,
        getCameras: scanner.getCameras,
        setTorch: scanner.setTorch,
      }),
      [scanner]
    );

    const rootStyle: CSSProperties = {
      ...BASE.root,
      ...cssVars,
      ...(width != null && { width }),
      ...(height != null && { height }),
      ...style,
    };

    // ── Estado: acceso denegado ──────────────────────────────────────────────
    if (scanner.permissionStatus === 'denied') {
      return (
        <div style={rootStyle} className={className} role="alert" aria-live="assertive">
          <div style={BASE.stateOverlay}>
            <span style={BASE.stateIcon} aria-hidden="true">⛔</span>
            <p style={BASE.stateTitle}>{msgs.permissionDenied}</p>
            <p style={BASE.stateSubtitle}>{msgs.permissionDeniedInstructions}</p>
          </div>
        </div>
      );
    }

    // ── Estado: sin cámara / no soportado ────────────────────────────────────
    if (scanner.permissionStatus === 'unavailable') {
      return (
        <div style={rootStyle} className={className} role="alert" aria-live="assertive">
          <div style={BASE.stateOverlay}>
            <span style={BASE.stateIcon} aria-hidden="true">📵</span>
            <p style={BASE.stateTitle}>{msgs.noCamera}</p>
          </div>
        </div>
      );
    }

    // ── Vista principal ──────────────────────────────────────────────────────
    return (
      <div style={rootStyle} className={className}>
        {/* Frame de vídeo */}
        <video
          ref={scanner.videoRef}
          style={BASE.video}
          autoPlay
          playsInline
          muted
          aria-hidden="true"
        />

        {/* Canvas de overlay (retícula + borde QR) */}
        <canvas ref={scanner.canvasRef} style={BASE.canvas} aria-hidden="true" />

        {/* Loading */}
        {!scanner.isReady && (
          <div style={BASE.loadingWrap} role="status" aria-live="polite">
            <div style={BASE.spinner} role="progressbar" aria-label={msgs.loading} />
            <span>{msgs.loading}</span>
          </div>
        )}

        {/* Hint de uso */}
        {scanner.isReady && (
          <div style={BASE.hint} aria-live="polite">
            {msgs.aimAtQR}
          </div>
        )}

        {/* Flash — esquina superior derecha */}
        {scanner.isReady && showTorch && (
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <button
              style={{
                ...BASE.controlBtn,
                ...(scanner.torchOn
                  ? {
                      background: 'rgba(255,214,10,0.28)',
                      boxShadow: '0 0 12px rgba(255,214,10,0.45)',
                      color: '#FFD60A',
                    }
                  : {}),
                ...(!scanner.torchSupported
                  ? { opacity: 0.35, cursor: 'not-allowed' }
                  : {}),
              }}
              onClick={() => scanner.torchSupported && scanner.setTorch(!scanner.torchOn)}
              aria-label={msgs.toggleTorch}
              aria-pressed={scanner.torchOn}
              aria-disabled={!scanner.torchSupported}
              title={scanner.torchSupported ? msgs.toggleTorch : 'Flash no disponible en este dispositivo'}
            >
              <FlashIcon on={scanner.torchOn} />
            </button>
          </div>
        )}

        {/* Cambiar cámara — esquina inferior derecha */}
        {scanner.isReady && showCameraSwitch && (
          <div style={BASE.controls}>
            <button
              style={BASE.controlBtnText}
              onClick={scanner.switchCamera}
              aria-label={msgs.switchCamera}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 7h-3.5a2 2 0 0 0-1.6.8L13 10H8L6.1 7.8A2 2 0 0 0 4.5 7H1v14h22V7h-3zm-8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
              </svg>
              {msgs.switchCamera}
            </button>
          </div>
        )}
      </div>
    );
  }
);

QRScanner.displayName = 'QRScanner';

function FlashIcon({ on }: { on: boolean }) {
  return on ? (
    // Rayo relleno — flash encendido
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L10 22l9.5-11.5H13L13 2Z" />
    </svg>
  ) : (
    // Rayo outline — flash apagado
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L10 22l9.5-11.5H13L13 2Z" />
    </svg>
  );
}
