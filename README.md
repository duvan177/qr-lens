# qr-lens

[![npm](https://img.shields.io/npm/v/qr-lens)](https://www.npmjs.com/package/qr-lens)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/qr-lens)](https://bundlephobia.com/package/qr-lens)
[![license](https://img.shields.io/npm/l/qr-lens)](https://www.npmjs.com/package/qr-lens)

**🌐 Language:** **English** · [Español](./README.es.md)

📦 **[npmjs.com/package/qr-lens](https://www.npmjs.com/package/qr-lens)** · 🚀 **[Live demo](https://qr-lens-demo.vercel.app)**

React library for scanning QR codes — lightweight, accessible, and SSR-friendly.

- Uses the native `BarcodeDetector` when available; automatically falls back to `jsQR`
- Ships a `<QRScanner />` component and a headless `useQRScanner()` hook
- Multi-camera, torch, theming, and i18n support (es/en/pt)
- Works with Next.js, Remix, and any modern bundler
- Zero CSS frameworks — styles are encapsulated with CSS variables

---

## Installation

```bash
npm install qr-lens
# or
yarn add qr-lens
# or
pnpm add qr-lens
```

React 18+ is a peer dependency:

```bash
npm install react react-dom
```

---

## Quick start

```tsx
import { QRScanner } from 'qr-lens';

export default function Page() {
  return (
    <QRScanner
      onScan={(value) => console.log('QR detected:', value)}
      locale="en"
    />
  );
}
```

---

## `<QRScanner />` component

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onScan` *(required)* | `(value: string, result: ScanResult) => void` | — | Called when a QR code is detected |
| `onError` | `(error: ScannerError) => void` | — | Camera or detection errors |
| `onPermissionChange` | `(status: PermissionStatus) => void` | — | Permission state changes |
| `onCameraChange` | `(device: MediaDeviceInfo) => void` | — | When the active camera changes |
| `onReady` | `() => void` | — | Stream is active and the scanner is ready |
| `facingMode` | `'environment' \| 'user'` | `'environment'` | Initial rear or front camera |
| `deviceId` | `string` | — | Force a specific camera device |
| `paused` | `boolean` | `false` | Pause/resume scanning |
| `scanDelay` | `number` | `500` | Cooldown between reads (ms) |
| `formats` | `string[]` | `['qr_code']` | Formats to detect (see formats table) |
| `theme` | `QRScannerTheme` | — | Custom colors (see Theming) |
| `locale` | `'es' \| 'en' \| 'pt'` | `'en'` | Language of the UI strings |
| `messages` | `Partial<Messages>` | — | Manual override of text strings |
| `width` | `number \| string` | `'100%'` | Component width |
| `height` | `number \| string` | `320` | Component height |
| `showCameraSwitch` | `boolean` | `true` | Show the camera-switch button |
| `showTorch` | `boolean` | `true` | Show the torch button (if the device supports it) |
| `className` | `string` | — | Extra CSS class on the root element |
| `style` | `CSSProperties` | — | Extra inline styles |

### Full example

```tsx
import { useRef } from 'react';
import { QRScanner } from 'qr-lens';
import type { QRScannerHandle, ScanResult, ScannerError } from 'qr-lens';

function Scanner() {
  const ref = useRef<QRScannerHandle>(null);

  const handleScan = (value: string, result: ScanResult) => {
    console.log('Value:', value);
    console.log('Corners:', result.cornerPoints);
    console.log('Timestamp:', result.timestamp);
  };

  const handleError = (error: ScannerError) => {
    if (error.type === 'permission-denied') {
      // Show your own permission-denied UI
    }
  };

  return (
    <QRScanner
      ref={ref}
      onScan={handleScan}
      onError={handleError}
      onReady={() => console.log('Camera ready')}
      locale="en"
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

## Imperative API (ref)

Passing a `ref` to the component gives you access to the control methods:

```tsx
const ref = useRef<QRScannerHandle>(null);

// Start/stop
ref.current?.start();
ref.current?.stop();

// Pause/resume (keeps the stream active)
ref.current?.pause();
ref.current?.resume();

// Switch camera
ref.current?.switchCamera();

// Get the list of available cameras
const cameras = await ref.current?.getCameras();

// Torch
ref.current?.setTorch(true);
ref.current?.setTorch(false);
```

| Method | Signature | Description |
|---|---|---|
| `start()` | `() => Promise<void>` | Starts the camera and the detection loop |
| `stop()` | `() => void` | Stops and releases all resources |
| `pause()` | `() => void` | Pauses detection (stream stays active) |
| `resume()` | `() => void` | Resumes detection |
| `switchCamera()` | `() => Promise<void>` | Switches to the next available camera |
| `getCameras()` | `() => Promise<MediaDeviceInfo[]>` | Lists video devices |
| `setTorch(on)` | `(on: boolean) => Promise<void>` | Turns the torch on/off |

---

## Headless hook `useQRScanner()`

For integrations where you need full control over rendering:

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
    locale: 'en',
    scanDelay: 500,
  });

  if (permissionStatus === 'denied') return <p>Permission denied</p>;

  return (
    <div style={{ position: 'relative', width: 400, height: 300 }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      {isReady && cameras.length > 1 && (
        <button onClick={switchCamera}>Switch camera</button>
      )}
    </div>
  );
}
```

### Hook options

Accepts the same behavioral props as `<QRScanner />` (without the UI ones):
`onScan`, `onError`, `onPermissionChange`, `onCameraChange`, `onReady`, `facingMode`, `deviceId`, `paused`, `scanDelay`, `formats`.

### Returned values

| Field | Type | Description |
|---|---|---|
| `videoRef` | `RefObject<HTMLVideoElement>` | Ref for the `<video>` element |
| `canvasRef` | `RefObject<HTMLCanvasElement>` | Ref for the overlay canvas |
| `permissionStatus` | `PermissionStatus` | Current camera-permission state |
| `cameras` | `MediaDeviceInfo[]` | Available video devices |
| `currentCamera` | `MediaDeviceInfo \| null` | Active device |
| `isReady` | `boolean` | `true` when the stream is active |
| `isScanning` | `boolean` | `true` when the detection loop is running |
| `torchSupported` | `boolean` | The device supports a torch |
| `torchOn` | `boolean` | Current torch state |
| `lastResult` | `ScanResult \| null` | Last detected QR code |
| + all `QRScannerHandle` methods | | `start`, `stop`, `pause`, `resume`, `switchCamera`, `getCameras`, `setTorch` |

---

## Theming

All colors map to CSS variables you can override:

```tsx
<QRScanner
  onScan={...}
  theme={{
    accent:  '#30D158',           // border of the detected QR
    primary: '#FFFFFF',           // primary color
    bg:      'rgba(0,0,0,0.9)',   // component background
    overlay: 'rgba(0,0,0,0.6)',   // state overlays (loading, error)
    text:    '#FFFFFF',           // UI text
    radius:  '20px',              // component border radius
  }}
/>
```

You can also override them globally in your CSS:

```css
.my-scanner {
  --qr-accent:  #FF6B35;
  --qr-bg:      #1a1a2e;
  --qr-radius:  12px;
}
```

```tsx
<QRScanner onScan={...} className="my-scanner" />
```

---

## Internationalization

Bundled languages: **Spanish (`es`)**, **English (`en`)**, **Portuguese (`pt`)**.

```tsx
<QRScanner onScan={...} locale="en" />
```

### Override individual strings

```tsx
<QRScanner
  onScan={...}
  locale="en"
  messages={{
    aimAtQR: 'Focus the code',
    permissionDenied: 'No camera access',
  }}
/>
```

### Register a new language

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

## Supported formats

| Format | Native BarcodeDetector | jsQR fallback |
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

> The `jsQR` fallback kicks in automatically when `BarcodeDetector` is unavailable. It only detects `qr_code`. Other formats require a browser with native support (Chrome 83+, Edge 83+).

```tsx
<QRScanner
  onScan={...}
  formats={['qr_code', 'ean_13', 'code_128']}
/>
```

---

## Usage with Next.js (SSR)

The component is SSR-safe. Every access to `window`, `navigator`, and `document` is guarded. No extra configuration is needed in Next.js 13+ (App Router):

```tsx
// app/scan/page.tsx
import { QRScanner } from 'qr-lens';

export default function ScanPage() {
  'use client'; // required because it uses hooks and browser APIs
  return <QRScanner onScan={(v) => console.log(v)} />;
}
```

With the Pages Router:

```tsx
// pages/scan.tsx
import dynamic from 'next/dynamic';

const QRScanner = dynamic(
  () => import('qr-lens').then((m) => m.QRScanner),
  { ssr: false }
);
```

---

## TypeScript type reference

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
  value: string;       // decoded content
  format: string;      // e.g. 'qr_code'
  cornerPoints?: Point[];  // corners in video-frame coordinates
  boundingBox?: { x: number; y: number; width: number; height: number };
  timestamp: number;   // Date.now() at the moment of detection
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

## Browser compatibility

| Browser | Support | Detection mode |
|---|:---:|---|
| Chrome 88+ (desktop) | ✅ | Native BarcodeDetector |
| Chrome 88+ (Android) | ✅ | Native BarcodeDetector |
| Edge 88+ | ✅ | Native BarcodeDetector |
| Safari 16+ (macOS/iOS) | ✅ | jsQR (fallback) |
| Firefox | ✅ | jsQR (fallback) |
| Samsung Internet 11+ | ✅ | Native BarcodeDetector |

> `getUserMedia` requires **HTTPS** in production. On `localhost` it works without a certificate.

---

## Security & privacy notes (audit)

### Camera permissions
- The library requests camera access only through `navigator.mediaDevices.getUserMedia`.
- It never requests audio (`audio: false` in all cases).
- The stream is fully released (`track.stop()`) when the component unmounts, on pause, and when switching cameras.
- The tab automatically pauses scanning when it loses visibility (`visibilitychange`), preventing passive background recording.

### Image processing
- Video frames are processed **locally in the browser**. No frame or image is sent to external servers.
- The detection canvas (`jsQR`) is a DOM element not attached to the document, invisible to the user.
- The native `BarcodeDetector` API also processes locally; it makes no network calls.

### Detected data
- The library returns the decoded QR value as a string. **It does not store, log, or transmit any scanned value**.
- Scan history is the responsibility of the consuming application.

### Dependencies
| Package | Version | Purpose | Loaded conditionally |
|---|---|---|:---:|
| `jsqr` | ^1.4.0 | QR fallback detection (no WASM) | Yes — only if BarcodeDetector is unavailable |

`jsqr` has no transitive dependencies and makes no network calls.

### Attack surface
- No network endpoints, WebSockets, or workers.
- No `eval`, `Function()`, or dynamic code-execution techniques.
- QR values returned in `onScan` are raw strings. The consuming application is responsible for sanitizing any URL or other content before navigating to or executing it.

---

## Performance

- The detection loop uses `requestAnimationFrame` for smooth animation (~60 fps).
- Actual detection is throttled with `scanDelay` (default 500 ms) to avoid saturating the CPU.
- The detector is cached: `BarcodeDetector` and `jsQR` are instantiated only once per session.
- `jsQR` is loaded via dynamic `import()` only when the browser lacks `BarcodeDetector`, keeping the initial bundle lightweight.

---

## Contributing

Contributions are welcome! Read the [Contributing Guide](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## License

MIT © 2026 Duvan Narvaez
