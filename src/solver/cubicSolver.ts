import { createProgramWithTransformFeedback, createBuffer, createEmptyBuffer } from '../gl';
import { CONFIG } from '../config';
import type { RootBuffer } from '../render/diskRenderer';
import type { Solver } from './types';

import solveVertSource from './shaders/solveCubic.vert?raw';
import passFragSource from './shaders/passthrough.frag?raw';

/**
 * GPU-based cubic polynomial root solver using transform feedback.
 * Uses Cardano's formula to find complex roots.
 */
export class CubicSolver implements Solver {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private transformFeedback: WebGLTransformFeedback;
  private vao: WebGLVertexArrayObject;

  // Attribute location
  private coefficientsLoc: number;

  // Uniform location
  private radiusScaleLoc: WebGLUniformLocation;

  // Output buffer (reused across solve calls)
  private outputBuffer: WebGLBuffer | null = null;
  private outputCapacity = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Create program with transform feedback varyings
    this.program = createProgramWithTransformFeedback(
      gl,
      solveVertSource,
      passFragSource,
      ['v_root', 'v_radius', 'v_discriminant'],
      gl.INTERLEAVED_ATTRIBS
    );

    // Get locations
    this.coefficientsLoc = gl.getAttribLocation(this.program, 'a_coefficients');
    this.radiusScaleLoc = gl.getUniformLocation(this.program, 'u_radiusScale')!;

    // Create transform feedback object
    const tf = gl.createTransformFeedback();
    if (!tf) throw new Error('Failed to create transform feedback');
    this.transformFeedback = tf;

    // Create VAO
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    this.vao = vao;
  }

  /**
   * Solve for roots of cubic polynomials.
   *
   * @param coefficientBuffer Buffer containing coefficients [a, b, c, d, a, b, c, d, ...]
   * @param count Number of polynomials
   * @returns RootBuffer with solved roots
   */
  solve(coefficientBuffer: WebGLBuffer, count: number): RootBuffer {
    const gl = this.gl;

    // Ensure output buffer is large enough
    // Output: 4 floats per root (re, im, radius, discriminant)
    const requiredBytes = count * 4 * 4;
    if (this.outputCapacity < requiredBytes) {
      if (this.outputBuffer) {
        gl.deleteBuffer(this.outputBuffer);
      }
      // Allocate with some headroom
      this.outputCapacity = requiredBytes * 2;
      this.outputBuffer = createEmptyBuffer(gl, this.outputCapacity, gl.DYNAMIC_COPY);
    }

    // Set up VAO with coefficient buffer
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, coefficientBuffer);
    gl.enableVertexAttribArray(this.coefficientsLoc);
    gl.vertexAttribPointer(this.coefficientsLoc, 4, gl.FLOAT, false, 0, 0); // 4 floats for cubic
    gl.bindVertexArray(null);

    // Use program
    gl.useProgram(this.program);
    gl.uniform1f(this.radiusScaleLoc, CONFIG.RADIUS_SCALE);

    // Set up transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.outputBuffer);

    // Disable rasterization (we only want transform feedback output)
    gl.enable(gl.RASTERIZER_DISCARD);

    // Execute solve pass
    gl.bindVertexArray(this.vao);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    gl.bindVertexArray(null);

    // Clean up
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    return {
      buffer: this.outputBuffer!,
      count,
    };
  }

  /**
   * Solve polynomials from a Float32Array of coefficients.
   * Convenience method that handles buffer creation.
   */
  solveFromArray(coefficients: Float32Array): RootBuffer {
    const gl = this.gl;
    const count = coefficients.length / 4; // 4 coefficients per cubic

    // Create coefficient buffer
    const coeffBuffer = createBuffer(gl, coefficients, gl.STREAM_DRAW);

    // Solve
    const result = this.solve(coeffBuffer, count);

    // Clean up input buffer (output is kept)
    gl.deleteBuffer(coeffBuffer);

    return result;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteTransformFeedback(this.transformFeedback);
    gl.deleteVertexArray(this.vao);
    if (this.outputBuffer) {
      gl.deleteBuffer(this.outputBuffer);
    }
  }
}
