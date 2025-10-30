/**
 * Utility functions for coordinate conversion and distance scaling
 */

/**
 * Convert pixel coordinates to normalized coordinates (-1 to 1)
 * @param {number} pixelX - Pixel X coordinate
 * @param {number} pixelY - Pixel Y coordinate
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {{x: number, y: number}} Normalized coordinates
 */
export function pixelToNormalized(pixelX, pixelY, imageWidth, imageHeight) {
  return {
    x: (pixelX / imageWidth) * 2 - 1,
    y: 1 - (pixelY / imageHeight) * 2 // Flip Y axis
  };
}

/**
 * Convert normalized coordinates to 3D space coordinates
 * @param {number} normalizedX - Normalized X (-1 to 1)
 * @param {number} normalizedY - Normalized Y (-1 to 1)
 * @param {number} width - Volume width
 * @param {number} height - Volume height
 * @returns {{x: number, y: number}} 3D coordinates
 */
export function normalizedTo3D(normalizedX, normalizedY, width, height) {
  return {
    x: normalizedX * width / 2,
    y: normalizedY * height / 2
  };
}

/**
 * Convert pixel coordinates directly to 3D coordinates
 * @param {number} pixelX - Pixel X coordinate
 * @param {number} pixelY - Pixel Y coordinate
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @param {number} volumeWidth - Volume width
 * @param {number} volumeHeight - Volume height
 * @returns {{x: number, y: number}} 3D coordinates
 */
export function pixelTo3D(pixelX, pixelY, imageWidth, imageHeight, volumeWidth, volumeHeight) {
  const norm = pixelToNormalized(pixelX, pixelY, imageWidth, imageHeight);
  return normalizedTo3D(norm.x, norm.y, volumeWidth, volumeHeight);
}

/**
 * Format distance for display
 * @param {number} distance - Distance value
 * @param {string} unit - Unit ('ly' or 'pc')
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance, unit = 'ly', decimals = 2) {
  if (!distance || distance <= 0) return 'N/A';
  
  const value = distance.toFixed(decimals);
  const unitLabel = unit === 'pc' ? 'pc' : 'ly';
  return `${value} ${unitLabel}`;
}

/**
 * Calculate distance scaling factor
 * @param {number} scaledDistance - Normalized distance (0-1)
 * @param {number} volumeDepth - Depth of the volume
 * @param {number} depthScale - User-adjustable depth scale multiplier
 * @returns {number} Scaled distance in 3D space
 */
export function scaleDistance(scaledDistance, volumeDepth, depthScale = 1.0) {
  return scaledDistance * volumeDepth * depthScale;
}

