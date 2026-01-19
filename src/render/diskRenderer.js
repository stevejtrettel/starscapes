import { createProgram, createBuffer } from '../gl.js';
import diskVertSource from './shaders/disk.vert?raw';
import diskFragSource from './shaders/disk.frag?raw';

/**
 * Renders disks using instanced quads.
 * Each instance is positioned by (root.x, root.y) with a given radius.
 *
 * RootBuffer format: { buffer: WebGLBuffer, count: number }
 * Camera format: { center: [x, y], scale: number }
 */
export class DiskRenderer {
  constructor(gl) {
    this.gl = gl;
    this.program = createProgram(gl, diskVertSource, diskFragSource);

    // Get attribute locations
    this.positionLoc = gl.getAttribLocation(this.program, 'a_position');
    this.instanceRootLoc = gl.getAttribLocation(this.program, 'a_instanceRoot');
    this.instanceRadiusLoc = gl.getAttribLocation(this.program, 'a_instanceRadius');
    this.instanceDiscriminantLoc = gl.getAttribLocation(this.program, 'a_instanceDiscriminant');

    // Get uniform locations
    this.centerLoc = gl.getUniformLocation(this.program, 'u_center');
    this.scaleLoc = gl.getUniformLocation(this.program, 'u_scale');
    this.resolutionLoc = gl.getUniformLocation(this.program, 'u_resolution');
    this.highlightDiscriminantLoc = gl.getUniformLocation(this.program, 'u_highlightDiscriminant');

    // Create unit quad (two triangles)
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
       1,  1,
      -1, -1,
       1,  1,
      -1,  1,
    ]);
    this.quadBuffer = createBuffer(gl, quadVertices);

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) throw new Error('Failed to create VAO');

    gl.bindVertexArray(this.vao);

    // Set up quad vertices (per-vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Bind a root buffer for rendering.
   * Root buffer format: [re, im, radius, discriminant, re, im, radius, discriminant, ...]
   * (4 floats per root, interleaved)
   */
  bindRootBuffer(rootBuffer) {
    const gl = this.gl;
    const stride = 4 * 4; // 4 floats * 4 bytes

    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, rootBuffer.buffer);

    // instanceRoot: vec2 at offset 0
    gl.enableVertexAttribArray(this.instanceRootLoc);
    gl.vertexAttribPointer(this.instanceRootLoc, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(this.instanceRootLoc, 1); // per-instance

    // instanceRadius: float at offset 8
    gl.enableVertexAttribArray(this.instanceRadiusLoc);
    gl.vertexAttribPointer(this.instanceRadiusLoc, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(this.instanceRadiusLoc, 1); // per-instance

    // instanceDiscriminant: float at offset 12
    gl.enableVertexAttribArray(this.instanceDiscriminantLoc);
    gl.vertexAttribPointer(this.instanceDiscriminantLoc, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(this.instanceDiscriminantLoc, 1); // per-instance

    gl.bindVertexArray(null);
  }

  /**
   * Render all disks with the given camera settings.
   */
  render(rootBuffer, camera, resolution, highlightDiscriminant) {
    const gl = this.gl;

    gl.useProgram(this.program);

    // Set uniforms
    gl.uniform2f(this.centerLoc, camera.center[0], camera.center[1]);
    gl.uniform1f(this.scaleLoc, camera.scale);
    gl.uniform2f(this.resolutionLoc, resolution[0], resolution[1]);
    gl.uniform1f(this.highlightDiscriminantLoc, highlightDiscriminant);

    // Standard alpha blending for dark dots on light background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw instanced quads
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, rootBuffer.count);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
  }
}

/**
 * Create a root buffer from raw data.
 * Data format: [re, im, radius, discriminant, ...]
 */
export function createRootBuffer(gl, data) {
  const buffer = createBuffer(gl, data, gl.STATIC_DRAW);
  return {
    buffer,
    count: data.length / 4,
  };
}
