/**
 * Distance lookup utilities for HIP stars
 * Supports SIMBAD API and local catalog lookup
 */

/**
 * Lookup distance for a HIP star using SIMBAD API
 * @param {number} hipNumber - HIP catalog number
 * @returns {Promise<{distanceLy: number, distancePc: number, parallax: number}|null>}
 */
export async function lookupDistanceSIMBAD(hipNumber) {
  try {
    const identifier = `HIP ${hipNumber}`;
    const url = `http://simbad.u-strasbg.fr/simbad/sim-id?output.format=ASCII&Ident=${encodeURIComponent(identifier)}&output.format=ASCII`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse parallax from SIMBAD response
    // Format: "Parallax     : 12.34 mas"
    const parallaxMatch = text.match(/Parallax\s*:\s*([\d.]+)\s*mas/i);
    
    if (parallaxMatch) {
      const parallaxMas = parseFloat(parallaxMatch[1]);
      const parallaxArcsec = parallaxMas / 1000; // Convert mas to arcsec
      
      if (parallaxArcsec > 0) {
        const distancePc = 1 / parallaxArcsec;
        const distanceLy = distancePc * 3.26156; // 1 parsec = 3.26156 light-years
        
        return {
          distanceLy,
          distancePc,
          parallax: parallaxArcsec
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up HIP ${hipNumber}:`, error.message);
    return null;
  }
}

/**
 * Lookup distance from local HIP catalog data
 * @param {number} hipNumber - HIP catalog number
 * @param {Object} catalog - Pre-loaded catalog data (HIP -> distance)
 * @returns {{distanceLy: number, distancePc: number}|null}
 */
export function lookupDistanceCatalog(hipNumber, catalog) {
  const entry = catalog[hipNumber];
  
  if (!entry) {
    return null;
  }
  
  // Catalog should have parallax in mas or distance in pc
  if (entry.parallax && entry.parallax > 0) {
    const parallaxArcsec = entry.parallax / 1000; // Convert mas to arcsec
    const distancePc = 1 / parallaxArcsec;
    const distanceLy = distancePc * 3.26156;
    
    return {
      distanceLy,
      distancePc,
      parallax: parallaxArcsec
    };
  } else if (entry.distancePc) {
    return {
      distanceLy: entry.distancePc * 3.26156,
      distancePc: entry.distancePc,
      parallax: 1 / entry.distancePc
    };
  }
  
  return null;
}

/**
 * Batch lookup distances with rate limiting for SIMBAD API
 * @param {number[]} hipNumbers - Array of HIP catalog numbers
 * @param {number} delayMs - Delay between requests in milliseconds
 * @returns {Promise<Map<number, {distanceLy: number, distancePc: number}>>}
 */
export async function batchLookupSIMBAD(hipNumbers, delayMs = 500) {
  const results = new Map();
  
  for (const hip of hipNumbers) {
    const distance = await lookupDistanceSIMBAD(hip);
    if (distance) {
      results.set(hip, distance);
    }
    
    // Rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

