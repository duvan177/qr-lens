import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Para probar en un móvil real hace falta HTTPS (getUserMedia exige contexto seguro):
// DEMO_HTTPS_KEY=key.pem DEMO_HTTPS_CERT=cert.pem vite --config vite.demo.config.ts --host
const { DEMO_HTTPS_KEY, DEMO_HTTPS_CERT } = process.env;

export default defineConfig({
  plugins: [react()],
  server:
    DEMO_HTTPS_KEY && DEMO_HTTPS_CERT
      ? { https: { key: readFileSync(DEMO_HTTPS_KEY), cert: readFileSync(DEMO_HTTPS_CERT) } }
      : undefined,
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
  },
});
