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
  
  // Check center coordinates
  const raHours = document.getElementById('image-center-ra-hours').value;
  const raMinutes = document.getElementById('image-center-ra-minutes').value;
  const raSeconds = document.getElementById('image-center-ra-seconds').value;
  const decDegrees = document.getElementById('image-center-dec-degrees').value;
  const decMinutes = document.getElementById('image-center-dec-minutes').value;
  const decSeconds = document.getElementById('image-center-dec-seconds').value;
  
  const coordsComplete = raHours && raMinutes && raSeconds && 
                         decDegrees && decMinutes && decSeconds;
  updateProgress('step-center-coords', coordsComplete);
  
  // Check primary star
  const starsContainer = document.getElementById('stars-container');
  const starEntries = starsContainer.querySelectorAll('.star-entry');
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
  const generateTopBtn = document.getElementById('generate-visualization-top');
  const allComplete = imageLoaded && coordsComplete && primaryStarComplete && starsComplete;
  
  if (generateBtn) {
    generateBtn.disabled = !allComplete;
    generateBtn.classList.toggle('disabled', !allComplete);
  }
  
  if (generateTopBtn) {
    generateTopBtn.disabled = !allComplete;
    generateTopBtn.classList.toggle('disabled', !allComplete);
  }
}

/**
 * Update progress step
 */
function updateProgress(stepId, completed) {
  const step = document.getElementById(stepId);
  if (!step) return;
  
  // Only update if state is actually changing
  const isCurrentlyCompleted = step.classList.contains('completed');
  
  if (completed && !isCurrentlyCompleted) {
    step.classList.add('completed');
    step.classList.remove('active');
  } else if (!completed && isCurrentlyCompleted) {
    step.classList.remove('completed');
    // Check if this is the first incomplete step
    const steps = ['step-load-image', 'step-center-coords', 'step-primary-star', 'step-star-selections'];
    const currentIndex = steps.indexOf(stepId);
    const allPreviousComplete = steps.slice(0, currentIndex).every(id => {
      const s = document.getElementById(id);
      return s && s.classList.contains('completed');
    });
    
    if (allPreviousComplete) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  }
}

/**
 * Initialize data entry form
 */
