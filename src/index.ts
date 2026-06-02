// Componente y hook principales
export { QRScanner } from './components/QRScanner';
export { useQRScanner } from './hooks/useQRScanner';

// Tipos exportados
export type {
  Point,
  ScanResult,
  ScannerError,
  ScannerErrorType,
  PermissionStatus,
  QRScannerTheme,
  Locale,
  Messages,
  QRScannerHandle,
  QRScannerProps,
  UseQRScannerOptions,
  UseQRScannerReturn,
} from './types';

// Internacionalización
export { getMessages, registerLocale } from './i18n/messages';

// Utilidades (para integraciones avanzadas)
export { getDetector, resetDetector } from './utils/detector';
