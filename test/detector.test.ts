import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import jsQR from 'jsqr';
import { getDetector, resetDetector, JSQR_MAX_DIMENSION } from '../src/utils/detector';

vi.mock('jsqr', () => ({ default: vi.fn(() => null) }));

const originalBarcodeDetector = (window as Record<string, unknown>).BarcodeDetector;

afterEach(() => {
  resetDetector();
  if (originalBarcodeDetector === undefined) {
    delete (window as Record<string, unknown>).BarcodeDetector;
  } else {
    (window as Record<string, unknown>).BarcodeDetector = originalBarcodeDetector;
  }
  vi.restoreAllMocks();
});

describe('getDetector con BarcodeDetector nativo', () => {
  beforeEach(() => {
    class FakeBarcodeDetector {
      static getSupportedFormats = vi.fn(() => Promise.resolve(['qr_code', 'ean_13']));
      detect = vi.fn(() =>
        Promise.resolve([
          {
            rawValue: 'hello',
            format: 'qr_code',
            cornerPoints: [{ x: 0, y: 0 }],
            boundingBox: { x: 1, y: 2, width: 3, height: 4 },
          },
        ])
      );
    }
    (window as Record<string, unknown>).BarcodeDetector = FakeBarcodeDetector;
  });

  it('usa el detector nativo cuando el formato está soportado', async () => {
    const detect = await getDetector(['qr_code']);
    const video = {} as HTMLVideoElement;
    const results = await detect(video);
    expect(results).toEqual([
      {
        value: 'hello',
        format: 'qr_code',
        cornerPoints: [{ x: 0, y: 0 }],
        boundingBox: { x: 1, y: 2, width: 3, height: 4 },
      },
    ]);
  });

  it('cachea el detector entre llamadas', async () => {
    const a = await getDetector(['qr_code']);
    const b = await getDetector(['qr_code']);
    expect(a).toBe(b);
  });

  it('resetDetector fuerza la reconstrucción', async () => {
    const a = await getDetector(['qr_code']);
    resetDetector();
    const b = await getDetector(['qr_code']);
    expect(a).not.toBe(b);
  });
});

describe('getDetector sin formatos soportados', () => {
  it('cae al fallback jsQR si BarcodeDetector no soporta el formato', async () => {
    class FakeBarcodeDetector {
      static getSupportedFormats = vi.fn(() => Promise.resolve(['ean_13']));
    }
    (window as Record<string, unknown>).BarcodeDetector = FakeBarcodeDetector;

    // El fallback importa jsqr dinámicamente; basta con que devuelva una función.
    const detect = await getDetector(['qr_code']);
    expect(typeof detect).toBe('function');
  });
});

describe('fallback jsQR', () => {
  it(`reduce el frame a ${JSQR_MAX_DIMENSION}px antes de decodificar`, async () => {
    delete (window as Record<string, unknown>).BarcodeDetector;
    const drawImage = vi.fn();
    const getImageData = vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      getImageData,
    } as never);

    const detect = await getDetector(['qr_code']);
    const video = { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;
    await expect(detect(video)).resolves.toEqual([]);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 960, 540);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 960, 540);
  });

  it('devuelve las esquinas en coordenadas del frame original', async () => {
    delete (window as Record<string, unknown>).BarcodeDetector;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4), width: w, height: h,
      }),
    } as never);
    vi.mocked(jsQR).mockReturnValueOnce({
      data: 'hola',
      location: {
        topLeftCorner: { x: 10, y: 20 },
        topRightCorner: { x: 30, y: 20 },
        bottomRightCorner: { x: 30, y: 40 },
        bottomLeftCorner: { x: 10, y: 40 },
      },
    } as never);

    const detect = await getDetector(['qr_code']);
    const [result] = await detect({ videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement);
    expect(result.cornerPoints).toEqual([
      { x: 20, y: 40 },
      { x: 60, y: 40 },
      { x: 60, y: 80 },
      { x: 20, y: 80 },
    ]);
  });

  it('no amplía frames pequeños', async () => {
    delete (window as Record<string, unknown>).BarcodeDetector;
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4), width: w, height: h,
      }),
    } as never);

    const detect = await getDetector(['qr_code']);
    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
    await detect(video);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 480);
  });
});
