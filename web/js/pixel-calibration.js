/**
 * Pixel coordinate calibration/override system
 * Use this to manually specify pixel coordinates for stars when RA/Dec conversion is inaccurate
 */

// Manual pixel coordinate overrides for known stars
// Format: { starLabel: { x: pixelX, y: pixelY } }
// Coordinates are in image pixel space (0,0 at top-left)
export const pixelCalibration = {
  'Alpheratz': { x: 1977, y: 1287 },
  'A': { x: 2064, y: 894 },
  'B': { x: 2544, y: 903 },
  'C': { x: 2832, y: 783 },
  'D': { x: 732, y: 519 },
  'E': { x: 2436, y: 2124 },
  'F': { x: 2625, y: 2091 },
  'G': { x: 3456, y: 579 },
};

/**
 * Check if a star has a manual pixel coordinate override
 * @param {string} starLabel - Star label (e.g., 'Alpheratz', 'A', 'B')
 * @returns {{x: number, y: number}|null} Pixel coordinates if override exists, null otherwise
 */
export function getCalibratedPixel(starLabel) {
  return pixelCalibration[starLabel] || null;
}

/**
 * Add or update a pixel coordinate calibration
 * @param {string} starLabel - Star label
 * @param {number} x - Pixel X coordinate
 * @param {number} y - Pixel Y coordinate
 */
export function setCalibratedPixel(starLabel, x, y) {
  pixelCalibration[starLabel] = { x, y };
}

/**
 * Check if calibration data exists for any stars
 * @returns {boolean} True if any calibrations exist
 */
export function hasCalibrations() {
  return Object.keys(pixelCalibration).length > 0;
}

