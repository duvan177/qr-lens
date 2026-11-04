import type { CameraResolution } from '../types';

/** Capabilities de imagen que aún no están en lib.dom (Media Capture Image) */
type ExtendedCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
};

/** Zoom aplicado con `zoom: 'auto'`: obliga a alejar el móvil y quedar sobre la distancia mínima de enfoque */
export const AUTO_ZOOM = 1.5;

/** Constraints de imagen que aplica esta librería */
const IMAGE_CONSTRAINTS = ['focusMode', 'zoom', 'torch'];

/** Espera antes de reintentar: stop() no libera el hardware al instante en algunos Android */
const CAMERA_RELEASE_RETRY_MS = 300;

// Escrituras en curso por track: getConstraints no refleja un applyConstraints
// hasta que termina, así que dos escrituras simultáneas se pisarían
const pendingConstraints = new WeakMap<MediaStreamTrack, Promise<unknown>>();

// Resultado de la búsqueda de cámara con autoenfoque, para no repetirla en cada
// montaje. undefined: sin buscar; null: ninguna cámara mejor que la del navegador
let preferredCameraId: string | null | undefined;

/** Olvida la cámara con autoenfoque recordada */
export function resetPreferredCamera(): void {
  preferredCameraId = undefined;
}

function getCaps(track: MediaStreamTrack): ExtendedCapabilities {
  return (track.getCapabilities?.() ?? {}) as ExtendedCapabilities;
}

/**
 * Aplica constraints avanzadas sin perder las anteriores.
 * applyConstraints reemplaza el set completo, así que sin el merge activar
 * la linterna desharía el zoom o el modo de enfoque. Cada constraint va en su
 * propio set porque un set avanzado es todo o nada, y la nueva va primero
 * porque hay versiones de Chrome que solo aplican el primero sin avisar.
 * Las de imagen salen del set básico: Chrome rechaza mezclarlas en un mismo
 * set con width o facingMode.
 */
function applyAdvanced(track: MediaStreamTrack, set: Record<string, unknown>): Promise<void> {
  const write = async () => {
    const { advanced: prevSets = [], ...basic } = (track.getConstraints?.() ??
      {}) as MediaTrackConstraints & Record<string, unknown>;
    const others: Record<string, unknown> = Object.assign({}, ...prevSets);
    for (const key of IMAGE_CONSTRAINTS) delete basic[key];
    for (const key of Object.keys(set)) delete others[key];
    const advanced = [set, ...Object.entries(others).map(([k, v]) => ({ [k]: v }))];
    await track.applyConstraints({ ...basic, advanced: advanced as MediaTrackConstraintSet[] });
  };
  const result = (pendingConstraints.get(track) ?? Promise.resolve()).then(write, write);
  pendingConstraints.set(track, result);
  return result;
}

/**
 * Solicita acceso a la cámara con el facing mode o deviceId indicados.
 * Lanza NotAllowedError si el usuario deniega, NotFoundError si no hay cámara.
 */
export async function requestCamera(
  facingMode: 'environment' | 'user' = 'environment',
  deviceId?: string,
  resolution: CameraResolution = 'high'
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('getUserMedia not supported'), { name: 'NotSupportedError' });
  }

  const videoConstraints: MediaTrackConstraints & { focusMode?: ConstrainDOMString } = {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
    // Sin resolución explícita muchos móviles entregan 640×480: el QR nunca se ve
    // nítido. frameRate evita que algunas webcams caigan a pocos fps en 1080p
    ...(resolution === 'high' && {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    }),
    // focusMode no está en los tipos estándar aún
    focusMode: { ideal: 'continuous' },
  };

  return navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
}

/** Devuelve todos los dispositivos de vídeo disponibles */
export async function enumerateCameras(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

/** Detiene todos los tracks del stream para liberar la cámara */
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Comprueba si el track soporta linterna (torch) */
export function isTorchSupported(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
  return caps != null && 'torch' in caps;
}

/** Activa o desactiva la linterna del dispositivo */
export async function setTorchState(stream: MediaStream, on: boolean): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error('No video track available');
  await applyAdvanced(track, { torch: on });
}

/**
 * Indica si la cámara tiene autoenfoque continuo.
 * Devuelve null si el navegador no expone focusMode (p. ej. Safari iOS, donde
 * el enfoque lo gestiona el sistema) — en ese caso no se puede saber.
 */
export function supportsContinuousFocus(stream: MediaStream): boolean | null {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  const modes = getCaps(track).focusMode;
  if (!Array.isArray(modes) || modes.length === 0) return null;
  return modes.includes('continuous');
}

/** Activa el autoenfoque continuo si el dispositivo lo soporta */
export async function applyContinuousFocus(stream: MediaStream): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track || !getCaps(track).focusMode?.includes('continuous')) return false;
  await applyAdvanced(track, { focusMode: 'continuous' });
  return true;
}

/**
 * Fuerza un nuevo barrido de enfoque. El enfoque continuo a veces se queda
 * fijado en el fondo; salir de continuous y volver lo reinicia. Reaplicar
 * continuous sin más no cambia nada, por eso se pasa antes por otro modo.
 */
