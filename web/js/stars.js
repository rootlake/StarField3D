/**
 * Star rendering - positioning, lines, and labels
 */

import * as THREE from 'three';
import { pixelTo3D, scaleDistance, formatDistance } from './utils.js';

/**
 * Create star representation (point + line + label)
 */
export class StarVisualization {
  constructor(starData, volumeConfig, imageConfig) {
    this.starData = starData;
    this.volumeConfig = volumeConfig;
    this.imageConfig = imageConfig;
    
    this.group = new THREE.Group();
    this.point = null;
    this.line = null;
    this.label = null;
    
    this.createVisualization();
  }
  
  createVisualization() {
    const { pixelX, pixelY, scaledDistance, distanceLy, distancePc } = this.starData;
    const { width: imgWidth, height: imgHeight } = this.imageConfig;
    const { width: volWidth, height: volHeight, depth: volDepth } = this.volumeConfig;
    
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
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pos2D.x, pos2D.y, frontZ),
      pos3D
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      opacity: 0.6,
      transparent: true
    });
    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.group.add(this.line);
    
    // Create point at 3D position
    const endPointGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const endPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const endPoint = new THREE.Mesh(endPointGeometry, endPointMaterial);
    endPoint.position.copy(pos3D);
    this.group.add(endPoint);
    
    // Create label (simple sprite for now)
    this.createLabel(pos3D, distanceLy, distancePc);
  }
  
  createLabel(position, distanceLy, distancePc) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    context.textAlign = 'center';
    
    const name = this.starData.name || `HIP ${this.starData.hip}`;
    const distLy = formatDistance(distanceLy, 'ly', 1);
    
    context.fillText(name, canvas.width / 2, 20);
    context.fillText(distLy, canvas.width / 2, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    this.label = new THREE.Sprite(spriteMaterial);
    this.label.position.copy(position);
    this.label.scale.set(20, 5, 1);
    this.label.position.z += 10; // Offset slightly in front
    
    this.group.add(this.label);
  }
  
  updateDistanceUnit(unit) {
    if (this.label) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = '#ffffff';
      context.font = '16px Arial';
      context.textAlign = 'center';
      
      const name = this.starData.name || `HIP ${this.starData.hip}`;
      const dist = formatDistance(
        unit === 'pc' ? this.starData.distancePc : this.starData.distanceLy,
        unit,
        1
      );
      
      context.fillText(name, canvas.width / 2, 20);
      context.fillText(dist, canvas.width / 2, 40);
      
      this.label.material.map.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.label.material.map = texture;
    }
  }
  
  updateDepthScale(depthScale) {
    const { pixelX, pixelY, scaledDistance } = this.starData;
    const { width: imgWidth, height: imgHeight } = this.imageConfig;
    const { width: volWidth, depth: volDepth } = this.volumeConfig;
    
    const pos2D = pixelTo3D(pixelX, pixelY, imgWidth, imgHeight, volWidth, volWidth);
    const frontZ = volDepth / 2;
    const scaledZ = scaleDistance(scaledDistance, volDepth, depthScale);
    const starZ = frontZ - scaledZ;
    
    // Update line endpoint
    if (this.line) {
      const positions = this.line.geometry.attributes.position;
      positions.setZ(1, starZ);
      positions.needsUpdate = true;
    }
    
    // Update end point position
    if (this.group.children.length > 2) {
      const endPoint = this.group.children[2]; // End point is third child
      endPoint.position.set(pos2D.x, pos2D.y, starZ);
      
      // Update label position
      if (this.label) {
        this.label.position.set(pos2D.x, pos2D.y, starZ + 10);
      }
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
  
  setLabelVisible(visible) {
    if (this.label) {
      this.label.visible = visible;
    }
  }
  
  dispose() {
    if (this.point) this.point.geometry.dispose();
    if (this.line) this.line.geometry.dispose();
    if (this.label) {
      this.label.material.map.dispose();
      this.label.material.dispose();
    }
  }
}

/**
 * Create all star visualizations from data
 */
export function createStars(starsData, volumeConfig, imageConfig) {
  return starsData.map(star => new StarVisualization(star, volumeConfig, imageConfig));
}

