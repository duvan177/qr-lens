# qr-add-locale

Añade soporte para un nuevo idioma a la librería qr-lens.

## Uso
```
/qr-add-locale <código-iso>
```
Ejemplo: `/qr-add-locale fr`

## Instrucciones para Claude

1. **Leer el catálogo actual** en `src/i18n/messages.ts` para ver todas las claves existentes.

2. **Traducir** todas las cadenas de la interfaz `Messages` al idioma indicado (`$ARGUMENTS`). Si no conoces el idioma con certeza, usa inglés como fallback y marca cada cadena con un comentario `// TODO: review translation`.

3. **Editar `src/i18n/messages.ts`**:
   - Añadir el nuevo locale al objeto `CATALOG`.
   - Mantener el orden alfabético de las claves dentro del objeto.

4. **Actualizar el tipo `Locale`** en `src/types/index.ts` para incluir el nuevo código de idioma.

5. **Actualizar `src/index.ts`** si el tipo `Locale` se exporta directamente (verificar).

6. Mostrar un resumen de las traducciones añadidas y recordarle al usuario que las revise si son automáticas.

## Restricciones
- No modificar ningún archivo fuera de `src/i18n/messages.ts` y `src/types/index.ts`.
- No romper los idiomas existentes (`es`, `en`, `pt`).
- No añadir dependencias externas.
