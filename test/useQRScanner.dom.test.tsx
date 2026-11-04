import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { useQRScanner } from '../src/hooks/useQRScanner';
import { resetPreferredCamera } from '../src/utils/camera';
import type { UseQRScannerOptions, UseQRScannerReturn } from '../src/types';

const detect = vi.fn(() => Promise.resolve([]));
vi.mock('../src/utils/detector', () => ({ getDetector: () => Promise.resolve(detect) }));

let applyConstraints: ReturnType<typeof vi.fn>;
let tracks: { stop: ReturnType<typeof vi.fn> }[];
let getUserMedia: ReturnType<typeof vi.fn>;
let scanner: UseQRScannerReturn;

function Harness(props: UseQRScannerOptions) {
  scanner = useQRScanner(props);
  return (
    <>
      <video ref={scanner.videoRef} />
      <canvas ref={scanner.canvasRef} />
    </>
  );
}

function makeStream(): MediaStream {
  let constraints: MediaTrackConstraints = {};
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({ focusMode: ['continuous', 'single-shot'], zoom: { min: 1, max: 4 } }),
    getSettings: () => ({ deviceId: 'back' }),
    getConstraints: () => constraints,
    applyConstraints: (c: MediaTrackConstraints) => {
      constraints = c;
      applyConstraints(c);
      return Promise.resolve();
    },
  };
  tracks.push(track);
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

const applied = (key: string) =>
  applyConstraints.mock.calls
    .map(([c]) => Object.assign({}, ...(c as MediaTrackConstraints).advanced!) as Record<string, unknown>)
    .map((set) => set[key]);
const singleShots = () => applied('focusMode').filter((m) => m === 'single-shot').length;

beforeEach(() => {
  tracks = [];
  applyConstraints = vi.fn();
  getUserMedia = vi.fn(() => Promise.resolve(makeStream()));
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: () => Promise.resolve([]) },
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 4 });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({}, { get: () => () => undefined, set: () => true }) as never
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetPreferredCamera();
  // @ts-expect-error reset de mock
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  delete (HTMLMediaElement.prototype as { readyState?: number }).readyState;
});

describe('useQRScanner — zoom', () => {
  it('aplica un zoom que cambió mientras arrancaba la cámara', async () => {
    let release!: () => void;
    getUserMedia.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve(makeStream()); })
    );
    const { rerender } = render(<Harness onScan={vi.fn()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    rerender(<Harness onScan={vi.fn()} zoom={2} />);
    await act(async () => release());

    await waitFor(() => expect(applied('zoom')).toContain(2));
  });

  it('no toca el zoom por defecto', async () => {
    render(<Harness onScan={vi.fn()} />);
    await waitFor(() => expect(scanner.isReady).toBe(true));
    expect(applied('zoom').filter((z) => z !== undefined)).toEqual([]);
  });
});

describe('useQRScanner — video.play()', () => {
  it('un fallo de play() libera la cámara y no se notifica como permiso denegado', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      Object.assign(new Error('autoplay'), { name: 'NotAllowedError' })
    );
    const onError = vi.fn();
    const onPermissionChange = vi.fn();
    render(<Harness onScan={vi.fn()} onError={onError} onPermissionChange={onPermissionChange} />);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'camera-error' }))
    );
    expect(onPermissionChange).not.toHaveBeenCalledWith('denied');
    expect(tracks[0].stop).toHaveBeenCalled();
  });
});

describe('useQRScanner — re-enfoque', () => {
  const startScanner = async (props: Partial<UseQRScannerOptions> = {}) => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
    render(<Harness onScan={vi.fn()} scanDelay={100} {...props} />);
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(scanner.isReady).toBe(true);
  };
  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  // Cada espera cuenta desde el final del barrido anterior, que dura 600 ms
  it('espacia los intentos: 2,5 s, 5 s y luego cada 10 s como máximo', async () => {
    await startScanner();

    await advance(2000);
    expect(singleShots()).toBe(0);
    await advance(1500);
    expect(singleShots()).toBe(1);

    await advance(4000);
    expect(singleShots()).toBe(1);
    await advance(2500);
    expect(singleShots()).toBe(2);

    await advance(8000);
    expect(singleShots()).toBe(2);
    await advance(1000);
    expect(singleShots()).toBe(3);

    await advance(9500);
    expect(singleShots()).toBe(3);
    await advance(1000);
    expect(singleShots()).toBe(4);
  });

  it('reinicia la espera tras una lectura', async () => {
    await startScanner();
    await advance(10000);
    expect(singleShots()).toBe(2);

    detect.mockResolvedValueOnce([{ value: 'qr', format: 'qr_code' }] as never);
    await advance(200);
    await advance(2000);
    expect(singleShots()).toBe(2);
    await advance(1000);
    expect(singleShots()).toBe(3);
  });

  it('autofocus={false} no fuerza barridos de enfoque', async () => {
    await startScanner({ autofocus: false });
    await advance(30000);
    expect(singleShots()).toBe(0);
  });
});
