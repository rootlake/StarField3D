/**
 * Student data entry form handling
 */

import { lookupHIP, batchLookupHIP } from './catalog.js';
import { raDecToPixel, parseRA, parseDec, estimateFOV, calculateScale } from './coordinate-converter.js';
import { getCalibratedPixel, hasCalibrations } from './pixel-calibration.js';

let starEntryCount = 0;
const starLabels = ['Alpheratz', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 
                    'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
                    'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
                    'X', 'Y', 'Z'];

/**
 * Handle image preview
 */
function handleImagePreview(event) {
  const file = event.target.files[0];
  const previewContainer = document.getElementById('image-preview-container');
  const preview = document.getElementById('image-preview');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      previewContainer.style.display = 'block';
      updateProgress('step-load-image', true);
      checkFormValidation();
    };
    reader.readAsDataURL(file);
  } else {
    previewContainer.style.display = 'none';
    updateProgress('step-load-image', false);
    checkFormValidation();
  }
}

/**
 * Handle back image preview
 */
function handleBackImagePreview(event) {
  const file = event.target.files[0];
  const previewContainer = document.getElementById('back-image-preview-container');
  const preview = document.getElementById('back-image-preview');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewContainer.style.display = 'none';
  }
}

/**
 * Set up form validation listeners
 */
/**
 * Debounce function to limit how often a function is called
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Setup form validation with debouncing
 */
function setupFormValidation() {
  // Debounced validation function (waits 150ms after last input)
  const debouncedValidation = debounce(checkFormValidation, 150);
  
  // Listen to all form inputs with debouncing
  const form = document.getElementById('star-data-form');
  const inputs = form.querySelectorAll('input, select');
  
  inputs.forEach(input => {
    // Use debounced version for input events (typing)
    input.addEventListener('input', debouncedValidation);
    // Use immediate version for change events (blur, select change)
    input.addEventListener('change', checkFormValidation);
  });
  
  // Also check when stars are added/removed (immediate, not frequent)
  const starsContainer = document.getElementById('stars-container');
  const observer = new MutationObserver(() => {
    // Small delay to let DOM settle
    setTimeout(checkFormValidation, 50);
  });
  observer.observe(starsContainer, { childList: true, subtree: true });
}

/**
 * Check form validation and update progress/states
 */
function checkFormValidation() {
  // Check image upload
  const imageFile = document.getElementById('image-upload').files[0];
  const imageLoaded = !!imageFile;
  updateProgress('step-load-image', imageLoaded);
  
  // Check center coordinates (optional - only needed for RA/Dec conversion fallback)
  // Check if any stars need RA/Dec conversion (don't have pixel coordinates)
  const starsContainer = document.getElementById('stars-container');
  const starEntries = starsContainer.querySelectorAll('.star-entry');
  let needsCoords = false;
  for (const entry of starEntries) {
    const pixelX = entry.dataset.pixelX;
    const pixelY = entry.dataset.pixelY;
    if (!pixelX || !pixelY) {
      needsCoords = true;
      break;
    }
  }
  
  let coordsComplete = true; // Default to true if not needed
  if (needsCoords) {
    // Check if center coordinate elements exist (they may have been removed)
    const raHoursEl = document.getElementById('image-center-ra-hours');
    const raMinutesEl = document.getElementById('image-center-ra-minutes');
    const raSecondsEl = document.getElementById('image-center-ra-seconds');
    const decDegreesEl = document.getElementById('image-center-dec-degrees');
    const decMinutesEl = document.getElementById('image-center-dec-minutes');
    const decSecondsEl = document.getElementById('image-center-dec-seconds');
    
    if (raHoursEl && raMinutesEl && raSecondsEl && decDegreesEl && decMinutesEl && decSecondsEl) {
      const raHours = raHoursEl.value;
      const raMinutes = raMinutesEl.value;
      const raSeconds = raSecondsEl.value;
      const decDegrees = decDegreesEl.value;
      const decMinutes = decMinutesEl.value;
      const decSeconds = decSecondsEl.value;
      
      coordsComplete = !!(raHours && raMinutes && raSeconds && 
                          decDegrees && decMinutes && decSeconds);
    } else {
      // Center coordinate elements don't exist - cannot complete RA/Dec conversion
      coordsComplete = false;
    }
  }
  
  updateProgress('step-center-coords', coordsComplete);
  
  // Check primary star
  const firstStar = starEntries[0];
  let primaryStarComplete = false;
  
  if (firstStar) {
    const labelEl = firstStar.querySelector('.star-label');
    const hipEl = firstStar.querySelector('.hip-number');
    const distanceEl = firstStar.querySelector('.distance-pc');
    const label = labelEl ? labelEl.value.trim() : '';
    const hip = hipEl ? hipEl.value : '';
    const distance = distanceEl ? distanceEl.value : '';
    primaryStarComplete = !!(label && hip && distance);
  }
  
  updateProgress('step-primary-star', primaryStarComplete);
  
  // Check star selections (at least one complete star)
  let starsComplete = false;
  for (const entry of starEntries) {
    const labelEl = entry.querySelector('.star-label');
    const hipEl = entry.querySelector('.hip-number');
    const distanceEl = entry.querySelector('.distance-pc');
    const label = labelEl ? labelEl.value.trim() : '';
    const hip = hipEl ? hipEl.value : '';
    const distance = distanceEl ? distanceEl.value : '';
    if (label && hip && distance) {
      starsComplete = true;
      break;
    }
  }
  
  updateProgress('step-star-selections', starsComplete);
  
  // Enable/disable generate button
  const generateBtn = document.getElementById('generate-visualization');
  const allComplete = imageLoaded && coordsComplete && primaryStarComplete && starsComplete;
  
  if (generateBtn) {
    generateBtn.disabled = !allComplete;
    generateBtn.classList.toggle('disabled', !allComplete);
  }
}

/**
 * Update progress step (no-op - progress bar removed)
 */
function updateProgress(stepId, completed) {
  // Progress bar has been removed, so this function is a no-op
  // Keeping it to avoid breaking existing code that calls it
  return;
}

/**
 * Simple CSV parser (handles quoted fields and commas)
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      rows.push(parseCSVLine(lines[i]));
    }
  }
  
  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Escape CSV field (add quotes if contains comma or quote)
 */
