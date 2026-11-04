import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  requestCamera,
  enumerateCameras,
  stopStream,
  isTorchSupported,
  setTorchState,
  findCurrentCamera,
  supportsContinuousFocus,
  applyContinuousFocus,
  nudgeFocus,
  applyZoom,
  rankBackCameras,
  preferAutofocusCamera,
  resetPreferredCamera,
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
  resetPreferredCamera();
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
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        focusMode: { ideal: 'continuous' },
      },
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
      video: {
        deviceId: { exact: 'cam-123' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        focusMode: { ideal: 'continuous' },
      },
      audio: false,
    });
  });
});

describe('requestCamera — resolution', () => {
  it("'default' no pide resolución y deja elegir al navegador", async () => {
    const getUserMedia = vi.fn(() => Promise.resolve(makeStream([makeTrack()])));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    await requestCamera('environment', undefined, 'default');
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' }, focusMode: { ideal: 'continuous' } },
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

describe('setTorchState — merge de constraints', () => {
  it('conserva las constraints avanzadas previas (zoom, focusMode)', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getConstraints: vi.fn(() => ({ advanced: [{ zoom: 1.5 }, { focusMode: 'continuous' }] })) as never,
    });
    await setTorchState(makeStream([track]), true);
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }, { zoom: 1.5 }, { focusMode: 'continuous' }],
    });
  });

  it('la constraint nueva va primero y reemplaza a la anterior del mismo tipo', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getConstraints: vi.fn(() => ({ advanced: [{ focusMode: 'continuous' }, { torch: true }] })) as never,
    });
    await setTorchState(makeStream([track]), false);
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: false }, { focusMode: 'continuous' }],
    });
  });

  it('conserva el set básico sin mezclarlo con constraints de imagen', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getConstraints: vi.fn(() => ({ width: 1920, focusMode: { ideal: 'continuous' } })) as never,
    });
    await setTorchState(makeStream([track]), true);
    expect(applyConstraints).toHaveBeenCalledWith({ width: 1920, advanced: [{ torch: true }] });
  });

  it('dos escrituras simultáneas no se pisan', async () => {
    let constraints: MediaTrackConstraints = {};
    const applyConstraints = vi.fn((c: MediaTrackConstraints) =>
      new Promise<void>((resolve) => setTimeout(() => { constraints = c; resolve(); }, 1))
    );
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getConstraints: vi.fn(() => constraints) as never,
      getCapabilities: vi.fn(() => ({ focusMode: ['continuous'], zoom: { min: 1, max: 4 } })) as never,
    });
    const stream = makeStream([track]);

    await Promise.all([applyContinuousFocus(stream), applyZoom(stream, 2)]);
    expect(constraints).toEqual({ advanced: [{ zoom: 2 }, { focusMode: 'continuous' }] });
  });

  it('una escritura fallida no bloquea las siguientes', async () => {
    const applyConstraints = vi.fn()
      .mockRejectedValueOnce(new Error('fallo'))
      .mockResolvedValueOnce(undefined);
    const track = makeTrack({ applyConstraints: applyConstraints as never });
    const stream = makeStream([track]);

    await expect(setTorchState(stream, true)).rejects.toThrow('fallo');
    await expect(setTorchState(stream, false)).resolves.toBeUndefined();
  });
});

describe('supportsContinuousFocus', () => {
  it('null si el navegador no expone focusMode', () => {
    expect(supportsContinuousFocus(makeStream([makeTrack()]))).toBeNull();
  });

  it('true / false según las capabilities', () => {
    const yes = makeTrack({ getCapabilities: vi.fn(() => ({ focusMode: ['continuous', 'manual'] })) as never });
    const no = makeTrack({ getCapabilities: vi.fn(() => ({ focusMode: ['manual'] })) as never });
    expect(supportsContinuousFocus(makeStream([yes]))).toBe(true);
    expect(supportsContinuousFocus(makeStream([no]))).toBe(false);
  });
});

describe('applyContinuousFocus', () => {
  it('aplica focusMode continuous si está soportado', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getCapabilities: vi.fn(() => ({ focusMode: ['continuous'] })) as never,
    });
    await expect(applyContinuousFocus(makeStream([track]))).resolves.toBe(true);
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: 'continuous' }] });
  });

  it('no hace nada si no está soportado', async () => {
    const track = makeTrack();
    await expect(applyContinuousFocus(makeStream([track]))).resolves.toBe(false);
    expect(track.applyConstraints).not.toHaveBeenCalled();
  });
});

