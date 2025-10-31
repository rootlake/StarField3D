/**
 * Debug script to compare expected pixel coordinates vs calculated ones
 * This helps identify issues in the RA/Dec to pixel conversion
 */

// Expected pixel coordinates from user
const expectedPixels = {
  'Alpheratz': { x: 1977, y: 1287 },
  'A': { x: 2064, y: 894 },
  'B': { x: 2544, y: 903 },
  'C': { x: 2832, y: 783 },
  'D': { x: 732, y: 519 },
  'E': { x: 2436, y: 2124 },
  'F': { x: 2625, y: 2091 },
  'G': { x: 3456, y: 579 },
};

// Star data: label, HIP, RA (hours), Dec (degrees)
const stars = {
  'Alpheratz': { hip: 677, ra: 0.1398, dec: 29.0905 },
  'A': { hip: 544, ra: 0.0819, dec: 29.0247 },
  'B': { hip: 540, ra: 0.0758, dec: 29.0136 },
  'C': { hip: 502, ra: 0.0658, dec: 29.0056 },
  'D': { hip: 423, ra: 0.0558, dec: 28.9945 },
  'E': { hip: 971, ra: 0.1738, dec: 29.1056 },
  'F': { hip: 956, ra: 0.1678, dec: 29.0945 },
  'G': { hip: 410, ra: 0.0538, dec: 28.9835 },
};

// Image center (from form)
const centerRAHours = 0 + 8/60 + 36.250/3600; // 0h 8m 36.250s
const centerRA = centerRAHours * 15; // Convert to degrees
const centerDec = 29 + 3/60 + 43.24/3600; // +29° 03' 43.24"

// Image dimensions (need to determine from actual image)
// Based on max pixel coordinates, image is at least 3456x2124
// Let's assume it's roughly 4000x3000 based on typical telescope sensor
const imageWidth = 4000;
const imageHeight = 3000;

// FOV from data-entry.js
const fovWidthDeg = 3.904;
const fovHeightDeg = 2.603;
const scaleX = (fovWidthDeg * 3600) / imageWidth;
const scaleY = (fovHeightDeg * 3600) / imageHeight;
const scale = (scaleX + scaleY) / 2;

console.log('=== DEBUGGING COORDINATE CONVERSION ===\n');
console.log('Image Center:');
console.log(`  RA: ${centerRAHours}h = ${centerRA}°`);
console.log(`  Dec: ${centerDec}°`);
console.log(`\nImage Dimensions: ${imageWidth} x ${imageHeight} pixels`);
console.log(`Scale: ${scale.toFixed(4)} arcsec/pixel (X: ${scaleX.toFixed(4)}, Y: ${scaleY.toFixed(4)})`);
console.log('\n=== STAR COMPARISONS ===\n');

// Gnomonic projection function (from coordinate-converter.js)
function raDecToPixel(raHours, decDeg, centerRA, centerDec, imageWidth, imageHeight, scale) {
  // Convert RA from hours to degrees
  const ra = raHours * 15;
  
  // Handle RA wrapping
  let raDiff = ra - centerRA;
  if (raDiff > 180) raDiff -= 360;
  if (raDiff < -180) raDiff += 360;
  
  // Convert to radians
  const raRad = raDiff * Math.PI / 180;
  const decRad = decDeg * Math.PI / 180;
  const centerDecRad = centerDec * Math.PI / 180;
  
  // Gnomonic projection
  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosCenterDec = Math.cos(centerDecRad);
  const sinCenterDec = Math.sin(centerDecRad);
  
  const denominator = sinDec * sinCenterDec + cosDec * cosCenterDec * Math.cos(raRad);
  
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }
  
  // Calculate x and y in arcseconds
  const xArcsec = (cosDec * Math.sin(raRad) / denominator) * 206265;
  const yArcsec = ((sinDec * cosCenterDec - cosDec * sinCenterDec * Math.cos(raRad)) / denominator) * 206265;
  
  // Convert arcseconds to pixels
  const xPixel = imageWidth / 2 + xArcsec / scale;
  const yPixel = imageHeight / 2 - yArcsec / scale; // Flip Y axis
  
  return { x: xPixel, y: yPixel };
}

// Test each star
for (const [label, star] of Object.entries(stars)) {
  const expected = expectedPixels[label];
  // Convert RA from hours to degrees
  const raDeg = star.ra * 15;
  const calculated = raDecToPixel(raDeg, star.dec, centerRA, centerDec, imageWidth, imageHeight, scale);
  
  if (calculated) {
    const dx = calculated.x - expected.x;
    const dy = calculated.y - expected.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    console.log(`${label} (HIP ${star.hip}):`);
    console.log(`  RA: ${star.ra}h = ${star.ra * 15}°, Dec: ${star.dec}°`);
    console.log(`  Expected: (${expected.x}, ${expected.y})`);
    console.log(`  Calculated: (${calculated.x.toFixed(1)}, ${calculated.y.toFixed(1)})`);
    console.log(`  Error: Δx=${dx.toFixed(1)}, Δy=${dy.toFixed(1)}, distance=${distance.toFixed(1)}px`);
    console.log('');
  } else {
    console.log(`${label}: Calculation failed (denominator too small)`);
  }
}

