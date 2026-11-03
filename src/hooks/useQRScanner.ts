import { useRef, useState, useEffect, useCallback } from 'react';
import { getDetector, type DetectFn } from '../utils/detector';
import {
  requestCamera,
  enumerateCameras,
  stopStream,
  isTorchSupported,
  setTorchState,
  findCurrentCamera,
  applyContinuousFocus,
  applyZoom,
  nudgeFocus,
  preferAutofocusCamera,
} from '../utils/camera';
import {
  drawQRBorder,
  drawReticle,
  lerpPoints,
  videoPointsToCanvas,
} from '../utils/canvas';
import type {
  UseQRScannerOptions,
  UseQRScannerReturn,
  PermissionStatus,
  ScanResult,
  Point,
} from '../types';

/** Tiempo sin detecciones tras el cual se fuerza un nuevo barrido de enfoque */
const REFOCUS_BASE_INTERVAL = 2500;
/** Tope del backoff: evita que la imagen "respire" sin parar si no hay QR delante */
const REFOCUS_MAX_INTERVAL = 10000;

/**
 * Enfoque continuo + zoom. Best effort y sin bloquear: un fallo o un
 * applyConstraints lento no deben retrasar ni cortar la cámara.
 */
function tuneStream(stream: MediaStream, zoom: number | 'auto'): void {
  applyContinuousFocus(stream).catch(() => false);
  // zoom 1 = zoom por defecto del dispositivo: no se toca
  if (zoom !== 1) applyZoom(stream, zoom).catch(() => null);
}