describe('nudgeFocus', () => {
  it('hace single-shot y luego vuelve a continuous', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getCapabilities: vi.fn(() => ({ focusMode: ['continuous', 'single-shot'] })) as never,
    });
    await nudgeFocus(makeStream([track]), 0);
    expect(applyConstraints.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      { advanced: [{ focusMode: 'single-shot' }] },
      { advanced: [{ focusMode: 'continuous' }] },
    ]);
  });

  it('sin single-shot pasa por manual para reiniciar el enfoque', async () => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getCapabilities: vi.fn(() => ({ focusMode: ['continuous', 'manual'] })) as never,
    });
    await nudgeFocus(makeStream([track]), 0);
    expect(applyConstraints.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      { advanced: [{ focusMode: 'manual' }] },
      { advanced: [{ focusMode: 'continuous' }] },
    ]);
  });

  it('no fija manual si no puede volver a continuous', async () => {
    const track = makeTrack({ getCapabilities: vi.fn(() => ({ focusMode: ['manual'] })) as never });
    await nudgeFocus(makeStream([track]), 0);
    expect(track.applyConstraints).not.toHaveBeenCalled();
  });

  it('no hace nada sin focusMode', async () => {
    const track = makeTrack();
    await nudgeFocus(makeStream([track]), 0);
    expect(track.applyConstraints).not.toHaveBeenCalled();
  });
});

describe('applyZoom', () => {
  const zoomTrack = (caps: object, settings: object = {}) => {
    const applyConstraints = vi.fn(() => Promise.resolve());
    const track = makeTrack({
      applyConstraints: applyConstraints as never,
      getCapabilities: vi.fn(() => caps) as never,
      getSettings: vi.fn(() => settings) as never,
    });
    return { track, applyConstraints };
  };

  it("'auto' aplica 1.5× en la cámara trasera", async () => {
    const { track, applyConstraints } = zoomTrack({ zoom: { min: 1, max: 8, step: 0.1 } });
    await expect(applyZoom(makeStream([track]), 'auto')).resolves.toBeCloseTo(1.5);
    expect(applyConstraints).toHaveBeenCalled();
  });

  it('limita al máximo del dispositivo', async () => {
    const { track } = zoomTrack({ zoom: { min: 1, max: 1.2 } });
    await expect(applyZoom(makeStream([track]), 4)).resolves.toBe(1.2);
  });

  it('ajustar al step no supera el máximo', async () => {
    const { track } = zoomTrack({ zoom: { min: 1, max: 1.2, step: 0.3 } });
    await expect(applyZoom(makeStream([track]), 4)).resolves.toBe(1.2);
  });

  it("'auto' no aplica zoom en la cámara frontal", async () => {
    const { track, applyConstraints } = zoomTrack({ zoom: { min: 1, max: 8 } }, { facingMode: 'user' });
    await expect(applyZoom(makeStream([track]), 'auto')).resolves.toBeNull();
    expect(applyConstraints).not.toHaveBeenCalled();
  });

  it('null si zoom no está soportado', async () => {
    await expect(applyZoom(makeStream([makeTrack()]), 2)).resolves.toBeNull();
  });
});

describe('rankBackCameras', () => {
  const cam = (deviceId: string, label: string) => ({ deviceId, label }) as MediaDeviceInfo;

  it('prioriza camera2 de menor índice y descarta lentes especiales y frontales', () => {
    const cams = [
      cam('front', 'camera2 1, facing front'),
      cam('wide', 'camera2 2, facing back'),
      cam('main', 'camera2 0, facing back'),
      cam('ultra', 'Back Ultra Wide Camera'),
      cam('tele', 'Back Telephoto Camera'),
    ];
    expect(rankBackCameras(cams).map((c) => c.deviceId)).toEqual(['main', 'wide']);
  });

  it('excluye la cámara indicada', () => {
    const cams = [cam('a', 'camera2 0, facing back'), cam('b', 'camera2 2, facing back')];
    expect(rankBackCameras(cams, 'a').map((c) => c.deviceId)).toEqual(['b']);
  });
});

