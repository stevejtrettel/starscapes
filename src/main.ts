import './style.css';
import { createContext, resizeCanvasToDisplaySize } from './gl';
import { DiskRenderer, createRootBuffer } from './render/diskRenderer';
import { Camera } from './camera';

function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const gl = createContext(canvas);

  // Initial resize
  resizeCanvasToDisplaySize(canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Set clear color to dark background
  gl.clearColor(0.0, 0.0, 0.05, 1.0);

  // Create disk renderer
  const diskRenderer = new DiskRenderer(gl);

  // Create some test disks
  // Format: [re, im, radius, re, im, radius, ...]
  // prettier-ignore
  const testRoots = new Float32Array([
    // A few disks at various positions in the upper half-plane
     0.0, 1.0, 0.5,   // center disk
    -2.0, 1.5, 0.3,   // left
     2.0, 1.5, 0.3,   // right
     0.0, 3.0, 0.8,   // top center
    -1.0, 0.5, 0.2,   // lower left
     1.0, 0.5, 0.2,   // lower right
    -3.0, 2.0, 0.4,   // far left
     3.0, 2.0, 0.4,   // far right
     0.0, 0.3, 0.1,   // very close to axis (small)
     0.0, 5.0, 1.0,   // high up (large)
  ]);

  const rootBuffer = createRootBuffer(gl, testRoots);
  diskRenderer.bindRootBuffer(rootBuffer);

  // Create interactive camera
  const camera = new Camera(canvas);

  function render() {
    // Handle resize
    const { width, height, resized } = resizeCanvasToDisplaySize(canvas);
    if (resized) {
      gl.viewport(0, 0, width, height);
    }

    // Clear
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render disks with current camera state
    diskRenderer.render(rootBuffer, camera.getState(), [width, height]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  console.log('Polynomial Root Visualizer initialized');
  console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
  console.log(`Rendering ${rootBuffer.count} test disks`);
  console.log('Controls: drag to pan, scroll to zoom');
}

main();
