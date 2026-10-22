/**
 * Computes the optimal supersampling render scale for the Phaser game canvas.
 * - Standard 1x displays (e.g. Linux/Windows 1080p) are supersampled by at least 2.0x
 *   linear density (= 4X pixel resolution / 4K buffer) for razor-sharp visual clarity.
 * - High-DPI / Retina displays are supersampled proportionally up to 3x.
 * - Caps buffer dimensions safely within the universal WebGL maximum (4096px).
 */
export function getGameRenderScale(win?: {
  devicePixelRatio?: number;
  innerWidth: number;
  innerHeight: number;
}): number {
  const targetWin =
    win ??
    (typeof window !== 'undefined'
      ? window
      : { devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080 });
  const baseDpr = targetWin.devicePixelRatio || 1;
  const width = targetWin.innerWidth || 1920;
  const height = targetWin.innerHeight || 1080;
  const MAX_CANVAS_DIM = 4096;

  let targetScale = Math.max(2, baseDpr * 1.5);
  if (
    width * targetScale > MAX_CANVAS_DIM ||
    height * targetScale > MAX_CANVAS_DIM
  ) {
    targetScale = Math.min(
      MAX_CANVAS_DIM / Math.max(width, 1),
      MAX_CANVAS_DIM / Math.max(height, 1)
    );
  }
  return Math.min(3, Math.max(1.5, targetScale));
}
