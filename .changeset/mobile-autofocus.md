---
"qr-lens": minor
---

Mejora el enfoque en móviles:

- La cámara se pide hasta 1080p con autoenfoque continuo. **Puede cambiar el encuadre** (por ejemplo de 4:3 a 16:9). Nueva prop `resolution`: `resolution="default"` deja elegir al navegador, como en 0.1.x.
- El fallback `jsQR` recibe el frame reducido a 960 px para limitar el coste de la mayor resolución en iOS.
- Nueva prop `autofocus` (por defecto `true`): si la cámara elegida es de enfoque fijo se prueba otra cámara trasera con autoenfoque, y si no hay lecturas se fuerza un nuevo barrido de enfoque (cada 2,5 s, espaciándose hasta 10 s). `autofocus={false}` lo desactiva.
- Nueva prop `zoom` (por defecto `1`, sin cambios). `zoom="auto"` aplica 1.5× en la cámara trasera y es lo recomendado en móviles.
- Si `start()` falla, se libera la cámara y el escáner deja de figurar como listo. Un fallo de `video.play()` ya no se notifica como permiso denegado.
