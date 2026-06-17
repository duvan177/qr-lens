import { describe, it, expect } from 'vitest';
import { lerp, lerpPoints, videoPointsToCanvas } from '../src/utils/canvas';

describe('lerp', () => {
  it('devuelve el extremo inicial en t=0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('devuelve el extremo final en t=1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('interpola en el punto medio', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('soporta valores negativos', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('lerpPoints', () => {
  it('interpola cada punto componente a componente', () => {
    const from = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ];
    const to = [
      { x: 10, y: 10 },
      { x: 20, y: 40 },
    ];
    expect(lerpPoints(from, to, 0.5)).toEqual([
      { x: 5, y: 5 },
      { x: 15, y: 30 },
    ]);
  });
});

describe('videoPointsToCanvas', () => {
  it('devuelve los puntos sin cambios si el vídeo tiene dimensión 0', () => {
    const points = [{ x: 1, y: 2 }];
    expect(videoPointsToCanvas(points, 0, 0, 100, 100)).toBe(points);
  });

  it('escala 1:1 cuando vídeo y canvas coinciden', () => {
    const points = [{ x: 50, y: 50 }];
    expect(videoPointsToCanvas(points, 100, 100, 100, 100)).toEqual([{ x: 50, y: 50 }]);
  });

  it('aplica object-fit: cover con offset centrado horizontal', () => {
    // vídeo 100x100, canvas 200x100 → scale = max(2, 1) = 2
    // offsetX = (200 - 100*2)/2 = 0, offsetY = (100 - 100*2)/2 = -50
    const result = videoPointsToCanvas([{ x: 50, y: 50 }], 100, 100, 200, 100);
    expect(result).toEqual([{ x: 100, y: 50 }]);
  });
});