export async function nudgeFocus(stream: MediaStream, settleMs = 600): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const modes = getCaps(track).focusMode ?? [];
  const continuous = modes.includes('continuous');
  const kick = modes.includes('single-shot')
    ? 'single-shot'
    : continuous && modes.includes('manual')
      ? 'manual'
      : null;
  if (kick) {
    await applyAdvanced(track, { focusMode: kick });
    if (!continuous) return;
    await new Promise((r) => setTimeout(r, settleMs));
  }
  if (continuous) await applyAdvanced(track, { focusMode: 'continuous' });
}

/**
 * Aplica zoom al track si está soportado. `'auto'` usa AUTO_ZOOM solo en la
 * cámara trasera. Devuelve el zoom aplicado o null si no se aplicó.
 */
export async function applyZoom(
  stream: MediaStream,
  zoom: number | 'auto'
): Promise<number | null> {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  const range = getCaps(track).zoom;
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return null;
  if (zoom === 'auto' && track.getSettings?.().facingMode === 'user') return null;

  const target = zoom === 'auto' ? AUTO_ZOOM : zoom;
  let value = Math.min(Math.max(target, range.min), range.max);
  if (range.step) {
    const steps = Math.round((value - range.min) / range.step);
    value = Math.min(range.min + steps * range.step, range.max);
  }

  await applyAdvanced(track, { zoom: value });
  return value;
}

/**
 * Ordena las cámaras traseras candidatas, descartando lentes que suelen ser
 * de enfoque fijo (ultra gran angular, macro, profundidad) y el teleobjetivo.
 * En Android las etiquetas siguen el formato "camera2 N, facing back" y la
 * principal suele ser la de menor índice.
 */
export function rankBackCameras(
  cameras: MediaDeviceInfo[],
  excludeDeviceId?: string
): MediaDeviceInfo[] {
  const index = (c: MediaDeviceInfo) => {
    const m = /camera2 (\d+)/i.exec(c.label);
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  return cameras
    .filter((c) => c.deviceId !== excludeDeviceId)
    .filter((c) => /back|rear|environment|trasera|traseira/i.test(c.label))
    .filter((c) => !/ultra|macro|depth|tele/i.test(c.label))
    .sort((a, b) => index(a) - index(b));
}

/** Abre una cámara, reintentando una vez si la anterior aún no liberó el hardware */
async function reopenCamera(
  deviceId: string | undefined,
  resolution: CameraResolution,
  retryMs: number
): Promise<MediaStream> {
  try {
    return await requestCamera('environment', deviceId, resolution);
  } catch (err) {
    if ((err as Error).name !== 'NotReadableError') throw err;
    await new Promise((r) => setTimeout(r, retryMs));
    return requestCamera('environment', deviceId, resolution);
  }
}

/**
 * Si la cámara elegida por el navegador no tiene autoenfoque continuo, prueba
 * otras cámaras traseras y devuelve la primera que sí lo tenga. Si ninguna lo
 * tiene, vuelve a abrir la original. Muchos Android no permiten abrir dos
 * cámaras a la vez, por eso se libera cada stream antes de probar el siguiente.
 * El resultado se recuerda durante la sesión para no repetir la búsqueda.
 */
export async function preferAutofocusCamera(
  stream: MediaStream,
  {
    resolution = 'high',
    maxAttempts = 3,
    retryMs = CAMERA_RELEASE_RETRY_MS,
  }: { resolution?: CameraResolution; maxAttempts?: number; retryMs?: number } = {}
): Promise<MediaStream> {
  if (supportsContinuousFocus(stream) !== false || preferredCameraId === null) return stream;

  const originalId = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
  let cameras: MediaDeviceInfo[];
  try {
    cameras = await enumerateCameras();
  } catch {
    return stream;
  }
  const ranked = rankBackCameras(cameras, originalId);
  const remembered = ranked.filter((c) => c.deviceId === preferredCameraId);
  const candidates = (remembered.length > 0 ? remembered : ranked).slice(0, maxAttempts);
  if (candidates.length === 0) {
    preferredCameraId = null;
    return stream;
  }

  stopStream(stream);
  for (const cam of candidates) {
    let next: MediaStream;
    try {
      next = await reopenCamera(cam.deviceId, resolution, retryMs);
    } catch {
      continue;
    }
    if (supportsContinuousFocus(next)) {
      preferredCameraId = cam.deviceId;
      return next;
    }
    stopStream(next);
  }
  preferredCameraId = null;
  try {
    return await reopenCamera(originalId, resolution, retryMs);
  } catch {
    // El deviceId original pudo dejar de estar disponible: dejar elegir al navegador
    return reopenCamera(undefined, resolution, retryMs);
  }
}

/**
 * Detecta la cámara activa dentro de la lista de dispositivos.
 * Compara el deviceId reportado por el track con los dispositivos enumerados.
 */
export function findCurrentCamera(
  stream: MediaStream,
  cameras: MediaDeviceInfo[]
): MediaDeviceInfo | null {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  return cameras.find((c) => c.deviceId === settings?.deviceId) ?? cameras[0] ?? null;
}
