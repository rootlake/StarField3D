/**
 * HIP Catalog lookup for RA/Dec coordinates
 * Loads a lightweight HIP catalog subset for browser-based lookups
 */

let hipCatalog = null;

/**
 * Initialize HIP catalog from JSON file
 */
export async function loadHIPCatalog() {
  if (hipCatalog) return hipCatalog;
  
  try {
    const response = await fetch('assets/hip-catalog.json');
    hipCatalog = await response.json();
    return hipCatalog;
  } catch (error) {
    console.error('Error loading HIP catalog:', error);
    // Fallback: try to fetch from SIMBAD API if catalog not available
    return null;
  }
}

/**
 * Lookup RA/Dec for a HIP number
 * @param {number} hipNumber - HIP catalog number
 * @returns {Promise<{ra: number, dec: number}|null>}
 */
export async function lookupHIP(hipNumber) {
  const catalog = await loadHIPCatalog();
  
  if (!catalog) {
    // Fallback to SIMBAD API lookup
    return await lookupHIPFromSIMBAD(hipNumber);
  }
  
  const entry = catalog[hipNumber];
  
  if (entry) {
    return {
      ra: entry.ra,
      dec: entry.dec
    };
  }
  
  return null;
}

/**
 * Fallback: Lookup HIP from SIMBAD API
 * @param {number} hipNumber - HIP catalog number
 * @returns {Promise<{ra: number, dec: number}|null>}
 */
async function lookupHIPFromSIMBAD(hipNumber) {
  try {
    const identifier = `HIP ${hipNumber}`;
    const url = `http://simbad.u-strasbg.fr/simbad/sim-id?output.format=ASCII&Ident=${encodeURIComponent(identifier)}`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse RA and Dec from SIMBAD response
    // Format: "RA(ICRS)  : 00 08 23.26  Dec(ICRS) : +29 05 26.0"
    const raMatch = text.match(/RA\(ICRS\)\s*:\s*(\d+)\s+(\d+)\s+([\d.]+)/i);
    const decMatch = text.match(/Dec\(ICRS\)\s*:\s*([+-]?\d+)\s+(\d+)\s+([\d.]+)/i);
    
    if (raMatch && decMatch) {
      const raHours = parseInt(raMatch[1], 10);
      const raMinutes = parseInt(raMatch[2], 10);
      const raSeconds = parseFloat(raMatch[3]);
      const ra = (raHours + raMinutes / 60 + raSeconds / 3600) * 15; // Convert to degrees
      
      const decDegrees = parseInt(decMatch[1], 10);
      const decMinutes = parseInt(decMatch[2], 10);
      const decSeconds = parseFloat(decMatch[3]);
      const decSign = decDegrees < 0 ? -1 : 1;
      const dec = decSign * (Math.abs(decDegrees) + decMinutes / 60 + decSeconds / 3600);
      
      return { ra, dec };
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up HIP ${hipNumber} from SIMBAD:`, error.message);
    return null;
  }
}

/**
 * Batch lookup multiple HIP numbers
 * @param {number[]} hipNumbers - Array of HIP catalog numbers
 * @returns {Promise<Map<number, {ra: number, dec: number}>>}
 */
export async function batchLookupHIP(hipNumbers) {
  const catalog = await loadHIPCatalog();
  const results = new Map();
  
  // Use minimal catalog as fallback if main catalog failed to load
  if (!catalog) {
    console.log('Using minimal HIP catalog fallback');
    const minimal = getMinimalHIPCatalog();
    for (const hip of hipNumbers) {
      if (minimal[hip]) {
        results.set(hip, { ra: minimal[hip].ra, dec: minimal[hip].dec });
      }
    }
    return results;
  }
  
  for (const hip of hipNumbers) {
    const coords = await lookupHIP(hip);
    if (coords) {
      results.set(hip, coords);
    } else {
      // Try minimal catalog as fallback
      const minimal = getMinimalHIPCatalog();
      if (minimal[hip]) {
        results.set(hip, { ra: minimal[hip].ra, dec: minimal[hip].dec });
      }
    }
  }
  
  return results;
}

/**
 * Create a minimal HIP catalog from common stars
 * This is a fallback if the full catalog isn't available
 */
export function getMinimalHIPCatalog() {
  // Common bright stars with their HIP numbers and coordinates
  return {
    677: { ra: 0.1398, dec: 29.0905 }, // Alpheratz
    544: { ra: 0.0819, dec: 29.0247 },
    540: { ra: 0.0758, dec: 29.0136 },
    502: { ra: 0.0658, dec: 29.0056 },
    423: { ra: 0.0558, dec: 28.9945 },
    971: { ra: 0.1738, dec: 29.1056 },
    956: { ra: 0.1678, dec: 29.0945 },
    410: { ra: 0.0538, dec: 28.9835 }
  };
}

