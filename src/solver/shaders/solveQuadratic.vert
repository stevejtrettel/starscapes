#version 300 es

// Input: coefficients (a, b, c) for ax² + bx + c
in vec3 a_coefficients;

// Output: root position, radius, and discriminant (for transform feedback)
out vec2 v_root;
out float v_radius;
out float v_discriminant;

// Radius scale factor
uniform float u_radiusScale;

void main() {
    float a = a_coefficients.x;
    float b = a_coefficients.y;
    float c = a_coefficients.z;

    // Compute discriminant
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant >= 0.0 || a == 0.0) {
        // Real roots or invalid polynomial - skip
        v_root = vec2(0.0);
        v_radius = 0.0;
        v_discriminant = 0.0;
    } else {
        // Complex conjugate roots
        // z = (-b ± i√(-Δ)) / (2a)
        float twoA = 2.0 * a;
        float re = -b / twoA;
        float im = sqrt(-discriminant) / abs(twoA);

        v_root = vec2(re, im);
        v_radius = u_radiusScale * im / abs(discriminant);
        v_discriminant = discriminant;
    }

    // Position is unused (RASTERIZER_DISCARD)
    gl_Position = vec4(0.0);
}
