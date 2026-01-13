#version 300 es
precision highp float;

// Minimal fragment shader for transform feedback passes.
// No output needed - we use RASTERIZER_DISCARD.

void main() {
    discard;
}
