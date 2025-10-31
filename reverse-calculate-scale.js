/**
 * Reverse calculate the scale and image dimensions from known pixel coordinates
 * This helps us understand what the actual image parameters should be
 */

// Known pixel coordinates
const knownStars = {
  'Alpheratz': { pixelX: 1977, pixelY: 1287, raHours: 0.1398, decDeg: 29.0905 },
  'A': { pixelX: 2064, pixelY: 894, raHours: 0.0819, decDeg: 29.0247 },
  'B': { pixelX: 2544, pixelY: 903, raHours: 0.0758, decDeg: 29.0136 },
  'C': { pixelX: 2832, pixelY: 783, raHours: 0.0658, decDeg: 29.0056 },
  'D': { pixelX: 732, pixelY: 519, raHours: 0.0558, decDeg: 28.9945 },
  'E': { pixelX: 2436, pixelY: 2124, raHours: 0.1738, decDeg: 29.1056 },
  'F': { pixelX: 2625, pixelY: 2091, raHours: 0.1678, decDeg: 29.0945 },
  'G': { pixelX: 3456, pixelY: 579, raHours: 0.0538, decDeg: 28.9835 },
};

const centerRAHours = 0 + 8/60 + 36.250/3600;
const centerRA = centerRAHours * 15;
const centerDec = 29 + 3/60 + 43.24/3600;

console.log('=== REVERSE CALCULATING IMAGE PARAMETERS ===\n');
console.log('Center: RA=', centerRAHours.toFixed(6), 'h =', centerRA.toFixed(6), 'deg, Dec=', centerDec.toFixed(6), 'deg\n');

// Estimate image dimensions from max pixel coordinates
const maxX = Math.max(...Object.values(knownStars).map(s => s.pixelX));
const maxY = Math.max(...Object.values(knownStars).map(s => s.pixelY));
const minX = Math.min(...Object.values(knownStars).map(s => s.pixelX));
const minY = Math.min(...Object.values(knownStars).map(s => s.pixelY));

console.log('Pixel coordinate ranges:');
console.log(`  X: ${minX} to ${maxX} (range: ${maxX - minX})`);
console.log(`  Y: ${minY} to ${maxY} (range: ${maxY - minY})`);
console.log(`  Estimated image size: ~${maxX + 200} x ${maxY + 200} pixels\n`);

// Try different image dimensions
const testSizes = [
  [4000, 3000],
  [4500, 3000],
  [5000, 3000],
  [4000, 2500],
  [maxX + 500, maxY + 500],
];

for (const [imgWidth, imgHeight] of testSizes) {
  console.log(`\nTesting image size: ${imgWidth} x ${imgHeight}`);
  
  // Calculate scale from FOV
  const fovWidthDeg = 3.904;
  const fovHeightDeg = 2.603;
  const scaleX = (fovWidthDeg * 3600) / imgWidth;
  const scaleY = (fovHeightDeg * 3600) / imgHeight;
  const scale = (scaleX + scaleY) / 2;
  
  console.log(`  Scale: ${scale.toFixed(4)} arcsec/pixel (X: ${scaleX.toFixed(4)}, Y: ${scaleY.toFixed(4)})`);
  
  // Test Alpheratz as reference
  const star = knownStars['Alpheratz'];
  const raDeg = star.raHours * 15;
  const raDiff = raDeg - centerRA;
  const raRad = raDiff * Math.PI / 180;
  const decRad = star.decDeg * Math.PI / 180;
  const centerDecRad = centerDec * Math.PI / 180;
  
  const cosDec = Math.cos(decRad);
  const sinDec = Math.sin(decRad);
  const cosCenterDec = Math.cos(centerDecRad);
  const sinCenterDec = Math.sin(centerDecRad);
  
  const A = cosDec * Math.cos(raRad);
  const denominator = sinCenterDec * sinDec + cosCenterDec * A;
  
  if (Math.abs(denominator) > 1e-10) {
    const xRad = -(cosDec * Math.sin(raRad)) / denominator;
    const yRad = (cosCenterDec * sinDec - sinCenterDec * A) / denominator;
    
    const xArcsec = xRad * 206265;
    const yArcsec = yRad * 206265;
    
    const calcX = imgWidth / 2 + xArcsec / scale;
    const calcY = imgHeight / 2 - yArcsec / scale;
    
    const dx = calcX - star.pixelX;
    const dy = calcY - star.pixelY;
    const error = Math.sqrt(dx * dx + dy * dy);
    
    console.log(`  Alpheratz: Expected (${star.pixelX}, ${star.pixelY}), Calculated (${calcX.toFixed(1)}, ${calcY.toFixed(1)}), Error: ${error.toFixed(1)}px`);
  }
}

