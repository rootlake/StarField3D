/**
 * Main Three.js scene setup and rendering loop
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWireframeVolume, createImagePlane as createImagePlaneTexture, updateVolumeDepth } from './volume.js';
import { createStars } from './stars.js';
import { initDataEntry } from './data-entry.js';
import { formatDistance } from './utils.js';

let scene, camera, renderer, controls;
let volumeGroup, imagePlane, backImagePlane, stars;
let distanceLabels = []; // Store distance label sprites

// Configuration
let starData = null;
let distanceUnit = 'ly';
let showLines = true;
let showStarLabels = true;
let showInfoLabels = true;
let labelSize = 1.0; // Label size multiplier
let starLabelSize = 1.0; // Star label size multiplier (independent)
let starLabelColor = '#ffffff'; // Star label color
let showWireframe = true;
let showDistanceLabels = true;
let showStarSpheres = true;

/**
 * Initialize Three.js scene
 */
function init() {
  // Initialize data entry form
  initDataEntry();
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  // Create camera
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100000);
  // Camera will be positioned when visualization is created
  
  // Create renderer
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Slightly reduced from 0.5
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Slightly reduced from 0.8
  directionalLight.position.set(1000, 1000, 1000);
  scene.add(directionalLight);
  
  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 100;
  controls.maxDistance = 10000;
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Setup UI controls
  setupUIControls();
  
  // Expose initialization function for data entry
  window.initVisualization = initVisualization;
  
  // Try to load star data if available
  loadStarData();
}

/**
 * Initialize visualization with provided data
 * Called from data entry form
 */
async function initVisualization(data) {
  starData = data;
  
  // Clear existing scene elements
  if (volumeGroup) scene.remove(volumeGroup);
  if (imagePlane) scene.remove(imagePlane);
  if (backImagePlane) scene.remove(backImagePlane);
  if (stars) {
    stars.forEach(star => {
      star.dispose();
      scene.remove(star.group);
    });
  }
  
  // Enable 3D Model tab and switch to it
  const tab3DModel = document.getElementById('tab-3d-model');
  const dataEntryPanel = document.getElementById('data-entry-panel');
  
  if (tab3DModel) {
    tab3DModel.disabled = false;
    // Switch to 3D Model tab by simulating a click
    tab3DModel.click();
  }
  
  // Hide data entry panel overlay
  if (dataEntryPanel) {
    dataEntryPanel.classList.remove('active');
  }
  
  // Also ensure the tab content is shown
  const container = document.getElementById('container');
  if (container) {
    container.style.display = 'block';
    container.classList.add('active');
  }
  
  // Ensure data entry tab is deactivated
  const tabDataEntry = document.getElementById('tab-data-entry');
  if (tabDataEntry) {
    tabDataEntry.classList.remove('active');
  }
  
  // Create volume
  createVolume();
  
  // Create image plane (await since it's async)
  await createImagePlane();
  
  // Create stars (this will also position the camera)
  createStarVisualizations();
  
  // Start animation loop if not already running
  if (!window.animationRunning) {
    window.animationRunning = true;
    animate();
  }
}

/**
 * Load star data from JSON file
 */
async function loadStarData() {
  try {
    const response = await fetch('assets/stars.json');
    if (!response.ok) {
      // No pre-loaded data, wait for user input
      console.log('No pre-loaded star data found. Waiting for user input...');
      return;
    }
    
    starData = await response.json();
    
    console.log('Loaded star data:', starData);
    
    // Create volume
    createVolume();
    
    // Create image plane
    await createImagePlane();
    
    // Create stars
    createStarVisualizations();
    
    // Hide data entry panel
    document.getElementById('data-entry-panel').classList.add('hidden');
    
    // Start animation loop
    animate();
  } catch (error) {
    console.log('No pre-loaded star data. Waiting for user input via form...');
    // This is expected when no data is pre-loaded
  }
}

/**
 * Create wireframe volume
 */