export function useQRScanner(options: UseQRScannerOptions): UseQRScannerReturn {
  const {
    facingMode = 'environment',
    deviceId,
    paused = false,
    scanDelay = 500,
    formats = ['qr_code'],
    zoom = 1,
    autofocus = true,
  } = options;

  // Refs para callbacks — evitan closures obsoletos en el loop RAF
  const onScanRef = useRef(options.onScan);
  const onErrorRef = useRef(options.onError);
  const onReadyRef = useRef(options.onReady);
  const onPermissionChangeRef = useRef(options.onPermissionChange);
  const onCameraChangeRef = useRef(options.onCameraChange);
  useEffect(() => { onScanRef.current = options.onScan; }, [options.onScan]);
  useEffect(() => { onErrorRef.current = options.onError; }, [options.onError]);
  useEffect(() => { onReadyRef.current = options.onReady; }, [options.onReady]);
  useEffect(() => { onPermissionChangeRef.current = options.onPermissionChange; }, [options.onPermissionChange]);
  useEffect(() => { onCameraChangeRef.current = options.onCameraChange; }, [options.onCameraChange]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<DetectFn | null>(null);
  const detectingRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const noDetectionCountRef = useRef(0);
  const mountedRef = useRef(true);
  const pausedRef = useRef(paused);
  const lastFocusNudgeRef = useRef(0);
  const refocusingRef = useRef(false);
  const refocusAttemptsRef = useRef(0);
  const autofocusRef = useRef(autofocus);
  // Se incrementa en cada start/stop/switchCamera: una operación asíncrona que
  // termina con un id antiguo sabe que fue cancelada y libera su stream
  const sessionRef = useRef(0);

  // Puntos del QR en coordenadas de vídeo
  const targetPointsRef = useRef<Point[] | null>(null);
  const currentPointsRef = useRef<Point[] | null>(null); // lerped toward target
  const overlayOpacityRef = useRef(0);
  const reticlePhaseRef = useRef(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('prompt');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamera, setCurrentCamera] = useState<MediaDeviceInfo | null>(null);
  // facingMode activo — se alterna cuando solo hay 1 cámara enumerada
  const activeFacingRef = useRef<'environment' | 'user'>(facingMode);
  const [isReady, setIsReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { autofocusRef.current = autofocus; }, [autofocus]);

  // ─── Loop RAF ────────────────────────────────────────────────────────────────

  const runLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !mountedRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sincroniza tamaño del canvas con el elemento <video> mostrado
    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    ctx.clearRect(0, 0, w, h);

    // Lerp de puntos hacia el target
    if (targetPointsRef.current && currentPointsRef.current) {
      currentPointsRef.current = lerpPoints(
        currentPointsRef.current,
        targetPointsRef.current,
        0.22
      );
      overlayOpacityRef.current = Math.min(overlayOpacityRef.current + 0.1, 1);
    } else if (overlayOpacityRef.current > 0) {
      overlayOpacityRef.current = Math.max(overlayOpacityRef.current - 0.06, 0);
      if (overlayOpacityRef.current === 0) currentPointsRef.current = null;
    }

    // Draw
    if (currentPointsRef.current && overlayOpacityRef.current > 0) {
      const scaled = videoPointsToCanvas(
        currentPointsRef.current,
        video.videoWidth,
        video.videoHeight,
        w,
        h
      );
      // CSS variables no son válidas en canvas — se lee el valor computado del elemento
      const accent =
        getComputedStyle(canvas).getPropertyValue('--qr-accent').trim() || '#30D158';
      drawQRBorder(ctx, scaled, overlayOpacityRef.current, accent);
    } else {
      if (!prefersReducedMotion) reticlePhaseRef.current += 0.022;
      drawReticle(ctx, canvas, reticlePhaseRef.current, prefersReducedMotion);
    }

    // Dispara detección de forma no bloqueante cuando corresponde
    const now = performance.now();
    if (
      !detectingRef.current &&
      !pausedRef.current &&
      detectorRef.current &&
      video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      now - lastScanTimeRef.current > scanDelay
    ) {
      detectingRef.current = true;
      detectorRef.current(video)
        .then((detections) => {
          detectingRef.current = false;
          if (!mountedRef.current) return;

          if (detections.length === 0) {
            noDetectionCountRef.current++;
            // Hysteresis: requiere varias lecturas vacías antes de quitar el overlay
            if (noDetectionCountRef.current > 3) {
              targetPointsRef.current = null;
            }
            // El autoenfoque puede quedarse fijado en el fondo: forzar un nuevo barrido
            const stream = streamRef.current;
            const idle = performance.now() - Math.max(lastScanTimeRef.current, lastFocusNudgeRef.current);
            const interval = Math.min(
              REFOCUS_BASE_INTERVAL * 2 ** refocusAttemptsRef.current,
              REFOCUS_MAX_INTERVAL
            );
            if (autofocusRef.current && stream && !refocusingRef.current && idle > interval) {
              refocusingRef.current = true;
              refocusAttemptsRef.current++;
              lastFocusNudgeRef.current = performance.now();
              nudgeFocus(stream)
                .catch(() => {})
                .finally(() => {
                  refocusingRef.current = false;
                  lastFocusNudgeRef.current = performance.now();
                });
            }
            return;
          }

          noDetectionCountRef.current = 0;
          refocusAttemptsRef.current = 0;
          lastScanTimeRef.current = performance.now();

          const det = detections[0];
          const result: ScanResult = {
            value: det.value,
            format: det.format,
            cornerPoints: det.cornerPoints,
            boundingBox: det.boundingBox,
            timestamp: Date.now(),
          };

          setLastResult(result);
          onScanRef.current(result.value, result);

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
          }

          if (det.cornerPoints && det.cornerPoints.length >= 4) {
            targetPointsRef.current = det.cornerPoints;
            // Si no hay puntos actuales, inicializa directamente (sin lerp en primer frame)
            if (!currentPointsRef.current) {
              currentPointsRef.current = [...det.cornerPoints];
            }
          }
        })
        .catch(() => {
          detectingRef.current = false;
        });
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [scanDelay, prefersReducedMotion]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    setIsScanning(true);
    lastFocusNudgeRef.current = performance.now();
    refocusAttemptsRef.current = 0;
    rafRef.current = requestAnimationFrame(runLoop);
  }, [runLoop, stopLoop]);

  // ─── Control de cámara ───────────────────────────────────────────────────────

  /** Conecta un stream nuevo al <video> y sincroniza cámaras y linterna */
  const attachStream = useCallback(
    async (stream: MediaStream, isStale: () => boolean): Promise<boolean> => {
      streamRef.current = stream;
      tuneStream(stream, zoom);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      if (isStale()) return false;

      // Re-enumerar tras el stream para obtener labels completos
      const cams = await enumerateCameras();
      if (isStale()) return false;
      setCameras(cams);
      const current = findCurrentCamera(stream, cams);
      setCurrentCamera(current);
      if (current) onCameraChangeRef.current?.(current);

      setTorchSupported(isTorchSupported(stream));
      setTorchOn(false);
      return true;
    },
    [zoom]
  );

  /** Libera el stream activo y limpia el overlay */
  const releaseStream = useCallback(() => {
    stopLoop();
    stopStream(streamRef.current);
    streamRef.current = null;
    targetPointsRef.current = null;
    currentPointsRef.current = null;
    overlayOpacityRef.current = 0;
  }, [stopLoop]);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus('unavailable');
      onErrorRef.current?.({
        type: 'not-supported',
        message: 'getUserMedia not supported',
      });
      return;
    }

    const session = ++sessionRef.current;
    const isStale = () => !mountedRef.current || session !== sessionRef.current;
    // start() sobre un escáner activo reinicia la cámara en vez de abrir una segunda
    releaseStream();

    try {
      // Pre-carga el detector antes de iniciar la cámara para evitar lag.
      // Un fallo aquí no debe bloquear la cámara: sin detector, el preview
      // sigue funcionando y solo se pierde la detección automática.
      try {
        detectorRef.current = await getDetector(formats);
      } catch (detectorErr) {
        detectorRef.current = null;
        onErrorRef.current?.({
          type: 'detection-error',
          message: (detectorErr as Error).message,
          originalError: detectorErr,
        });
      }
      if (isStale()) return;

      let stream = await requestCamera(facingMode, deviceId);
      // Sin deviceId explícito, el navegador puede elegir una lente de enfoque fijo
      if (autofocus && !deviceId && facingMode === 'environment' && !isStale()) {
        stream = await preferAutofocusCamera(stream);
      }
      if (isStale()) { stopStream(stream); return; }

      setPermissionStatus('granted');
      onPermissionChangeRef.current?.('granted');

      if (!(await attachStream(stream, isStale))) return;

      activeFacingRef.current = facingMode;
      setIsReady(true);
      onReadyRef.current?.();
      startLoop();
    } catch (err: unknown) {
      if (isStale()) return;
      const error = err as Error;

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        onPermissionChangeRef.current?.('denied');
        onErrorRef.current?.({ type: 'permission-denied', message: error.message, originalError: err });
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionStatus('unavailable');
        onErrorRef.current?.({ type: 'no-camera', message: error.message, originalError: err });
      } else {
        onErrorRef.current?.({ type: 'camera-error', message: error.message, originalError: err });
      }
    }
  }, [facingMode, deviceId, formats, autofocus, attachStream, releaseStream, startLoop]);

  const stop = useCallback(() => {
    // Cancela cualquier start/switchCamera en curso
    sessionRef.current++;
    releaseStream();
    setIsReady(false);
    setIsScanning(false);
    setTorchOn(false);
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, [releaseStream]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsScanning(false);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setIsScanning(true);
  }, []);

  const switchCamera = useCallback(async () => {
    const session = ++sessionRef.current;
    const isStale = () => !mountedRef.current || session !== sessionRef.current;
    const previousId = currentCamera?.deviceId;
    const previousFacing = activeFacingRef.current;
    releaseStream();

    try {
      const cams = await enumerateCameras();

      let nextDeviceId: string | undefined;
      let nextFacing: 'environment' | 'user' = previousFacing;

      if (cams.length >= 2) {
        // Hay múltiples cámaras: avanzar al siguiente deviceId
        const idx = previousId ? cams.findIndex((c) => c.deviceId === previousId) : 0;
        nextDeviceId = cams[(idx + 1) % cams.length].deviceId;
      } else {
        // Solo 1 cámara enumerada (típico en iOS antes del segundo getUserMedia):
        // alternar facingMode environment ↔ user
        nextFacing = previousFacing === 'environment' ? 'user' : 'environment';
      }

      const stream = await requestCamera(nextFacing, nextDeviceId);
      if (isStale()) { stopStream(stream); return; }
      activeFacingRef.current = nextFacing;
      if (!(await attachStream(stream, isStale))) return;
      startLoop();
    } catch (err: unknown) {
      if (isStale()) return;
      onErrorRef.current?.({ type: 'camera-error', message: (err as Error).message, originalError: err });

      // El stream anterior ya se liberó: intentar volver a la cámara previa
      stopStream(streamRef.current);
      streamRef.current = null;
      try {
        const stream = await requestCamera(previousFacing, previousId);
        if (isStale()) { stopStream(stream); return; }
        activeFacingRef.current = previousFacing;
        if (!(await attachStream(stream, isStale))) return;
        startLoop();
      } catch {
        if (isStale()) return;
        stopStream(streamRef.current);
        streamRef.current = null;
        setIsReady(false);
        setIsScanning(false);
      }
    }
  }, [currentCamera, attachStream, releaseStream, startLoop]);

  const getCameras = useCallback(async () => {
    const cams = await enumerateCameras();
    setCameras(cams);
    return cams;
  }, []);

  const setTorch = useCallback(async (on: boolean) => {
    if (!streamRef.current) return;
    try {
      await setTorchState(streamRef.current, on);
      setTorchOn(on);
      // Si llegamos aquí y torchSupported era false, actualizamos el estado
      if (!torchSupported) setTorchSupported(true);
    } catch {
      // El dispositivo no soporta torch — marcar como no soportado
      setTorchSupported(false);
    }
  }, [torchSupported]);

  // ─── Efectos de ciclo de vida ─────────────────────────────────────────────

  // Auto-start al montar
  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respuesta al prop paused
  useEffect(() => {
    if (paused) pause();
    else if (isReady) resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Respuesta al prop zoom
  useEffect(() => {
    if (streamRef.current) applyZoom(streamRef.current, zoom).catch(() => {});
  }, [zoom]);

  // Pausa automática cuando la pestaña pierde visibilidad
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handle = () => {
      if (document.hidden) {
        pausedRef.current = true;
      } else if (!paused) {
        pausedRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [paused]);

  return {
    videoRef,
    canvasRef,
    permissionStatus,
    cameras,
    currentCamera,
    isReady,
    isScanning,
    torchSupported,
    torchOn,
    lastResult,
    start,
    stop,
    pause,
    resume,
    switchCamera,
    getCameras,
    setTorch,
  };
}
