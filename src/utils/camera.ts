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

  const videoConstraints: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: facingMode } };

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
  // torch no está en los tipos estándar aún
  await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
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
