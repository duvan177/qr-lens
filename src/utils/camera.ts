/** Capabilities de imagen que aún no están en lib.dom (Media Capture Image) */
type ExtendedCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
};

/** Zoom aplicado con `zoom: 'auto'`: obliga a alejar el móvil y quedar sobre la distancia mínima de enfoque */
export const AUTO_ZOOM = 1.5;

function getCaps(track: MediaStreamTrack): ExtendedCapabilities {
  return (track.getCapabilities?.() ?? {}) as ExtendedCapabilities;
}

/**
 * Aplica constraints avanzadas sin perder las anteriores.
 * applyConstraints reemplaza el set completo, así que sin el merge activar
 * la linterna desharía el zoom o el modo de enfoque.
 */
async function applyAdvanced(
  track: MediaStreamTrack,
  set: Record<string, unknown>
): Promise<void> {
  const prev = track.getConstraints?.() ?? {};
  const merged = Object.assign({}, ...(prev.advanced ?? []), set);
  await track.applyConstraints({ ...prev, advanced: [merged as MediaTrackConstraintSet] });
}

/**
 * Solicita acceso a la cámara con el facing mode o deviceId indicados.
 * Lanza NotAllowedError si el usuario deniega, NotFoundError si no hay cámara.
 */
export async function requestCamera(
  facingMode: 'environment' | 'user' = 'environment',
  deviceId?: string
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('getUserMedia not supported'), { name: 'NotSupportedError' });
  }

  // Sin resolución explícita muchos móviles entregan 640×480: el QR nunca se ve nítido
  const videoConstraints: MediaTrackConstraints & { focusMode?: ConstrainDOMString } = {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
    width: { ideal: 1920 },
    height: { ideal: 1080 },
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
 * fijado en el fondo; un single-shot seguido de continuous lo reinicia.
 */
export async function nudgeFocus(stream: MediaStream, settleMs = 600): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const modes = getCaps(track).focusMode ?? [];
  if (modes.includes('single-shot')) {
    await applyAdvanced(track, { focusMode: 'single-shot' });
    if (!modes.includes('continuous')) return;
    await new Promise((r) => setTimeout(r, settleMs));
  }
  if (modes.includes('continuous')) {
    await applyAdvanced(track, { focusMode: 'continuous' });
  }
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
  if (range.step) value = range.min + Math.round((value - range.min) / range.step) * range.step;

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

/**
 * Si la cámara elegida por el navegador no tiene autoenfoque continuo, prueba
 * otras cámaras traseras y devuelve la primera que sí lo tenga. Si ninguna lo
 * tiene, vuelve a abrir la original. Muchos Android no permiten abrir dos
 * cámaras a la vez, por eso se libera cada stream antes de probar el siguiente.
 */
export async function preferAutofocusCamera(
  stream: MediaStream,
  maxAttempts = 3
): Promise<MediaStream> {
  if (supportsContinuousFocus(stream) !== false) return stream;

  const originalId = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
  const candidates = rankBackCameras(await enumerateCameras(), originalId).slice(0, maxAttempts);
  if (candidates.length === 0) return stream;

  stopStream(stream);
  for (const cam of candidates) {
    let next: MediaStream;
    try {
      next = await requestCamera('environment', cam.deviceId);
    } catch {
      continue;
    }
    if (supportsContinuousFocus(next)) return next;
    stopStream(next);
  }
  try {
    return await requestCamera('environment', originalId);
  } catch {
    // El deviceId original pudo dejar de estar disponible: dejar elegir al navegador
    return requestCamera('environment');
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
