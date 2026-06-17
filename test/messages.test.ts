import { describe, it, expect } from 'vitest';
import { getMessages, registerLocale } from '../src/i18n/messages';
import type { Messages } from '../src/types';

describe('getMessages', () => {
  it('devuelve el catálogo del idioma solicitado', () => {
    expect(getMessages('en').requestPermission).toBe('Allow camera access');
    expect(getMessages('es').requestPermission).toBe('Permitir acceso a la cámara');
    expect(getMessages('pt').requestPermission).toBe('Permitir acesso à câmera');
  });

  it('aplica overrides parciales sin mutar el resto', () => {
    const msgs = getMessages('es', { aimAtQR: 'Escanea aquí' });
    expect(msgs.aimAtQR).toBe('Escanea aquí');
    expect(msgs.loading).toBe('Cargando cámara…');
  });

  it('no muta el catálogo original entre llamadas', () => {
    getMessages('en', { error: 'X' });
    expect(getMessages('en').error).toBe('Something went wrong');
  });
});

describe('registerLocale', () => {
  it('registra un idioma nuevo recuperable con getMessages', () => {
    const fr: Messages = {
      requestPermission: "Autoriser l'accès à la caméra",
      permissionDenied: 'Accès refusé',
      permissionDeniedInstructions: 'Activez la caméra dans les réglages.',
      noCamera: 'Aucune caméra',
      loading: 'Chargement…',
      aimAtQR: 'Visez un QR code',
      switchCamera: 'Changer de caméra',
      toggleTorch: 'Lampe torche',
      notSupported: 'Caméra non supportée',
      error: 'Une erreur est survenue',
    };
    registerLocale('fr', fr);
    // @ts-expect-error: 'fr' no está en el tipo Locale, pero se registró en runtime
    expect(getMessages('fr').aimAtQR).toBe('Visez un QR code');
  });
});
