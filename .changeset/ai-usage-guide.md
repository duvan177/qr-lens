---
'qr-lens': patch
---

Añade una guía de uso para asistentes de IA (`llms.txt`, incluida en el paquete) y una sección en los READMEs con las reglas clave: el zoom se controla con la prop `zoom` y no con `applyConstraints`, la cámara se arranca una sola vez, y el hook necesita el canvas. Documenta esas reglas en los tipos. Corrige el ejemplo del hook, que pasaba una opción `locale` que no existe. Sin cambios de API ni de runtime.