function createVolume() {
  if (volumeGroup) {
    scene.remove(volumeGroup);
  }
  
  volumeGroup = new THREE.Group();
  // Scale pixel dimensions to reasonable Three.js units (0.1 = 4000px becomes 400 units)
  const scale = 0.1;
  const { width: imgWidth, height: imgHeight } = starData.image;
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  const depth = width; // Depth matches width
  
  const wireframe = createWireframeVolume(width, height, depth);
  volumeGroup.add(wireframe);
  
  scene.add(volumeGroup);
  
  // Distance labels will be added after visualization is created
}

/**
 * Create image plane
 */
async function createImagePlane() {
  if (imagePlane) {
    scene.remove(imagePlane);
  }
  
  const { width: imgWidth, height: imgHeight } = starData.image;
  // Scale dimensions to match volume
  const scale = 0.1;
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  
  // Use URL if provided (from file upload), otherwise use filename
  const imageUrl = starData.image.url || `assets/${starData.image.filename}`;
  
  imagePlane = await createImagePlaneTexture(imageUrl, width, height);
  
  // Position image plane at front of volume (z = depth/2)
  const depth = width; // Depth matches width
  const frontZ = depth / 2;
  imagePlane.position.z = frontZ;
  
  scene.add(imagePlane);
  
  // Create back image plane if provided
  if (starData.backImage) {
    if (backImagePlane) {
      scene.remove(backImagePlane);
    }
    
    const backWidth = starData.backImage.width * scale;
    const backHeight = starData.backImage.height * scale;
    const backImageUrl = starData.backImage.url || `assets/${starData.backImage.filename}`;
    
    backImagePlane = await createImagePlaneTexture(backImageUrl, backWidth, backHeight);
    
    // Position back image plane slightly behind front image to avoid Z-fighting
    // Increase gap size to prevent visual glitches
    const gapSize = Math.max(width, height) * 0.002; // Larger gap - 0.2% of max dimension
    const backZ = frontZ - gapSize;
    backImagePlane.position.z = backZ;
    
    // Rotate 180 degrees around Y axis so it faces backward (back-to-back with front)
    backImagePlane.rotation.y = Math.PI;
    
    // Initially hide back image (will show when camera views from behind)
    backImagePlane.visible = false;
    
    scene.add(backImagePlane);
  }
}

/**
 * Create star visualizations
 */
function createStarVisualizations() {
  // Remove existing stars
  if (stars) {
    stars.forEach(star => {
      star.dispose();
      scene.remove(star.group);
    });
  }
  
  // Scale volume dimensions for 3D space
  const scale = 0.1;
  const { width: imgWidth, height: imgHeight } = starData.image;
  // Pixel coordinates are already scaled to match resized image dimensions
  const volWidth = imgWidth * scale;
  const volHeight = imgHeight * scale;
  const volDepth = volWidth;
  
  stars = createStars(
    starData.stars,
    {
      width: volWidth,
      height: volHeight,
      depth: volDepth
    },
    {
      width: imgWidth,  // Resized pixel dimensions (coordinates already scaled)
      height: imgHeight
    },
    labelSize,
    starLabelSize,
    starLabelColor
  );
  
  // Add all stars to scene (visibility controlled later)
  stars.forEach(star => {
    scene.add(star.group);
  });
  
  // Update visibility based on current settings
  updateStarVisibility();
  updateStarLines();
  updateStarLabels();
  stars.forEach(star => {
    star.setStarLabelVisible(showStarLabels);
    star.setInfoLabelVisible(showInfoLabels);
    star.setLineVisible(showLines);
    star.setSphereVisible(showStarSpheres);
  });
  
  // Set wireframe visibility
  if (volumeGroup) volumeGroup.visible = showWireframe;
  
  // Set distance labels visibility
  distanceLabels.forEach(label => label.visible = showDistanceLabels);
  
  // Add distance labels to wireframe box
  addDistanceLabels();
  
  // Position camera to fit volume nicely, starting with front view
  positionCameraForVolume();
}

/**
 * Position camera to fit volume nicely, starting with front view
 */
