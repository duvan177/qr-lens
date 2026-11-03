---
"qr-lens": minor
---

Mejora el enfoque en móviles sin cambiar el comportamiento visual por defecto:

- La cámara se pide hasta 1080p con autoenfoque continuo. El fallback `jsQR` recibe el frame reducido a 960 px, así que el coste por lectura en iOS se mantiene.
- Nueva prop `autofocus` (por defecto `true`): si la cámara elegida es de enfoque fijo se prueba otra cámara trasera con autoenfoque, y si no hay lecturas se fuerza un nuevo barrido de enfoque (cada 2,5 s, espaciándose hasta 10 s). `autofocus={false}` lo desactiva.
- Nueva prop `zoom` (por defecto `1`, sin cambios). `zoom="auto"` aplica 1.5× en la cámara trasera y es lo recomendado en móviles.