function escapeCSVField(field) {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Export current form data to CSV
 */
async function exportToCSV() {
  try {
    // Get image filenames
    const frontImageFile = document.getElementById('image-upload').files[0];
    const backImageFile = document.getElementById('back-image-upload').files[0];
    const frontImage = frontImageFile ? frontImageFile.name : '';
    const backImage = backImageFile ? backImageFile.name : '';
    
    // Get star data
    const starEntries = document.querySelectorAll('.star-entry');
    const stars = [];
    
    for (const entry of starEntries) {
      const label = entry.querySelector('.star-label').value.trim();
      const hip = entry.querySelector('.hip-number').value.trim();
      const distancePc = entry.querySelector('.distance-pc').value.trim();
      const magnitudeInput = entry.querySelector('.magnitude');
      const magnitude = magnitudeInput && magnitudeInput.value ? magnitudeInput.value.trim() : '';
      
      const tempInput = entry.querySelector('.temperature-k');
      const temperature = tempInput && tempInput.value ? tempInput.value.trim() : '';
      
      // Get pixel coordinates from data attributes (set during CSV import)
      const pixelX = entry.dataset.pixelX || '';
      const pixelY = entry.dataset.pixelY || '';
      
      if (label && hip && distancePc) {
        stars.push({
          label,
          hip,
          temperature,
          distancePc,
          magnitude,
          pixelX,
          pixelY
        });
      }
    }
    
    if (stars.length === 0) {
      alert('No stars to export. Please add at least one star.');
      return;
    }
    
    // Build CSV with simplified format
    const headers = [
      'FrontImage', 'BackImage',
      'Label', 'HIP', 'Temperature_K', 'Distance_pc', 'Magnitude',
      'PixelX', 'PixelY'
    ];
    
    const csvLines = [headers.map(escapeCSVField).join(',')];
    
    // First row: image filenames + first star
    const firstStar = stars[0];
    const firstRow = [
      frontImage, backImage,
      firstStar.label, firstStar.hip, firstStar.temperature, firstStar.distancePc, firstStar.magnitude,
      firstStar.pixelX, firstStar.pixelY
    ];
    csvLines.push(firstRow.map(escapeCSVField).join(','));
    
    // Subsequent rows: empty image filenames + star data
    for (let i = 1; i < stars.length; i++) {
      const star = stars[i];
      const row = [
        '', '', // Images (empty for subsequent stars)
        star.label, star.hip, star.temperature, star.distancePc, star.magnitude,
        star.pixelX, star.pixelY
      ];
      csvLines.push(row.map(escapeCSVField).join(','));
    }
    
    // Download CSV
    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Use first star's label (or object name) for filename
    const csvFilename = stars.length > 0 && stars[0].label 
      ? `${stars[0].label}.csv` 
      : 'star_data.csv';
    
    link.setAttribute('href', url);
    link.setAttribute('download', csvFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV: ' + error.message);
  }
}

/**
 * Load image from filename and set in form
 * @param {string} filename - Image filename
 * @param {boolean} isBack - Whether this is the back image
 * @param {string} baseDir - Base directory path (e.g., 'assets/Examples')
 */
async function loadImageFromFilename(filename, isBack = false, baseDir = 'assets/Examples') {
  if (!filename) return;
  
  try {
    const imageUrl = `${baseDir}/${filename}`;
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Image not found: ${imageUrl}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    
    // Create DataTransfer and set file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    const inputId = isBack ? 'back-image-upload' : 'image-upload';
    const input = document.getElementById(inputId);
    if (input) {
      input.files = dataTransfer.files;
      
      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  } catch (error) {
    console.warn(`Could not load image ${filename} from ${baseDir}:`, error);
    throw error;
  }
}

/**
 * Populate form from CSV data
 */
async function populateFormFromData(data) {
  try {
    // Clear existing star entries
    const container = document.getElementById('stars-container');
    container.innerHTML = '';
    starEntryCount = 0;
    
    // Store pixel scale and FOV globally if provided (from image solver)
    if (data.pixelScale !== undefined && data.pixelScale !== null && !isNaN(data.pixelScale)) {
      window.currentPixelScale = data.pixelScale;
      console.log(`Stored pixel scale from image solver: ${data.pixelScale} arcsec/pixel`);
    }
    if (data.fovWidthDeg !== undefined && data.fovWidthDeg !== null && !isNaN(data.fovWidthDeg)) {
      window.currentFOVWidthDeg = data.fovWidthDeg;
    }
    if (data.fovHeightDeg !== undefined && data.fovHeightDeg !== null && !isNaN(data.fovHeightDeg)) {
      window.currentFOVHeightDeg = data.fovHeightDeg;
    }
    
    // Set image center coordinates (optional - only needed for RA/Dec conversion fallback)
    if (data.imageCenter) {
      document.getElementById('image-center-ra-hours').value = data.imageCenter.raHours || '';
      document.getElementById('image-center-ra-minutes').value = data.imageCenter.raMinutes || '';
      document.getElementById('image-center-ra-seconds').value = data.imageCenter.raSeconds || '';
      document.getElementById('image-center-dec-sign').value = data.imageCenter.decSign || '1';
      document.getElementById('image-center-dec-degrees').value = data.imageCenter.decDegrees || '';
      document.getElementById('image-center-dec-minutes').value = data.imageCenter.decMinutes || '';
      document.getElementById('image-center-dec-seconds').value = data.imageCenter.decSeconds || '';
    }
    
    // Load images from the same directory as the CSV
    const imageBaseDir = data.imageBaseDir || 'assets/Examples';
    
    // Try to load images, but don't fail if they don't exist (allow manual upload)
    if (data.frontImage) {
      try {
        await loadImageFromFilename(data.frontImage, false, imageBaseDir);
      } catch (error) {
        console.warn(`Could not auto-load front image ${data.frontImage} from ${imageBaseDir}. Please upload manually.`);
        // Don't throw - allow user to upload manually
      }
    }
    if (data.backImage) {
      try {
        await loadImageFromFilename(data.backImage, true, imageBaseDir);
      } catch (error) {
        console.warn(`Could not auto-load back image ${data.backImage} from ${imageBaseDir}. Please upload manually.`);
        // Don't throw - allow user to upload manually
      }
    }
    
    // Add star entries
    for (const star of data.stars) {
      const temp = star.temperature ? parseInt(star.temperature, 10) : null;
      const hexColor = temp && !isNaN(temp) ? temperatureToColorGradient(temp) : '#444';
      
      // Debug logging for problematic temperatures
      if (temp === 6690 || temp === 6890) {
        console.log(`Star ${star.label}: temp=${temp}, hexColor=${hexColor}`);
      }
      
      const entry = document.createElement('div');
      entry.className = 'star-entry';
      
      // Store pixel coordinates as data attributes if available
      if (star.pixelX !== undefined && star.pixelY !== undefined) {
        entry.dataset.pixelX = star.pixelX.toString();
        entry.dataset.pixelY = star.pixelY.toString();
      }
      
      entry.innerHTML = `
        <div class="form-group">
          <label>Star Label:</label>
          <input type="text" class="star-label" value="${escapeHtml(star.label)}">
        </div>
        <div class="form-group">
          <label>HIP Number:</label>
          <input type="number" class="hip-number" value="${star.hip}" required>
        </div>
        <div class="form-group">
          <label>Temperature (K):</label>
          <div class="temperature-wrapper">
            <div class="temperature-color-preview" style="background-color: ${hexColor};"></div>
            <input type="number" class="temperature-k" placeholder="e.g., 9500" min="2000" max="50000" step="10" style="width: 120px;" value="${temp || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Distance (pc):</label>
          <input type="number" class="distance-pc" step="0.01" value="${star.distancePc}" required>
        </div>
        <div class="form-group">
          <label>App. Mag.:</label>
          <input type="number" class="magnitude" step="0.1" value="${star.magnitude || ''}">
        </div>
      `;
      
      container.appendChild(entry);
      starEntryCount++;
      
      // Set up color preview for temperature input
      const tempInput = entry.querySelector('.temperature-k');
      const wrapper = entry.querySelector('.temperature-wrapper');
      if (wrapper && tempInput) {
        const preview = wrapper.querySelector('.temperature-color-preview');
        
        // Force set the color using the temperature we already have
        // Use both background and background-color for maximum compatibility
        if (temp && !isNaN(temp)) {
          const calculatedColor = temperatureToColorGradient(temp);
          if (calculatedColor && calculatedColor !== '#444' && calculatedColor.length === 7) {
            preview.style.background = calculatedColor;
            preview.style.backgroundColor = calculatedColor;
            // Verify it was set
            if (temp === 6690 || temp === 6890) {
              console.log(`Set color for ${temp}: ${calculatedColor}, actual bg: ${preview.style.background}, computed: ${window.getComputedStyle(preview).backgroundColor}`);
            }
          }
        }
        
        // Force set the input value explicitly to ensure it's properly set
        // This helps with HTML5 validation
        if (temp && !isNaN(temp)) {
          tempInput.value = temp.toString();
          // Remove any validation errors by clearing and resetting
          tempInput.setCustomValidity('');
        }
        
        // Also update when the input value changes
        tempInput.addEventListener('input', () => {
          updateTemperatureColorPreview(tempInput, preview);
          checkFormValidation();
        });
        
        // Also trigger on change event (for programmatic changes)
        tempInput.addEventListener('change', () => {
          updateTemperatureColorPreview(tempInput, preview);
        });
        
        // Update again after a brief delay to ensure color is set
        setTimeout(() => {
          // Force update color preview
          if (temp && !isNaN(temp)) {
            const calculatedColor = temperatureToColorGradient(temp);
            if (calculatedColor && calculatedColor !== '#444' && calculatedColor.length === 7) {
              preview.style.background = calculatedColor;
              preview.style.backgroundColor = calculatedColor;
            }
          }
          // Also ensure input value is set correctly
          if (temp && !isNaN(temp)) {
            const currentValue = tempInput.value;
            if (currentValue !== temp.toString()) {
              tempInput.value = temp.toString();
              tempInput.setCustomValidity('');
            }
          }
          // Final update of color preview
          updateTemperatureColorPreview(tempInput, preview);
        }, 50);
      }
    }
    
    // Update form validation
    checkFormValidation();
    updateRemoveButton();
    
  } catch (error) {
    console.error('Error populating form:', error);
    throw error;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Import CSV data and populate form
 * @param {string} csvText - CSV text content
 * @param {string} baseDir - Base directory path for images (e.g., 'assets/Examples')
 * @param {string} csvFilename - Optional CSV filename (without path) for auto-generating image names
 */
async function importFromCSV(csvText, baseDir = 'assets/Examples', csvFilename = null) {
  try {
    const { headers, rows } = parseCSV(csvText);
    
    if (headers.length === 0 || rows.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }
    
    // Validate headers - new simplified format
    const expectedHeaders = [
      'FrontImage', 'BackImage',
      'Label', 'HIP', 'Temperature_K', 'Distance_pc', 'Magnitude',
      'PixelX', 'PixelY' // Pixel coordinates are required
    ];
    
    // Optional headers (for backward compatibility and RA/Dec conversion fallback)
    const optionalHeaders = [
      'ImageCenterRA_H', 'ImageCenterRA_M', 'ImageCenterRA_S',
      'ImageCenterDec_Sign', 'ImageCenterDec_D', 'ImageCenterDec_M', 'ImageCenterDec_S',
      'PixelScale_ArcsecPerPixel', 'FOV_Width_Deg', 'FOV_Height_Deg'
    ];
    
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[h] = i;
    });
    
    // Check for required headers (FrontImage/BackImage can be optional)
    const requiredHeaders = expectedHeaders.filter(h => h !== 'FrontImage' && h !== 'BackImage');
    const missingHeaders = requiredHeaders.filter(h => !(h in headerMap));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
    
    const firstRow = rows[0];
    let frontImage = firstRow[headerMap['FrontImage']] || '';
    let backImage = firstRow[headerMap['BackImage']] || '';
    
    // Auto-generate image filenames if not specified
    if (!frontImage || !backImage) {
      // Try to get base name from CSV filename first, then from first star label
      let baseName = null;
      if (csvFilename) {
        // Remove .csv extension and use as base name
        baseName = csvFilename.replace(/\.csv$/i, '');
      } else if (firstRow[headerMap['Label']]) {
        // Use first star's label as base name
        baseName = firstRow[headerMap['Label']].trim();
      }
      
      if (baseName) {
        if (!frontImage) {
          frontImage = `${baseName}_Front.png`;
        }
        if (!backImage) {
          backImage = `${baseName}_Back.png`;
        }
        console.log(`Auto-generated image filenames: ${frontImage}, ${backImage}`);
      }
    }
    
    // Read pixel scale from image solver if available (arcseconds per pixel)
    const pixelScale = headerMap['PixelScale_ArcsecPerPixel'] !== undefined && firstRow[headerMap['PixelScale_ArcsecPerPixel']]
      ? parseFloat(firstRow[headerMap['PixelScale_ArcsecPerPixel']].trim())
      : null;
    
    // Read FOV dimensions from image solver if available (in decimal degrees)
    const fovWidthDeg = headerMap['FOV_Width_Deg'] !== undefined && firstRow[headerMap['FOV_Width_Deg']]
      ? parseFloat(firstRow[headerMap['FOV_Width_Deg']].trim())
      : null;
    const fovHeightDeg = headerMap['FOV_Height_Deg'] !== undefined && firstRow[headerMap['FOV_Height_Deg']]
      ? parseFloat(firstRow[headerMap['FOV_Height_Deg']].trim())
      : null;
    
    // Extract image center (optional - only needed for RA/Dec conversion fallback)
    const imageCenter = headerMap['ImageCenterRA_H'] !== undefined ? {
      raHours: firstRow[headerMap['ImageCenterRA_H']] || '',
      raMinutes: firstRow[headerMap['ImageCenterRA_M']] || '',
      raSeconds: firstRow[headerMap['ImageCenterRA_S']] || '',
      decSign: firstRow[headerMap['ImageCenterDec_Sign']] || '1',
      decDegrees: firstRow[headerMap['ImageCenterDec_D']] || '',
      decMinutes: firstRow[headerMap['ImageCenterDec_M']] || '',
      decSeconds: firstRow[headerMap['ImageCenterDec_S']] || ''
    } : null;
    
    // Extract stars from all rows
    const stars = [];
    for (const row of rows) {
      const label = row[headerMap['Label']];
      const hip = row[headerMap['HIP']];
      const temperature = row[headerMap['Temperature_K']];
      const distancePc = row[headerMap['Distance_pc']];
      const magnitude = row[headerMap['Magnitude']] || '';
      
      // Read pixel coordinates if available
      const pixelX = headerMap['PixelX'] !== undefined ? row[headerMap['PixelX']] : null;
      const pixelY = headerMap['PixelY'] !== undefined ? row[headerMap['PixelY']] : null;
      
      if (label && hip && distancePc) {
        const starData = {
          label: label.trim(),
          hip: hip.trim(),
          temperature: temperature ? temperature.trim() : '',
          distancePc: distancePc.trim(),
          magnitude: magnitude.trim()
        };
        
        // Add pixel coordinates if present
        if (pixelX && pixelY && pixelX.trim() && pixelY.trim()) {
          starData.pixelX = parseFloat(pixelX.trim());
          starData.pixelY = parseFloat(pixelY.trim());
        }
        
        stars.push(starData);
      }
    }
    
    if (stars.length === 0) {
      throw new Error('No valid stars found in CSV');
    }
    
    // Populate form
    await populateFormFromData({
      imageCenter, // Optional - only needed for RA/Dec conversion fallback
      frontImage,
      backImage,
      stars,
      pixelScale, // Optional - from image solver
      fovWidthDeg, // Optional - from image solver
      fovHeightDeg, // Optional - from image solver
      imageBaseDir: baseDir // Directory where images are located
    });
    
    return true;
  } catch (error) {
    console.error('Error importing CSV:', error);
    alert('Error importing CSV: ' + error.message);
    return false;
  }
}

/**
 * Scan Examples folder for CSV files (auto-detect)
 */
async function scanDemoLibrary() {
  try {
    // Try to auto-detect CSV files by checking common patterns
    // Start with known examples and expand the list as needed
    const potentialExamples = [
      'Alpheratz.csv', 'Diphda.csv', 'M45.csv',
      'Pleiades.csv', 'Orion.csv', 'Cassiopeia.csv'
    ];
    
    const demoSelect = document.getElementById('demo-select');
    if (!demoSelect) return;
    
    // Clear existing options except first
    while (demoSelect.children.length > 1) {
      demoSelect.removeChild(demoSelect.lastChild);
    }
    
    // Try to load each potential example
    for (const filename of potentialExamples) {
      try {
        const response = await fetch(`assets/Examples/${filename}`);
        if (response.ok) {
          const option = document.createElement('option');
          option.value = filename;
          // Display name without .csv extension
          option.textContent = filename.replace('.csv', '');
          demoSelect.appendChild(option);
        }
      } catch (error) {
        // File doesn't exist, skip silently
        console.debug(`Example file ${filename} not found`);
      }
    }
    
    // For production with many examples, consider implementing a server-side endpoint
    // that lists CSV files in the Examples folder
    
  } catch (error) {
    console.error('Error scanning example library:', error);
  }
}

/**
 * Load example CSV file
 */
async function loadDemoCSV(filename) {
  try {
    const csvPath = `assets/Examples/${filename}`;
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error(`Example file not found: ${filename}`);
    }
    
    const csvText = await response.text();
    // Pass the directory path and filename so images can be auto-generated if needed
    await importFromCSV(csvText, 'assets/Examples', filename);
    
  } catch (error) {
    console.error('Error loading example:', error);
    alert('Error loading example: ' + error.message);
  }
}

export function initDataEntry() {
  const form = document.getElementById('star-data-form');
  const addStarBtn = document.getElementById('add-star-btn');
  const removeStarBtn = document.getElementById('remove-star-btn');
  const exportCsvBtn = document.getElementById('export-csv');
  const imageUpload = document.getElementById('image-upload');
  const backImageUpload = document.getElementById('back-image-upload');
  const demoSelect = document.getElementById('demo-select');
  const csvUpload = document.getElementById('csv-upload');
  
  starEntryCount = 1; // Start with primary star
  
  // Initialize temperature inputs in existing HTML
  const temperatureInputs = document.querySelectorAll('.temperature-k');
  temperatureInputs.forEach(tempInput => {
    const wrapper = tempInput.closest('.temperature-wrapper');
    if (wrapper) {
      const preview = wrapper.querySelector('.temperature-color-preview');
      updateTemperatureColorPreview(tempInput, preview);
      
      tempInput.addEventListener('input', () => {
        updateTemperatureColorPreview(tempInput, preview);
        checkFormValidation();
      });
    }
  });
  
  // Set up image previews
  imageUpload.addEventListener('change', handleImagePreview);
  if (backImageUpload) {
    backImageUpload.addEventListener('change', handleBackImagePreview);
  }
  
  // Set up form validation (will use debouncing)
  setupFormValidation();
  
  // Check if we already have data loaded
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('data') === 'loaded') {
    // Hide data entry panel if data is already loaded
    document.getElementById('data-entry-panel').classList.add('hidden');
  }
  
  addStarBtn.addEventListener('click', addStarEntry);
  removeStarBtn.addEventListener('click', removeStarEntry);
  
  // CSV export
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }
  
  // Demo library dropdown
  if (demoSelect) {
    scanDemoLibrary(); // Scan for available examples
    demoSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        loadDemoCSV(e.target.value);
        // Reset dropdown after loading
        setTimeout(() => {
          e.target.value = '';
        }, 100);
      }
    });
  }
  
  // CSV file upload
  if (csvUpload) {
    csvUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          // For uploaded CSV files, use the filename to auto-generate image names
          // Assume images are in assets/Examples or can be uploaded separately
          await importFromCSV(event.target.result, 'assets/Examples', file.name);
          // Clear file input
          e.target.value = '';
        };
        reader.readAsText(file);
      }
    });
  }
  
  form.addEventListener('submit', handleFormSubmit);
  
  // Set up Generate button in header (outside form) to submit form
  const generateBtnInHeader = document.getElementById('generate-visualization');
  if (generateBtnInHeader && generateBtnInHeader.closest('form') === null) {
    generateBtnInHeader.addEventListener('click', (e) => {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }
  
  // Set up tab switching
  setupTabs();
  
  // Initial validation check (with delay to let DOM settle)
  setTimeout(() => {
    checkFormValidation();
  }, 100);
}

/**
 * Setup tab navigation
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const dataEntryPanel = document.getElementById('data-entry-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      
      if (targetTab === 'data-entry') {
        // Show data entry panel overlay
        if (dataEntryPanel) {
          dataEntryPanel.classList.add('active');
        }
      } else {
        // Hide data entry panel overlay
        if (dataEntryPanel) {
          dataEntryPanel.classList.remove('active');
        }
      }
      
      const targetContent = document.querySelector(`[data-tab="${targetTab}"]`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
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
      <label>Temperature (K):</label>
      <div class="temperature-wrapper">
        <div class="temperature-color-preview" style="background: #444;"></div>
        <input type="number" class="temperature-k" placeholder="e.g., 9500" min="2000" max="50000" step="10" style="width: 120px;">
      </div>
    </div>
    <div class="form-group">
      <label>Distance (pc):</label>
      <input type="number" class="distance-pc" step="0.01" placeholder="e.g., 13.8" required>
    </div>
    <div class="form-group">
      <label>App. Mag.:</label>
      <input type="number" class="magnitude" step="0.1" placeholder="e.g., 2.1">
    </div>
  `;
  
  container.appendChild(entry);
  starEntryCount++;
  
  // Set up color preview for temperature input
  const tempInput = entry.querySelector('.temperature-k');
  const wrapper = entry.querySelector('.temperature-wrapper');
  if (wrapper && tempInput) {
    const preview = wrapper.querySelector('.temperature-color-preview');
    updateTemperatureColorPreview(tempInput, preview);
    
    tempInput.addEventListener('input', () => {
      updateTemperatureColorPreview(tempInput, preview);
      checkFormValidation();
    });
  }
  
  updateRemoveButton();
  checkFormValidation();
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
  checkFormValidation();
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

/**
 * Load sample data for testing
 */
async function loadSampleData() {
  // Set sample image center coordinates from PixInsight output
  // RA: 0 08 36.250 (HMS), Dec: +29 03 43.24 (DMS)
  document.getElementById('image-center-ra-hours').value = 0;
  document.getElementById('image-center-ra-minutes').value = 8;
  document.getElementById('image-center-ra-seconds').value = 36.250;
  
  document.getElementById('image-center-dec-sign').value = 1;
  document.getElementById('image-center-dec-degrees').value = 29;
  document.getElementById('image-center-dec-minutes').value = 3;
  document.getElementById('image-center-dec-seconds').value = 43.24;
  
  // Preload images from assets/images directory
  try {
    // Load front image
    const frontImageUrl = 'assets/images/Alpheratz_Annotated.png';
    const frontImageResponse = await fetch(frontImageUrl);
    if (frontImageResponse.ok) {
      const frontImageBlob = await frontImageResponse.blob();
      const frontImageFile = new File([frontImageBlob], 'Alpheratz_Annotated.png', { type: 'image/png' });
      
      // Create a DataTransfer object to simulate file input
      const frontDataTransfer = new DataTransfer();
      frontDataTransfer.items.add(frontImageFile);
      const frontImageInput = document.getElementById('image-upload');
      frontImageInput.files = frontDataTransfer.files;
      
      // Trigger preview update
      const frontPreviewEvent = new Event('change', { bubbles: true });
      frontImageInput.dispatchEvent(frontPreviewEvent);
    }
    
    // Load back image
    const backImageUrl = 'assets/images/Alpheratz_Annotated_Back.png';
    const backImageResponse = await fetch(backImageUrl);
    if (backImageResponse.ok) {
      const backImageBlob = await backImageResponse.blob();
      const backImageFile = new File([backImageBlob], 'Alpheratz_Annotated_Back.png', { type: 'image/png' });
      
      // Create a DataTransfer object to simulate file input
      const backDataTransfer = new DataTransfer();
      backDataTransfer.items.add(backImageFile);
      const backImageInput = document.getElementById('back-image-upload');
      if (backImageInput) {
        backImageInput.files = backDataTransfer.files;
        
        // Trigger preview update
        const backPreviewEvent = new Event('change', { bubbles: true });
        backImageInput.dispatchEvent(backPreviewEvent);
      }
    }
  } catch (error) {
    console.warn('Could not preload images from assets/images:', error);
  }
  
  // Clear existing entries
  const container = document.getElementById('stars-container');
  container.innerHTML = '';
  
  // Pre-load Primary star and Stars A-E
  const sampleStars = [
    { label: 'Alpheratz', hip: 677, distance: 29.8 },
    { label: 'A', hip: 544, distance: 13.8 },
    { label: 'B', hip: 540, distance: 14.2 },
    { label: 'C', hip: 502, distance: 15.5 },
    { label: 'D', hip: 423, distance: 16.0 },
    { label: 'E', hip: 971, distance: 18.3 }
  ];
  
  starEntryCount = 0;
  
  sampleStars.forEach((star, index) => {
    const entry = document.createElement('div');
    entry.className = 'star-entry';
    entry.innerHTML = `
      <div class="form-group">
        <label>Star Label:</label>
        <input type="text" class="star-label" placeholder="${star.label}" value="${star.label}">
      </div>
      <div class="form-group">
        <label>HIP Number:</label>
        <input type="number" class="hip-number" placeholder="e.g., ${star.hip}" value="${star.hip}" required>
      </div>
      <div class="form-group">
        <label>Temperature (K):</label>
        <div class="temperature-wrapper">
          <div class="temperature-color-preview" style="background: #444;"></div>
          <input type="number" class="temperature-k" placeholder="e.g., 9500" min="2000" max="50000" step="10" style="width: 120px;" value="${index === 0 ? '9500' : ''}">
        </div>
      </div>
      <div class="form-group">
        <label>Distance (pc):</label>
        <input type="number" class="distance-pc" step="0.01" placeholder="e.g., ${star.distance}" value="${star.distance}" required>
      </div>
      <div class="form-group">
        <label>App. Mag.:</label>
        <input type="number" class="magnitude" step="0.1" placeholder="e.g., 2.1">
      </div>
    `;
    
    container.appendChild(entry);
    starEntryCount++;
    
    // Set up color preview for temperature input
    const tempInput = entry.querySelector('.temperature-k');
    const wrapper = entry.querySelector('.temperature-wrapper');
    if (wrapper && tempInput) {
      const preview = wrapper.querySelector('.temperature-color-preview');
      // Update color preview immediately (value is already set in HTML)
      // Use setTimeout to ensure DOM is fully ready
      setTimeout(() => {
        updateTemperatureColorPreview(tempInput, preview);
      }, 0);
      
      tempInput.addEventListener('input', () => {
        updateTemperatureColorPreview(tempInput, preview);
        checkFormValidation();
      });
      
      // Also trigger on change event (for programmatic changes)
      tempInput.addEventListener('change', () => {
        updateTemperatureColorPreview(tempInput, preview);
      });
    }
  });
  
  updateRemoveButton();
  checkFormValidation();
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const submitBtn = document.getElementById('generate-visualization');
  
  if (!submitBtn) {
    console.error('Generate button not found');
    return;
  }
  
  const originalBtnText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  
  try {
    const imageFile = document.getElementById('image-upload').files[0];
    const backImageFile = document.getElementById('back-image-upload')?.files[0] || null;
    
    if (!imageFile) {
      alert('Please upload an image file');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }
    
    // Collect star data first to check if we need RA/Dec conversion
    const starEntries = form.querySelectorAll('.star-entry');
    const stars = [];
    
    for (const entry of starEntries) {
      const label = entry.querySelector('.star-label').value.trim();
      const hip = parseInt(entry.querySelector('.hip-number').value, 10);
      const distancePc = parseFloat(entry.querySelector('.distance-pc').value);
      const magnitudeInput = entry.querySelector('.magnitude');
      const magnitude = magnitudeInput && magnitudeInput.value ? parseFloat(magnitudeInput.value) : null;
      const tempInput = entry.querySelector('.temperature-k');
      const temp = tempInput && tempInput.value ? parseInt(tempInput.value, 10) : null;
      
      // Get color from temperature using gradient
      let spectralColorHex = null;
      if (temp && !isNaN(temp)) {
        spectralColorHex = temperatureToColorGradient(temp);
      } else {
        spectralColorHex = temperatureToColorGradient(9500); // Default to A2
      }
      
      // Convert temperature to spectral class for compatibility
      const spectralType = temp ? temperatureToSpectralClass(temp) : null;
      
      if (isNaN(hip) || isNaN(distancePc) || !label) {
        continue;
      }
      
      const starData = {
        label,
        hip,
        distancePc,
        distanceLy: distancePc * 3.26156,
        magnitude,
        spectralType,
        spectralColorHex,
        temperature: temp
      };
      
      // Check if pixel coordinates are stored in the entry (from CSV import)
      const storedPixelX = entry.dataset.pixelX;
      const storedPixelY = entry.dataset.pixelY;
      if (storedPixelX && storedPixelY) {
        starData.pixelX = parseFloat(storedPixelX);
        starData.pixelY = parseFloat(storedPixelY);
      }
      
      stars.push(starData);
    }
    
    if (stars.length === 0) {
      alert('Please enter at least one valid star');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }
    
    // Check which stars need coordinate lookup (don't have pixel coordinates from CSV)
    const starsNeedingLookup = stars.filter(s => !s.pixelX || !s.pixelY);
    const starsWithPixels = stars.filter(s => s.pixelX && s.pixelY);
    
    // Parse RA/Dec from form (optional - only needed if some stars require RA/Dec conversion)
    let centerRA = null;
    let centerDec = null;
    
    if (starsNeedingLookup.length > 0) {
      // Check if center coordinate elements exist
      const raHoursEl = document.getElementById('image-center-ra-hours');
      const raMinutesEl = document.getElementById('image-center-ra-minutes');
      const raSecondsEl = document.getElementById('image-center-ra-seconds');
      const decSignEl = document.getElementById('image-center-dec-sign');
      const decDegreesEl = document.getElementById('image-center-dec-degrees');
      const decMinutesEl = document.getElementById('image-center-dec-minutes');
      const decSecondsEl = document.getElementById('image-center-dec-seconds');
      
      if (!raHoursEl || !raMinutesEl || !raSecondsEl || !decSignEl || 
          !decDegreesEl || !decMinutesEl || !decSecondsEl) {
        alert('Some stars need RA/Dec conversion but center coordinate fields are not available. Please add pixel coordinates for all stars in the CSV.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }
      
      const raHours = parseFloat(raHoursEl.value) || 0;
      const raMinutes = parseFloat(raMinutesEl.value) || 0;
      const raSeconds = parseFloat(raSecondsEl.value) || 0;
      centerRA = (raHours + raMinutes / 60 + raSeconds / 3600) * 15; // Convert to degrees
      
      const decSign = parseFloat(decSignEl.value) || 1;
      const decDegrees = parseFloat(decDegreesEl.value) || 0;
      const decMinutes = parseFloat(decMinutesEl.value) || 0;
      const decSeconds = parseFloat(decSecondsEl.value) || 0;
      centerDec = decSign * (decDegrees + decMinutes / 60 + decSeconds / 3600);
      
      if (isNaN(centerRA) || isNaN(centerDec) || centerRA < 0 || centerRA > 360 || centerDec < -90 || centerDec > 90) {
        alert('For RA/Dec conversion, please enter valid center coordinates in HMS/DMS format');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }
    }
    
    submitBtn.textContent = 'Looking up star coordinates...';
    
    // Only lookup coordinates for stars that don't have pixel coordinates
    let hipCoords = new Map();
    if (starsNeedingLookup.length > 0) {
      const hipNumbers = starsNeedingLookup.map(s => s.hip);
      hipCoords = await batchLookupHIP(hipNumbers);
      
      // Check which stars were found (only warn about stars that need RA/Dec conversion)
      const notFound = starsNeedingLookup.filter(s => !hipCoords.has(s.hip));
      if (notFound.length > 0) {
        const notFoundList = notFound.map(s => `${s.label} (HIP ${s.hip})`).join(', ');
        const proceed = confirm(`Warning: Could not find coordinates for: ${notFoundList}\n\nThese stars need RA/Dec conversion but coordinates weren't found. Continue anyway?`);
        if (!proceed) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }
      }
    }
    
    if (starsWithPixels.length > 0) {
      console.log(`Using pixel coordinates from CSV for ${starsWithPixels.length} star(s)`);
    }
    
    submitBtn.textContent = 'Loading image...';
    
    // Compress images for better performance while keeping original dimensions
    console.log('Compressing images for optimal performance...');
    const compressedImage = await compressImage(imageFile);
    const imageWidth = compressedImage.originalWidth; // Use original dimensions for coordinates
    const imageHeight = compressedImage.originalHeight;
    
    // Create object URL for compressed image
    const compressedImageUrl = URL.createObjectURL(compressedImage.blob);
    
    // Compress back image if provided
    let backImageData = null;
    if (backImageFile) {
      const compressedBackImage = await compressImage(backImageFile);
      const backImageUrl = URL.createObjectURL(compressedBackImage.blob);
      backImageData = {
        file: compressedBackImage.blob,
        width: compressedBackImage.originalWidth,
        height: compressedBackImage.originalHeight,
        url: backImageUrl
      };
      console.log(`Back image compressed: ${compressedBackImage.originalWidth}x${compressedBackImage.originalHeight} (quality reduced)`);
    }
    
    console.log(`Front image compressed: ${imageWidth}x${imageHeight} (quality reduced, dimensions preserved)`);
    
    // Calculate scale - priority order:
    // 1. Pixel scale from image solver (in CSV)
    // 2. Calculate from FOV if provided (for backward compatibility)
    // 3. Only needed if some stars require RA/Dec conversion
    let scale = null;
    
    // Check if we have pixel scale from image solver
    if (window.currentPixelScale && !isNaN(window.currentPixelScale)) {
      scale = window.currentPixelScale;
      console.log(`Using pixel scale from image solver: ${scale} arcsec/pixel`);
    } else if (starsNeedingLookup.length > 0) {
      // Only calculate scale if we need RA/Dec conversion
      // Try to use FOV dimensions from image solver first
      let fovWidthDeg = window.currentFOVWidthDeg;
      let fovHeightDeg = window.currentFOVHeightDeg;
      
      if (!fovWidthDeg || !fovHeightDeg) {
        // Fallback to hardcoded FOV (for backward compatibility)
        fovWidthDeg = 3.904; // Actual: 3d 54' 14.7"
        fovHeightDeg = 2.603; // Actual: 2d 36' 9.8"
        console.log('Using hardcoded FOV (fallback)');
      } else {
        console.log(`Using FOV from image solver: ${fovWidthDeg}° x ${fovHeightDeg}°`);
      }
      
      // Use original dimensions for scale calculation
      const scaleX = calculateScale(fovWidthDeg, compressedImage.originalWidth);
      const scaleY = calculateScale(fovHeightDeg, compressedImage.originalHeight);
      // Use average scale for circular field approximation
      scale = (scaleX + scaleY) / 2;
      console.log(`Calculated scale from FOV: ${scale} arcsec/pixel`);
    } else {
      console.log('All stars have pixel coordinates - scale not needed');
    }
    
    submitBtn.textContent = 'Converting coordinates...';
    
    // Convert RA/Dec to pixel coordinates
    const starsWithCoords = [];
    const starsOutsideBounds = [];
    const useCalibration = hasCalibrations();
    
    for (const star of stars) {
      // Priority order for pixel coordinates:
      // 1. Pixel coordinates from CSV (already in star data)
      // 2. Manual pixel calibration override
      // 3. Calculate from RA/Dec conversion
      
      let pixel = null;
      
      if (star.pixelX !== undefined && star.pixelY !== undefined) {
        // Use pixel coordinates from CSV
        pixel = { x: star.pixelX, y: star.pixelY };
        console.log(`Using pixel coordinates from CSV for ${star.label}:`, pixel);
      } else {
        // Check for manual pixel coordinate override
        const calibratedPixel = getCalibratedPixel(star.label);
        if (calibratedPixel) {
          pixel = calibratedPixel;
          console.log(`Using calibrated pixel coordinates for ${star.label}:`, pixel);
        } else {
          // Use RA/Dec conversion
          const coords = hipCoords.get(star.hip);
          if (!coords) {
            continue;
          }
          
          // Convert RA from hours to degrees if needed
          // Catalog may provide RA in hours (values < 24) or degrees (values 0-360)
          let raDeg = coords.ra;
          if (coords.ra < 24) {
            // RA is in hours, convert to degrees
            raDeg = coords.ra * 15;
          }
          
          if (scale === null) {
            console.warn(`Cannot convert RA/Dec to pixel for ${star.label}: scale not available`);
            continue;
          }
          
          if (!centerRA || !centerDec) {
            console.warn(`Cannot convert RA/Dec to pixel for ${star.label}: center coordinates not available`);
            continue;
          }
          
          // Use original dimensions for coordinate conversion
          pixel = raDecToPixel(
            raDeg,
            coords.dec,
            centerRA,
            centerDec,
            compressedImage.originalWidth,
            compressedImage.originalHeight,
            scale
          );
          
          if (pixel) {
            console.log(`Calculated pixel for ${star.label} (HIP ${star.hip}):`, pixel, 'from RA/Dec:', coords.ra, coords.dec);
          }
        }
      }
      
      if (pixel) {
        // Get coordinates from lookup (for reference, even if using calibrated pixels)
        const starCoords = hipCoords.get(star.hip);
        
        starsWithCoords.push({
          ...star,
          ra: starCoords?.ra || null,
          dec: starCoords?.dec || null,
          pixelX: pixel.x,
          pixelY: pixel.y
        });
      } else {
        starsOutsideBounds.push(star.label);
      }
    }
    
    if (starsWithCoords.length === 0) {
      alert('Could not find pixel coordinates for any stars. Please check:\n- Your HIP numbers are correct\n- Your center coordinates match your image\n- Stars are within the field of view');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }
    
    if (starsOutsideBounds.length > 0) {
      console.warn('Stars outside image bounds:', starsOutsideBounds);
    }
  
    submitBtn.textContent = 'Generating visualization...';
    
    // Generate visualization data with compressed image (using original dimensions)
    const visualizationData = generateVisualizationData(
      compressedImage.blob,
      compressedImage.originalWidth,
      compressedImage.originalHeight,
      starsWithCoords,
      backImageData
    );
    
    // Update image data with compressed image URL and original dimensions
    visualizationData.image.url = compressedImageUrl;
    visualizationData.image.width = compressedImage.originalWidth; // Original width for coordinates
    visualizationData.image.height = compressedImage.originalHeight; // Original height for coordinates
    visualizationData.image.originalWidth = compressedImage.originalWidth; // Same as width (no resizing)
    visualizationData.image.originalHeight = compressedImage.originalHeight; // Same as height (no resizing)
    
    // No coordinate scaling needed - dimensions are preserved
    
    // Don't hide data entry panel - visualization will appear above it
    // Visualization container will be positioned above the form
    
    // Initialize visualization with generated data
    if (window.initVisualization) {
      window.initVisualization(visualizationData);
    } else {
      console.error('Visualization not initialized');
      alert('Error: Visualization system not ready. Please refresh the page.');
    }
    
    // Reset buttons
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
 * Compress image to optimize performance while preserving dimensions
 * Converts PNG to JPG and reduces quality for better compression
 * @param {File} file - Image file
 * @param {number} quality - JPEG quality (0.0 to 1.0, default 0.75)
 * @returns {Promise<{blob: Blob, originalWidth: number, originalHeight: number}>}
 */
function compressImage(file, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Create canvas with original dimensions
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image at original size
        ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
        
        // Determine output format: prefer JPG for better compression
        // Convert PNG to JPG unless transparency is needed
        const isPng = file.type === 'image/png';
        const outputType = isPng ? 'image/jpeg' : (file.type || 'image/jpeg');
        const outputQuality = isPng ? quality : Math.min(quality, 0.92); // Slightly higher quality for already-JPG
        
        // Convert to blob with compression
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              blob,
              originalWidth,
              originalHeight
            });
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, outputType, outputQuality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
 * Star spectral class colors with detailed subtypes
 */
const STAR_COLORS = [
  { label: "O2 — 45,000 K", hex: "#95B8FF", code: "O2" },
  { label: "O5 — 38,000 K", hex: "#99BAFF", code: "O5" },
  { label: "O9 — 30,000 K", hex: "#9FBEFF", code: "O9" },
  { label: "B2 — 22,000 K", hex: "#A8C4FF", code: "B2" },
  { label: "B5 — 16,000 K", hex: "#B3CBFF", code: "B5" },
  { label: "B9 — 12,000 K", hex: "#BFD3FF", code: "B9" },
  { label: "A2 — 9,500 K", hex: "#CDDCFF", code: "A2" },
  { label: "A5 — 8,500 K", hex: "#D7E2FF", code: "A5" },
  { label: "A9 — 7,800 K", hex: "#E0E8FF", code: "A9" },
  { label: "F2 — 7,000 K", hex: "#F3F2FF", code: "F2" },
  { label: "F5 — 6,500 K", hex: "#FFFIFA", code: "F5" },
  { label: "F9 — 6,000 K", hex: "#FFF6ED", code: "F9" },
  { label: "G2 — 5,800 K (Sun)", hex: "#FFF3E7", code: "G2" },
  { label: "G5 — 5,500 K", hex: "#FFEDDE", code: "G5" },
  { label: "G9 — 5,200 K", hex: "#FFE8D5", code: "G9" },
  { label: "K2 — 4,800 K", hex: "#FFE0C7", code: "K2" },
  { label: "K5 — 4,400 K", hex: "#FFD7B7", code: "K5" },
  { label: "K9 — 4,000 K", hex: "#FFCEA6", code: "K9" },
  { label: "M2 — 3,600 K", hex: "#FFC392", code: "M2" },
  { label: "M5 — 3,200 K", hex: "#FFB87B", code: "M5" },
  { label: "M9 — 2,800 K", hex: "#FFAA5F", code: "M9" },
];

/**
 * Extract temperature from STAR_COLORS entry
 */
function extractTemperature(label) {
  // Match patterns like "45,000 K", "9500 K", "5,800 K"
  // Handle both comma-separated and plain numbers
  const match = label.match(/(\d{1,2}),?(\d{3})?\s*K/);
  if (match) {
    const part1 = match[1];
    const part2 = match[2] || '';
    return parseInt(part1 + part2, 10);
  }
  return null;
}

// Pre-compute temperatures for each spectral class
const SPECTRAL_TEMPERATURES = STAR_COLORS.map(color => ({
  code: color.code,
  hex: color.hex,
  temp: extractTemperature(color.label)
})).filter(item => item.temp !== null);

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color string
 */
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1Hex, color2Hex, ratio) {
  const rgb1 = hexToRgb(color1Hex);
  const rgb2 = hexToRgb(color2Hex);
  
  if (!rgb1 || !rgb2) return color1Hex;
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * ratio;
  const g = rgb1.g + (rgb2.g - rgb1.g) * ratio;
  const b = rgb1.b + (rgb2.b - rgb1.b) * ratio;
  
  return rgbToHex(r, g, b);
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert temperature (K) to hex color using blackbody gradient interpolation
 * Maps temperatures to a smooth gradient from dark blue (cool) to red (hot)
 */
function temperatureToColorGradient(tempK) {
  if (!tempK || isNaN(tempK)) {
    return '#CDDCFF'; // Default to A2-like color
  }
  
  const temp = parseInt(tempK, 10);
  if (isNaN(temp)) {
    return '#CDDCFF';
  }
  
  // Blackbody color stops for stellar temperatures
  // Temperature ranges: 2000K (coolest/red) to 50000K (hottest/blue)
  const colorStops = [
    { temp: 2000, hex: '#8B3A3A' },   // Dark red (coolest)
    { temp: 3000, hex: '#FF8C42' },    // Orange-red
    { temp: 4000, hex: '#FFB347' },    // Orange
    { temp: 5000, hex: '#FFE85C' },    // Yellow
    { temp: 6000, hex: '#FFF8DC' },     // Light yellow/white
    { temp: 7000, hex: '#E6F3FF' },    // Light blue-white
    { temp: 10000, hex: '#B3D9FF' },   // Light blue
    { temp: 20000, hex: '#8BB3FF' },   // Blue
    { temp: 30000, hex: '#6B9FFF' },   // Darker blue
    { temp: 50000, hex: '#4A7FFF' }    // Deep blue (hottest)
  ];
  
  // Clamp temperature to valid range
  const minTemp = colorStops[0].temp;
  const maxTemp = colorStops[colorStops.length - 1].temp;
  
  if (temp <= minTemp) {
    return colorStops[0].hex;
  }
  if (temp >= maxTemp) {
    return colorStops[colorStops.length - 1].hex;
  }
  
  // Find the two bounding color stops
  for (let i = 0; i < colorStops.length - 1; i++) {
    const lower = colorStops[i];
    const upper = colorStops[i + 1];
    
    if (temp >= lower.temp && temp <= upper.temp) {
      // Exact match
      if (temp === lower.temp) return lower.hex;
      if (temp === upper.temp) return upper.hex;
      
      // Interpolate between lower and upper
      const ratio = (temp - lower.temp) / (upper.temp - lower.temp);
      return interpolateColor(lower.hex, upper.hex, ratio);
    }
  }
  
  // Fallback
  return '#CDDCFF';
}

/**
 * Convert temperature (K) to closest spectral class code
 */
function temperatureToSpectralClass(tempK) {
  if (!tempK || isNaN(tempK)) return 'A2'; // Default
  
  const temp = parseInt(tempK, 10);
  let closest = SPECTRAL_TEMPERATURES[0];
  let minDiff = Math.abs(temp - closest.temp);
  
  for (const item of SPECTRAL_TEMPERATURES) {
    const diff = Math.abs(temp - item.temp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }
  
  return closest.code;
}

/**
 * Convert temperature (K) to hex color
 */
function temperatureToColor(tempK) {
  return temperatureToColorGradient(tempK);
}

/**
 * Convert spectral class code to temperature (K)
 */
function spectralClassToTemperature(code) {
  const item = SPECTRAL_TEMPERATURES.find(s => s.code === code);
  return item ? item.temp : 9500; // Default to A2 temperature
}

/**
 * Generate spectral type dropdown HTML
 */
function generateSpectralTypeDropdownHTML(selectedValue = '') {
  let html = '<option value="">Select...</option>';
  STAR_COLORS.forEach(color => {
    const selected = selectedValue === color.code ? 'selected' : '';
    html += `<option value="${color.code}" data-hex="${color.hex}" ${selected}>${color.label}</option>`;
  });
  return html;
}

/**
 * Update temperature color preview box
 */
function updateTemperatureColorPreview(tempInput, previewElement) {
  if (!tempInput || !previewElement) return;
  
  // Get temperature value - always read as string first, then parse
  // This ensures we get the value even if it's set programmatically
  const tempValue = tempInput.value ? tempInput.value.toString().trim() : '';
  if (!tempValue) {
    previewElement.style.background = '#444';
    return;
  }
  
  const temp = parseInt(tempValue, 10);
  
  // Validate temperature range
  if (isNaN(temp) || temp < 2000 || temp > 50000) {
    previewElement.style.background = '#444';
    return;
  }
  
  // Get color from gradient
  const hexColor = temperatureToColorGradient(temp);
  
  if (hexColor && hexColor !== '#444' && hexColor.length === 7) {
    previewElement.style.background = hexColor;
    previewElement.style.backgroundColor = hexColor;
  } else {
    console.warn(`Invalid color returned for temperature ${temp}:`, hexColor);
    previewElement.style.background = '#444';
    previewElement.style.backgroundColor = '#444';
  }
}

/**
 * Get hex color for spectral class code
 */
function getHexColorForSpectralClass(code) {
  const color = STAR_COLORS.find(c => c.code === code);
  return color ? color.hex : '#FFFFFF'; // Default to white
}

/**
 * Generate visualization data structure
 */
function generateVisualizationData(imageFile, imageWidth, imageHeight, stars, backImageData = null) {
  // Calculate distance scaling
  const distances = stars.map(s => s.distanceLy);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const frontOffset = Math.floor(minDistance / 10) * 10;
  const distanceRange = maxDistance - frontOffset;
  
  // Sort by distance (closest first)
  stars.sort((a, b) => a.distanceLy - b.distanceLy);
  
  // Calculate scaled distances
  // Volume dimensions should match original image dimensions (preserved during compression)
  const volumeWidth = imageWidth;
  const volumeHeight = imageHeight;
  const volumeDepth = imageWidth; // Depth matches width for good aspect ratio
  
  stars.forEach(star => {
    star.scaledDistance = (star.distanceLy - frontOffset) / distanceRange;
    star.scaledDistance = Math.max(0, Math.min(1, star.scaledDistance));
  });
  
  // Create image URL (compressed image with original dimensions)
  const imageUrl = imageFile instanceof Blob ? URL.createObjectURL(imageFile) : imageFile;
  
  const result = {
    image: {
      width: imageWidth,
      height: imageHeight,
      aspectRatio: imageWidth / imageHeight,
      filename: imageFile.name,
      url: imageUrl
    },
    volume: {
      width: volumeWidth,
      height: volumeHeight,
      depth: volumeDepth
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
      magnitude: star.magnitude, // Include magnitude if provided
      distanceLy: star.distanceLy,
      distancePc: star.distancePc,
      scaledDistance: star.scaledDistance,
      spectralClass: star.spectralType || 'A2', // Use selected spectral type or default to A2
      spectralColorHex: star.spectralColorHex || getHexColorForSpectralClass('A2') // Include hex color
    }))
  };
  
  // Add back image data if provided
  if (backImageData) {
    result.backImage = {
      width: backImageData.width,
      height: backImageData.height,
      filename: backImageData.file.name,
      url: backImageData.url
    };
  }
  
  return result;
}

