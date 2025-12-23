/**
 * Smart Self-View Detection
 * Automatically detects the self-view video box in meeting apps using:
 * 1. Face detection (MediaPipe FaceLandmarker)
 * 2. Edge detection (gradient-based boundary finding)
 */

import { FaceLandmarkerManager } from '@lumina/core';

export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  debugImageUrl?: string; // Debug visualization
}

interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  centerX: number;
  centerY: number;
}

interface Point {
  x: number;
  y: number;
}

interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Configuration
const CONFIG = {
  GRADIENT_THRESHOLD: 30,    // Luminance change to consider an "edge"
  SAMPLE_STEP: 2,            // Pixels to step when scanning
  MAX_SCAN_DISTANCE: 400,    // Don't scan more than 400px from face
  MIN_BOX_SIZE: 80,          // Minimum expected self-view size
  MULTI_RAY_OFFSETS: [-20, -10, 0, 10, 20], // Parallel rays for robustness
  FALLBACK_EXPAND_X: 1.8,    // Fallback: expand face width by this factor
  FALLBACK_EXPAND_Y: 2.2,    // Fallback: expand face height by this factor
  // Edge detection for rectangles
  EDGE_THRESHOLD: 35,        // Strong edge threshold
  MIN_EDGE_POINTS: 4,        // Min points to consider a line
  DEBUG_MODE: true,          // Enable debug visualization
};

/**
 * Main entry point: Auto-detect self-view region from screenshot
 * Always uses edge detection to find the best rectangle containing the face
 */
export async function autoDetectSelfView(
  screenshotDataUrl: string,
  screenshotWidth: number,
  screenshotHeight: number
): Promise<DetectedRegion | null> {
  console.log('[SmartDetection] Starting auto-detection...');

  // Step 1: Convert data URL to ImageData
  const imageData = await dataUrlToImageData(screenshotDataUrl, screenshotWidth, screenshotHeight);
  if (!imageData) {
    console.error('[SmartDetection] Failed to convert screenshot to ImageData');
    return null;
  }

  // Step 2: Detect faces using MediaPipe
  const faces = await detectFaces(screenshotDataUrl, screenshotWidth, screenshotHeight);
  if (faces.length === 0) {
    console.warn('[SmartDetection] No faces detected in screenshot');
    return null;
  }

  console.log(`[SmartDetection] Detected ${faces.length} face(s)`);

  // Step 3: Select the most likely self-view face
  const selfViewFace = selectSelfViewCandidate(faces, screenshotWidth, screenshotHeight);
  console.log('[SmartDetection] Selected face:', selfViewFace);

  // Step 4: ALWAYS use edge detection to find rectangles
  const { edges, horizontalEdges, verticalEdges, candidateRects } = findBestRectangle(
    imageData,
    screenshotWidth,
    screenshotHeight,
    selfViewFace
  );

  console.log('[SmartDetection] Detected edges:', edges);

  // Step 5: Create debug visualization
  let debugImageUrl: string | undefined;
  if (CONFIG.DEBUG_MODE) {
    debugImageUrl = createDebugVisualization(
      screenshotDataUrl,
      screenshotWidth,
      screenshotHeight,
      selfViewFace,
      horizontalEdges,
      verticalEdges,
      candidateRects,
      edges
    );
  }

  // Step 6: Calculate final region
  const region: DetectedRegion = {
    x: Math.max(0, edges.left),
    y: Math.max(0, edges.top),
    width: Math.min(edges.right - edges.left, screenshotWidth - edges.left),
    height: Math.min(edges.bottom - edges.top, screenshotHeight - edges.top),
    confidence: calculateConfidence(selfViewFace, edges, screenshotWidth, screenshotHeight),
    debugImageUrl,
  };

  // Validate minimum size
  if (region.width < CONFIG.MIN_BOX_SIZE || region.height < CONFIG.MIN_BOX_SIZE) {
    console.warn('[SmartDetection] Detected region too small, using fallback expansion');
    const fallback = createFallbackRegion(selfViewFace, screenshotWidth, screenshotHeight);
    fallback.debugImageUrl = debugImageUrl;
    return fallback;
  }

  console.log('[SmartDetection] Final region:', region);
  return region;
}

