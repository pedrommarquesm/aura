import { AVATAR_MAX_SCALE, AVATAR_MIN_SCALE } from './avatar-targets';

export function coverScale(imageWidth: number, imageHeight: number, circleSize: number): number {
  'worklet';
  const shortest = Math.min(imageWidth, imageHeight);
  if (shortest <= 0 || circleSize <= 0) return 1;
  return circleSize / shortest;
}

export function clampScale(scale: number): number {
  'worklet';
  if (!Number.isFinite(scale)) return AVATAR_MIN_SCALE;
  return Math.min(AVATAR_MAX_SCALE, Math.max(AVATAR_MIN_SCALE, scale));
}

export function clampTranslation(
  translateX: number,
  translateY: number,
  imageWidth: number,
  imageHeight: number,
  circleSize: number,
  userScale: number,
): { x: number; y: number } {
  'worklet';
  const total = coverScale(imageWidth, imageHeight, circleSize) * clampScale(userScale);
  const displayW = imageWidth * total;
  const displayH = imageHeight * total;
  const maxX = Math.max(0, (displayW - circleSize) / 2);
  const maxY = Math.max(0, (displayH - circleSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, translateX)),
    y: Math.min(maxY, Math.max(-maxY, translateY)),
  };
}

export function cropRectFromTransform(input: {
  imageWidth: number;
  imageHeight: number;
  circleSize: number;
  scale: number;
  translateX: number;
  translateY: number;
}): { originX: number; originY: number; width: number; height: number } {
  const scale = clampScale(input.scale);
  const { x: translateX, y: translateY } = clampTranslation(
    input.translateX,
    input.translateY,
    input.imageWidth,
    input.imageHeight,
    input.circleSize,
    scale,
  );
  const total = coverScale(input.imageWidth, input.imageHeight, input.circleSize) * scale;
  const size = input.circleSize / total;

  let originX = input.imageWidth / 2 - translateX / total - size / 2;
  let originY = input.imageHeight / 2 - translateY / total - size / 2;

  originX = Math.round(Math.min(Math.max(0, originX), Math.max(0, input.imageWidth - size)));
  originY = Math.round(Math.min(Math.max(0, originY), Math.max(0, input.imageHeight - size)));
  const width = Math.round(Math.min(size, input.imageWidth - originX));
  const height = Math.round(Math.min(size, input.imageHeight - originY));
  const edge = Math.max(1, Math.min(width, height));

  return { originX, originY, width: edge, height: edge };
}
