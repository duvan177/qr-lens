# qr-dev

Crea o actualiza una app de demostración local para probar qr-lens durante el desarrollo.

## Uso
```
/qr-dev
```

## Instrucciones para Claude

### Paso 1 — Verificar si ya existe el ejemplo
Comprueba si existe `demo/` o `example/` en la raíz del proyecto.

### Paso 2 — Crear demo si no existe
Si no existe, crea los siguientes archivos:

**`demo/index.html`** — App Vite mínima:
```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>qr-lens — Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/demo/main.tsx"></script>
  </body>
</html>
```

**`demo/main.tsx`** — Ejemplo básico:
```tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QRScanner } from '../src';
import type { ScanResult } from '../src';

function App() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontFamily: 'system-ui', marginBottom: 16 }}>qr-lens demo</h1>
      <QRScanner
        onScan={(value) => setResult(value)}
        locale="es"
        showCameraSwitch
        showTorch
      />
      {result && (
        <p style={{ marginTop: 16, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          ✅ {result}
        </p>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### Paso 3 — Actualizar vite.config.ts para apuntar al demo
Si el entry point del demo es diferente al de la librería, asegúrate de que `vite dev` lo sirve desde `demo/index.html`.

Añade en `vite.config.ts` (solo si no está ya):
```ts
root: 'demo',        // solo para `vite dev`, no afecta el build de librería
```

O alternativamente, crea un `vite.demo.config.ts` separado.

### Paso 4 — Arrancar
```bash
npm run dev
```
Muestra la URL local al usuario.

## Restricciones
- No modifiques `src/` ni `package.json` en este comando.
- El demo debe importar desde `../src` (fuente local), no desde el paquete npm publicado.
