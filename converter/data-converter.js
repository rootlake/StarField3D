#!/usr/bin/env node

/**
 * Main data converter script
 * Converts PixInsight annotation output to StarSlice JSON format
 * 
 * Usage:
 *   node data-converter.js <input-file> <image-file> [output-dir]
 * 
 * Example:
 *   node data-converter.js stars.csv starfield.jpg ./web/assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV, parseTextFormat, parseJSON } from './pixinsight-parser.js';
import { batchLookupSIMBAD, lookupDistanceCatalog } from './distance-lookup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate distance scaling to fit within volume
 * @param {Array} stars - Array of stars with distanceLy
 * @param {number} volumeDepth - Depth of the visualization volume
 * @returns {Object} Scaling parameters
 */
function calculateDistanceScaling(stars, volumeDepth) {
  const distances = stars
    .map(s => s.distanceLy)
    .filter(d => d !== null && d > 0);
  
  if (distances.length === 0) {
    return {
      frontOffset: 0,
      maxDistance: volumeDepth,
      scale: 1
    };
  }
  
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  
  // Set front offset to a round number below minimum
  const frontOffset = Math.floor(minDistance / 10) * 10;
  
  // Scale distances to fit volume
  const distanceRange = maxDistance - frontOffset;
  const scale = volumeDepth / distanceRange;
  
  return {
    frontOffset,
    maxDistance,
    scale,
    distanceRange
  };
}

/**
 * Main conversion function
 */
async function convertData(inputFile, imageFile, outputDir = './web/assets') {
  console.log(`Reading input file: ${inputFile}`);
  
  // Read input file
  const inputText = fs.readFileSync(inputFile, 'utf-8');
  
  // Determine format and parse
  let stars = [];
  const ext = path.extname(inputFile).toLowerCase();
  
  if (ext === '.csv') {
    stars = parseCSV(inputText);
  } else if (ext === '.json') {
    stars = parseJSON(inputText);
  } else {
    stars = parseTextFormat(inputText);
  }
  
  console.log(`Parsed ${stars.length} stars`);
  
  if (stars.length === 0) {
    console.error('No stars found in input file');
    process.exit(1);
  }
  
  // Get image dimensions
  let imageWidth = 1920;
  let imageHeight = 1080;
  
  if (imageFile && fs.existsSync(imageFile)) {
    // Try to get dimensions from image file
    // For now, use default or require user to specify
    console.log(`Using image: ${imageFile}`);
    // TODO: Use sharp or image-size library to get actual dimensions
  }
  
  // Extract HIP numbers for distance lookup
  const hipNumbers = stars
    .map(s => s.hip)
    .filter(h => h !== null);
  
  console.log(`Looking up distances for ${hipNumbers.length} HIP stars...`);
  
  // Lookup distances (using SIMBAD API for now)
  // TODO: Support local catalog file
  const distanceMap = await batchLookupSIMBAD(hipNumbers, 500);
  
  // Add distances to stars
  stars.forEach(star => {
    if (star.hip && distanceMap.has(star.hip)) {
      const dist = distanceMap.get(star.hip);
      star.distanceLy = dist.distanceLy;
      star.distancePc = dist.distancePc;
    }
  });
  
  // Filter stars with valid distances
  const starsWithDistances = stars.filter(s => s.distanceLy > 0);
  
  console.log(`Found distances for ${starsWithDistances.length} stars`);
  
  if (starsWithDistances.length === 0) {
    console.error('No stars with valid distances found');
    process.exit(1);
  }
  
  // Sort by magnitude (brightest first)
  starsWithDistances.sort((a, b) => {
    const magA = a.magnitude || 999;
    const magB = b.magnitude || 999;
    return magA - magB;
  });
  
  // Calculate volume dimensions (match screen size)
  const volumeWidth = 1920;  // Screen width
  const volumeHeight = 1080; // Screen height
  const volumeDepth = 1920;  // Match screen width
  
  // Calculate distance scaling
  const scaling = calculateDistanceScaling(starsWithDistances, volumeDepth);
  
  console.log(`Distance scaling: front=${scaling.frontOffset.toFixed(2)} ly, max=${scaling.maxDistance.toFixed(2)} ly`);
  
  // Apply scaling to stars
  starsWithDistances.forEach(star => {
    star.scaledDistance = (star.distanceLy - scaling.frontOffset) / scaling.distanceRange;
    // Clamp to [0, 1]
    star.scaledDistance = Math.max(0, Math.min(1, star.scaledDistance));
  });
  
  // Determine image filename
  const imageFilename = imageFile ? path.basename(imageFile) : 'starfield.jpg';
  
  // Create output structure
  const output = {
    image: {
      width: imageWidth,
      height: imageHeight,
      aspectRatio: imageWidth / imageHeight,
      filename: imageFilename
    },
    volume: {
      width: volumeWidth,
      height: volumeHeight,
      depth: volumeDepth
    },
    scaling: {
      frontOffsetLy: scaling.frontOffset,
      maxDistanceLy: scaling.maxDistance,
      distanceRangeLy: scaling.distanceRange
    },
    stars: starsWithDistances.map(star => ({
      hip: star.hip,
      name: star.name || `HIP ${star.hip}`,
      ra: star.ra,
      dec: star.dec,
      pixelX: star.pixelX,
      pixelY: star.pixelY,
      magnitude: star.magnitude,
      distanceLy: star.distanceLy,
      distancePc: star.distancePc,
      scaledDistance: star.scaledDistance
    }))
  };
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON file
  const jsonPath = path.join(outputDir, 'stars.json');
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`Written: ${jsonPath}`);
  
  // Copy image file if provided
  if (imageFile && fs.existsSync(imageFile)) {
    const imageDest = path.join(outputDir, imageFilename);
    fs.copyFileSync(imageFile, imageDest);
    console.log(`Copied image: ${imageDest}`);
  }
  
  console.log(`\nConversion complete!`);
  console.log(`  - Stars: ${starsWithDistances.length}`);
  console.log(`  - Distance range: ${scaling.frontOffset.toFixed(2)} - ${scaling.maxDistance.toFixed(2)} light-years`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node data-converter.js <input-file> [image-file] [output-dir]');
  console.error('\nExample:');
  console.error('  node data-converter.js stars.csv starfield.jpg ./web/assets');
  process.exit(1);
}

const inputFile = args[0];
const imageFile = args[1] || null;
const outputDir = args[2] || './web/assets';

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

convertData(inputFile, imageFile, outputDir).catch(error => {
  console.error('Error during conversion:', error);
  process.exit(1);
});

