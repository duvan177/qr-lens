# qr-lens

## 0.2.0

### Minor Changes

- ca9cd87: Mejora el enfoque en móviles:

  - La cámara se pide hasta 1080p con autoenfoque continuo. **Puede cambiar el encuadre** (por ejemplo de 4:3 a 16:9). Nueva prop `resolution`: `resolution="default"` deja elegir al navegador, como en 0.1.x.
  - El fallback `jsQR` recibe el frame reducido a 960 px para limitar el coste de la mayor resolución en iOS.
  - Nueva prop `autofocus` (por defecto `true`): si la cámara elegida es de enfoque fijo se prueba otra cámara trasera con autoenfoque, y si no hay lecturas se fuerza un nuevo barrido de enfoque (cada 2,5 s, espaciándose hasta 10 s). `autofocus={false}` lo desactiva.
  - Nueva prop `zoom` (por defecto `1`, sin cambios). `zoom="auto"` aplica 1.5× en la cámara trasera y es lo recomendado en móviles.
  - Si `start()` falla, se libera la cámara y el escáner deja de figurar como listo. Un fallo de `video.play()` ya no se notifica como permiso denegado.

## 0.1.7

### Patch Changes

- 1389095: Actualiza el enlace de la demo en vivo del README (ahora en Cloudflare Workers) para que la página de npm apunte a la URL vigente. Sin cambios de API ni de runtime.

## 0.1.6

### Patch Changes

- a7ab408: Corrige la resolución de tipos bajo `moduleResolution: "node16"` / `"nodenext"`. El build ejecutaba `tsc` después de `vite build` y sobrescribía el `dist/index.d.ts` autocontenido con declaraciones de imports relativos sin extensión, por lo que todos los exports resolvían a `any` (TS7006 / TS2834). Ahora se publica un único `index.d.ts` empaquetado, y el build falla si reaparecen imports relativos. Sin cambios de API ni de runtime.

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
