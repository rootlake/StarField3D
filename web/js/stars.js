/**
 * Star rendering - positioning, lines, and labels
 */

import * as THREE from 'three';
import { pixelTo3D, scaleDistance, formatDistance } from './utils.js';

/**
 * Create star representation (point + line + label)
 */
export class StarVisualization {
  constructor(starData, volumeConfig, imageConfig, labelSize = 1.0, starLabelSize = 1.0, starLabelColor = '#ffffff') {
    this.starData = starData;
    this.volumeConfig = volumeConfig;
    this.imageConfig = imageConfig;
    this.labelSize = labelSize;
    this.starLabelSize = starLabelSize;
    this.starLabelColor = starLabelColor;
    
    this.group = new THREE.Group();
    this.point = null;
    this.line = null;
    this.starLabel = null;
    this.infoLabel = null;
    this.endPoint = null; // Store the star sphere
    this.glowSphere = null; // Store inner glow sphere
    this.outerGlowSphere = null; // Store outer glow sphere
    this.baseLineRadius = null;
    this.baseStarRadius = null; // Store base star radius
    this.baseStarLabelScale = null;
    this.baseInfoLabelScale = null;
    
    this.createVisualization();
  }
  
  createVisualization() {
    const { pixelX, pixelY, scaledDistance, distanceLy, distancePc } = this.starData;
    const { width: imgWidth, height: imgHeight } = this.imageConfig;
    const { width: volWidth, height: volHeight, depth: volDepth } = this.volumeConfig;
    
    // Get spectral class once for use in both line and star
    const spectralClass = this.starData.spectralClass || 'A2';
    const hexColor = this.starData.spectralColorHex || null;
    const starColor = getSpectralClassColor(spectralClass, hexColor);
    
    // Calculate 3D position on image plane
    const pos2D = pixelTo3D(pixelX, pixelY, imgWidth, imgHeight, volWidth, volHeight);
    
    // Calculate 3D position at scaled distance
    // Front face is at z = depth/2, back face is at z = -depth/2
    const depthScale = 1.0; // Will be updated by controls
    const frontZ = volDepth / 2;
    const scaledZ = scaleDistance(scaledDistance, volDepth, depthScale);
    const starZ = frontZ - scaledZ; // Extend backwards from front
    
    const pos3D = new THREE.Vector3(pos2D.x, pos2D.y, starZ);
    
    // Create point at image plane (front face)
    const pointGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.point = new THREE.Mesh(pointGeometry, pointMaterial);
    this.point.position.set(pos2D.x, pos2D.y, frontZ);
    this.group.add(this.point);
    
    // Create line from image plane to 3D position
    // Use TubeGeometry for thicker lines
    const startPoint = new THREE.Vector3(pos2D.x, pos2D.y, frontZ);
    const endPointPos = pos3D.clone();
    // Create a curve from two points using CatmullRomCurve3
    const curve = new THREE.CatmullRomCurve3([startPoint, endPointPos]);
    const baseRadius = Math.max(volWidth, volHeight) * 0.001; // Base radius relative to volume
    const tubeRadius = baseRadius * 2.0; // Fixed thickness
    const segments = 8;
    const lineGeometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false);
    
