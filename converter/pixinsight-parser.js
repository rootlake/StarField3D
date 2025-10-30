/**
 * Parser for PixInsight annotation and export data
 * Handles various formats that PixInsight might output
 */

import { parse } from 'csv-parse/sync';

/**
 * Parse CSV format from PixInsight annotation or "What's In My Image"
 * Expected columns: HIP, RA, Dec, X, Y, Magnitude, Name (or similar)
 * 
 * @param {string} csvText - CSV content as string
 * @returns {Array<Object>} Array of star objects
 */
export function parseCSV(csvText) {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    return records.map(record => {
      // Try to extract HIP number (might be "HIP 12345" or just "12345")
      let hip = null;
      const hipMatch = String(record.HIP || record.Hip || record.hip || '').match(/(\d+)/);
      if (hipMatch) {
        hip = parseInt(hipMatch[1], 10);
      }
      
      // Parse RA/Dec (could be in various formats)
      const ra = parseCoordinate(record.RA || record.RA_DEG || record['RA (deg)'] || '');
      const dec = parseCoordinate(record.Dec || record.DEC || record.DEC_DEG || record['Dec (deg)'] || '');
      
      // Parse pixel coordinates
      const pixelX = parseFloat(record.X || record.x || record.PixelX || '');
      const pixelY = parseFloat(record.Y || record.y || record.PixelY || '');
      
      // Parse magnitude
      const magnitude = parseFloat(record.Mag || record.Vmag || record.Magnitude || record.magnitude || '');
      
      // Star name
      const name = record.Name || record.Name || record.STAR || '';
      
      return {
        hip,
        ra,
        dec,
        pixelX,
        pixelY,
        magnitude,
        name: name.trim()
      };
    }).filter(star => star.hip !== null || (star.ra !== null && star.dec !== null));
  } catch (error) {
    console.error('Error parsing CSV:', error.message);
    return [];
  }
}

/**
 * Parse coordinate string (handles degrees, hours:minutes:seconds, etc.)
 * @param {string} coordStr - Coordinate string
 * @returns {number|null} Coordinate in degrees
 */
function parseCoordinate(coordStr) {
  if (!coordStr) return null;
  
  const str = String(coordStr).trim();
  
  // If it's already a decimal number
  const decimal = parseFloat(str);
  if (!isNaN(decimal)) {
    return decimal;
  }
  
  // Try to parse hour:minute:second or degree:arcmin:arcsec format
  const parts = str.split(/[:hms°'"]/).filter(p => p.trim());
  if (parts.length >= 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    
    // Convert to degrees (assuming RA format)
    return hours * 15 + minutes / 4 + seconds / 240;
  }
  
  return null;
}

/**
 * Parse text format from PixInsight annotation script output
 * Attempts to extract HIP numbers and coordinates from various text formats
 * 
 * @param {string} text - Text content
 * @returns {Array<Object>} Array of star objects
 */
export function parseTextFormat(text) {
  const stars = [];
  const lines = text.split('\n');
  
  // Look for HIP patterns: "HIP 12345" or similar
  const hipPattern = /HIP\s*(\d+)/gi;
  const coordPattern = /RA:\s*([\d:.\s]+)\s+Dec:\s*([+-]?[\d:.\s]+)/gi;
  
  for (const line of lines) {
    const hipMatch = line.match(hipPattern);
    const coordMatch = line.match(coordPattern);
    
    if (hipMatch) {
      const hip = parseInt(hipMatch[1], 10);
      let ra = null, dec = null;
      
      if (coordMatch) {
        ra = parseCoordinate(coordMatch[1]);
        dec = parseCoordinate(coordMatch[2]);
      }
      
      stars.push({
        hip,
        ra,
        dec,
        pixelX: null,
        pixelY: null,
        magnitude: null,
        name: `HIP ${hip}`
      });
    }
  }
  
  return stars;
}

/**
 * Parse JSON format if PixInsight exports JSON
 * @param {string} jsonText - JSON content as string
 * @returns {Array<Object>} Array of star objects
 */
export function parseJSON(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    
    // Handle various JSON structures
    const stars = Array.isArray(data) ? data : (data.stars || data.objects || []);
    
    return stars.map(star => ({
      hip: star.hip || star.HIP || parseInt(String(star.id || '').match(/(\d+)/)?.[1] || '0', 10) || null,
      ra: star.ra || star.RA || star.rightAscension || null,
      dec: star.dec || star.DEC || star.declination || null,
      pixelX: star.x || star.pixelX || star.X || null,
      pixelY: star.y || star.pixelY || star.Y || null,
      magnitude: star.magnitude || star.Mag || star.Vmag || null,
      name: star.name || star.Name || star.identifier || ''
    })).filter(star => star.hip !== null || (star.ra !== null && star.dec !== null));
  } catch (error) {
    console.error('Error parsing JSON:', error.message);
    return [];
  }
}

