// WebGL2 utilities

/**
 * Initialize WebGL2 context from a canvas element
 */
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    throw new Error('WebGL2 not supported');
  }

  return gl;
}

/**
 * Compile a shader from source
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

/**
 * Create a program from vertex and fragment shader sources
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }

  // Clean up shaders after linking
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Create a program with transform feedback varyings
 */
export function createProgramWithTransformFeedback(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  varyings: string[],
  bufferMode: number = gl.INTERLEAVED_ATTRIBS
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // Must specify varyings before linking
  gl.transformFeedbackVaryings(program, varyings, bufferMode);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Create and populate a buffer
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  data: BufferSource | null,
  usage: number = gl.STATIC_DRAW
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);

  return buffer;
}

/**
 * Create an empty buffer with specified size
 */
export function createEmptyBuffer(
  gl: WebGL2RenderingContext,
  byteSize: number,
  usage: number = gl.DYNAMIC_DRAW
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, byteSize, usage);

  return buffer;
}

/**
 * Resize canvas to match display size and return dimensions
 */
export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement
): { width: number; height: number; resized: boolean } {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  const resized = canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (resized) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return { width: canvas.width, height: canvas.height, resized };
}
