/**
 * Student data entry form handling
 */

import { lookupHIP, batchLookupHIP } from './catalog.js';
import { raDecToPixel, parseRA, parseDec, estimateFOV, calculateScale } from './coordinate-converter.js';

let starEntryCount = 0;
const starLabels = ['Alpheratz', 'Star A', 'Star B', 'Star C', 'Star D', 'Star E', 'Star F', 'Star G', 
                    'Star H', 'Star I', 'Star J', 'Star K', 'Star L', 'Star M', 'Star N', 'Star O',
                    'Star P', 'Star Q', 'Star R', 'Star S', 'Star T', 'Star U', 'Star V', 'Star W',
                    'Star X', 'Star Y', 'Star Z'];

/**
 * Initialize data entry form
 */
export function initDataEntry() {
  const form = document.getElementById('star-data-form');
  const addStarBtn = document.getElementById('add-star-btn');
  const removeStarBtn = document.getElementById('remove-star-btn');
  const toggleBtn = document.getElementById('toggle-data-entry');
  const showBtn = document.getElementById('show-data-entry');
  const loadSampleBtn = document.getElementById('load-sample-data');
  
  starEntryCount = 1; // Start with primary star
  
  // Check if we already have data loaded
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('data') === 'loaded') {
    // Hide data entry panel if data is already loaded
    document.getElementById('data-entry-panel').classList.add('hidden');
    if (showBtn) showBtn.style.display = 'block';
  }
  
  addStarBtn.addEventListener('click', addStarEntry);
  removeStarBtn.addEventListener('click', removeStarEntry);
  if (toggleBtn) toggleBtn.addEventListener('click', toggleDataEntryPanel);
  if (showBtn) showBtn.addEventListener('click', toggleDataEntryPanel);
  loadSampleBtn.addEventListener('click', loadSampleData);
  
  form.addEventListener('submit', handleFormSubmit);
}

/**
 * Add a new star entry row
 */
function addStarEntry() {
  if (starEntryCount >= 27) {
    alert('Maximum of 27 stars allowed (1 primary + 26 A-Z)');
    return;
  }
  
  const container = document.getElementById('stars-container');
  const label = starLabels[starEntryCount] || `Star ${starEntryCount}`;
  
  const entry = document.createElement('div');
  entry.className = 'star-entry';
  entry.innerHTML = `
    <div class="form-group">
      <label>Star Label:</label>
      <input type="text" class="star-label" placeholder="${label}" value="${label}">
    </div>
    <div class="form-group">
      <label>HIP Number:</label>
      <input type="number" class="hip-number" placeholder="e.g., 544" required>
    </div>
    <div class="form-group">
      <label>Distance (pc):</label>
      <input type="number" class="distance-pc" step="0.01" placeholder="e.g., 13.8" required>
    </div>
  `;
  
  container.appendChild(entry);
  starEntryCount++;
  
  updateRemoveButton();
}

/**
 * Remove the last star entry
 */
function removeStarEntry() {
  if (starEntryCount <= 1) {
    alert('Must have at least one star');
    return;
  }
  
  const container = document.getElementById('stars-container');
  const entries = container.querySelectorAll('.star-entry');
  if (entries.length > 0) {
    entries[entries.length - 1].remove();
    starEntryCount--;
  }
  
  updateRemoveButton();
}

/**
 * Update remove button state
 */
function updateRemoveButton() {
  const removeBtn = document.getElementById('remove-star-btn');
  removeBtn.disabled = starEntryCount <= 1;
}

/**
 * Toggle data entry panel visibility
 */
function toggleDataEntryPanel() {
  const panel = document.getElementById('data-entry-panel');
  const toggleBtn = document.getElementById('toggle-data-entry');
  const showBtn = document.getElementById('show-data-entry');
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    if (toggleBtn) toggleBtn.textContent = 'Hide Data Entry';
    if (showBtn) showBtn.style.display = 'none';
  } else {
    panel.classList.add('hidden');
    if (showBtn) showBtn.style.display = 'block';
  }
}

/**
 * Load sample data for testing
 */
