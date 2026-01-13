import { createProgram, createBuffer } from '../gl';
import diskVertSource from './shaders/disk.vert?raw';
import diskFragSource from './shaders/disk.frag?raw';

export interface RootBuffer {
  buffer: WebGLBuffer;
  count: number;
}

export interface Camera {
  center: [number, number];
  scale: number;
}

/**
 * Renders disks using instanced quads.
 * Each instance is positioned by (root.x, root.y) with a given radius.
 */
export class DiskRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private quadBuffer: WebGLBuffer;

  // Attribute locations
  private positionLoc: number;
  private instanceRootLoc: number;
  private instanceRadiusLoc: number;
  private instanceDiscriminantLoc: number;

  // Uniform locations
  private centerLoc: WebGLUniformLocation;
  private scaleLoc: WebGLUniformLocation;
  private resolutionLoc: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, diskVertSource, diskFragSource);

    // Get attribute locations
    this.positionLoc = gl.getAttribLocation(this.program, 'a_position');
    this.instanceRootLoc = gl.getAttribLocation(this.program, 'a_instanceRoot');
    this.instanceRadiusLoc = gl.getAttribLocation(this.program, 'a_instanceRadius');
    this.instanceDiscriminantLoc = gl.getAttribLocation(this.program, 'a_instanceDiscriminant');

    // Get uniform locations
    this.centerLoc = gl.getUniformLocation(this.program, 'u_center')!;
    this.scaleLoc = gl.getUniformLocation(this.program, 'u_scale')!;
    this.resolutionLoc = gl.getUniformLocation(this.program, 'u_resolution')!;

    // Create unit quad (two triangles)
    // prettier-ignore
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
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    this.vao = vao;

    gl.bindVertexArray(this.vao);

    // Set up quad vertices (per-vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    // divisor = 0 means per-vertex (default)

    gl.bindVertexArray(null);
  }

  /**
   * Bind a root buffer for rendering.
   * Root buffer format: [re, im, radius, discriminant, re, im, radius, discriminant, ...]
   * (4 floats per root, interleaved)
   */
  bindRootBuffer(rootBuffer: RootBuffer): void {
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
  render(rootBuffer: RootBuffer, camera: Camera, resolution: [number, number]): void {
    const gl = this.gl;

    gl.useProgram(this.program);

    // Set uniforms
    gl.uniform2f(this.centerLoc, camera.center[0], camera.center[1]);
    gl.uniform1f(this.scaleLoc, camera.scale);
    gl.uniform2f(this.resolutionLoc, resolution[0], resolution[1]);

    // Standard alpha blending for dark dots on light background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw instanced quads
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, rootBuffer.count);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  dispose(): void {
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
export function createRootBuffer(
  gl: WebGL2RenderingContext,
  data: Float32Array
): RootBuffer {
  const buffer = createBuffer(gl, data, gl.STATIC_DRAW);
  return {
    buffer,
    count: data.length / 4,
  };
}
