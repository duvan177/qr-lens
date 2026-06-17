# Contribuir a qr-lens

**🌐 Idioma:** **Español** · [English](./CONTRIBUTING.md)

¡Gracias por tu interés en mejorar **qr-lens**! 🎉 Toda contribución es bienvenida:
issues, mejoras de documentación, traducciones, nuevos formatos de código o
correcciones de bugs.

## Requisitos

- Node.js >= 18
- npm

## Puesta en marcha

```bash
git clone https://github.com/duvan177/qr-lens.git
cd qr-lens
npm install
npm run dev        # arranca el playground/demo local
```

## Flujo de trabajo

1. Crea un fork y una rama descriptiva: `git checkout -b feat/torch-toggle`.
2. Haz tus cambios siguiendo el estilo del proyecto.
3. Asegúrate de que todo pasa en local:

   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

4. Añade un **changeset** describiendo tu cambio (ver abajo).
5. Abre un Pull Request contra `main` y rellena la plantilla.

## Changesets (versionado)

Usamos [Changesets](https://github.com/changesets/changesets). Si tu cambio
afecta a lo que se publica en npm, ejecuta:

```bash
npm run changeset
```

Elige `patch` (bugfix), `minor` (nueva funcionalidad retrocompatible) o
`major` (cambio incompatible), describe el cambio e incluye el archivo
generado en tu PR. No subas la versión manualmente: lo hace el bot de release.

## Estilo de código

- TypeScript en modo `strict`.
- ESLint + Prettier (`npm run lint:fix` y `npm run format`).
- Mantén las funciones de utilidad puras y testeables.
- Los mensajes de UI van en `src/i18n/messages.ts`, nunca hardcodeados.

## Añadir un idioma o un formato

El proyecto incluye guías rápidas:

- **Idioma nuevo**: añade el catálogo en `src/i18n/messages.ts` y un test en
  `test/messages.test.ts`.
- **Formato de código**: revisa `src/utils/detector.ts`.

## Documentación (bilingüe)

La documentación se mantiene en inglés y español:

- `README.md` (EN) ↔ `README.es.md` (ES)
- `CONTRIBUTING.md` (EN) ↔ `CONTRIBUTING.es.md` (ES)
- `CODE_OF_CONDUCT.md` (EN) ↔ `CODE_OF_CONDUCT.es.md` (ES)

Cuando cambies un idioma, refleja el cambio en el otro. Si solo puedes hacer
uno, indícalo en el PR y te ayudamos con la traducción.

## Tests

Usamos [Vitest](https://vitest.dev). Los tests viven en `test/`. Prioriza
cubrir las utilidades puras (`canvas`, `camera`, `detector`, `i18n`). Para el
hook y el componente, mockea `getUserMedia` y `BarcodeDetector`.

```bash
npm run test          # una vez
npm run test:watch    # modo watch
npm run test:coverage # con cobertura
```

## Reportar bugs

Abre un issue con la plantilla de bug e incluye navegador, versión y, si es
posible, un caso reproducible mínimo.

## Código de conducta

Al participar aceptas nuestro [Código de Conducta](./CODE_OF_CONDUCT.md).
