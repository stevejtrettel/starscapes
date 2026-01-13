import './style.css';
import { createContext, resizeCanvasToDisplaySize } from './gl';
import { DiskRenderer } from './render/diskRenderer';
import { QuadraticSolver } from './solver/quadraticSolver';
import { IntegerQuadraticFamily } from './families/integerQuadratic';
import { Camera } from './camera';
import { CONFIG } from './config';

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

  // Create components
  const diskRenderer = new DiskRenderer(gl);
  const solver = new QuadraticSolver(gl);
  const family = new IntegerQuadraticFamily();

  // Generate coefficients
  const totalPolynomials = family.getTotalCount();
  const polynomialCount = Math.min(totalPolynomials, CONFIG.MAX_POLYNOMIAL_COUNT);

  console.log(`Generating ${polynomialCount.toLocaleString()} polynomials...`);

  const coefficients = new Float32Array(polynomialCount * family.coefficientCount);
  const actualCount = family.generate(coefficients, polynomialCount);

  console.log(`Generated ${actualCount.toLocaleString()} polynomials`);

  // Solve for roots on GPU
  console.log('Solving for roots...');
  const startTime = performance.now();
  const rootBuffer = solver.solveFromArray(coefficients);
  const solveTime = performance.now() - startTime;

  console.log(`Solved in ${solveTime.toFixed(1)}ms`);

  // Bind root buffer for rendering
  diskRenderer.bindRootBuffer(rootBuffer);

  // Create interactive camera
  const camera = new Camera(canvas);

  // FPS tracking
  let frameCount = 0;
  let lastFpsTime = performance.now();

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

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      const fps = frameCount / ((now - lastFpsTime) / 1000);
      document.title = `Polynomial Roots | ${fps.toFixed(0)} FPS`;
      frameCount = 0;
      lastFpsTime = now;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  console.log('Polynomial Root Visualizer initialized');
  console.log(`Rendering ${rootBuffer.count.toLocaleString()} roots`);
  console.log('Controls: drag to pan, scroll to zoom');
}

main();
