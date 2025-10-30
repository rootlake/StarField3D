/**
 * Main Three.js scene setup and rendering loop
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWireframeVolume, createImagePlane as createImagePlaneTexture, updateVolumeDepth } from './volume.js';
import { createStars } from './stars.js';
import { initDataEntry } from './data-entry.js';

let scene, camera, renderer, controls;
let volumeGroup, imagePlane, stars;

// Configuration
let starData = null;
let visibleStarCount = 20;
let distanceUnit = 'ly';
let showLines = true;
let showLabels = true;
let depthScale = 1.0;

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
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);
  camera.position.set(2000, 1500, 3000);
  
  // Create renderer
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1000, 1000, 1000);
  scene.add(directionalLight);
  
  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 500;
  controls.maxDistance = 5000;
  
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
function initVisualization(data) {
  starData = data;
  
  // Clear existing scene elements
  if (volumeGroup) scene.remove(volumeGroup);
  if (imagePlane) scene.remove(imagePlane);
  if (stars) {
    stars.forEach(star => {
      star.dispose();
      scene.remove(star.group);
    });
  }
  
  // Create volume
  createVolume();
  
  // Create image plane
  createImagePlane();
  
  // Create stars
  createStarVisualizations();
  
  // Update UI
  updateStats();
  
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
    
    // Update UI
    updateStats();
    
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
  const { width, height, depth } = starData.volume;
  
  const wireframe = createWireframeVolume(width, height, depth);
  volumeGroup.add(wireframe);
  
  scene.add(volumeGroup);
}

/**
 * Create image plane
 */
async function createImagePlane() {
  if (imagePlane) {
    scene.remove(imagePlane);
  }
  
  const { width, height } = starData.image;
  // Use URL if provided (from file upload), otherwise use filename
  const imageUrl = starData.image.url || `assets/${starData.image.filename}`;
  
  imagePlane = await createImagePlaneTexture(imageUrl, width, height);
  
  // Position image plane at front of volume (z = depth/2)
  const frontZ = starData.volume.depth / 2;
  imagePlane.position.z = frontZ;
  
  scene.add(imagePlane);
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
  
  stars = createStars(
    starData.stars,
    starData.volume,
    starData.image
  );
  
  // Add all stars to scene (visibility controlled later)
  stars.forEach(star => {
    scene.add(star.group);
  });
  
  // Update visibility based on current settings
  updateStarVisibility();
  updateStarLines();
  updateStarLabels();
}

/**
 * Setup UI controls
 */
function setupUIControls() {
  // Star count slider
  const starCountSlider = document.getElementById('star-count');
  const starCountValue = document.getElementById('star-count-value');
  
  starCountSlider.addEventListener('input', (e) => {
    visibleStarCount = parseInt(e.target.value);
    starCountValue.textContent = visibleStarCount;
    updateStarVisibility();
    updateStats();
  });
  
  // Distance unit selector
  const distanceUnitSelect = document.getElementById('distance-unit');
  distanceUnitSelect.addEventListener('change', (e) => {
    distanceUnit = e.target.value;
    stars.forEach(star => star.updateDistanceUnit(distanceUnit));
  });
  
  // Show lines checkbox
  const showLinesCheckbox = document.getElementById('show-lines');
  showLinesCheckbox.addEventListener('change', (e) => {
    showLines = e.target.checked;
    updateStarLines();
  });
  
  // Show labels checkbox
  const showLabelsCheckbox = document.getElementById('show-labels');
  showLabelsCheckbox.addEventListener('change', (e) => {
    showLabels = e.target.checked;
    updateStarLabels();
  });
  
  // Depth scale slider
  const depthScaleSlider = document.getElementById('depth-scale');
  const depthScaleValue = document.getElementById('depth-scale-value');
  
  depthScaleSlider.addEventListener('input', (e) => {
    depthScale = parseFloat(e.target.value);
    depthScaleValue.textContent = depthScale.toFixed(1);
    stars.forEach(star => star.updateDepthScale(depthScale));
  });
}

/**
 * Update star visibility based on count
 */
function updateStarVisibility() {
  if (!stars) return;
  
  stars.forEach((star, index) => {
    star.setVisible(index < visibleStarCount);
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
    star.setLabelVisible(showLabels);
  });
}

/**
 * Update statistics display
 */
function updateStats() {
  const totalStars = document.getElementById('total-stars');
  const visibleStars = document.getElementById('visible-stars');
  
  if (starData) {
    totalStars.textContent = starData.stars.length;
    visibleStars.textContent = Math.min(visibleStarCount, starData.stars.length);
  }
}

/**
 * Animation loop
 */
function animate() {
  requestAnimationFrame(animate);
  
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

