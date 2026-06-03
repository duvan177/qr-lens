# qr-lens

[![npm](https://img.shields.io/npm/v/qr-lens)](https://www.npmjs.com/package/qr-lens)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/qr-lens)](https://bundlephobia.com/package/qr-lens)
[![license](https://img.shields.io/npm/l/qr-lens)](https://www.npmjs.com/package/qr-lens)

📦 **[npmjs.com/package/qr-lens](https://www.npmjs.com/package/qr-lens)** · 🚀 **[Demo en vivo](https://qr-lens-demo.vercel.app)**

Librería React para escaneo de códigos QR — ligera, accesible y compatible con SSR.

- Usa `BarcodeDetector` nativo cuando está disponible; cae automáticamente a `jsQR`
- Expone un componente `<QRScanner />` y un hook headless `useQRScanner()`
- Soporte de multi-cámara, linterna, tematización y i18n (es/en/pt)
- Compatible con Next.js, Remix y cualquier bundler moderno
- Cero CSS frameworks — estilos encapsulados con variables CSS

---

## Instalación

```bash
npm install qr-lens
# o
yarn add qr-lens
# o
pnpm add qr-lens
```

React 18+ es peer dependency:

```bash
npm install react react-dom
```

---

## Inicio rápido

```tsx
import { QRScanner } from 'qr-lens';

export default function Page() {
  return (
    <QRScanner
      onScan={(value) => console.log('QR detectado:', value)}
      locale="es"
    />
  );
}
```

---

## Componente `<QRScanner />`

### Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `onScan` *(requerida)* | `(value: string, result: ScanResult) => void` | — | Callback al detectar un QR |
| `onError` | `(error: ScannerError) => void` | — | Errores de cámara o detección |
| `onPermissionChange` | `(status: PermissionStatus) => void` | — | Cambios en el estado del permiso |
| `onCameraChange` | `(device: MediaDeviceInfo) => void` | — | Al cambiar de cámara |
| `onReady` | `() => void` | — | Stream activo y escáner listo |
| `facingMode` | `'environment' \| 'user'` | `'environment'` | Cámara trasera o frontal inicial |
| `deviceId` | `string` | — | Forzar un dispositivo de cámara concreto |
| `paused` | `boolean` | `false` | Pausar/reanudar el escaneo |
| `scanDelay` | `number` | `500` | Cooldown entre lecturas (ms) |
| `formats` | `string[]` | `['qr_code']` | Formatos a detectar (ver tabla de formatos) |
| `theme` | `QRScannerTheme` | — | Colores personalizados (ver Tematización) |
| `locale` | `'es' \| 'en' \| 'pt'` | `'en'` | Idioma de los textos de la UI |
| `messages` | `Partial<Messages>` | — | Override manual de cadenas de texto |
| `width` | `number \| string` | `'100%'` | Ancho del componente |
| `height` | `number \| string` | `320` | Alto del componente |
| `showCameraSwitch` | `boolean` | `true` | Mostrar botón de cambio de cámara |
| `showTorch` | `boolean` | `true` | Mostrar botón de linterna (si el dispositivo lo soporta) |
| `className` | `string` | — | Clase CSS adicional en el elemento raíz |
| `style` | `CSSProperties` | — | Estilos inline adicionales |

### Ejemplo completo

```tsx
import { useRef } from 'react';
import { QRScanner } from 'qr-lens';
import type { QRScannerHandle, ScanResult, ScannerError } from 'qr-lens';

function Scanner() {
  const ref = useRef<QRScannerHandle>(null);

  const handleScan = (value: string, result: ScanResult) => {
    console.log('Valor:', value);
    console.log('Esquinas:', result.cornerPoints);
    console.log('Timestamp:', result.timestamp);
  };

  const handleError = (error: ScannerError) => {
    if (error.type === 'permission-denied') {
      // Mostrar UI propia de permiso denegado
    }
  };

  return (
    <QRScanner
      ref={ref}
      onScan={handleScan}
      onError={handleError}
      onReady={() => console.log('Cámara lista')}
      locale="es"
      facingMode="environment"
      scanDelay={600}
      width={400}
      height={300}
      theme={{ accent: '#30D158', radius: '20px' }}
      showCameraSwitch
      showTorch
    />
  );
}
```

---

## API imperativa (ref)

Al pasar un `ref` al componente, obtienes acceso a los métodos de control:

```tsx
const ref = useRef<QRScannerHandle>(null);

// Iniciar/detener
ref.current?.start();
ref.current?.stop();

// Pausar/reanudar (mantiene el stream activo)
ref.current?.pause();
ref.current?.resume();

// Cambiar de cámara
ref.current?.switchCamera();

// Obtener lista de cámaras disponibles
const cameras = await ref.current?.getCameras();

// Linterna
ref.current?.setTorch(true);
ref.current?.setTorch(false);
```

| Método | Firma | Descripción |
|---|---|---|
| `start()` | `() => Promise<void>` | Inicia la cámara y el loop de detección |
| `stop()` | `() => void` | Detiene y libera todos los recursos |
| `pause()` | `() => void` | Pausa la detección (stream sigue activo) |
| `resume()` | `() => void` | Reanuda la detección |
| `switchCamera()` | `() => Promise<void>` | Cambia a la siguiente cámara disponible |
| `getCameras()` | `() => Promise<MediaDeviceInfo[]>` | Lista los dispositivos de vídeo |
| `setTorch(on)` | `(on: boolean) => Promise<void>` | Activa/desactiva la linterna |

---

## Hook headless `useQRScanner()`

Para integraciones donde necesitas control total sobre el renderizado:

```tsx
import { useRef } from 'react';
import { useQRScanner } from 'qr-lens';

function CustomScanner() {
  const {
    videoRef,
    canvasRef,
    permissionStatus,
    isReady,
    cameras,
    currentCamera,
    torchSupported,
    torchOn,
    lastResult,
    switchCamera,
    setTorch,
  } = useQRScanner({
    onScan: (value, result) => console.log(value, result),
    onError: (err) => console.error(err),
    locale: 'es',
    scanDelay: 500,
  });

  if (permissionStatus === 'denied') return <p>Permiso denegado</p>;

  return (
    <div style={{ position: 'relative', width: 400, height: 300 }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      {isReady && cameras.length > 1 && (
        <button onClick={switchCamera}>Cambiar cámara</button>
      )}
    </div>
  );
}
```

### Opciones del hook

Acepta las mismas props de comportamiento que `<QRScanner />` (sin las de UI):
`onScan`, `onError`, `onPermissionChange`, `onCameraChange`, `onReady`, `facingMode`, `deviceId`, `paused`, `scanDelay`, `formats`.

### Valores devueltos

| Campo | Tipo | Descripción |
|---|---|---|
| `videoRef` | `RefObject<HTMLVideoElement>` | Ref para el elemento `<video>` |
| `canvasRef` | `RefObject<HTMLCanvasElement>` | Ref para el canvas de overlay |
| `permissionStatus` | `PermissionStatus` | Estado actual del permiso de cámara |
| `cameras` | `MediaDeviceInfo[]` | Dispositivos de vídeo disponibles |
| `currentCamera` | `MediaDeviceInfo \| null` | Dispositivo activo |
| `isReady` | `boolean` | `true` cuando el stream está activo |
| `isScanning` | `boolean` | `true` cuando el loop de detección está corriendo |
| `torchSupported` | `boolean` | El dispositivo soporta linterna |
| `torchOn` | `boolean` | Estado actual de la linterna |
| `lastResult` | `ScanResult \| null` | Último QR detectado |
| + todos los métodos de `QRScannerHandle` | | `start`, `stop`, `pause`, `resume`, `switchCamera`, `getCameras`, `setTorch` |

---

## Tematización

Todos los colores se mapean a variables CSS que puedes sobreescribir:

```tsx
<QRScanner
  onScan={...}
  theme={{
    accent:  '#30D158',           // borde del QR detectado
    primary: '#FFFFFF',           // color principal
    bg:      'rgba(0,0,0,0.9)',   // fondo del componente
    overlay: 'rgba(0,0,0,0.6)',   // fondo de estados (cargando, error)
    text:    '#FFFFFF',           // texto de la UI
    radius:  '20px',              // radio de borde del componente
  }}
/>
```

También puedes sobreescribirlas globalmente en tu CSS:

```css
.mi-escaner {
  --qr-accent:  #FF6B35;
  --qr-bg:      #1a1a2e;
  --qr-radius:  12px;
}
```

```tsx
<QRScanner onScan={...} className="mi-escaner" />
```

---

## Internacionalización

Idiomas incluidos: **español (`es`)**, **inglés (`en`)**, **portugués (`pt`)**.

```tsx
<QRScanner onScan={...} locale="es" />
```

### Override de textos puntuales

```tsx
<QRScanner
  onScan={...}
  locale="es"
  messages={{
    aimAtQR: 'Enfoca el código',
    permissionDenied: 'Sin acceso a la cámara',
  }}
/>
```

### Registrar un idioma nuevo

```ts
import { registerLocale } from 'qr-lens';

registerLocale('fr', {
  requestPermission: "Autoriser l'accès à la caméra",
  permissionDenied: 'Accès à la caméra refusé',
  permissionDeniedInstructions: 'Allez dans Réglages → Confidentialité → Caméra.',
  noCamera: 'Aucune caméra disponible',
  loading: 'Chargement…',
  aimAtQR: 'Pointez vers un code QR',
  switchCamera: 'Changer de caméra',
  toggleTorch: 'Lampe de poche',
  notSupported: "La caméra n'est pas prise en charge",
  error: "Une erreur s'est produite",
});
```

---

## Formatos soportados

| Formato | BarcodeDetector nativo | Fallback jsQR |
|---|:---:|:---:|
| `qr_code` | ✅ | ✅ |
| `aztec` | ✅ | ❌ |
| `code_128` | ✅ | ❌ |
| `code_39` | ✅ | ❌ |
| `data_matrix` | ✅ | ❌ |
| `ean_13` | ✅ | ❌ |
| `ean_8` | ✅ | ❌ |
| `pdf417` | ✅ | ❌ |
| `upc_a` | ✅ | ❌ |

> El fallback a `jsQR` se activa automáticamente cuando `BarcodeDetector` no está disponible. Solo detecta `qr_code`. Para otros formatos se requiere un navegador con soporte nativo (Chrome 83+, Edge 83+).

```tsx
<QRScanner
  onScan={...}
  formats={['qr_code', 'ean_13', 'code_128']}
/>
```

---

## Uso con Next.js (SSR)

El componente es SSR-safe. Todos los accesos a `window`, `navigator` y `document` están protegidos. No se necesita configuración adicional en Next.js 13+ (App Router):

```tsx
// app/scan/page.tsx
import { QRScanner } from 'qr-lens';

export default function ScanPage() {
  'use client'; // necesario porque usa hooks y APIs del navegador
  return <QRScanner onScan={(v) => console.log(v)} />;
}
```

Con Pages Router:

```tsx
// pages/scan.tsx
import dynamic from 'next/dynamic';

const QRScanner = dynamic(
  () => import('qr-lens').then((m) => m.QRScanner),
  { ssr: false }
);
```

---

## Referencia de tipos TypeScript

```ts
import type {
  ScanResult,
  ScannerError,
  ScannerErrorType,
  PermissionStatus,
  QRScannerTheme,
  QRScannerHandle,
  QRScannerProps,
  UseQRScannerOptions,
  UseQRScannerReturn,
  Locale,
  Messages,
  Point,
} from 'qr-lens';
```

### `ScanResult`

```ts
interface ScanResult {
  value: string;       // contenido decodificado
  format: string;      // ej. 'qr_code'
  cornerPoints?: Point[];  // esquinas en coordenadas del frame de vídeo
  boundingBox?: { x: number; y: number; width: number; height: number };
  timestamp: number;   // Date.now() al momento de la detección
}
```

### `ScannerError`

```ts
interface ScannerError {
  type: 'permission-denied' | 'no-camera' | 'camera-error' | 'detection-error' | 'not-supported';
  message: string;
  originalError?: unknown;
}
```

### `PermissionStatus`

```ts
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';
```

---

## Compatibilidad de navegadores

| Navegador | Soporte | Modo de detección |
|---|:---:|---|
| Chrome 88+ (desktop) | ✅ | BarcodeDetector nativo |
| Chrome 88+ (Android) | ✅ | BarcodeDetector nativo |
| Edge 88+ | ✅ | BarcodeDetector nativo |
| Safari 16+ (macOS/iOS) | ✅ | jsQR (fallback) |
| Firefox | ✅ | jsQR (fallback) |
| Samsung Internet 11+ | ✅ | BarcodeDetector nativo |

> `getUserMedia` requiere **HTTPS** en producción. En `localhost` funciona sin certificado.

---

## Consideraciones de seguridad y privacidad (auditoría)

### Permisos de cámara
- La librería solicita acceso a la cámara únicamente mediante `navigator.mediaDevices.getUserMedia`.
- No solicita audio (`audio: false` en todos los casos).
- El stream se libera completamente (`track.stop()`) al desmontar el componente, al pausar y al cambiar de cámara.
- La pestaña pausa automáticamente el escaneo al perder visibilidad (`visibilitychange`), evitando grabación pasiva en segundo plano.

### Procesamiento de imágenes
- Los frames de vídeo se procesan **localmente en el navegador**. Ningún frame ni imagen se envía a servidores externos.
- El canvas de detección (`jsQR`) es un elemento DOM no adjunto al documento, invisible para el usuario.
- La API nativa `BarcodeDetector` también procesa localmente; no realiza llamadas de red.

### Datos detectados
- La librería devuelve el valor decodificado del QR como string. **No almacena, registra ni transmite ningún valor escaneado**.
- El historial de lecturas es responsabilidad de la aplicación que consume la librería.

### Dependencias
| Paquete | Versión | Propósito | Cargado condicionalmente |
|---|---|---|:---:|
| `jsqr` | ^1.4.0 | Detección QR fallback (sin WASM) | Sí — solo si BarcodeDetector no está disponible |

`jsqr` no tiene dependencias transitivas y no realiza llamadas de red.

### Surface de ataque
- No hay endpoints de red, WebSockets ni workers.
- No usa `eval`, `Function()` ni técnicas de ejecución dinámica de código.
- Los valores QR devueltos en `onScan` son strings sin procesar. La aplicación consumidora es responsable de sanitizar cualquier URL u otro contenido antes de navegarlo o ejecutarlo.

---

## Rendimiento

- El loop de detección usa `requestAnimationFrame` para animación fluida (~60 fps).
- La detección real se limita con `scanDelay` (default 500 ms) para no saturar la CPU.
- El detector se cachea: `BarcodeDetector` y `jsQR` se instancian una sola vez por sesión.
- `jsQR` se carga mediante `import()` dinámico solo si el navegador no soporta `BarcodeDetector`, manteniendo el bundle inicial ligero.

---

## Licencia

MIT © 2026