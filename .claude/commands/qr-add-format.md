# qr-add-format

Añade soporte para un nuevo formato de código de barras a la librería qr-lens.

## Uso
```
/qr-add-format <formato>
```
Ejemplo: `/qr-add-format code_128`

Formatos válidos según la spec de BarcodeDetector:
`aztec`, `code_128`, `code_39`, `code_93`, `codabar`, `data_matrix`, `ean_13`, `ean_8`, `itf`, `pdf417`, `upc_a`, `upc_e`

## Instrucciones para Claude

1. **Verificar compatibilidad**: El formato `$ARGUMENTS` debe ser un valor de la BarcodeDetector API. Si no lo reconoces, lista los válidos y pide confirmación.

2. **Revisar `src/utils/detector.ts`**:
   - En `buildNativeDetector`, el array `requestedFormats` ya filtra por los soportados por el navegador. Solo asegúrate de que el nuevo formato no requiera lógica especial.
   - Si el formato NO es `qr_code`, el fallback a jsQR no lo detectará — añade un comentario en `buildJsQRDetector` indicando que el fallback solo soporta QR.

3. **Actualizar `src/types/index.ts`**: El prop `formats` ya acepta `string[]`, así que no se necesita cambio en el tipo. Solo si hubiera un tipo `BarcodeFormat` enumerado habría que actualizarlo.

4. **Actualizar el prop `formats` por defecto** en `QRScannerProps` si el nuevo formato debe ser activo por defecto (generalmente NO; dejarlo como `['qr_code']`).

5. **Documentar** en el `README.md` la tabla de formatos soportados, añadiendo el nuevo formato con una nota sobre si el fallback jsQR lo soporta.

6. Mostrar un resumen de los cambios realizados y advertir si el nuevo formato no tiene soporte en el fallback jsQR.

## Restricciones
- El fallback jsQR solo detecta `qr_code`. Para otros formatos, la librería requiere un navegador con BarcodeDetector nativo.
- No cambiar el comportamiento por defecto (`formats: ['qr_code']`).
