---
'qr-lens': patch
---

Corrige la resolución de tipos bajo `moduleResolution: "node16"` / `"nodenext"`. El build ejecutaba `tsc` después de `vite build` y sobrescribía el `dist/index.d.ts` autocontenido con declaraciones de imports relativos sin extensión, por lo que todos los exports resolvían a `any` (TS7006 / TS2834). Ahora se publica un único `index.d.ts` empaquetado, y el build falla si reaparecen imports relativos. Sin cambios de API ni de runtime.
