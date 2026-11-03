import { useEffect, useState } from 'react';

// Registra cada applyConstraints para ver en el móvil el re-enfoque y el zoom
type ConstraintLog = { t: number; set: string };
const logs: ConstraintLog[] = [];
const listeners = new Set<() => void>();

if (typeof MediaStreamTrack !== 'undefined' && !(MediaStreamTrack.prototype as { _qrlPatched?: boolean })._qrlPatched) {
  const original = MediaStreamTrack.prototype.applyConstraints;
  MediaStreamTrack.prototype.applyConstraints = function (c?: MediaTrackConstraints) {
    const set = Object.assign({}, ...(c?.advanced ?? []));
    logs.unshift({ t: Date.now(), set: JSON.stringify(set) });
    logs.length = Math.min(logs.length, 8);
    listeners.forEach((l) => l());
    return original.call(this, c);
  };
  (MediaStreamTrack.prototype as { _qrlPatched?: boolean })._qrlPatched = true;
}

type Snapshot = {
  label: string;
  settings: Record<string, unknown>;
  caps: Record<string, unknown>;
};

function readTrack(): Snapshot | null {
  const video = document.querySelector('video');
  const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0];
  if (!track) return null;
  return {
    label: track.label,
    settings: track.getSettings() as Record<string, unknown>,
    caps: (track.getCapabilities?.() ?? {}) as Record<string, unknown>,
  };
}

const fmt = (v: unknown) => (v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function CameraDiagnostics() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSnap(readTrack()), 500);
    const onLog = () => force((n) => n + 1);
    listeners.add(onLog);
    navigator.mediaDevices?.enumerateDevices?.().then((d) => setCams(d.filter((x) => x.kind === 'videoinput')));
    return () => { clearInterval(id); listeners.delete(onLog); };
  }, [snap?.label]);

  const s = snap?.settings ?? {};
  const c = snap?.caps ?? {};
  const rows: [string, unknown][] = [
    ['Cámara', snap?.label],
    ['Resolución', s.width ? `${s.width}×${s.height}` : undefined],
    ['focusMode (actual)', s.focusMode],
    ['focusMode (soportados)', c.focusMode],
    ['zoom (actual)', s.zoom],
    ['zoom (rango)', c.zoom],
    ['torch', 'torch' in c ? 'soportado' : 'no'],
  ];

  return (
    <details style={panel} open>
      <summary style={summary}>Diagnóstico de cámara</summary>
      {!snap ? (
        <p style={muted}>Esperando stream…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={key}>{k}</td>
                <td style={val}>{fmt(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={label}>Cámaras ({cams.length})</p>
      {cams.map((cam) => (
        <div key={cam.deviceId} style={{ ...val, opacity: cam.label === snap?.label ? 1 : 0.5 }}>
          {cam.label === snap?.label ? '● ' : '○ '}{cam.label || cam.deviceId.slice(0, 8)}
        </div>
      ))}

      <p style={label}>applyConstraints (más reciente primero)</p>
      {logs.length === 0 ? (
        <p style={muted}>Ninguno todavía</p>
      ) : (
        logs.map((l, i) => (
          <div key={i} style={val}>
            <span style={muted}>{new Date(l.t).toLocaleTimeString()}</span> {l.set}
          </div>
        ))
      )}
    </details>
  );
}

const panel: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  fontSize: 12,
};
const summary: React.CSSProperties = { cursor: 'pointer', fontWeight: 600, marginBottom: 8 };
const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  margin: '12px 0 4px',
};
const key: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' };
const val: React.CSSProperties = { color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', padding: '2px 0' };
const muted: React.CSSProperties = { color: 'rgba(255,255,255,0.4)' };
