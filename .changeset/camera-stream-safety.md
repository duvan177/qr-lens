---
"qr-lens": patch
---

Correcciones de estabilidad de la cámara, sin cambios de API ni de comportamiento visual:

- Se pide autoenfoque continuo a la cámara cuando el dispositivo lo soporta (los navegadores que no lo soportan lo ignoran).
- Activar la linterna ya no deshace otras constraints aplicadas al track, como el modo de enfoque.
- `start()` concurrente, `start()` sobre un escáner activo y el doble montaje de StrictMode ya no dejan streams de cámara abiertos.
- Si `switchCamera()` falla, se vuelve a la cámara anterior en vez de quedarse sin imagen.
- `exports` declara `types` primero para que TypeScript resuelva los tipos con `moduleResolution: bundler` / `node16`.
