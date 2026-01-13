#version 300 es

// Per-vertex attributes (unit quad corners)
in vec2 a_position;

// Per-instance attributes (from root buffer)
in vec2 a_instanceRoot;
in float a_instanceRadius;

// Camera uniforms
uniform vec2 u_center;
uniform float u_scale;
uniform vec2 u_resolution;

// Output to fragment shader
out vec2 v_localPos;

void main() {
    v_localPos = a_position;

    // Skip if radius is zero/negative (invalid root)
    if (a_instanceRadius <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // off-screen
        return;
    }

    // Position quad in world space
    vec2 worldPos = a_instanceRoot + a_position * a_instanceRadius;

    // Apply camera transform
    vec2 viewPos = (worldPos - u_center) / u_scale;

    // Aspect ratio correction (scale is vertical extent)
    float aspect = u_resolution.x / u_resolution.y;
    viewPos.x /= aspect;

    gl_Position = vec4(viewPos, 0.0, 1.0);
}