describe('preferAutofocusCamera', () => {
  const focusStream = (deviceId: string, modes: string[]) =>
    makeStream([
      makeTrack({
        getCapabilities: vi.fn(() => ({ focusMode: modes })) as never,
        getSettings: vi.fn(() => ({ deviceId })) as never,
      }),
    ]);

  it('devuelve el mismo stream si ya tiene autoenfoque continuo', async () => {
    const stream = focusStream('a', ['continuous']);
    await expect(preferAutofocusCamera(stream)).resolves.toBe(stream);
  });

  it('cambia a otra cámara trasera con autoenfoque', async () => {
    const original = focusStream('fixed', ['manual']);
    const good = focusStream('main', ['continuous']);
    const getUserMedia = vi.fn(() => Promise.resolve(good));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices: vi.fn(() =>
          Promise.resolve([
            { kind: 'videoinput', deviceId: 'fixed', label: 'camera2 2, facing back' },
            { kind: 'videoinput', deviceId: 'main', label: 'camera2 0, facing back' },
          ])
        ),
      },
    });

    await expect(preferAutofocusCamera(original)).resolves.toBe(good);
    expect(original.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('vuelve a abrir la original si ninguna tiene autoenfoque', async () => {
    const original = focusStream('fixed', ['manual']);
    const other = focusStream('other', ['manual']);
    const reopened = focusStream('fixed', ['manual']);
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(other)
      .mockResolvedValueOnce(reopened);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices: vi.fn(() =>
          Promise.resolve([
            { kind: 'videoinput', deviceId: 'fixed', label: 'camera2 0, facing back' },
            { kind: 'videoinput', deviceId: 'other', label: 'camera2 2, facing back' },
          ])
        ),
      },
    });

    await expect(preferAutofocusCamera(original)).resolves.toBe(reopened);
    expect(other.getTracks()[0].stop).toHaveBeenCalled();
  });
});

describe('preferAutofocusCamera — fallos y memoria', () => {
  const fixedStream = () =>
    makeStream([
      makeTrack({
        getCapabilities: vi.fn(() => ({ focusMode: ['manual'] })) as never,
        getSettings: vi.fn(() => ({ deviceId: 'fixed' })) as never,
      }),
    ]);
  const goodStream = () =>
    makeStream([makeTrack({ getCapabilities: vi.fn(() => ({ focusMode: ['continuous'] })) as never })]);
  const devices = [
    { kind: 'videoinput', deviceId: 'fixed', label: 'camera2 2, facing back' },
    { kind: 'videoinput', deviceId: 'main', label: 'camera2 0, facing back' },
  ];
  const mockDevices = (getUserMedia: unknown, enumerateDevices: unknown = () => Promise.resolve(devices)) =>
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    });
  const named = (name: string) => Object.assign(new Error(name), { name });

  it('deja elegir al navegador si la cámara original ya no se puede abrir', async () => {
    const fallback = makeStream([makeTrack()]);
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(named('OverconstrainedError')) // candidata
      .mockRejectedValueOnce(named('NotFoundError')) // original
      .mockResolvedValueOnce(fallback);
    mockDevices(getUserMedia);

    await expect(preferAutofocusCamera(fixedStream(), { retryMs: 0 })).resolves.toBe(fallback);
    const last = getUserMedia.mock.calls[2][0] as { video: MediaTrackConstraints };
    expect(last.video.deviceId).toBeUndefined();
    expect(last.video.facingMode).toEqual({ ideal: 'environment' });
  });

  it('reintenta si la cámara aún no se liberó', async () => {
    const good = goodStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(named('NotReadableError'))
      .mockResolvedValueOnce(good);
    mockDevices(getUserMedia);

    await expect(preferAutofocusCamera(fixedStream(), { retryMs: 0 })).resolves.toBe(good);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    const retry = getUserMedia.mock.calls[1][0] as { video: MediaTrackConstraints };
    expect(retry.video.deviceId).toEqual({ exact: 'main' });
  });

  it('conserva el stream si enumerateDevices falla', async () => {
    const stream = fixedStream();
    mockDevices(vi.fn(), () => Promise.reject(new Error('fallo')));

    await expect(preferAutofocusCamera(stream)).resolves.toBe(stream);
    expect(stream.getTracks()[0].stop).not.toHaveBeenCalled();
  });

  it('no repite la búsqueda si ninguna cámara era mejor', async () => {
    const getUserMedia = vi.fn(() => Promise.resolve(fixedStream()));
    mockDevices(getUserMedia);

    await preferAutofocusCamera(fixedStream(), { retryMs: 0 });
    getUserMedia.mockClear();
    const second = fixedStream();
    await expect(preferAutofocusCamera(second, { retryMs: 0 })).resolves.toBe(second);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('recuerda la cámara con autoenfoque y va directo a ella', async () => {
    mockDevices(vi.fn(() => Promise.resolve(goodStream())));
    await preferAutofocusCamera(fixedStream(), { retryMs: 0 });

    const getUserMedia = vi.fn(() => Promise.resolve(goodStream()));
    const many = [...devices, { kind: 'videoinput', deviceId: 'other', label: 'camera2 3, facing back' }];
    mockDevices(getUserMedia, () => Promise.resolve(many));
    await preferAutofocusCamera(fixedStream(), { retryMs: 0 });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    const call = (getUserMedia.mock.calls as unknown[][])[0][0] as { video: MediaTrackConstraints };
    expect(call.video.deviceId).toEqual({ exact: 'main' });
  });
});
