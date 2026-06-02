# qr-release

Prepara y publica una nueva versión de qr-lens en npm.

## Uso
```
/qr-release <patch|minor|major>
```
Ejemplo: `/qr-release patch`

## Instrucciones para Claude

Ejecuta los pasos **en orden**, deteniéndote si alguno falla.

### Paso 1 — Verificación previa
```bash
# Asegúrate de estar en la rama principal y sin cambios sin commitear
git status
git log --oneline -5
```
Si hay cambios sin commitear: detente y pide al usuario que haga commit primero.

### Paso 2 — Typecheck y build
```bash
npm run typecheck
npm run build
```
Si falla: muestra el error y detente. No publiques con errores de tipos.

### Paso 3 — Bump de versión
Dependiendo de `$ARGUMENTS` (patch / minor / major):
```bash
npm version $ARGUMENTS --no-git-tag-version
```
Muestra la versión nueva al usuario y pide confirmación antes de continuar.

### Paso 4 — Commit y tag
```bash
git add package.json
git commit -m "chore: release v$(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version")"
```

### Paso 5 — Publicar
```bash
npm publish --access public
```

### Paso 6 — Reporte final
Muestra:
- Versión publicada
- Tamaño del bundle (`dist/`)
- Comando para instalar la nueva versión: `npm install qr-lens@<version>`

## Restricciones
- **No ejecutes** `npm publish` sin confirmación explícita del usuario tras el Paso 3.
- Si `$ARGUMENTS` no es `patch`, `minor` ni `major`, pide aclaración.
- Nunca hagas `git push --force`.
