import type { Point } from '../types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoints(from: Point[], to: Point[], t: number): Point[] {
  return from.map((p, i) => ({
    x: lerp(p.x, to[i].x, t),
    y: lerp(p.y, to[i].y, t),
  }));
}

/**
 * Transforma puntos del espacio del frame de vídeo al espacio del canvas.
 * Asume object-fit: cover en el elemento <video>.
 */
export function videoPointsToCanvas(
  points: Point[],
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): Point[] {
  if (!videoWidth || !videoHeight) return points;
  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const offsetX = (canvasWidth - videoWidth * scale) / 2;
  const offsetY = (canvasHeight - videoHeight * scale) / 2;
  return points.map((p) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  }));
}

/**
 * Dibuja el polígono del QR con borde redondeado, glow y puntos de esquina.
 * Los puntos ya deben estar en coordenadas del canvas.
 */
export function drawQRBorder(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  opacity: number,
  color: string
): void {
  if (points.length < 4) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Dibuja la retícula de guía cuando no hay QR detectado.
 * El parámetro phase (0..2π) controla la animación de "respiración".
 */
export function drawReticle(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  phase: number,
  prefersReducedMotion: boolean
): void {
  const cw = canvas.width;
  const ch = canvas.height;
  const baseSize = Math.min(cw, ch) * 0.62;
  const breathe = prefersReducedMotion ? 1 : 1 + Math.sin(phase) * 0.012;
  const size = baseSize * breathe;
  const cx = cw / 2;
  const cy = ch / 2;
  const x = cx - size / 2;
  const y = cy - size / 2;
  const armLen = size * 0.14;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur = 6;

  const corners = [
    { cx: x, cy: y, dx: 1, dy: 1 },
    { cx: x + size, cy: y, dx: -1, dy: 1 },
    { cx: x + size, cy: y + size, dx: -1, dy: -1 },
    { cx: x, cy: y + size, dx: 1, dy: -1 },
  ];

  for (const { cx: ox, cy: oy, dx, dy } of corners) {
    ctx.beginPath();
    ctx.moveTo(ox + dx * armLen, oy);
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox, oy + dy * armLen);
    ctx.stroke();
  }

  ctx.restore();
}
