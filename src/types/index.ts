import type { CSSProperties, RefObject } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface ScanResult {
  /** Contenido decodificado del código QR */
  value: string;
  /** Formato del código (ej. 'qr_code') */
  format: string;
  /** Esquinas del QR en coordenadas del frame de vídeo */
  cornerPoints?: Point[];
  /** Caja delimitadora en coordenadas del frame de vídeo */
  boundingBox?: { x: number; y: number; width: number; height: number };
  /** Timestamp de la detección */
  timestamp: number;
}

export type ScannerErrorType =
  | 'permission-denied'
  | 'no-camera'
  | 'camera-error'
  | 'detection-error'
  | 'not-supported';

export interface ScannerError {
  type: ScannerErrorType;
  message: string;
  originalError?: unknown;
}

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface QRScannerTheme {
  /** Color del borde del QR detectado. Default: #30D158 */
  accent?: string;
  /** Color primario. Default: #FFFFFF */
  primary?: string;
  /** Fondo del componente. Default: rgba(0,0,0,0.88) */
  bg?: string;
  /** Fondo de los overlays de estado. Default: rgba(0,0,0,0.55) */
  overlay?: string;
  /** Color del texto. Default: #FFFFFF */
  text?: string;
  /** Radio de borde. Default: 16px */
  radius?: string;
}

export type Locale = 'es' | 'en' | 'pt';

export interface Messages {
  requestPermission: string;
  permissionDenied: string;
  permissionDeniedInstructions: string;
  noCamera: string;
  loading: string;
  aimAtQR: string;
  switchCamera: string;
  toggleTorch: string;
  notSupported: string;
  error: string;
}

/**
 * `'high'` pide hasta 1920×1080 y `'default'` deja elegir al navegador, como en
 * 0.1.x (a menudo 640×480). El cambio de resolución puede cambiar el encuadre.
 */
export type CameraResolution = 'high' | 'default';

export interface QRScannerHandle {
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  switchCamera: () => Promise<void>;
  getCameras: () => Promise<MediaDeviceInfo[]>;
  setTorch: (on: boolean) => Promise<void>;
}

export interface QRScannerProps {
  /** Callback principal — llamado al detectar un QR */
  onScan: (value: string, result: ScanResult) => void;
  onError?: (error: ScannerError) => void;
  onPermissionChange?: (status: PermissionStatus) => void;
  onCameraChange?: (device: MediaDeviceInfo) => void;
  onReady?: () => void;
  facingMode?: 'environment' | 'user';
  deviceId?: string;
  paused?: boolean;
  /** Cooldown entre lecturas en ms. Default: 500 */
  scanDelay?: number;
  formats?: string[];
  /**
   * Zoom de la cámara si el dispositivo lo soporta. `'auto'` aplica 1.5× en la
   * cámara trasera para que el usuario no acerque el móvil más allá de la
   * distancia mínima de enfoque. Recomendado en móviles. Default: 1 (sin zoom)
   */
  zoom?: number | 'auto';
  /**
   * Estrategias activas de enfoque: si la cámara elegida no tiene autoenfoque
   * se prueba otra cámara trasera, y si no hay lecturas se fuerza un nuevo
   * barrido de enfoque. `false` las desactiva. Default: true
   */
  autofocus?: boolean;
  /** Resolución pedida a la cámara. Default: 'high' */
  resolution?: CameraResolution;
  theme?: QRScannerTheme;
  locale?: Locale;
  messages?: Partial<Messages>;
  width?: number | string;
  height?: number | string;
  showCameraSwitch?: boolean;
  showTorch?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface UseQRScannerOptions {
  onScan: (value: string, result: ScanResult) => void;
  onError?: (error: ScannerError) => void;
  onPermissionChange?: (status: PermissionStatus) => void;
  onCameraChange?: (device: MediaDeviceInfo) => void;
  onReady?: () => void;
  facingMode?: 'environment' | 'user';
  deviceId?: string;
  paused?: boolean;
  scanDelay?: number;
  formats?: string[];
  zoom?: number | 'auto';
  autofocus?: boolean;
  resolution?: CameraResolution;
}

export interface UseQRScannerReturn {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  permissionStatus: PermissionStatus;
  cameras: MediaDeviceInfo[];
  currentCamera: MediaDeviceInfo | null;
  isReady: boolean;
  isScanning: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  lastResult: ScanResult | null;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  switchCamera: () => Promise<void>;
  getCameras: () => Promise<MediaDeviceInfo[]>;
  setTorch: (on: boolean) => Promise<void>;
}