    // Use spectral class color for the line (matches star color)
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      opacity: 0.6,
      transparent: true
    });
    this.line = new THREE.Mesh(lineGeometry, lineMaterial);
    this.baseLineRadius = baseRadius; // Store for later scaling
    this.group.add(this.line);
    
    // Create point at 3D position (larger sphere representing the star)
    // Calculate star size based on magnitude (brighter = larger)
    const baseStarRadius = Math.max(volWidth, volHeight) * 0.008;
    const magnitude = this.starData.magnitude !== null && this.starData.magnitude !== undefined 
      ? this.starData.magnitude 
      : 5.0; // Default magnitude if not provided
    
    // Scale size: brighter stars (lower magnitude) are larger
    // Formula: size varies inversely with magnitude
    // Brightest stars (mag ~1-2) get ~1.5x, dimmest (mag ~8-9) get ~0.5x
    const magnitudeScale = Math.max(0.4, Math.min(1.5, 1.0 - (magnitude - 3) * 0.15));
    const starRadius = baseStarRadius * magnitudeScale;
    
    // Create glow halo (larger transparent sphere around the star)
    const glowRadius = starRadius * 2.5;
    const glowGeometry = new THREE.SphereGeometry(glowRadius, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide // Render inside-out for glow effect
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.position.copy(pos3D);
    this.glowSphere = glowSphere; // Store reference
    this.group.add(glowSphere);
    
    // Create outer glow layer (softer, more diffuse)
    const outerGlowRadius = starRadius * 4.0;
    const outerGlowGeometry = new THREE.SphereGeometry(outerGlowRadius, 16, 16);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const outerGlowSphere = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlowSphere.position.copy(pos3D);
    this.outerGlowSphere = outerGlowSphere; // Store reference
    this.group.add(outerGlowSphere);
    
    // Create the main star sphere with emissive glow
    const endPointGeometry = new THREE.SphereGeometry(starRadius, 16, 16);
    
    // Use MeshStandardMaterial with emissive properties for glow
    const endPointMaterial = new THREE.MeshStandardMaterial({
      color: starColor,
      emissive: starColor,
      emissiveIntensity: 1.0
    });
    const endPoint = new THREE.Mesh(endPointGeometry, endPointMaterial);
    endPoint.position.copy(pos3D);
    this.endPoint = endPoint; // Store reference
    this.baseStarRadius = starRadius; // Store for later reference
    this.group.add(endPoint);
    
    // Create star label (bigger, positioned over the star)
    const starLabelOffset = starRadius * 3.0; // Higher above the star
    const starLabelPosition = pos3D.clone();
    starLabelPosition.y += starLabelOffset;
    this.createStarLabel(starLabelPosition);
    
    // Create info label positioned below the star tip
    const infoLabelOffset = starRadius * 4.0; // Increased offset - lower below star
    const infoLabelPosition = pos3D.clone();
    infoLabelPosition.y -= infoLabelOffset;
    this.createInfoLabel(infoLabelPosition, distanceLy, distancePc);
  }
  
  createStarLabel(position) {
    // Create canvas for star name label (floating, no background)
    const baseFontSize = 32;
    const fontSize = Math.round(baseFontSize * this.starLabelSize);
    const canvasWidth = Math.round(128 * this.starLabelSize);
    const canvasHeight = Math.round(64 * this.starLabelSize);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // No background - transparent
    // context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    // context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = this.starLabelColor;
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    
    // Get star label (single letter or name)
    const name = this.starData.name || `HIP ${this.starData.hip}`;
    const label = name.length === 1 ? name : name.charAt(0);
    
    context.fillText(label, canvas.width / 2, canvas.height / 2 + fontSize / 3);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    this.starLabel = new THREE.Sprite(spriteMaterial);
    this.starLabel.position.copy(position);
    const baseScaleX = 20;
    const baseScaleY = 10;
    this.starLabel.scale.set(baseScaleX * this.starLabelSize, baseScaleY * this.starLabelSize, 1);
    this.baseStarLabelScale = { x: baseScaleX, y: baseScaleY };
    
    this.group.add(this.starLabel);
  }
  
  createInfoLabel(position, distanceLy, distancePc) {
    // Create canvas for info label (HIP, distance, magnitude)
    const baseFontSize = 14;
    const fontSize = Math.round(baseFontSize * this.labelSize);
    // Reduced canvas size - tighter fit around text
    const canvasWidth = Math.round(130 * this.labelSize);
    const canvasHeight = Math.round(50 * this.labelSize); // Reduced from 60
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Background with reduced padding
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#ffffff';
    context.font = `${fontSize}px Arial`;
    context.textAlign = 'center';
    
    const hip = this.starData.hip;
    const distLy = formatDistance(distanceLy, 'ly', 1);
    const magnitude = this.starData.magnitude !== null && this.starData.magnitude !== undefined 
      ? this.starData.magnitude.toFixed(1) 
      : 'N/A';
    
    // Draw text with tighter spacing
    let yPos = fontSize + 4; // Reduced top padding
    context.fillText(`HIP ${hip}`, canvas.width / 2, yPos);
    
    yPos += fontSize + 2;
    context.fillText(distLy, canvas.width / 2, yPos);
    
    yPos += fontSize + 2;
    context.fillText(`m = ${magnitude}`, canvas.width / 2, yPos);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    this.infoLabel = new THREE.Sprite(spriteMaterial);
    this.infoLabel.position.copy(position);
    // Reduced scale to match smaller canvas
    const baseScaleX = 13;
    const baseScaleY = 4;
    this.infoLabel.scale.set(baseScaleX * this.labelSize, baseScaleY * this.labelSize, 1);
    this.baseInfoLabelScale = { x: baseScaleX, y: baseScaleY };
    
    this.group.add(this.infoLabel);
  }
  
  updateDistanceUnit(unit) {
    // Update info label with new distance unit
    if (this.infoLabel) {
      const baseFontSize = 14;
      const fontSize = Math.round(baseFontSize * this.labelSize);
      // Use same reduced canvas size as createInfoLabel
      const canvasWidth = Math.round(130 * this.labelSize);
      const canvasHeight = Math.round(50 * this.labelSize);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = '#ffffff';
      context.font = `${fontSize}px Arial`;
      context.textAlign = 'center';
      
      const hip = this.starData.hip;
      const dist = formatDistance(
        unit === 'pc' ? this.starData.distancePc : this.starData.distanceLy,
        unit,
        1
      );
      const magnitude = this.starData.magnitude !== null && this.starData.magnitude !== undefined 
        ? this.starData.magnitude.toFixed(1) 
        : 'N/A';
      
      let yPos = fontSize + 4;
      context.fillText(`HIP ${hip}`, canvas.width / 2, yPos);
      
      yPos += fontSize + 2;
      context.fillText(dist, canvas.width / 2, yPos);
      
      yPos += fontSize + 2;
      context.fillText(`m = ${magnitude}`, canvas.width / 2, yPos);
      
      // Dispose old texture and create new one
      this.infoLabel.material.map.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.infoLabel.material.map = texture;
      
      // Update scale to match new canvas size
      const baseScaleX = 13;
      const baseScaleY = 4;
      this.infoLabel.scale.set(baseScaleX * this.labelSize, baseScaleY * this.labelSize, 1);
    }
  }
  
  updateLineThickness(thickness) {
    this.lineThickness = thickness;
    if (this.line && this.baseLineRadius !== null) {
      // Recreate line with new thickness
      const pos2D = pixelTo3D(
        this.starData.pixelX,
        this.starData.pixelY,
        this.imageConfig.width,
        this.imageConfig.height,
        this.volumeConfig.width,
        this.volumeConfig.height
      );
      const frontZ = this.volumeConfig.depth / 2;
      const scaledZ = scaleDistance(this.starData.scaledDistance, this.volumeConfig.depth, 1.0);
      const starZ = frontZ - scaledZ;
      const pos3D = new THREE.Vector3(pos2D.x, pos2D.y, starZ);
      
      const startPoint = new THREE.Vector3(pos2D.x, pos2D.y, frontZ);
      const endPointPos = pos3D.clone();
      const curve = new THREE.CatmullRomCurve3([startPoint, endPointPos]);
      const tubeRadius = this.baseLineRadius * thickness;
      const segments = 8;
      const newGeometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false);
      
      this.group.remove(this.line);
      this.line.geometry.dispose();
      this.line.geometry = newGeometry;
      this.group.add(this.line);
    }
  }
  
  updateLabelSize(size) {
    this.labelSize = size;
    if (this.infoLabel) {
      const baseFontSize = 14;
      const fontSize = Math.round(baseFontSize * this.labelSize);
      const canvas = this.infoLabel.material.map.image;
      const context = canvas.getContext('2d');
      canvas.width = Math.round(180 * this.labelSize);
      canvas.height = Math.round(80 * this.labelSize);
      
      // Redraw info label
      const distanceLy = this.starData.distanceLy;
      const distancePc = this.starData.distancePc;
      const currentUnit = document.getElementById('distance-unit')?.value || 'ly';
      
      // Redraw the label content
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      
      const name = this.starData.name || `HIP ${this.starData.hip}`;
      const label = name.length === 1 ? name : name.charAt(0);
      const distanceText = formatDistance(currentUnit === 'ly' ? distanceLy : distancePc, currentUnit);
      const magnitudeText = this.starData.magnitude ? `m = ${this.starData.magnitude.toFixed(1)}` : 'm = N/A';
      
      const lines = [
        label,
        `HIP ${this.starData.hip}`,
        distanceText,
        magnitudeText
      ];
      
      let y = fontSize;
      lines.forEach((line, index) => {
        if (index === 0) {
          context.font = `bold ${fontSize}px Arial`;
        } else {
          context.font = `${fontSize}px Arial`;
        }
        context.fillText(line, canvas.width / 2, y);
        y += fontSize + 2;
      });
      
      this.infoLabel.material.map.needsUpdate = true;
      const baseScaleX = 15;
      const baseScaleY = 6;
      this.infoLabel.scale.set(baseScaleX * this.labelSize, baseScaleY * this.labelSize, 1);
    }
    this.updateLabelPositions();
  }
  
  updateDepthScale(depthScale) {
    const { pixelX, pixelY, scaledDistance } = this.starData;
    const { width: imgWidth, height: imgHeight } = this.imageConfig;
    const { width: volWidth, height: volHeight, depth: volDepth } = this.volumeConfig;
    
    const pos2D = pixelTo3D(pixelX, pixelY, imgWidth, imgHeight, volWidth, volHeight);
    const frontZ = volDepth / 2;
    const scaledZ = scaleDistance(scaledDistance, volDepth, depthScale);
    const starZ = frontZ - scaledZ;
    
    // Update point position on image plane
    this.point.position.set(pos2D.x, pos2D.y, frontZ);
    
    // Update line end position
    const endPoint = this.group.children[2]; // End point is third child (after point, line)
    endPoint.position.set(pos2D.x, pos2D.y, starZ);
    
    // Update label position - keep it below the star tip
    if (this.label) {
      const starRadius = Math.max(volWidth, volHeight) * 0.008;
      const labelOffset = starRadius * 2.5;
      this.label.position.set(pos2D.x, pos2D.y - labelOffset, starZ);
    }
    
    // Update line curve
    const startPoint = new THREE.Vector3(pos2D.x, pos2D.y, frontZ);
    const endPointPos = new THREE.Vector3(pos2D.x, pos2D.y, starZ);
    const curve = new THREE.CatmullRomCurve3([startPoint, endPointPos]);
    
    // Recreate line geometry with new curve
    if (this.line) {
      this.group.remove(this.line);
      this.line.geometry.dispose();
      this.line.material.dispose();
      
      const baseRadius = Math.max(volWidth, volHeight) * 0.001;
      const tubeRadius = baseRadius * 2.0; // Fixed thickness
      const lineGeometry = new THREE.TubeGeometry(curve, 8, tubeRadius, 8, false);
      
      // Get spectral class color for the line (matches star color)
      const spectralClass = this.starData.spectralClass || 'A2';
      const hexColor = this.starData.spectralColorHex || null;
      const starColor = getSpectralClassColor(spectralClass, hexColor);
      
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: starColor,
        opacity: 0.6,
        transparent: true
      });
      
      this.line = new THREE.Mesh(lineGeometry, lineMaterial);
      this.group.insert(this.line, 1); // Insert after point, before endPoint
    }
  }
  
  setVisible(visible) {
    this.group.visible = visible;
  }
  
  setLineVisible(visible) {
    if (this.line) {
      this.line.visible = visible;
    }
  }
  
  setSphereVisible(visible) {
    if (this.endPoint) {
      this.endPoint.visible = visible;
    }
    if (this.glowSphere) {
      this.glowSphere.visible = visible;
    }
    if (this.outerGlowSphere) {
      this.outerGlowSphere.visible = visible;
    }
  }
  
  updateLabelSize(size) {
    this.labelSize = size;
    if (this.infoLabel) {
      const baseFontSize = 14;
      const fontSize = Math.round(baseFontSize * this.labelSize);
      // Use same reduced canvas size as createInfoLabel
      const canvasWidth = Math.round(130 * this.labelSize);
      const canvasHeight = Math.round(50 * this.labelSize);
      
      // Create new canvas (can't resize existing canvas)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Redraw info label
      const distanceLy = this.starData.distanceLy;
      const distancePc = this.starData.distancePc;
      const currentUnit = document.getElementById('distance-unit')?.value || 'ly';
      
      // Redraw the label content
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = `${fontSize}px Arial`;
      context.textAlign = 'center';
      
      const hip = this.starData.hip;
      const distText = formatDistance(currentUnit === 'ly' ? distanceLy : distancePc, currentUnit, 1);
      const magnitude = this.starData.magnitude !== null && this.starData.magnitude !== undefined 
        ? this.starData.magnitude.toFixed(1) 
        : 'N/A';
      
      let yPos = fontSize + 4;
      context.fillText(`HIP ${hip}`, canvas.width / 2, yPos);
      yPos += fontSize + 2;
      context.fillText(distText, canvas.width / 2, yPos);
      yPos += fontSize + 2;
      context.fillText(`m = ${magnitude}`, canvas.width / 2, yPos);
      
      // Dispose old texture and create new one
      this.infoLabel.material.map.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.infoLabel.material.map = texture;
      
      // Update scale to match new canvas size
      const baseScaleX = 13;
      const baseScaleY = 4;
      this.infoLabel.scale.set(baseScaleX * this.labelSize, baseScaleY * this.labelSize, 1);
    }
    this.updateLabelPositions();
  }
  
  updateStarLabelSize(size) {
    this.starLabelSize = size;
    if (this.starLabel) {
      const baseFontSize = 32;
      const fontSize = Math.round(baseFontSize * this.starLabelSize);
      const canvas = this.starLabel.material.map.image;
      const context = canvas.getContext('2d');
      canvas.width = Math.round(128 * this.starLabelSize);
      canvas.height = Math.round(64 * this.starLabelSize);
      
      // Redraw star label
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = this.starLabelColor;
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      const name = this.starData.name || `HIP ${this.starData.hip}`;
      const label = name.length === 1 ? name : name.charAt(0);
      context.fillText(label, canvas.width / 2, canvas.height / 2 + fontSize / 3);
      
      this.starLabel.material.map.needsUpdate = true;
      const baseScaleX = 20;
      const baseScaleY = 10;
      this.starLabel.scale.set(baseScaleX * this.starLabelSize, baseScaleY * this.starLabelSize, 1);
    }
    this.updateLabelPositions();
  }
  
  setStarLabelColor(color) {
    this.starLabelColor = color;
    if (this.starLabel) {
      // Recreate the canvas and texture with new color
      const baseFontSize = 32;
      const fontSize = Math.round(baseFontSize * this.starLabelSize);
      const canvasWidth = Math.round(128 * this.starLabelSize);
      const canvasHeight = Math.round(64 * this.starLabelSize);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Redraw with new color
      context.fillStyle = this.starLabelColor;
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      const name = this.starData.name || `HIP ${this.starData.hip}`;
      const label = name.length === 1 ? name : name.charAt(0);
      context.fillText(label, canvas.width / 2, canvas.height / 2 + fontSize / 3);
      
      // Dispose old texture and create new one
      this.starLabel.material.map.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.starLabel.material.map = texture;
    }
  }
  
  updateLabelPositions() {
    if (!this.endPoint) return;
    
    // Use stored baseStarRadius if available, otherwise calculate
    const starRadius = this.baseStarRadius || Math.max(this.volumeConfig.width, this.volumeConfig.height) * 0.008;
    const pos3D = this.endPoint.position;
    
    // Update star label position (scaled by starLabelSize)
    if (this.starLabel) {
      const starLabelOffset = starRadius * 3.0 * this.starLabelSize;
      this.starLabel.position.set(pos3D.x, pos3D.y + starLabelOffset, pos3D.z);
    }
    
    // Update info label position (scaled by labelSize)
    if (this.infoLabel) {
      const infoLabelOffset = starRadius * 4.0 * this.labelSize; // Increased offset - lower below star
      this.infoLabel.position.set(pos3D.x, pos3D.y - infoLabelOffset, pos3D.z);
    }
  }
  
  setStarLabelVisible(visible) {
    if (this.starLabel) {
      this.starLabel.visible = visible;
    }
  }
  
  setInfoLabelVisible(visible) {
    if (this.infoLabel) {
      this.infoLabel.visible = visible;
    }
  }
  
  dispose() {
    if (this.point) {
      this.point.geometry.dispose();
      this.point.material.dispose();
    }
    if (this.line) {
      this.line.geometry.dispose();
      this.line.material.dispose();
    }
    if (this.endPoint) {
      this.endPoint.geometry.dispose();
      this.endPoint.material.dispose();
    }
    if (this.glowSphere) {
      this.glowSphere.geometry.dispose();
      this.glowSphere.material.dispose();
    }
    if (this.outerGlowSphere) {
      this.outerGlowSphere.geometry.dispose();
      this.outerGlowSphere.material.dispose();
    }
    if (this.starLabel) {
      this.starLabel.material.map.dispose();
      this.starLabel.material.dispose();
    }
    if (this.infoLabel) {
      this.infoLabel.material.map.dispose();
      this.infoLabel.material.dispose();
    }
  }
}

