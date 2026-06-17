import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  requestCamera,
  enumerateCameras,
  stopStream,
  isTorchSupported,
  setTorchState,
  findCurrentCamera,
} from '../src/utils/camera';

function makeTrack(overrides: Partial<MediaStreamTrack> = {}): MediaStreamTrack {
  return {
    stop: vi.fn(),
    getCapabilities: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({})),
    applyConstraints: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as MediaStreamTrack;
}

function makeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
}

afterEach(() => {
  vi.restoreAllMocks();
  // limpia mediaDevices entre tests
  // @ts-expect-error reset de mock
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
});

describe('requestCamera', () => {
  it('lanza NotSupportedError si getUserMedia no existe', async () => {
    await expect(requestCamera()).rejects.toMatchObject({ name: 'NotSupportedError' });
  });

  it('usa facingMode cuando no se pasa deviceId', async () => {
    const getUserMedia = vi.fn(() => Promise.resolve(makeStream([makeTrack()])));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    await requestCamera('user');
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'user' } },
      audio: false,
    });
  });

  it('usa deviceId exacto cuando se proporciona', async () => {
    const getUserMedia = vi.fn(() => Promise.resolve(makeStream([makeTrack()])));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    await requestCamera('environment', 'cam-123');
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'cam-123' } },
      audio: false,
    });
  });
});

describe('enumerateCameras', () => {
  it('devuelve [] si enumerateDevices no existe', async () => {
    await expect(enumerateCameras()).resolves.toEqual([]);
  });

  it('filtra solo dispositivos videoinput', async () => {
    const devices = [
      { kind: 'videoinput', deviceId: 'a' },
      { kind: 'audioinput', deviceId: 'b' },
      { kind: 'videoinput', deviceId: 'c' },
    ];
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices: vi.fn(() => Promise.resolve(devices)) },
    });

    const cams = await enumerateCameras();
    expect(cams.map((c) => c.deviceId)).toEqual(['a', 'c']);
  });
});

describe('stopStream', () => {
  it('detiene todos los tracks', () => {
    const t1 = makeTrack();
    const t2 = makeTrack();
    stopStream(makeStream([t1, t2]));
    expect(t1.stop).toHaveBeenCalled();
    expect(t2.stop).toHaveBeenCalled();
  });

  it('no falla con null', () => {
    expect(() => stopStream(null)).not.toThrow();
  });
});

describe('isTorchSupported', () => {
  it('true si las capabilities incluyen torch', () => {
    const track = makeTrack({ getCapabilities: vi.fn(() => ({ torch: true })) as never });
    expect(isTorchSupported(makeStream([track]))).toBe(true);
  });

  it('false si no incluyen torch', () => {
    expect(isTorchSupported(makeStream([makeTrack()]))).toBe(false);
  });

  it('false si no hay track de vídeo', () => {
    expect(isTorchSupported(makeStream([]))).toBe(false);
  });
});

describe('setTorchState', () => {
  it('aplica la constraint torch al track', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({ applyConstraints: applyConstraints as never });
    await setTorchState(makeStream([track]), true);
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  });

  it('lanza si no hay track', async () => {
    await expect(setTorchState(makeStream([]), true)).rejects.toThrow('No video track');
  });
});

describe('findCurrentCamera', () => {
  const cams = [
    { deviceId: 'a' },
    { deviceId: 'b' },
  ] as MediaDeviceInfo[];

  it('encuentra la cámara cuyo deviceId coincide con los settings del track', () => {
    const track = makeTrack({ getSettings: vi.fn(() => ({ deviceId: 'b' })) as never });
    expect(findCurrentCamera(makeStream([track]), cams)).toBe(cams[1]);
  });

  it('cae a la primera cámara si no hay coincidencia', () => {
    const track = makeTrack({ getSettings: vi.fn(() => ({ deviceId: 'z' })) as never });
    expect(findCurrentCamera(makeStream([track]), cams)).toBe(cams[0]);
  });
});
