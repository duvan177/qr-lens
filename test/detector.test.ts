import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getDetector, resetDetector } from '../src/utils/detector';

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