function positionCameraForVolume() {
  const scale = 0.1;
  const { width: imgWidth, height: imgHeight } = starData.image;
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  const depth = width;
  
  // Calculate distance to fit volume on screen
  const maxDimension = Math.max(width, height, depth);
  const fov = camera.fov * Math.PI / 180;
  const distance = maxDimension / (2 * Math.tan(fov / 2)) * 1.5; // 50% padding
  
  // Position camera looking at front face (z = depth/2)
  camera.position.set(0, 0, depth / 2 + distance);
  camera.lookAt(0, 0, depth / 2);
  
  // Update controls target
  controls.target.set(0, 0, depth / 2);
  controls.update();
}

/**
 * Setup UI controls
 */
function setupUIControls() {
  // Distance unit selector
  const distanceUnitSelect = document.getElementById('distance-unit');
  if (distanceUnitSelect) {
    distanceUnitSelect.addEventListener('change', (e) => {
      distanceUnit = e.target.value;
      if (stars) {
        stars.forEach(star => star.updateDistanceUnit(distanceUnit));
      }
      // Update wireframe labels too
      updateDistanceLabels();
    });
  }
  
  // Label size slider (for info labels)
  const labelSizeSlider = document.getElementById('label-size');
  const labelSizeValue = document.getElementById('label-size-value');
  
  if (labelSizeSlider) {
    labelSizeSlider.addEventListener('input', (e) => {
      labelSize = parseFloat(e.target.value);
      if (labelSizeValue) {
        labelSizeValue.textContent = labelSize.toFixed(1);
      }
      if (stars) {
        stars.forEach(star => {
          star.updateLabelSize(labelSize);
        });
      }
    });
  }
  
  // Star label size slider (independent)
  const starLabelSizeSlider = document.getElementById('star-label-size');
  const starLabelSizeValue = document.getElementById('star-label-size-value');
  
  if (starLabelSizeSlider) {
    starLabelSizeSlider.addEventListener('input', (e) => {
      starLabelSize = parseFloat(e.target.value);
      if (starLabelSizeValue) {
        starLabelSizeValue.textContent = starLabelSize.toFixed(1);
      }
      if (stars) {
        stars.forEach(star => star.updateStarLabelSize(starLabelSize));
      }
    });
  }
  
  // Star label color picker
  const starLabelColorPicker = document.getElementById('star-label-color');
  if (starLabelColorPicker) {
    starLabelColorPicker.addEventListener('input', (e) => {
      starLabelColor = e.target.value;
      if (stars) {
        stars.forEach(star => star.setStarLabelColor(starLabelColor));
      }
    });
  }
  
  // Visibility toggles
  const toggleWireframe = document.getElementById('toggle-wireframe');
  if (toggleWireframe) {
    toggleWireframe.addEventListener('change', (e) => {
      showWireframe = e.target.checked;
      if (volumeGroup) volumeGroup.visible = showWireframe;
    });
  }
  
  const toggleDistanceLabels = document.getElementById('toggle-distance-labels');
  if (toggleDistanceLabels) {
    toggleDistanceLabels.addEventListener('change', (e) => {
      showDistanceLabels = e.target.checked;
      distanceLabels.forEach(label => label.visible = showDistanceLabels);
    });
  }
  
  const toggleStarLabels = document.getElementById('toggle-star-labels');
  if (toggleStarLabels) {
    toggleStarLabels.addEventListener('change', (e) => {
      showStarLabels = e.target.checked;
      if (stars) {
        stars.forEach(star => star.setStarLabelVisible(showStarLabels));
      }
    });
  }
  
  const toggleInfoLabels = document.getElementById('toggle-info-labels');
  if (toggleInfoLabels) {
    toggleInfoLabels.addEventListener('change', (e) => {
      showInfoLabels = e.target.checked;
      if (stars) {
        stars.forEach(star => star.setInfoLabelVisible(showInfoLabels));
      }
    });
  }
  
  const toggleStarLines = document.getElementById('toggle-star-lines');
  if (toggleStarLines) {
    toggleStarLines.addEventListener('change', (e) => {
      showLines = e.target.checked;
      if (stars) {
        stars.forEach(star => star.setLineVisible(showLines));
      }
    });
  }
  
  const toggleStarSpheres = document.getElementById('toggle-star-spheres');
  if (toggleStarSpheres) {
    toggleStarSpheres.addEventListener('change', (e) => {
      showStarSpheres = e.target.checked;
      if (stars) {
        stars.forEach(star => star.setSphereVisible(showStarSpheres));
      }
    });
  }
}

