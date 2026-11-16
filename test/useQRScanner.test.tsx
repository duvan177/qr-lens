import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQRScanner } from '../src/hooks/useQRScanner';
import { resetDetector } from '../src/utils/detector';
import { resetPreferredCamera } from '../src/utils/camera';

type FakeTrack = { stop: ReturnType<typeof vi.fn>; deviceId: string };

let tracks: FakeTrack[];
let getUserMedia: ReturnType<typeof vi.fn>;

function makeStream(deviceId: string): MediaStream {
  const track = {
    stop: vi.fn(),
    deviceId,
    getCapabilities: () => ({}),
    getSettings: () => ({ deviceId }),
    getConstraints: () => ({}),
    applyConstraints: () => Promise.resolve(),
  };
  tracks.push(track);
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

const cameras = [
  { kind: 'videoinput', deviceId: 'back', label: 'camera2 0, facing back' },
  { kind: 'videoinput', deviceId: 'front', label: 'camera2 1, facing front' },
];

beforeEach(() => {
  tracks = [];
  getUserMedia = vi.fn((c: { video: { deviceId?: { exact: string } } }) =>
    Promise.resolve(makeStream(c.video.deviceId?.exact ?? 'back'))
  );
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: () => Promise.resolve(cameras) },
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

afterEach(() => {
  resetDetector();
  resetPreferredCamera();
  // @ts-expect-error reset de mock
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
});

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
const live = () => tracks.filter((t) => t.stop.mock.calls.length === 0);

describe('useQRScanner — ciclo de vida del stream', () => {
  it('con StrictMode deja exactamente un stream abierto', async () => {
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn() }), { wrapper: strict });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(live()).toHaveLength(1);
  });

  it('dos start() concurrentes dejan un solo stream abierto', async () => {
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn() }));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(() => Promise.all([result.current.start(), result.current.start()]));
    expect(live()).toHaveLength(1);
  });

  it('libera el stream si se desmonta mientras arranca', async () => {
    let release!: () => void;
    getUserMedia.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve(makeStream('back')); })
    );
    const { unmount } = renderHook(() => useQRScanner({ onScan: vi.fn() }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    unmount();
    await act(async () => release());
    expect(live()).toHaveLength(0);
  });

  it('start() sobre un escáner activo no deja el stream anterior abierto', async () => {
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn() }));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(() => result.current.start());
    expect(tracks).toHaveLength(2);
    expect(live()).toHaveLength(1);
  });

  it('si start() falla al reiniciar, libera la cámara y deja de estar listo', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn(), onError }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    getUserMedia.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('busy'), { name: 'NotReadableError' }))
    );
    await act(() => result.current.start());

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'camera-error' }));
    expect(result.current.isReady).toBe(false);
    expect(result.current.isScanning).toBe(false);
    expect(live()).toHaveLength(0);
  });

  it('si start() falla al arrancar, sigue notificando el permiso denegado', async () => {
    getUserMedia.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    );
    const onError = vi.fn();
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn(), onError }));

    await waitFor(() => expect(result.current.permissionStatus).toBe('denied'));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'permission-denied' }));
  });

  it('si switchCamera falla vuelve a la cámara anterior', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useQRScanner({ onScan: vi.fn(), onError }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    getUserMedia.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('busy'), { name: 'NotReadableError' }))
    );
    await act(() => result.current.switchCamera());

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'camera-error' }));
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ video: expect.objectContaining({ deviceId: { exact: 'back' } }) })
    );
    expect(result.current.isReady).toBe(true);
    expect(live()).toHaveLength(1);
  });
});

describe('useQRScanner — arranque con callbacks y búsqueda de lente', () => {
  it('si onPermissionChange lanza, libera la cámara en vez de dejarla encendida', async () => {
    const onError = vi.fn();
    const onPermissionChange = vi.fn(() => {
      throw new Error('callback roto');
    });
    renderHook(() => useQRScanner({ onScan: vi.fn(), onError, onPermissionChange }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'camera-error' }))
    );
    expect(live()).toHaveLength(0);
  });

  describe('con una cámara de enfoque fijo', () => {
    const fixedFocusStream = (deviceId: string, modes: string[]) => {
      const stream = makeStream(deviceId);
      const track = tracks[tracks.length - 1] as FakeTrack & Record<string, unknown>;
      track.getCapabilities = () => ({ focusMode: modes });
      return stream;
    };
    const rearCameras = [
      { kind: 'videoinput', deviceId: 'fixed', label: 'camera2 2, facing back' },
      { kind: 'videoinput', deviceId: 'main', label: 'camera2 0, facing back' },
    ];
    let releaseReopen!: (stream: MediaStream) => void;

    beforeEach(() => {
      getUserMedia
        .mockReset()
        .mockImplementationOnce(() => Promise.resolve(fixedFocusStream('fixed', ['manual'])))
        .mockImplementationOnce(
          () => new Promise<MediaStream>((resolve) => { releaseReopen = resolve; })
        );
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia, enumerateDevices: () => Promise.resolve(rearCameras) },
      });
    });

    it('avisa del permiso concedido antes de terminar la búsqueda de lente', async () => {
      const onPermissionChange = vi.fn();
      const { result } = renderHook(() => useQRScanner({ onScan: vi.fn(), onPermissionChange }));

      await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
      expect(onPermissionChange).toHaveBeenCalledWith('granted');
      expect(result.current.permissionStatus).toBe('granted');
      expect(result.current.isReady).toBe(false);

      await act(async () => releaseReopen(fixedFocusStream('main', ['continuous'])));
      await waitFor(() => expect(result.current.isReady).toBe(true));
    });

    it('una búsqueda obsoleta libera la cámara y no sigue abriendo otras', async () => {
      const { unmount } = renderHook(() => useQRScanner({ onScan: vi.fn() }));
      await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));

      unmount();
      await act(async () => releaseReopen(fixedFocusStream('main', ['continuous'])));

      expect(live()).toHaveLength(0);
      expect(getUserMedia).toHaveBeenCalledTimes(2);
    });
  });
});