/**
 * Create all star visualizations from data
 */
/**
 * Get random spectral class for testing
 * @returns {string} Random spectral class (O, B, A, F, G, K, M)
 */
function getRandomSpectralClass() {
  const classes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  return classes[Math.floor(Math.random() * classes.length)];
}

/**
 * Get color for spectral class (from hex string or fallback to code)
 * @param {string} spectralClass - Spectral class code (e.g., "A2", "G5")
 * @param {string} hexColor - Hex color string (e.g., "#FFF3E7")
 * @returns {number} Color as hex number for Three.js
 */
function getSpectralClassColor(spectralClass, hexColor = null) {
  // If hex color is provided, use it
  if (hexColor) {
    // Convert hex string to number (remove # and parse)
    return parseInt(hexColor.replace('#', ''), 16);
  }
  
  // Fallback: use first character of spectral class for basic color lookup
  const firstChar = spectralClass ? spectralClass.charAt(0) : 'A';
  const colors = {
    'O': 0x95b8ff,
    'B': 0xa8c4ff,
    'A': 0xcddcff,
    'F': 0xf3f2ff,
    'G': 0xfff3e7,
    'K': 0xffe0c7,
    'M': 0xffc392
  };
  return colors[firstChar] || 0xffffff; // Default to white
}

export function createStars(starsData, volumeConfig, imageConfig, labelSize = 1.0, starLabelSize = 1.0, starLabelColor = '#ffffff') {
  return starsData.map(star => new StarVisualization(star, volumeConfig, imageConfig, labelSize, starLabelSize, starLabelColor));
}

