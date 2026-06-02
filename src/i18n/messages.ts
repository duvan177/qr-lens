import type { Locale, Messages } from '../types';

const CATALOG: Record<Locale, Messages> = {
  en: {
    requestPermission: 'Allow camera access',
    permissionDenied: 'Camera access denied',
    permissionDeniedInstructions:
      'Go to Settings → Privacy → Camera and enable access for this site.',
    noCamera: 'No camera available on this device',
    loading: 'Loading camera…',
    aimAtQR: 'Point at a QR code',
    switchCamera: 'Switch camera',
    toggleTorch: 'Toggle torch',
    notSupported: 'Camera is not supported in this browser',
    error: 'Something went wrong',
  },
  es: {
    requestPermission: 'Permitir acceso a la cámara',
    permissionDenied: 'Acceso a la cámara denegado',
    permissionDeniedInstructions:
      'Ve a Ajustes → Privacidad → Cámara y activa el acceso para este sitio.',
    noCamera: 'No hay cámara disponible en este dispositivo',
    loading: 'Cargando cámara…',
    aimAtQR: 'Apunta a un código QR',
    switchCamera: 'Cambiar cámara',
    toggleTorch: 'Activar linterna',
    notSupported: 'La cámara no es compatible con este navegador',
    error: 'Ha ocurrido un error',
  },
  pt: {
    requestPermission: 'Permitir acesso à câmera',
    permissionDenied: 'Acesso à câmera negado',
    permissionDeniedInstructions:
      'Vá em Configurações → Privacidade → Câmera e ative o acesso para este site.',
    noCamera: 'Nenhuma câmera disponível neste dispositivo',
    loading: 'Carregando câmera…',
    aimAtQR: 'Aponte para um código QR',
    switchCamera: 'Trocar câmera',
    toggleTorch: 'Ativar lanterna',
    notSupported: 'A câmera não é compatível com este navegador',
    error: 'Ocorreu um erro',
  },
};

export function getMessages(locale: Locale, overrides?: Partial<Messages>): Messages {
  return { ...CATALOG[locale], ...overrides };
}

/** Añade un nuevo idioma al catálogo en tiempo de ejecución */
export function registerLocale(locale: string, messages: Messages): void {
  (CATALOG as Record<string, Messages>)[locale] = messages;
}
