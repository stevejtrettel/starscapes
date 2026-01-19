import { CONFIG } from './config.js';

/**
 * Camera for navigating the complex plane.
 * Handles pan (drag) and zoom (scroll) interactions.
 *
 * Camera state: { center: [x, y], scale: number }
 */
export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.center = [...CONFIG.CAMERA.INITIAL_CENTER];
    this.scale = CONFIG.CAMERA.INITIAL_SCALE;
    this.isDragging = false;
    this.lastMousePos = [0, 0];

    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvas = this.canvas;

    // Mouse down - start drag
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMousePos = [e.clientX, e.clientY];
        canvas.style.cursor = 'grabbing';
      }
    });

    // Mouse move - drag
    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMousePos[0];
        const dy = e.clientY - this.lastMousePos[1];
        this.lastMousePos = [e.clientX, e.clientY];

        // Convert screen pixels to world units
        const pixelsPerUnit = this.getPixelsPerUnit();
        this.center[0] -= dx / pixelsPerUnit;
        this.center[1] += dy / pixelsPerUnit; // Y is inverted in screen space
      }
    });

    // Mouse up - end drag
    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    // Mouse leave - end drag
    canvas.addEventListener('mouseleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    // Wheel - zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Get mouse position in world coordinates before zoom
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPosBefore = this.screenToWorld(mouseX, mouseY);

      // Apply zoom
      const zoomFactor = e.deltaY > 0 ? CONFIG.CAMERA.ZOOM_SPEED : 1 / CONFIG.CAMERA.ZOOM_SPEED;
      this.scale = Math.max(
        CONFIG.CAMERA.MIN_SCALE,
        Math.min(CONFIG.CAMERA.MAX_SCALE, this.scale * zoomFactor)
      );

      // Get mouse position in world coordinates after zoom
      const worldPosAfter = this.screenToWorld(mouseX, mouseY);

      // Adjust center so mouse stays at same world position
      this.center[0] += worldPosBefore[0] - worldPosAfter[0];
      this.center[1] += worldPosBefore[1] - worldPosAfter[1];
    });

    // Set initial cursor
    canvas.style.cursor = 'grab';
  }

  /**
   * Get pixels per world unit (based on vertical extent).
   */
  getPixelsPerUnit() {
    return this.canvas.height / this.scale;
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX, screenY) {
    const pixelsPerUnit = this.getPixelsPerUnit();
    const aspect = this.canvas.width / this.canvas.height;

    // Screen center
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Offset from screen center
    const offsetX = screenX - centerX;
    const offsetY = centerY - screenY; // Y inverted

    // Convert to world units
    const worldX = this.center[0] + (offsetX / pixelsPerUnit) * aspect;
    const worldY = this.center[1] + offsetY / pixelsPerUnit;

    return [worldX, worldY];
  }

  /**
   * Get camera state for rendering.
   */
  getState() {
    return {
      center: [...this.center],
      scale: this.scale,
    };
  }

  /**
   * Reset camera to initial position.
   */
  reset() {
    this.center = [...CONFIG.CAMERA.INITIAL_CENTER];
    this.scale = CONFIG.CAMERA.INITIAL_SCALE;
  }
}
