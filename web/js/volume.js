/**
 * Volume construction - creates wireframe box with image plane
 */

import * as THREE from 'three';

/**
 * Create wireframe box volume
 * @param {number} width - Volume width
 * @param {number} height - Volume height
 * @param {number} depth - Volume depth
 * @returns {THREE.Group} Group containing wireframe box
 */
export function createWireframeVolume(width, height, depth) {
  const group = new THREE.Group();
  
  // Create wireframe material
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 0.3,
    transparent: true
  });
  
  // Define corners of the box
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  
  const corners = {
    front: {
      topLeft: new THREE.Vector3(-halfWidth, halfHeight, halfDepth),
      topRight: new THREE.Vector3(halfWidth, halfHeight, halfDepth),
      bottomLeft: new THREE.Vector3(-halfWidth, -halfHeight, halfDepth),
      bottomRight: new THREE.Vector3(halfWidth, -halfHeight, halfDepth)
    },
    back: {
      topLeft: new THREE.Vector3(-halfWidth, halfHeight, -halfDepth),
      topRight: new THREE.Vector3(halfWidth, halfHeight, -halfDepth),
      bottomLeft: new THREE.Vector3(-halfWidth, -halfHeight, -halfDepth),
      bottomRight: new THREE.Vector3(halfWidth, -halfHeight, -halfDepth)
    }
  };
  
  // Create front face edges
  const frontFace = createRectangleWireframe(
    corners.front.topLeft,
    corners.front.topRight,
    corners.front.bottomRight,
    corners.front.bottomLeft,
    wireframeMaterial
  );
  group.add(frontFace);
  
  // Create back face edges
  const backFace = createRectangleWireframe(
    corners.back.topLeft,
    corners.back.topRight,
    corners.back.bottomRight,
    corners.back.bottomLeft,
    wireframeMaterial
  );
  group.add(backFace);
  
  // Create connecting edges (sides)
  const edges = [
    [corners.front.topLeft, corners.back.topLeft],
    [corners.front.topRight, corners.back.topRight],
    [corners.front.bottomLeft, corners.back.bottomLeft],
    [corners.front.bottomRight, corners.back.bottomRight]
  ];
  
  edges.forEach(([start, end]) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, wireframeMaterial);
    group.add(line);
  });
  
  return group;
}

/**
 * Create rectangle wireframe from four corners
 */
function createRectangleWireframe(p1, p2, p3, p4, material) {
  const group = new THREE.Group();
  
  const points = [p1, p2, p3, p4, p1]; // Close the rectangle
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  
  group.add(line);
  return group;
}

/**
 * Create image plane with texture
 * @param {string} imageUrl - URL to the star field image
 * @param {number} width - Plane width
 * @param {number} height - Plane height
 * @returns {Promise<THREE.Mesh>} Mesh with image texture
 */
export function createImagePlane(imageUrl, width, height) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    
    loader.load(
      imageUrl,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        // Use MeshBasicMaterial - it ignores lighting and displays textures exactly as they are
        // Add a color multiplier to darken the image to match original brightness
        // Using 0x888888 (~53% brightness) for a moderate darkening
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          color: 0x888888 // Darken by multiplying texture colors (0x888888 ≈ 53% brightness)
        });
        
        const plane = new THREE.Mesh(geometry, material);
        plane.position.z = 0; // Centered at origin, will be positioned by depth
        
        resolve(plane);
      },
      undefined,
      (error) => {
        console.error('Error loading image:', error);
        reject(error);
      }
    );
  });
}

/**
 * Update volume depth scale
 * @param {THREE.Group} volumeGroup - Volume group to update
 * @param {number} newDepth - New depth value
 * @param {number} width - Volume width
 * @param {number} height - Volume height
 */
export function updateVolumeDepth(volumeGroup, newDepth, width, height) {
  // Remove old volume
  while (volumeGroup.children.length > 0) {
    volumeGroup.remove(volumeGroup.children[0]);
  }
  
  // Create new volume with updated depth
  const newVolume = createWireframeVolume(width, height, newDepth);
  volumeGroup.add(newVolume);
}