export function initDataEntry() {
  const form = document.getElementById('star-data-form');
  const addStarBtn = document.getElementById('add-star-btn');
  const removeStarBtn = document.getElementById('remove-star-btn');
  const loadSampleBtn = document.getElementById('load-sample-data');
  const imageUpload = document.getElementById('image-upload');
  const backImageUpload = document.getElementById('back-image-upload');
  
  starEntryCount = 1; // Start with primary star
  
  // Initialize spectral type dropdowns in existing HTML
  const spectralTypeDropdowns = document.querySelectorAll('.spectral-type');
  spectralTypeDropdowns.forEach(dropdown => {
    dropdown.innerHTML = generateSpectralTypeDropdownHTML();
    
    // Set up color preview update
    const wrapper = dropdown.closest('.spectral-type-wrapper');
    if (wrapper) {
      const preview = wrapper.querySelector('.spectral-color-preview');
      updateSpectralColorPreview(dropdown, preview);
      
      dropdown.addEventListener('change', () => {
        updateSpectralColorPreview(dropdown, preview);
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
  } else {
    // Pre-load sample data by default (with delay to let DOM settle)
    setTimeout(() => {
      loadSampleData();
    }, 100);
  }
  
  addStarBtn.addEventListener('click', addStarEntry);
  removeStarBtn.addEventListener('click', removeStarEntry);
  loadSampleBtn.addEventListener('click', loadSampleData);
  
  form.addEventListener('submit', handleFormSubmit);
  
  // Set up top Generate button to also submit form
  const generateTopBtn = document.getElementById('generate-visualization-top');
  if (generateTopBtn) {
    generateTopBtn.addEventListener('click', () => {
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
      <label>Spectral Type:</label>
      <div class="spectral-type-wrapper">
        <div class="spectral-color-preview" style="background: #444;"></div>
        <select class="spectral-type">
          ${generateSpectralTypeDropdownHTML()}
        </select>
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
  
  // Set up color preview for the new dropdown
  const newDropdown = entry.querySelector('.spectral-type');
  const wrapper = entry.querySelector('.spectral-type-wrapper');
  if (wrapper && newDropdown) {
    const preview = wrapper.querySelector('.spectral-color-preview');
    updateSpectralColorPreview(newDropdown, preview);
    
    newDropdown.addEventListener('change', () => {
      updateSpectralColorPreview(newDropdown, preview);
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
        <label>Spectral Type:</label>
        <div class="spectral-type-wrapper">
          <div class="spectral-color-preview" style="background: #444;"></div>
          <select class="spectral-type">
            ${generateSpectralTypeDropdownHTML()}
          </select>
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
    
    // Set up color preview for the new dropdown
    const newDropdown = entry.querySelector('.spectral-type');
    const wrapper = entry.querySelector('.spectral-type-wrapper');
    if (wrapper && newDropdown) {
      const preview = wrapper.querySelector('.spectral-color-preview');
      updateSpectralColorPreview(newDropdown, preview);
      
      newDropdown.addEventListener('change', () => {
        updateSpectralColorPreview(newDropdown, preview);
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
  const submitTopBtn = document.getElementById('generate-visualization-top');
  
  if (!submitBtn) {
    console.error('Generate button not found');
    return;
  }
  
  const originalBtnText = submitBtn.textContent;
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  if (submitTopBtn) {
    submitTopBtn.disabled = true;
    submitTopBtn.textContent = 'Processing...';
  }
  
  try {
    const imageFile = document.getElementById('image-upload').files[0];
    const backImageFile = document.getElementById('back-image-upload')?.files[0] || null;
    
    // Parse RA from HMS format
    const raHours = parseFloat(document.getElementById('image-center-ra-hours').value) || 0;
    const raMinutes = parseFloat(document.getElementById('image-center-ra-minutes').value) || 0;
    const raSeconds = parseFloat(document.getElementById('image-center-ra-seconds').value) || 0;
    const centerRA = (raHours + raMinutes / 60 + raSeconds / 3600) * 15; // Convert to degrees
    
    // Parse Dec from DMS format
    const decSign = parseFloat(document.getElementById('image-center-dec-sign').value) || 1;
    const decDegrees = parseFloat(document.getElementById('image-center-dec-degrees').value) || 0;
    const decMinutes = parseFloat(document.getElementById('image-center-dec-minutes').value) || 0;
    const decSeconds = parseFloat(document.getElementById('image-center-dec-seconds').value) || 0;
    const centerDec = decSign * (decDegrees + decMinutes / 60 + decSeconds / 3600);
    
    if (!imageFile) {
      alert('Please upload an image file');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      if (submitTopBtn) {
        submitTopBtn.disabled = false;
        submitTopBtn.textContent = 'Generate 3D Model';
      }
      return;
    }
    
    if (isNaN(centerRA) || isNaN(centerDec) || centerRA < 0 || centerRA > 360 || centerDec < -90 || centerDec > 90) {
      alert('Please enter valid center coordinates in HMS/DMS format');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      if (submitTopBtn) {
        submitTopBtn.disabled = false;
        submitTopBtn.textContent = 'Generate 3D Model';
      }
      return;
    }
    
    // Collect star data
    const starEntries = form.querySelectorAll('.star-entry');
    const stars = [];
    
    for (const entry of starEntries) {
      const label = entry.querySelector('.star-label').value.trim();
      const hip = parseInt(entry.querySelector('.hip-number').value, 10);
      const distancePc = parseFloat(entry.querySelector('.distance-pc').value);
      const magnitudeInput = entry.querySelector('.magnitude');
      const magnitude = magnitudeInput && magnitudeInput.value ? parseFloat(magnitudeInput.value) : null;
      const spectralTypeSelect = entry.querySelector('.spectral-type');
      const spectralType = spectralTypeSelect && spectralTypeSelect.value ? spectralTypeSelect.value : null;
      const selectedOption = spectralTypeSelect ? spectralTypeSelect.options[spectralTypeSelect.selectedIndex] : null;
      const spectralColorHex = selectedOption && selectedOption.dataset.hex ? selectedOption.dataset.hex : null;
      
      if (isNaN(hip) || isNaN(distancePc) || !label) {
        continue;
      }
      
      stars.push({
        label,
        hip,
        distancePc,
        distanceLy: distancePc * 3.26156,
        magnitude,
        spectralType,
        spectralColorHex
      });
    }
    
    if (stars.length === 0) {
      alert('Please enter at least one valid star');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      if (submitTopBtn) {
        submitTopBtn.disabled = false;
        submitTopBtn.textContent = 'Generate 3D Model';
      }
      return;
    }
    
    submitBtn.textContent = 'Looking up star coordinates...';
    if (submitTopBtn) submitTopBtn.textContent = 'Looking up star coordinates...';
    
    // Lookup RA/Dec for all HIP numbers
    const hipNumbers = stars.map(s => s.hip);
    const hipCoords = await batchLookupHIP(hipNumbers);
    
    // Check which stars were found
    const notFound = stars.filter(s => !hipCoords.has(s.hip));
    if (notFound.length > 0) {
      const notFoundList = notFound.map(s => `${s.label} (HIP ${s.hip})`).join(', ');
      const proceed = confirm(`Warning: Could not find coordinates for: ${notFoundList}\n\nContinue anyway?`);
      if (!proceed) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        if (submitTopBtn) {
          submitTopBtn.disabled = false;
          submitTopBtn.textContent = 'Generate 3D Model';
        }
        return;
      }
    }
    
    submitBtn.textContent = 'Loading image...';
    if (submitTopBtn) submitTopBtn.textContent = 'Loading image...';
    
    // Resize images for better performance (max 2048px)
    console.log('Resizing images for optimal performance...');
    const resizedImage = await resizeImage(imageFile, 2048, 2048);
    const imageWidth = resizedImage.width;
    const imageHeight = resizedImage.height;
    
    // Create object URL for resized image
    const resizedImageUrl = URL.createObjectURL(resizedImage.blob);
    
    // Resize back image if provided
    let backImageData = null;
    if (backImageFile) {
      const resizedBackImage = await resizeImage(backImageFile, 2048, 2048);
      const backImageUrl = URL.createObjectURL(resizedBackImage.blob);
      backImageData = {
        file: resizedBackImage.blob,
        width: resizedBackImage.width,
        height: resizedBackImage.height,
        url: backImageUrl
      };
      console.log(`Back image resized: ${resizedBackImage.originalWidth}x${resizedBackImage.originalHeight} -> ${resizedBackImage.width}x${resizedBackImage.height}`);
    }
    
    console.log(`Front image resized: ${resizedImage.originalWidth}x${resizedImage.originalHeight} -> ${imageWidth}x${imageHeight}`);
    
    // Calculate scale using hardcoded field of view (4° x 2.5°)
    // FOV width: 3d 54' 14.7" ≈ 3.904° ≈ 4°
    // FOV height: 2d 36' 9.8" ≈ 2.603° ≈ 2.5°
    const fovWidthDeg = 3.904; // Actual: 3d 54' 14.7"
    const fovHeightDeg = 2.603; // Actual: 2d 36' 9.8"
    const scaleX = calculateScale(fovWidthDeg, imageWidth);
    const scaleY = calculateScale(fovHeightDeg, imageHeight);
    // Use average scale for circular field approximation
    const scale = (scaleX + scaleY) / 2;
    
    submitBtn.textContent = 'Converting coordinates...';
    if (submitTopBtn) submitTopBtn.textContent = 'Converting coordinates...';
    
    // Convert RA/Dec to pixel coordinates
    const starsWithCoords = [];
    const starsOutsideBounds = [];
    const useCalibration = hasCalibrations();
    
    for (const star of stars) {
      // Check for manual pixel coordinate override first
      const calibratedPixel = getCalibratedPixel(star.label);
      let pixel = null;
      
      if (calibratedPixel) {
        // Use manual calibration
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
        
        pixel = raDecToPixel(
          raDeg,
          coords.dec,
          centerRA,
          centerDec,
          imageWidth,
          imageHeight,
          scale
        );
        
        if (pixel) {
          console.log(`Calculated pixel for ${star.label} (HIP ${star.hip}):`, pixel, 'from RA/Dec:', coords.ra, coords.dec);
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
      if (submitTopBtn) {
        submitTopBtn.disabled = false;
        submitTopBtn.textContent = 'Generate 3D Model';
      }
      return;
    }
    
    if (starsOutsideBounds.length > 0) {
      console.warn('Stars outside image bounds:', starsOutsideBounds);
    }
  
    submitBtn.textContent = 'Generating visualization...';
    if (submitTopBtn) submitTopBtn.textContent = 'Generating visualization...';
    
    // Generate visualization data with resized image
    const visualizationData = generateVisualizationData(
      resizedImage.blob,
      imageWidth,
      imageHeight,
      starsWithCoords,
      backImageData
    );
    
    // Update image data with resized image URL and original dimensions
    visualizationData.image.url = resizedImageUrl;
    visualizationData.image.width = imageWidth; // Resized width for texture
    visualizationData.image.height = imageHeight; // Resized height for texture
    visualizationData.image.originalWidth = resizedImage.originalWidth; // Original width for pixel coordinates
    visualizationData.image.originalHeight = resizedImage.originalHeight; // Original height for pixel coordinates
    
    // Scale pixel coordinates proportionally if image was resized
    if (resizedImage.originalWidth !== imageWidth || resizedImage.originalHeight !== imageHeight) {
      const scaleX = imageWidth / resizedImage.originalWidth;
      const scaleY = imageHeight / resizedImage.originalHeight;
      visualizationData.stars.forEach(star => {
        star.pixelX = star.pixelX * scaleX;
        star.pixelY = star.pixelY * scaleY;
      });
      console.log(`Scaled pixel coordinates by ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
    }
    
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
    
    if (submitTopBtn) {
      submitTopBtn.disabled = false;
      submitTopBtn.textContent = 'Generate 3D Model';
    }
  } catch (error) {
    console.error('Error generating visualization:', error);
    alert('An error occurred: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    
    if (submitTopBtn) {
      submitTopBtn.disabled = false;
      submitTopBtn.textContent = 'Generate 3D Model';
    }
  }
}

/**
 * Resize image to optimize performance
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width (default 2048)
 * @param {number} maxHeight - Maximum height (default 2048)
 * @returns {Promise<{blob: Blob, width: number, height: number, originalWidth: number, originalHeight: number}>}
 */
function resizeImage(file, maxWidth = 2048, maxHeight = 2048) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Use high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              blob,
              width,
              height,
              originalWidth,
              originalHeight
            });
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, file.type || 'image/png', 0.92); // High quality (92%)
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
 * Update spectral color preview box
 */
function updateSpectralColorPreview(selectElement, previewElement) {
  if (!selectElement || !previewElement) return;
  
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const hexColor = selectedOption && selectedOption.dataset.hex ? selectedOption.dataset.hex : '#444';
  previewElement.style.background = hexColor;
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
  // Volume dimensions should match image dimensions, not screen dimensions
  const volumeWidth = imageWidth;
  const volumeHeight = imageHeight;
  const volumeDepth = imageWidth; // Depth matches width for good aspect ratio
  
  stars.forEach(star => {
    star.scaledDistance = (star.distanceLy - frontOffset) / distanceRange;
    star.scaledDistance = Math.max(0, Math.min(1, star.scaledDistance));
  });
  
  // Create image URL (will be overwritten if resized)
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