/**
 * Update star visibility based on count
 */
function updateStarVisibility() {
  if (!stars) return;
  
  // Show all stars
  stars.forEach(star => {
    star.setVisible(true);
  });
}

/**
 * Update line visibility
 */
function updateStarLines() {
  if (!stars) return;
  
  stars.forEach(star => {
    star.setLineVisible(showLines);
  });
}

/**
 * Update label visibility
 */
function updateStarLabels() {
  if (!stars) return;
  
  stars.forEach(star => {
    star.setStarLabelVisible(showStarLabels);
    star.setInfoLabelVisible(showInfoLabels);
  });
}

/**
 * Add distance labels along top edge of wireframe box
 */
function addDistanceLabels() {
  // Remove existing labels
  distanceLabels.forEach(label => {
    scene.remove(label);
    label.material.map.dispose();
    label.material.dispose();
  });
  distanceLabels = [];
  
  if (!starData || !starData.scaling) return;
  
  const { frontOffsetLy, maxDistanceLy, distanceRangeLy } = starData.scaling;
  const scale = 0.1;
  const { width: imgWidth, height: imgHeight } = starData.image;
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  const depth = width;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Calculate distances in both units
  const frontOffsetPc = frontOffsetLy / 3.26156;
  const maxDistancePc = maxDistanceLy / 3.26156;
  const spanLy = distanceRangeLy;
  const spanPc = spanLy / 3.26156;
  
  // Position labels:
  // Front corner: top-left corner of front face (z = depth/2)
  const frontCornerPos = new THREE.Vector3(-halfWidth - 10, halfHeight + 5, depth / 2);
  // Back corner: top-left corner of back face (z = -depth/2)
  const backCornerPos = new THREE.Vector3(-halfWidth - 10, halfHeight + 5, -depth / 2);
  // Span label: inside along top edge, centered
  const spanPos = new THREE.Vector3(0, halfHeight + 5, 0);
  
  // Format distances using utility function
  const formatDistanceValue = (dist, unit) => {
    if (unit === 'pc') {
      return dist.toFixed(1) + ' pc';
    } else {
      return dist.toFixed(1) + ' ly';
    }
  };
  
  // Create label sprite (floating text, no background)
  const createLabelSprite = (textLines, position, scaleFactor = 1.0) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = textLines.length * 32 + 10;
    
    // No background - transparent
    // context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    // context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#ffffff';
    context.font = `bold ${18 * scaleFactor}px Arial`; // Scale font size
    context.textAlign = 'center';
    
    textLines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, 20 + index * 28);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(50 * scaleFactor, (textLines.length * 8 + 2) * scaleFactor, 1); // Scale sprite size
    
    return sprite;
  };
  
  // Front corner label (closest distance) - 50% smaller
  const frontLabelLines = [
    formatDistanceValue(frontOffsetLy, 'ly'),
    formatDistanceValue(frontOffsetPc, 'pc')
  ];
  const frontLabel = createLabelSprite(frontLabelLines, frontCornerPos, 0.5);
  scene.add(frontLabel);
  distanceLabels.push(frontLabel);
  
  // Back corner label (furthest distance) - 50% smaller
  const backLabelLines = [
    formatDistanceValue(maxDistanceLy, 'ly'),
    formatDistanceValue(maxDistancePc, 'pc')
  ];
  const backLabel = createLabelSprite(backLabelLines, backCornerPos, 0.5);
  scene.add(backLabel);
  distanceLabels.push(backLabel);
  
  // Span label (along right top edge, between front and back corners) - 50% smaller
  const spanLabelLines = [
    `${formatDistanceValue(spanLy, 'ly')} (${formatDistanceValue(spanPc, 'pc')})`
  ];
  // Position on right top edge: x = halfWidth (right), y = halfHeight (top), z = 0 (center between front and back)
  const rightTopEdgePos = new THREE.Vector3(halfWidth + 10, halfHeight + 5, 0);
  const spanLabel = createLabelSprite(spanLabelLines, rightTopEdgePos, 0.5);
  scene.add(spanLabel);
  distanceLabels.push(spanLabel);
}

