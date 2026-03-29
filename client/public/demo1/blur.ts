// Naive box blur algorithm
// O(H * W * r^2)

const GREEN_OFFSET = 1;
const BLUE_OFFSET = 2;
const ALPHA_OFFSET = 3;

export const jsBlur = (
  input: Uint8ClampedArray,
  output: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void => {
  for (let y = 0; y < height; y++) {
    const startY = Math.max(0, y - radius);
    const endY = Math.min(height - 1, y + radius);

    for (let x = 0; x < width; x++) {
      const startX = Math.max(0, x - radius);
      const endX = Math.min(width - 1, x + radius);

      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let pixelCount = 0;

      for (let ky = startY; ky <= endY; ky++) {
        const rowOffset = ky * width;
        for (let kx = startX; kx <= endX; kx++) {
          const neighborIndex = (rowOffset + kx) * 4;

          redSum += input[neighborIndex]!;
          greenSum += input[neighborIndex + 1]!;
          blueSum += input[neighborIndex + 2]!;
          pixelCount++;
        }
      }

      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = redSum / pixelCount;
      output[targetIndex + GREEN_OFFSET] = greenSum / pixelCount;
      output[targetIndex + BLUE_OFFSET] = blueSum / pixelCount;
      output[targetIndex + ALPHA_OFFSET] = 255;
    }
  }
};
