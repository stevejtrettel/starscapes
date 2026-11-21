/**
 * Instanced discs in raw WebGL2, with the compositing of render/raster.ts:
 *
 *   pass 1  discs of at least half a pixel: opaque, depth = radius, so the
 *           smallest disc covering a pixel wins — the depth buffer does the
 *           size ordering, in any drawing order;
 *   pass 2  smaller discs: drawn half a pixel wide with opacity equal to
 *           their true area over the drawn area, blended, so that dust
 *           accumulates as coverage instead of as full dots.
 *
 * Positions are relative to an anchor (the view centre of the request that
 * produced them); the camera offset is subtracted in float64 on the CPU.
 * Uploaded discs therefore re-project for free while the worker computes a
 * new view.
 */
import type { View } from "../../fibre/window.ts";
import { FLOATS_PER_DISC } from "../protocol.ts";

const VERTEX = `#version 300 es
layout(location=0) in vec2 corner;     // unit quad
layout(location=1) in vec2 iPosition;  // world − anchor
layout(location=2) in float iRadius;   // world units
layout(location=3) in vec3 iColour;

uniform vec2 uCentre;      // camera centre − anchor
uniform vec2 uScale;       // clip units per world unit
uniform float uMinRadius;  // half a pixel, in world units
uniform float uMaxRadius;  // for normalising depth
uniform int uDust;         // 0: pass 1, 1: pass 2

out vec2 vLocal;
out vec4 vColour;

void main() {
  bool dust = iRadius < uMinRadius;
  if (dust != (uDust == 1)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);  // outside the clip volume
    return;
  }
  float r = max(iRadius, uMinRadius);
  vec2 clip = (iPosition + corner * r - uCentre) * uScale;
  float depth = clamp(iRadius / uMaxRadius, 0.0, 1.0) * 1.9 - 0.95;
  gl_Position = vec4(clip, depth, 1.0);
  vLocal = corner;
  float coverage = dust ? (iRadius * iRadius) / (uMinRadius * uMinRadius) : 1.0;
  vColour = vec4(iColour, coverage);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vColour;
out vec4 colour;
void main() {
  if (dot(vLocal, vLocal) > 1.0) discard;
  colour = vColour;
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export interface DiscRenderer {
  /** Forget all discs; those appended next are relative to this anchor. */
  begin(anchor: readonly [number, number]): void;
  append(discs: Float32Array, count: number): void;
  draw(view: View, viewportW: number, viewportH: number): void;
  readonly count: number;
  /** Discs refused because the buffer was full: nonzero means the picture is incomplete. */
  readonly dropped: number;
}

export function createDiscRenderer(gl: WebGL2RenderingContext, capacity = 4_000_000): DiscRenderer {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program: ${gl.getProgramInfoLog(program)}`);
  }
  const uniform = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const [uCentre, uScale, uMinRadius, uMaxRadius, uDust] = ["uCentre", "uScale", "uMinRadius", "uMaxRadius", "uDust"].map(uniform);

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const instances = gl.createBuffer()!;
  const stride = FLOATS_PER_DISC * 4;
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.bufferData(gl.ARRAY_BUFFER, capacity * stride, gl.DYNAMIC_DRAW);
  for (const [location, size, offset] of [[1, 2, 0], [2, 1, 8], [3, 3, 12]]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(location, 1);
  }
  gl.bindVertexArray(null);

  let count = 0;
  let dropped = 0;
  let anchor: readonly [number, number] = [0, 0];

  return {
    get count() {
      return count;
    },
    get dropped() {
      return dropped;
    },
    begin(newAnchor) {
      count = 0;
      dropped = 0;
      anchor = newAnchor;
    },
    append(discs, n) {
      const room = Math.min(n, capacity - count);
      dropped += n - room;
      if (room <= 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferSubData(gl.ARRAY_BUFFER, count * stride, discs, 0, room * FLOATS_PER_DISC);
      count += room;
    },
    draw(view, viewportW, viewportH) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(1, 1, 1, 1);
      gl.clearDepth(1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (count === 0) return;

      const pixel = view.height / gl.drawingBufferHeight;
      gl.useProgram(program);
      gl.uniform2f(uCentre, view.centre[0] - anchor[0], view.centre[1] - anchor[1]);
      gl.uniform2f(uScale, 2 / (view.height * (viewportW / viewportH)), 2 / view.height);
      gl.uniform1f(uMinRadius, 0.5 * pixel);
      gl.uniform1f(uMaxRadius, view.height);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);

      gl.disable(gl.BLEND);
      gl.uniform1i(uDust, 0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1i(uDust, 1);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

      gl.bindVertexArray(null);
    },
  };
}
