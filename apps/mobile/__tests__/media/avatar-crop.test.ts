import { clampScale, clampTranslation, coverScale, cropRectFromTransform } from '@/lib/media/avatar-crop';

describe('avatar crop math', () => {
  it('covers the circle with the shorter side at scale 1', () => {
    expect(coverScale(1080, 1350, 270)).toBe(0.25);
    expect(coverScale(1350, 1080, 270)).toBe(0.25);
  });

  it('keeps pinch scale between 1 and 4', () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(8)).toBe(4);
    expect(clampScale(2)).toBe(2);
  });

  it('does not let the circle leave the image', () => {
    const pan = clampTranslation(400, 400, 1080, 1350, 270, 1);
    expect(pan.x).toBe(0);
    expect(pan.y).toBeGreaterThan(0);
    expect(pan.y).toBeLessThanOrEqual((1350 * 0.25 - 270) / 2);
  });

  it('crops the inscribed square at the default transform', () => {
    const crop = cropRectFromTransform({
      imageWidth: 1080,
      imageHeight: 1350,
      circleSize: 270,
      scale: 1,
      translateX: 0,
      translateY: 0,
    });

    expect(crop.width).toBe(1080);
    expect(crop.height).toBe(1080);
    expect(crop.originX).toBe(0);
    expect(crop.originY).toBe(135);
  });
});