/**
 * Create debug visualization showing detected edges and rectangles
 */
function createDebugVisualization(
  screenshotDataUrl: string,
  width: number,
  height: number,
  face: FaceBounds,
  hEdges: number[],
  vEdges: number[],
  candidateRects: Array<{ left: number; right: number; top: number; bottom: number; score: number }>,
  finalRect: Edges
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return screenshotDataUrl;

  // Draw original image
  const img = new Image();
  img.src = screenshotDataUrl;

  // Since we can't wait for image load synchronously, draw shapes only
  // The debug image will be overlaid on the screenshot in the UI

  // Draw horizontal edges (cyan lines)
  ctx.strokeStyle = 'cyan';
  ctx.lineWidth = 1;
  hEdges.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });

  // Draw vertical edges (magenta lines)
  ctx.strokeStyle = 'magenta';
  vEdges.forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  });

  // Draw candidate rectangles (yellow, semi-transparent)
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 2;
  candidateRects.slice(0, 5).forEach(rect => {
    ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
  });

  // Draw face bounding box (blue)
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 3;
  ctx.strokeRect(face.x, face.y, face.width, face.height);

  // Draw final selected rectangle (green, thick)
  ctx.strokeStyle = 'lime';
  ctx.lineWidth = 4;
  ctx.strokeRect(finalRect.left, finalRect.top, finalRect.right - finalRect.left, finalRect.bottom - finalRect.top);

  // Add text labels
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.fillText(`H-edges: ${hEdges.length}, V-edges: ${vEdges.length}`, 10, 20);
  ctx.fillText(`Candidates: ${candidateRects.length}`, 10, 40);

  return canvas.toDataURL();
}

/**
 * Convert data URL to ImageData for pixel analysis
 */
