# qr-review

Revisa la salud general de la librería qr-lens: tipos, exports, consistencia de la API y posibles regressions.

## Uso
```
/qr-review
```

## Instrucciones para Claude

Ejecuta estas comprobaciones en orden y reporta los hallazgos:

### 1. Consistencia de tipos
- Lee `src/types/index.ts`. Verifica que `QRScannerProps` y `UseQRScannerOptions` tengan las mismas props de comportamiento (facingMode, deviceId, paused, scanDelay, formats).
- Verifica que `UseQRScannerReturn` exponga todos los métodos declarados en `QRScannerHandle`.

### 2. Exports públicos
- Lee `src/index.ts`. Confirma que exporta: `QRScanner`, `useQRScanner`, todos los tipos de `src/types/index.ts`, `getMessages`, `registerLocale`, `getDetector`, `resetDetector`.
- Busca cualquier símbolo definido en `src/` que debería ser público pero no está exportado.

### 3. Seguridad SSR
- Busca todos los accesos a `window`, `navigator`, `document` y `requestAnimationFrame` en `src/`.
- Confirma que cada uno tiene una guarda `typeof window !== 'undefined'` o está dentro de un `useEffect`.

### 4. Fugas de MediaStream
- Verifica en `src/hooks/useQRScanner.ts` que `stopStream` se llama en: cleanup del useEffect principal, `stop()`, `switchCamera()` (antes de pedir el nuevo stream).

### 5. Loop RAF
- Confirma que `cancelAnimationFrame` se llama en `stopLoop` y que `stopLoop` se invoca en el cleanup del useEffect.

### 6. i18n
- Lee `src/i18n/messages.ts`. Verifica que todos los idiomas (`en`, `es`, `pt`) tienen exactamente las mismas claves.

### Salida esperada
Lista de ✅ (ok) y ⚠️ (problema encontrado) para cada comprobación, con la línea exacta de cada problema.
