/**
 * Instanced disk renderer, raw WebGL2. Instances live in world coordinates
 * RELATIVE to a per-generation anchor (the view center at request time) —
 * absolute float32 coordinates jitter at deep zoom; window-relative offsets
 * survive the cast, and camera − anchor is computed here in float64. The
 * camera is applied in the vertex shader, so already-uploaded roots
 * re-project for free while a new view computes, and opaque size-ordered
 * compositing is the hardware depth test with depth = radius (design.md:
 * smallest disk wins per pixel).
 *
 * Instance layout, interleaved Float32 ×6: [x, y, radiusWorld, r, g, b].
 */
import type { Camera } from "../camera.ts";

export const FLOATS_PER_INSTANCE = 6;

const VERT = `#version 300 es
layout(location=0) in vec2 corner;        // unit quad, per vertex
layout(location=1) in vec2 iPos;          // per instance, world − anchor
layout(location=2) in float iRadius;      // per instance, world units
layout(location=3) in vec3 iColor;

uniform vec2 uCenter;     // camera center − anchor (float64 subtraction, CPU-side)
uniform vec2 uScale;      // clip units per world unit (x carries aspect)
uniform float uMinRadius; // half a pixel in world units — tiny dots stay visible
uniform float uRadiusCap; // style cap: normalizes radius into depth [0,1]

out vec2 vLocal;
out vec3 vColor;

void main() {
  float r = max(iRadius, uMinRadius);
  vec2 world = iPos + corner * r;
  vec2 clip = (world - uCenter) * uScale;
  // Smaller disks draw nearer: depth increases with radius.
  float depth = clamp(iRadius / uRadiusCap, 0.0, 1.0) * 1.9 - 0.95;
  gl_Position = vec4(clip, depth, 1.0);
  vLocal = corner;
  vColor = iColor;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec3 vColor;
out vec4 outColor;

void main() {
  if (dot(vLocal, vLocal) > 1.0) discard;
  outColor = vec4(vColor, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export interface DiskRenderer {
  /** Drop all instances; positions of the new generation are relative to this anchor. */
  begin(anchorRe: number, anchorIm: number): void;
  /** Append styled instances (FLOATS_PER_INSTANCE floats each). */
  append(data: Float32Array, count: number): void;
  draw(camera: Camera, viewportW: number, viewportH: number): void;
  readonly count: number;
  /** Instances discarded because the buffer filled — nonzero means the view is incomplete. */
  readonly dropped: number;
}

export function createDiskRenderer(
  gl: WebGL2RenderingContext,
  opts: { capacity?: number; radiusCap?: number } = {},
): DiskRenderer {
  const capacity = opts.capacity ?? 1_500_000;
  const radiusCap = opts.radiusCap ?? 0.5;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link: ${gl.getProgramInfoLog(program)}`);
  }
  const uCenter = gl.getUniformLocation(program, "uCenter");
  const uScale = gl.getUniformLocation(program, "uScale");
  const uMinRadius = gl.getUniformLocation(program, "uMinRadius");
  const uRadiusCap = gl.getUniformLocation(program, "uRadiusCap");

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  // Unit quad (two triangles), per-vertex.
  const quad = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Instance buffer, preallocated.
  const instances = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.bufferData(gl.ARRAY_BUFFER, capacity * FLOATS_PER_INSTANCE * 4, gl.DYNAMIC_DRAW);
  const stride = FLOATS_PER_INSTANCE * 4;
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 8);
  gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 12);
  gl.vertexAttribDivisor(3, 1);

  gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);

  let count = 0;
  let dropped = 0;
  let anchorRe = 0;
  let anchorIm = 0;

  return {
    get count() {
      return count;
    },
    get dropped() {
      return dropped;
    },
    begin(aRe, aIm) {
      count = 0;
      dropped = 0;
      anchorRe = aRe;
      anchorIm = aIm;
    },
    append(data, n) {
      const room = Math.min(n, capacity - count);
      dropped += n - room;
      if (room <= 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferSubData(
        gl.ARRAY_BUFFER, count * stride,
        data, 0, room * FLOATS_PER_INSTANCE,
      );
      count += room;
    },
    draw(camera, viewportW, viewportH) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(1, 1, 1, 1);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (count === 0) return;

      const aspect = viewportW / viewportH;
      const worldPerPx = camera.height / viewportH;
      gl.useProgram(program);
      gl.uniform2f(uCenter, camera.centerRe - anchorRe, camera.centerIm - anchorIm);
      gl.uniform2f(uScale, 2 / (camera.height * aspect), 2 / camera.height);
      gl.uniform1f(uMinRadius, 0.5 * worldPerPx);
      gl.uniform1f(uRadiusCap, radiusCap);
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      gl.bindVertexArray(null);
    },
  };
}