function loadSampleData() {
  // Set sample image center coordinates
  document.getElementById('image-center-ra').value = 0.1398;
  document.getElementById('image-center-dec').value = 29.0905;
  
  // Clear existing entries except first
  const container = document.getElementById('stars-container');
  const entries = container.querySelectorAll('.star-entry');
  for (let i = entries.length - 1; i > 0; i--) {
    entries[i].remove();
  }
  
  // Set sample star data
  const firstEntry = entries[0];
  firstEntry.querySelector('.star-label').value = 'Alpheratz';
  firstEntry.querySelector('.hip-number').value = 677;
  firstEntry.querySelector('.distance-pc').value = 29.8;
  
  // Add a few more sample stars
  addStarEntry();
  const entryA = container.querySelectorAll('.star-entry')[1];
  entryA.querySelector('.hip-number').value = 544;
  entryA.querySelector('.distance-pc').value = 13.8;
  
  addStarEntry();
  const entryB = container.querySelectorAll('.star-entry')[2];
  entryB.querySelector('.hip-number').value = 540;
  entryB.querySelector('.distance-pc').value = 14.2;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const submitBtn = document.getElementById('generate-visualization');
  const originalBtnText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  
  try {
    const imageFile = document.getElementById('image-upload').files[0];
    const centerRA = parseFloat(document.getElementById('image-center-ra').value);
    const centerDec = parseFloat(document.getElementById('image-center-dec').value);
    
    if (!imageFile) {
      alert('Please upload an image file');
      return;
    }
    
    if (isNaN(centerRA) || isNaN(centerDec)) {
      alert('Please enter valid center coordinates');
      return;
    }
    
    // Collect star data
    const starEntries = form.querySelectorAll('.star-entry');
    const stars = [];
    
    for (const entry of starEntries) {
      const label = entry.querySelector('.star-label').value.trim();
      const hip = parseInt(entry.querySelector('.hip-number').value, 10);
      const distancePc = parseFloat(entry.querySelector('.distance-pc').value);
      
      if (isNaN(hip) || isNaN(distancePc) || !label) {
        continue;
      }
      
      stars.push({
        label,
        hip,
        distancePc,
        distanceLy: distancePc * 3.26156
      });
    }
    
    if (stars.length === 0) {
      alert('Please enter at least one valid star');
      return;
    }
    
    submitBtn.textContent = 'Looking up star coordinates...';
    
    // Lookup RA/Dec for all HIP numbers
    const hipNumbers = stars.map(s => s.hip);
    const hipCoords = await batchLookupHIP(hipNumbers);
    
    // Check which stars were found
    const notFound = stars.filter(s => !hipCoords.has(s.hip));
    if (notFound.length > 0) {
      const notFoundList = notFound.map(s => `${s.label} (HIP ${s.hip})`).join(', ');
      const proceed = confirm(`Warning: Could not find coordinates for: ${notFoundList}\n\nContinue anyway?`);
      if (!proceed) {
        return;
      }
    }
    
    submitBtn.textContent = 'Loading image...';
    
    // Load image and get dimensions
    const image = await loadImage(imageFile);
    const imageWidth = image.width;
    const imageHeight = image.height;
    
    // Calculate scale (use default telescope parameters)
    const fov = estimateFOV(); // Default telescope parameters
    const scale = calculateScale(fov, imageWidth);
    
    submitBtn.textContent = 'Converting coordinates...';
    
    // Convert RA/Dec to pixel coordinates
    const starsWithCoords = [];
    const starsOutsideBounds = [];
    
    for (const star of stars) {
      const coords = hipCoords.get(star.hip);
      if (!coords) {
        continue;
      }
      
      const pixel = raDecToPixel(
        coords.ra,
        coords.dec,
        centerRA,
        centerDec,
        imageWidth,
        imageHeight,
        scale
      );
      
      if (pixel) {
        starsWithCoords.push({
          ...star,
          ra: coords.ra,
          dec: coords.dec,
          pixelX: pixel.x,
          pixelY: pixel.y
        });
      } else {
        starsOutsideBounds.push(star.label);
      }
    }
    
    if (starsWithCoords.length === 0) {
      alert('Could not find pixel coordinates for any stars. Please check:\n- Your HIP numbers are correct\n- Your center coordinates match your image\n- Stars are within the field of view');
      return;
    }
    
    if (starsOutsideBounds.length > 0) {
      console.warn('Stars outside image bounds:', starsOutsideBounds);
    }
  
    submitBtn.textContent = 'Generating visualization...';
    
    // Generate visualization data
    const visualizationData = generateVisualizationData(
      imageFile,
      imageWidth,
      imageHeight,
      starsWithCoords
    );
    
    // Hide data entry panel
    document.getElementById('data-entry-panel').classList.add('hidden');
    const showBtn = document.getElementById('show-data-entry');
    if (showBtn) showBtn.style.display = 'block';
    
    // Initialize visualization with generated data
    if (window.initVisualization) {
      window.initVisualization(visualizationData);
    } else {
      console.error('Visualization not initialized');
      alert('Error: Visualization system not ready. Please refresh the page.');
    }
    
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    
  } catch (error) {
    console.error('Error generating visualization:', error);
    alert('An error occurred: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

/**
 * Load image file and get dimensions
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate visualization data structure
 */
function generateVisualizationData(imageFile, imageWidth, imageHeight, stars) {
  // Calculate distance scaling
  const distances = stars.map(s => s.distanceLy);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const frontOffset = Math.floor(minDistance / 10) * 10;
  const distanceRange = maxDistance - frontOffset;
  
  // Sort by distance (closest first)
  stars.sort((a, b) => a.distanceLy - b.distanceLy);
  
  // Calculate scaled distances
  const volumeDepth = 1920; // Match screen width
  stars.forEach(star => {
    star.scaledDistance = (star.distanceLy - frontOffset) / distanceRange;
    star.scaledDistance = Math.max(0, Math.min(1, star.scaledDistance));
  });
  
  // Create image URL
  const imageUrl = URL.createObjectURL(imageFile);
  
  return {
    image: {
      width: imageWidth,
      height: imageHeight,
      aspectRatio: imageWidth / imageHeight,
      filename: imageFile.name,
      url: imageUrl
    },
    volume: {
      width: 1920,
      height: 1080,
      depth: 1920
    },
    scaling: {
      frontOffsetLy: frontOffset,
      maxDistanceLy: maxDistance,
      distanceRangeLy: distanceRange
    },
    stars: stars.map(star => ({
      hip: star.hip,
      name: star.label,
      ra: star.ra,
      dec: star.dec,
      pixelX: star.pixelX,
      pixelY: star.pixelY,
      magnitude: null, // Not provided by students
      distanceLy: star.distanceLy,
      distancePc: star.distancePc,
      scaledDistance: star.scaledDistance
    }))
  };
}