async function dataUrlToImageData(
  dataUrl: string,
  width: number,
  height: number
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Detect faces in the screenshot using MediaPipe FaceLandmarker
 * Uses a canvas to convert the image to a format FaceLandmarker can process
 */
async function detectFaces(
  dataUrl: string,
  width: number,
  height: number
): Promise<FaceBounds[]> {
  // Create a temporary FaceLandmarker for detection
  const manager = new FaceLandmarkerManager();

  try {
    // Initialize with IMAGE running mode by configuring for single frame
    await manager.initialize({
      numFaces: 5, // Allow multiple faces for self-view candidate selection
      disableCalibration: true, // Don't need calibration for detection
    });

    // Create canvas from image for detection
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[SmartDetection] Failed to get canvas context');
      return [];
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Detect faces using processVideoFrame (works with canvas)
    const result = manager.processVideoFrame(canvas, width);

    if (!result || !result.rawLandmarks) {
      return [];
    }

    // We get one face from rawLandmarks - convert to bounds
    // For multiple faces, we'd need to modify FaceLandmarkerManager
    const landmarks = result.rawLandmarks;
    const xs = landmarks.map((p: { x: number; y: number }) => p.x * width);
    const ys = landmarks.map((p: { x: number; y: number }) => p.y * height);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;

    // Return single face (FaceLandmarkerManager currently returns first face only)
    return [{
      x: minX,
      y: minY,
      width: faceWidth,
      height: faceHeight,
      area: faceWidth * faceHeight,
      centerX: minX + faceWidth / 2,
      centerY: minY + faceHeight / 2,
    }];
  } catch (err) {
    console.error('[SmartDetection] Face detection error:', err);
    return [];
  } finally {
    manager.close();
  }
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Select the most likely self-view face from detected faces
 * Heuristics: prefer smaller faces in corners
 */
function selectSelfViewCandidate(
  faces: FaceBounds[],
  screenWidth: number,
  screenHeight: number
): FaceBounds {
  if (faces.length === 1) {
    return faces[0];
  }

  const scored = faces.map((face) => {
    let score = 0;

    // Heuristic 1: Prefer smaller faces (self-view is usually thumbnail)
    const avgDimension = (face.width + face.height) / 2;
    if (avgDimension < 150) score += 35;
    else if (avgDimension < 250) score += 25;
    else if (avgDimension < 350) score += 15;
    else if (avgDimension > 500) score -= 25; // Probably main speaker

    // Heuristic 2: Prefer faces in corners
    const isInCorner =
      (face.centerX < screenWidth * 0.3 || face.centerX > screenWidth * 0.7) &&
      (face.centerY < screenHeight * 0.3 || face.centerY > screenHeight * 0.7);
    if (isInCorner) score += 30;

    // Heuristic 3: Slight preference for right side (most apps put self-view right)
    if (face.centerX > screenWidth * 0.5) score += 10;

    // Heuristic 4: Slight preference for bottom (common self-view position)
    if (face.centerY > screenHeight * 0.5) score += 10;

    // Heuristic 5: Prefer faces near edges
    const distToEdge = Math.min(
      face.centerX,
      screenWidth - face.centerX,
      face.centerY,
      screenHeight - face.centerY
    );
    if (distToEdge < screenWidth * 0.15) score += 15;

    return { face, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored[0].face;
}

interface RectCandidate {
  left: number;
  right: number;
  top: number;
  bottom: number;
  score: number;
}

interface FindRectResult {
  edges: Edges;
  horizontalEdges: number[];
  verticalEdges: number[];
  candidateRects: RectCandidate[];
}

/**
 * Find the best rectangle containing the face using edge detection
 */
function findBestRectangle(
  imageData: ImageData,
  screenWidth: number,
  screenHeight: number,
  face: FaceBounds
): FindRectResult {
  const { data, width } = imageData;

  // Get pixel luminance
  const getLum = (x: number, y: number): number => {
    const px = Math.floor(Math.max(0, Math.min(x, screenWidth - 1)));
    const py = Math.floor(Math.max(0, Math.min(y, screenHeight - 1)));
    const i = (py * width + px) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Find horizontal edges - look for rows with CONTINUOUS strong gradients
  // A real UI border has gradient at 70%+ of points, not scattered noise
  const horizontalEdges: number[] = [];
  const EDGE_THRESHOLD = CONFIG.EDGE_THRESHOLD;
  const CONTINUITY_RATIO = 0.6; // 60% of points must have gradient

  for (let y = 5; y < screenHeight - 5; y += 2) {
    let edgePoints = 0;
    let totalPoints = 0;
    // Sample across the FULL row width
    for (let x = 10; x < screenWidth - 10; x += 5) {
      totalPoints++;
      // Check vertical gradient at this point
      const above = getLum(x, y - 2);
      const below = getLum(x, y + 2);
      if (Math.abs(above - below) > EDGE_THRESHOLD) {
        edgePoints++;
      }
    }
    // Require CONTINUOUS edge - gradient at most points along the line
    const ratio = edgePoints / totalPoints;
    if (ratio >= CONTINUITY_RATIO) {
      // Avoid adding edges too close together
      if (horizontalEdges.length === 0 || y - horizontalEdges[horizontalEdges.length - 1] > 15) {
        horizontalEdges.push(y);
        console.log(`[SmartDetection] H-edge at y=${y}, ratio=${(ratio*100).toFixed(0)}%`);
      }
    }
  }

  // Find vertical edges - same continuous requirement
  const verticalEdges: number[] = [];
  for (let x = 5; x < screenWidth - 5; x += 2) {
    let edgePoints = 0;
    let totalPoints = 0;
    for (let y = 10; y < screenHeight - 10; y += 5) {
      totalPoints++;
      const left = getLum(x - 2, y);
      const right = getLum(x + 2, y);
      if (Math.abs(left - right) > EDGE_THRESHOLD) {
        edgePoints++;
      }
    }
    const ratio = edgePoints / totalPoints;
    if (ratio >= CONTINUITY_RATIO) {
      if (verticalEdges.length === 0 || x - verticalEdges[verticalEdges.length - 1] > 15) {
        verticalEdges.push(x);
        console.log(`[SmartDetection] V-edge at x=${x}, ratio=${(ratio*100).toFixed(0)}%`);
      }
    }
  }

  console.log(`[SmartDetection] Found ${horizontalEdges.length} H-edges, ${verticalEdges.length} V-edges`);
  console.log(`[SmartDetection] H-edges: ${horizontalEdges.slice(0, 10).join(', ')}...`);
  console.log(`[SmartDetection] V-edges: ${verticalEdges.slice(0, 10).join(', ')}...`);

  // Find all valid rectangles
  const candidateRects: RectCandidate[] = [];
  // Default: use most of the window with margins for UI controls
  const marginX = Math.min(20, screenWidth * 0.02);
  const marginTop = Math.min(10, screenHeight * 0.01);
  const marginBottom = Math.min(80, screenHeight * 0.1); // More margin at bottom for controls
  const defaultRect = {
    left: marginX,
    right: screenWidth - marginX,
    top: marginTop,
    bottom: screenHeight - marginBottom,
  };

  if (horizontalEdges.length >= 2 && verticalEdges.length >= 2) {
    // Sort edges
    horizontalEdges.sort((a, b) => a - b);
    verticalEdges.sort((a, b) => a - b);

    // Try all combinations (limit to avoid explosion)
    const maxH = Math.min(horizontalEdges.length, 15);
    const maxV = Math.min(verticalEdges.length, 15);

    for (let hi = 0; hi < maxH - 1; hi++) {
      for (let hj = hi + 1; hj < maxH; hj++) {
        for (let vi = 0; vi < maxV - 1; vi++) {
          for (let vj = vi + 1; vj < maxV; vj++) {
            const top = horizontalEdges[hi];
            const bottom = horizontalEdges[hj];
            const left = verticalEdges[vi];
            const right = verticalEdges[vj];

            const w = right - left;
            const h = bottom - top;

            // Skip tiny rectangles - self-view is at least 200x150
            if (w < 200 || h < 150) continue;

            // MUST contain face with PADDING - reject tight face crops
            // Require at least 30% of face size as padding on each side
            const minPadX = face.width * 0.3;
            const minPadY = face.height * 0.3;
            const containsFaceWithPadding =
              face.x > left + minPadX &&
              (face.x + face.width) < right - minPadX &&
              face.y > top + minPadY &&
              (face.y + face.height) < bottom - minPadY;
            if (!containsFaceWithPadding) continue;

            // Verify corners - check that edges actually meet (forming closed rectangle)
            // A real corner has gradient in BOTH horizontal and vertical directions
            const cornerSize = 8;
            let validCorners = 0;

            // Check each corner for gradients in both directions
            const corners = [
              { x: left, y: top },      // top-left
              { x: right, y: top },     // top-right
              { x: left, y: bottom },   // bottom-left
              { x: right, y: bottom },  // bottom-right
            ];

            for (const corner of corners) {
              let hasHGradient = false;
              let hasVGradient = false;

              // Check horizontal gradient near corner
              for (let dx = -cornerSize; dx <= cornerSize; dx++) {
                const g = Math.abs(getLum(corner.x + dx, corner.y) - getLum(corner.x + dx + 3, corner.y));
                if (g > EDGE_THRESHOLD) hasHGradient = true;
              }

              // Check vertical gradient near corner
              for (let dy = -cornerSize; dy <= cornerSize; dy++) {
                const g = Math.abs(getLum(corner.x, corner.y + dy) - getLum(corner.x, corner.y + dy + 3));
                if (g > EDGE_THRESHOLD) hasVGradient = true;
              }

              if (hasHGradient && hasVGradient) validCorners++;
            }

            // Require at least 3 valid corners (allow one weak corner)
            if (validCorners < 3) continue;

            // Calculate score
            let score = 0;

            // Prefer rectangles where face is well-centered (not touching edges)
            const facePadLeft = face.centerX - left;
            const facePadRight = right - face.centerX;
            const facePadTop = face.centerY - top;
            const facePadBottom = bottom - face.centerY;
            const minPad = Math.min(facePadLeft, facePadRight, facePadTop, facePadBottom);
            score += Math.min(minPad / 50, 20); // Up to 20 points for padding

            // Prefer larger rectangles (more likely to be the video container)
            const area = w * h;
            const screenArea = screenWidth * screenHeight;
            const areaRatio = area / screenArea;
            if (areaRatio > 0.1) score += 15;
            if (areaRatio > 0.2) score += 10;
            if (areaRatio > 0.4) score += 5;

            // Aspect ratio bonus (video is usually wider than tall)
            const aspect = w / h;
            if (aspect > 1.2 && aspect < 2.0) score += 15;

            // Slight preference for bottom-right (self-view position)
            score += (left + right) / 2 / screenWidth * 5;
            score += (top + bottom) / 2 / screenHeight * 5;

            candidateRects.push({ left, right, top, bottom, score });
          }
        }
      }
    }
  }

  // Sort by score descending
  candidateRects.sort((a, b) => b.score - a.score);

  console.log(`[SmartDetection] Found ${candidateRects.length} candidate rectangles`);
  if (candidateRects.length > 0) {
    console.log(`[SmartDetection] Top 3 candidates:`);
    candidateRects.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.left},${r.top}]->[${r.right},${r.bottom}] score=${r.score.toFixed(1)}`);
    });
  }

  const bestRect = candidateRects.length > 0 ? candidateRects[0] : defaultRect;

  return {
    edges: { left: bestRect.left, right: bestRect.right, top: bestRect.top, bottom: bestRect.bottom },
    horizontalEdges,
    verticalEdges,
    candidateRects,
  };
}

/**
 * Find video box edges using gradient-based edge detection
 * Scans outward from face center in 4 directions
 */
function findVideoBoxEdges(
  imageData: ImageData,
  faceCenter: Point,
  screenWidth: number,
  screenHeight: number
): Edges {
  // Use multi-ray scanning for robustness
  const left = scanForEdgeMultiRay(imageData, faceCenter, 'left', screenWidth, screenHeight);
  const right = scanForEdgeMultiRay(imageData, faceCenter, 'right', screenWidth, screenHeight);
  const top = scanForEdgeMultiRay(imageData, faceCenter, 'up', screenWidth, screenHeight);
  const bottom = scanForEdgeMultiRay(imageData, faceCenter, 'down', screenWidth, screenHeight);

  return { left, right, top, bottom };
}

/**
 * Scan multiple parallel rays and return median edge position
 */
function scanForEdgeMultiRay(
  imageData: ImageData,
  faceCenter: Point,
  direction: 'left' | 'right' | 'up' | 'down',
  screenWidth: number,
  screenHeight: number
): number {
  const edges: number[] = [];

  for (const offset of CONFIG.MULTI_RAY_OFFSETS) {
    const adjustedCenter: Point =
      direction === 'left' || direction === 'right'
        ? { x: faceCenter.x, y: faceCenter.y + offset }
        : { x: faceCenter.x + offset, y: faceCenter.y };

    // Skip if adjusted center is out of bounds
    if (
      adjustedCenter.x < 0 ||
      adjustedCenter.x >= screenWidth ||
      adjustedCenter.y < 0 ||
      adjustedCenter.y >= screenHeight
    ) {
      continue;
    }

    const edge = scanSingleRay(imageData, adjustedCenter, direction, screenWidth, screenHeight);
    edges.push(edge);
  }

  if (edges.length === 0) {
    // Fallback to face center
    return direction === 'left' || direction === 'up'
      ? Math.max(0, faceCenter.x - CONFIG.MAX_SCAN_DISTANCE)
      : Math.min(screenWidth, faceCenter.x + CONFIG.MAX_SCAN_DISTANCE);
  }

  // Return median
  edges.sort((a, b) => a - b);
  return edges[Math.floor(edges.length / 2)];
}

/**
 * Scan a single ray in one direction looking for edge
 */
function scanSingleRay(
  imageData: ImageData,
  start: Point,
  direction: 'left' | 'right' | 'up' | 'down',
  screenWidth: number,
  screenHeight: number
): number {
  const { data, width } = imageData;

  // Helper to get pixel luminance
  const getLuminance = (x: number, y: number): number => {
    const px = Math.floor(Math.max(0, Math.min(x, screenWidth - 1)));
    const py = Math.floor(Math.max(0, Math.min(y, screenHeight - 1)));
    const i = (py * width + px) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Helper to get gradient
  const getGradient = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.abs(getLuminance(x1, y1) - getLuminance(x2, y2));
  };

  let pos = direction === 'left' || direction === 'right' ? start.x : start.y;
  const step = direction === 'left' || direction === 'up' ? -CONFIG.SAMPLE_STEP : CONFIG.SAMPLE_STEP;

  const minBound =
    direction === 'left'
      ? Math.max(0, start.x - CONFIG.MAX_SCAN_DISTANCE)
      : direction === 'up'
        ? Math.max(0, start.y - CONFIG.MAX_SCAN_DISTANCE)
        : 0;

  const maxBound =
    direction === 'right'
      ? Math.min(screenWidth - 1, start.x + CONFIG.MAX_SCAN_DISTANCE)
      : direction === 'down'
        ? Math.min(screenHeight - 1, start.y + CONFIG.MAX_SCAN_DISTANCE)
        : direction === 'left' || direction === 'up'
          ? Infinity
          : screenWidth;

  let lastPos = pos;

  while (
    (step < 0 && pos > minBound) ||
    (step > 0 && pos < maxBound)
  ) {
    const nextPos = pos + step;

    let gradient: number;
    if (direction === 'left' || direction === 'right') {
      gradient = getGradient(pos, start.y, nextPos, start.y);
    } else {
      gradient = getGradient(start.x, pos, start.x, nextPos);
    }

    // Check if we found an edge
    const distFromStart = Math.abs(pos - (direction === 'left' || direction === 'right' ? start.x : start.y));
    if (gradient > CONFIG.GRADIENT_THRESHOLD && distFromStart > CONFIG.MIN_BOX_SIZE / 2) {
      return pos;
    }

    lastPos = pos;
    pos = nextPos;
  }

  return lastPos;
}

/**
 * Calculate confidence score for detected region
 */
function calculateConfidence(
  face: FaceBounds,
  edges: Edges,
  screenWidth: number,
  screenHeight: number
): number {
  let confidence = 0.5; // Base confidence

  // Boost if face is in corner
  const isInCorner =
    (face.centerX < screenWidth * 0.3 || face.centerX > screenWidth * 0.7) &&
    (face.centerY < screenHeight * 0.3 || face.centerY > screenHeight * 0.7);
  if (isInCorner) confidence += 0.15;

  // Boost if face is small (more likely self-view)
  const avgDimension = (face.width + face.height) / 2;
  if (avgDimension < 200) confidence += 0.15;
  else if (avgDimension < 350) confidence += 0.1;

  // Boost if detected region has reasonable aspect ratio (close to 4:3 or 16:9)
  const regionWidth = edges.right - edges.left;
  const regionHeight = edges.bottom - edges.top;
  const aspectRatio = regionWidth / regionHeight;
  if (aspectRatio > 1.1 && aspectRatio < 1.9) confidence += 0.1;

  // Boost if face is roughly centered in detected region
  const regionCenterX = (edges.left + edges.right) / 2;
  const regionCenterY = (edges.top + edges.bottom) / 2;
  const faceOffsetX = Math.abs(face.centerX - regionCenterX) / regionWidth;
  const faceOffsetY = Math.abs(face.centerY - regionCenterY) / regionHeight;
  if (faceOffsetX < 0.2 && faceOffsetY < 0.2) confidence += 0.1;

  return Math.min(1, confidence);
}

/**
 * Create fallback region - use most of the window (since we're doing window capture)
 * When no good rectangle is found, the video likely fills most of the window
 * Leave some margin for UI controls (typically at bottom)
 */
function createFallbackRegion(
  face: FaceBounds,
  screenWidth: number,
  screenHeight: number
): DetectedRegion {
  // For window capture, use almost the entire window
  // Leave small margins for potential UI elements
  const marginX = Math.min(20, screenWidth * 0.02);
  const marginTop = Math.min(10, screenHeight * 0.01);
  const marginBottom = Math.min(80, screenHeight * 0.1); // More margin at bottom for controls

  return {
    x: Math.round(marginX),
    y: Math.round(marginTop),
    width: Math.round(screenWidth - marginX * 2),
    height: Math.round(screenHeight - marginTop - marginBottom),
    confidence: 0.6, // Reasonable confidence since window capture = video area
  };
}
