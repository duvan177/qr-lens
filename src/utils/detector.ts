import type { Point } from '../types';

export interface RawDetection {
  value: string;
  format: string;
  cornerPoints?: Point[];
  boundingBox?: { x: number; y: number; width: number; height: number };
}

/** Función de detección unificada — recibe el elemento <video> y devuelve detecciones */
export type DetectFn = (video: HTMLVideoElement) => Promise<RawDetection[]>;

let _detector: DetectFn | null = null;
let _detectorPromise: Promise<DetectFn> | null = null;

// Canvas privado para jsQR; no contamina el canvas de overlay
let _jsqrCanvas: HTMLCanvasElement | null = null;

function getJsQRCanvas(): HTMLCanvasElement {
  if (!_jsqrCanvas) {
    _jsqrCanvas = document.createElement('canvas');
  }
  return _jsqrCanvas;
}

async function buildNativeDetector(formats: string[]): Promise<DetectFn | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats();
    const requestedFormats = formats.filter((f) => supported.includes(f));
    if (requestedFormats.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bd = new (window as any).BarcodeDetector({ formats: requestedFormats });

    return async (video: HTMLVideoElement): Promise<RawDetection[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = await bd.detect(video);
      return results.map((r) => ({
        value: r.rawValue as string,
        format: r.format as string,
        cornerPoints: r.cornerPoints as Point[] | undefined,
        boundingBox: r.boundingBox
          ? {
              x: r.boundingBox.x as number,
              y: r.boundingBox.y as number,
              width: r.boundingBox.width as number,
              height: r.boundingBox.height as number,
            }
          : undefined,
      }));
    };
  } catch {
    return null;
  }
}

async function buildJsQRDetector(): Promise<DetectFn> {
  const { default: jsQR } = await import('jsqr');

  return async (video: HTMLVideoElement): Promise<RawDetection[]> => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return [];

    const canvas = getJsQRCanvas();
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (!result) return [];

    const loc = result.location;
    return [
      {
        value: result.data,
        format: 'qr_code',
        cornerPoints: [
          loc.topLeftCorner,
          loc.topRightCorner,
          loc.bottomRightCorner,
          loc.bottomLeftCorner,
        ],
      },
    ];
  };
}

/**
 * Devuelve la función de detección óptima para este navegador.
 * Prefiere BarcodeDetector nativo; cae a jsQR si no está disponible.
 * El resultado se cachea: solo se construye una vez por sesión.
 */
export async function getDetector(formats: string[] = ['qr_code']): Promise<DetectFn> {
  if (_detector) return _detector;
  if (_detectorPromise) return _detectorPromise;

  _detectorPromise = (async () => {
    const native = await buildNativeDetector(formats);
    if (native) {
      _detector = native;
      return native;
    }
    const fallback = await buildJsQRDetector();
    _detector = fallback;
    return fallback;
  })();

  return _detectorPromise;
}

/** Fuerza la reconstrucción del detector (útil al cambiar formatos) */
export function resetDetector(): void {
  _detector = null;
  _detectorPromise = null;
}
