import { createProgramWithTransformFeedback, createBuffer, createEmptyBuffer } from '../gl.js';
import { CONFIG } from '../config.js';

import solveVertSource from './shaders/solveQuadratic.vert?raw';
import passFragSource from './shaders/passthrough.frag?raw';

/**
 * GPU-based quadratic polynomial root solver using transform feedback.
 * Takes coefficient buffers and produces root buffers.
 *
 * Implements the Solver interface (see solver/types.js for documentation).
 */
export class QuadraticSolver {
  constructor(gl) {
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
    this.radiusScaleLoc = gl.getUniformLocation(this.program, 'u_radiusScale');

    // Create transform feedback object
    this.transformFeedback = gl.createTransformFeedback();
    if (!this.transformFeedback) throw new Error('Failed to create transform feedback');

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) throw new Error('Failed to create VAO');

    // Output buffer (reused across solve calls)
    this.outputBuffer = null;
    this.outputCapacity = 0;
  }

  /**
   * Solve for roots of quadratic polynomials.
   *
   * @param coefficientBuffer Buffer containing coefficients [a, b, c, a, b, c, ...]
   * @param count Number of polynomials
   * @returns RootBuffer with solved roots
   */
  solve(coefficientBuffer, count) {
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
    gl.vertexAttribPointer(this.coefficientsLoc, 3, gl.FLOAT, false, 0, 0);
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
      buffer: this.outputBuffer,
      count,
    };
  }

  /**
   * Solve polynomials from a Float32Array of coefficients.
   * Convenience method that handles buffer creation.
   */
  solveFromArray(coefficients) {
    const gl = this.gl;
    const count = coefficients.length / 3;

    // Create coefficient buffer
    const coeffBuffer = createBuffer(gl, coefficients, gl.STREAM_DRAW);

    // Solve
    const result = this.solve(coeffBuffer, count);

    // Clean up input buffer (output is kept)
    gl.deleteBuffer(coeffBuffer);

    return result;
  }

  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteTransformFeedback(this.transformFeedback);
    gl.deleteVertexArray(this.vao);
    if (this.outputBuffer) {
      gl.deleteBuffer(this.outputBuffer);
    }
  }
}
