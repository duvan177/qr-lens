---
"qr-lens": patch
---

Fix `Cannot destructure property 'default' from null or undefined value` camera crash on Safari, desktop browsers without native BarcodeDetector, and consumers loading the package inside a Module Federation remote. The jsQR fallback now uses a static import instead of a dynamic `import()` to a side chunk, so it no longer depends on the host bundler resolving that chunk's relative path correctly. Detector construction failures are also non-fatal to camera start.
