# Changesets

Este directorio gestiona el versionado y el changelog del paquete con
[Changesets](https://github.com/changesets/changesets).

## ¿Cómo añadir un changeset?

Cuando hagas un cambio que deba publicarse, ejecuta:

```bash
npm run changeset
```

Elige el tipo de cambio (`patch` / `minor` / `major`) y describe qué cambió.
Esto crea un archivo Markdown en `.changeset/` que debes incluir en tu PR.

Al hacer merge a `main`, el workflow de release abrirá (o actualizará) un PR
de "Version Packages" que consolida los changesets, sube la versión y, al
mergearlo, publica en npm automáticamente.
