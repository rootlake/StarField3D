/**
 * Coordinate conversion utilities
 * Converts RA/Dec to pixel coordinates using gnomonic projection
 */

/**
 * Convert RA/Dec to pixel coordinates using gnomonic projection
 * @param {number} ra - Right Ascension in degrees
 * @param {number} dec - Declination in degrees
 * @param {number} centerRA - Image center RA in degrees
 * @param {number} centerDec - Image center Dec in degrees
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @param {number} scale - Arcseconds per pixel (default: 3.5 arcsec/pixel for typical telescope)
 * @returns {{x: number, y: number}|null}
 */
export function raDecToPixel(ra, dec, centerRA, centerDec, imageWidth, imageHeight, scale = 3.5) {
  // RA and Dec should be in degrees
  // Handle RA wrapping (RA can be 0-360 degrees)
  let raDiff = ra - centerRA;
  
  // Normalize RA difference to [-180, 180] range
  if (raDiff > 180) raDiff -= 360;
  if (raDiff < -180) raDiff += 360;
  
  // Convert degrees to radians
  const raRad = raDiff * Math.PI / 180;
  const decRad = dec * Math.PI / 180;
  const centerDecRad = centerDec * Math.PI / 180;
  
  // Gnomonic projection (tangent plane projection)
  // Based on standard astronomical gnomonic projection formula
  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosCenterDec = Math.cos(centerDecRad);
  const sinCenterDec = Math.sin(centerDecRad);
  
  // A = cos(dec) * cos(ra - centerRA)
  const A = cosDec * Math.cos(raRad);
  
  // Denominator: sin(centerDec) * sin(dec) + cos(centerDec) * cos(dec) * cos(ra - centerRA)
  const denominator = sinCenterDec * sinDec + cosCenterDec * A;
  
  if (Math.abs(denominator) < 1e-10) {
    return null; // Point is too far from center (near pole)
  }
  
  // Calculate angular offsets in radians
  // X axis: negative because RA increases to the left (east) in sky coordinates
  // Y axis: positive because Dec increases upward (north) in sky coordinates
  const xRad = -(cosDec * Math.sin(raRad)) / denominator;
  const yRad = (cosCenterDec * sinDec - sinCenterDec * A) / denominator;
  
  // Convert radians to arcseconds (1 radian = 206265 arcseconds)
  const xArcsec = xRad * 206265;
  const yArcsec = yRad * 206265;
  
  // Convert arcseconds to pixels using the scale factor
  // X increases to the right (positive X in image), Y increases downward (positive Y in image)
  const xPixel = imageWidth / 2 + xArcsec / scale;
  const yPixel = imageHeight / 2 - yArcsec / scale; // Negative because image Y increases downward
  
  // Allow stars slightly outside bounds (20% margin) for better visualization
  const margin = Math.max(imageWidth, imageHeight) * 0.2;
  if (xPixel < -margin || xPixel > imageWidth + margin || 
      yPixel < -margin || yPixel > imageHeight + margin) {
    return null; // Point is too far outside image bounds
  }
  
  // Clamp to image bounds
  return {
    x: Math.max(0, Math.min(imageWidth, xPixel)),
    y: Math.max(0, Math.min(imageHeight, yPixel))
  };
}

/**
 * Calculate image scale from field of view
 * @param {number} fovWidthDeg - Field of view width in degrees
 * @param {number} imageWidth - Image width in pixels
 * @returns {number} Scale in arcseconds per pixel
 */
export function calculateScale(fovWidthDeg, imageWidth) {
  return (fovWidthDeg * 3600) / imageWidth; // Convert degrees to arcseconds
}

/**
 * Estimate field of view from typical telescope setup
 * Default values for common telescope configurations
 * @param {number} focalLength - Focal length in mm
 * @param {number} sensorWidth - Sensor width in mm
 * @returns {number} Field of view width in degrees
 */
export function estimateFOV(focalLength = 529.39, sensorWidth = 23.04) {
  // FOV = 2 * arctan(sensorWidth / (2 * focalLength))
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * 180 / Math.PI;
}

/**
 * Convert RA from hours:minutes:seconds format to degrees
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @param {number} seconds - Seconds
 * @returns {number} RA in degrees
 */
export function raHMSToDegrees(hours, minutes, seconds) {
  return (hours + minutes / 60 + seconds / 3600) * 15;
}

/**
 * Convert Dec from degrees:arcminutes:arcseconds format to degrees
 * @param {number} degrees - Degrees
 * @param {number} arcminutes - Arcminutes
 * @param {number} arcseconds - Arcseconds
 * @param {boolean} isNegative - Whether the declination is negative
 * @returns {number} Dec in degrees
 */
export function decDMSToDegrees(degrees, arcminutes, arcseconds, isNegative = false) {
  const sign = isNegative ? -1 : 1;
  return sign * (Math.abs(degrees) + arcminutes / 60 + arcseconds / 3600);
}

/**
 * Parse RA string (various formats) to degrees
 * @param {string} raStr - RA string (e.g., "00 08 23.26" or "0.1398")
 * @returns {number|null} RA in degrees
 */
export function parseRA(raStr) {
  if (!raStr) return null;
  
  // If it's already a decimal number
  const decimal = parseFloat(raStr);
  if (!isNaN(decimal)) {
    return decimal;
  }
  
  // Try to parse hour:minute:second format
  const parts = raStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return raHMSToDegrees(hours, minutes, seconds);
  }
  
  return null;
}

/**
 * Parse Dec string (various formats) to degrees
 * @param {string} decStr - Dec string (e.g., "+29 05 26.0" or "29.0905")
 * @returns {number|null} Dec in degrees
 */
export function parseDec(decStr) {
  if (!decStr) return null;
  
  // If it's already a decimal number
  const decimal = parseFloat(decStr);
  if (!isNaN(decimal)) {
    return decimal;
  }
  
  // Try to parse degree:arcminute:arcsecond format
  const parts = decStr.trim().replace(/[+-]/, '').split(/\s+/);
  const isNegative = decStr.trim().startsWith('-');
  
  if (parts.length >= 3) {
    const degrees = parseFloat(parts[0]) || 0;
    const arcminutes = parseFloat(parts[1]) || 0;
    const arcseconds = parseFloat(parts[2]) || 0;
    return decDMSToDegrees(degrees, arcminutes, arcseconds, isNegative);
  }
  
  return null;
}

