import './style.css';
import { createContext, resizeCanvasToDisplaySize } from './gl';

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

  function render() {
    // Handle resize
    const { resized } = resizeCanvasToDisplaySize(canvas);
    if (resized) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Clear
    gl.clear(gl.COLOR_BUFFER_BIT);

    // TODO: Render disks here

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  console.log('Polynomial Root Visualizer initialized');
  console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
}

main();
