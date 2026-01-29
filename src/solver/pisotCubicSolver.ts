import { createProgramWithTransformFeedback, createBuffer, createEmptyBuffer } from '../gl';
import { CONFIG } from '../config';
import type { RootBuffer } from '../render/diskRenderer';
import type { Solver } from './types';

import solveVertSource from './shaders/solvePisotCubic.vert?raw';
import passFragSource from './shaders/passthrough.frag?raw';

/**
 * GPU-based cubic solver that keeps only Pisot polynomials:
 * one real root > 1, complex conjugate pair inside the unit circle.
 */
export class PisotCubicSolver implements Solver {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private transformFeedback: WebGLTransformFeedback;
  private vao: WebGLVertexArrayObject;

  private coefficientsLoc: number;
  private radiusScaleLoc: WebGLUniformLocation;

  private outputBuffer: WebGLBuffer | null = null;
  private outputCapacity = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.program = createProgramWithTransformFeedback(
      gl,
      solveVertSource,
      passFragSource,
      ['v_root', 'v_radius', 'v_discriminant'],
      gl.INTERLEAVED_ATTRIBS
    );

    this.coefficientsLoc = gl.getAttribLocation(this.program, 'a_coefficients');
    this.radiusScaleLoc = gl.getUniformLocation(this.program, 'u_radiusScale')!;

    const tf = gl.createTransformFeedback();
    if (!tf) throw new Error('Failed to create transform feedback');
    this.transformFeedback = tf;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    this.vao = vao;
  }

  solve(coefficientBuffer: WebGLBuffer, count: number): RootBuffer {
    const gl = this.gl;

    const requiredBytes = count * 4 * 4;
    if (this.outputCapacity < requiredBytes) {
      if (this.outputBuffer) {
        gl.deleteBuffer(this.outputBuffer);
      }
      this.outputCapacity = requiredBytes * 2;
      this.outputBuffer = createEmptyBuffer(gl, this.outputCapacity, gl.DYNAMIC_COPY);
    }

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, coefficientBuffer);
    gl.enableVertexAttribArray(this.coefficientsLoc);
    gl.vertexAttribPointer(this.coefficientsLoc, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.useProgram(this.program);
    gl.uniform1f(this.radiusScaleLoc, CONFIG.RADIUS_SCALE);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.outputBuffer);

    gl.enable(gl.RASTERIZER_DISCARD);

    gl.bindVertexArray(this.vao);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    gl.bindVertexArray(null);

    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    return {
      buffer: this.outputBuffer!,
      count,
    };
  }

  solveFromArray(coefficients: Float32Array): RootBuffer {
    const gl = this.gl;
    const count = coefficients.length / 4;
    const coeffBuffer = createBuffer(gl, coefficients, gl.STREAM_DRAW);
    const result = this.solve(coeffBuffer, count);
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
