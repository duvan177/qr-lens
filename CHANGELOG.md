# qr-lens

## 0.1.5

### Patch Changes

- 3cab291: Correcciones de estabilidad de la cámara, sin cambios de API ni de comportamiento visual:

  - Se pide autoenfoque continuo a la cámara cuando el dispositivo lo soporta (los navegadores que no lo soportan lo ignoran).
  - Activar la linterna ya no deshace otras constraints aplicadas al track, como el modo de enfoque.
  - `start()` concurrente, `start()` sobre un escáner activo y el doble montaje de StrictMode ya no dejan streams de cámara abiertos.
  - Si `switchCamera()` falla, se vuelve a la cámara anterior en vez de quedarse sin imagen.
  - `exports` declara `types` primero para que TypeScript resuelva los tipos con `moduleResolution: bundler` / `node16`.

## 0.1.4

### Patch Changes

- 626871d: Fix `Cannot destructure property 'default' from null or undefined value` camera crash on Safari, desktop browsers without native BarcodeDetector, and consumers loading the package inside a Module Federation remote. The jsQR fallback now uses a static import instead of a dynamic `import()` to a side chunk, so it no longer depends on the host bundler resolving that chunk's relative path correctly. Detector construction failures are also non-fatal to camera start.

## 0.1.3

### Patch Changes

- 64c5ec9: Mejora los metadatos del paquete para npm (`repository`, `homepage`, `bugs`, `keywords`, `engines`, `sideEffects`) para mejorar la descubribilidad y el tree-shaking.