/**
 * Update distance labels when unit changes
 */
function updateDistanceLabels() {
  if (distanceLabels.length === 0) return;
  
  const { frontOffsetLy, maxDistanceLy, distanceRangeLy } = starData.scaling;
  const scale = 0.1;
  const { width: imgWidth, height: imgHeight } = starData.image;
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  const depth = width;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Calculate distances in both units
  const frontOffsetPc = frontOffsetLy / 3.26156;
  const maxDistancePc = maxDistanceLy / 3.26156;
  const spanLy = distanceRangeLy;
  const spanPc = spanLy / 3.26156;
  
  const formatDistanceValue = (dist, unit) => {
    if (unit === 'pc') {
      return dist.toFixed(1) + ' pc';
    } else {
      return dist.toFixed(1) + ' ly';
    }
  };
  
  // Update front corner label (index 0) - 50% smaller
  if (distanceLabels[0]) {
    distanceLabels[0].material.map.dispose();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // No background - transparent
    context.fillStyle = '#ffffff';
    context.font = 'bold 9px Arial'; // 50% of 18px
    context.textAlign = 'center';
    
    const frontLabelLines = [
      formatDistanceValue(frontOffsetLy, distanceUnit),
      formatDistanceValue(frontOffsetPc, distanceUnit === 'ly' ? 'pc' : 'ly')
    ];
    
    frontLabelLines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, 20 + index * 28);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    distanceLabels[0].material.map = texture;
    distanceLabels[0].scale.set(25, 32, 1); // 50% of original scale
  }
  
  // Update back corner label (index 1) - 50% smaller
  if (distanceLabels[1]) {
    distanceLabels[1].material.map.dispose();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // No background - transparent
    context.fillStyle = '#ffffff';
    context.font = 'bold 9px Arial'; // 50% of 18px
    context.textAlign = 'center';
    
    const backLabelLines = [
      formatDistanceValue(maxDistanceLy, distanceUnit),
      formatDistanceValue(maxDistancePc, distanceUnit === 'ly' ? 'pc' : 'ly')
    ];
    
    backLabelLines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, 20 + index * 28);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    distanceLabels[1].material.map = texture;
    distanceLabels[1].scale.set(25, 32, 1); // 50% of original scale
  }
  
  // Update span label (index 2) - 50% smaller, moved to right top edge
  if (distanceLabels[2]) {
    distanceLabels[2].material.map.dispose();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 40;
    
    // No background - transparent
    context.fillStyle = '#ffffff';
    context.font = 'bold 9px Arial'; // 50% of 18px
    context.textAlign = 'center';
    
    const spanLabelText = `${formatDistanceValue(spanLy, distanceUnit)} (${formatDistanceValue(spanPc, distanceUnit === 'ly' ? 'pc' : 'ly')})`;
    context.fillText(spanLabelText, canvas.width / 2, canvas.height / 2 + 7);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    distanceLabels[2].material.map = texture;
    distanceLabels[2].scale.set(25, 20, 1); // 50% of original scale
    
    // Update position to right top edge
    distanceLabels[2].position.set(halfWidth + 10, halfHeight + 5, 0);
  }
}

/**
 * Animation loop
 */
function animate() {
  requestAnimationFrame(animate);
  
  // Update back image visibility based on camera position
  if (backImagePlane && starData) {
    const scale = 0.1;
    const { width: imgWidth, height: imgHeight } = starData.image;
    const depth = imgWidth * scale;
    const frontZ = depth / 2;
    
    // Show back image when camera is behind the front image plane
    // Use a small threshold to prevent flickering
    backImagePlane.visible = camera.position.z < frontZ - 10;
  }
  
  controls.update();
  renderer.render(scene, camera);
  
  window.animationRunning = true;
}

/**
 * Handle window resize
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

