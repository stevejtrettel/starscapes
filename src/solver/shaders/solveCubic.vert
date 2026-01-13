#version 300 es

// Input: coefficients (a, b, c, d) for ax³ + bx² + cx + d
in vec4 a_coefficients;

// Output: root position, radius, and discriminant (for transform feedback)
out vec2 v_root;
out float v_radius;
out float v_discriminant;

// Radius scale factor
uniform float u_radiusScale;

// Cube root that handles negative numbers
float cbrt(float x) {
    return sign(x) * pow(abs(x), 1.0 / 3.0);
}

void main() {
    float a = a_coefficients.x;
    float b = a_coefficients.y;
    float c = a_coefficients.z;
    float d = a_coefficients.w;

    // Handle degenerate case (not actually a cubic)
    if (abs(a) < 1e-10) {
        v_root = vec2(0.0);
        v_radius = 0.0;
        v_discriminant = 0.0;
        gl_Position = vec4(0.0);
        return;
    }

    // Convert to monic: x³ + (b/a)x² + (c/a)x + (d/a)
    float p1 = b / a;
    float p2 = c / a;
    float p3 = d / a;

    // Depress the cubic by substituting x = t - p1/3
    // Get t³ + pt + q = 0
    float p = p2 - p1 * p1 / 3.0;
    float q = 2.0 * p1 * p1 * p1 / 27.0 - p1 * p2 / 3.0 + p3;

    // Discriminant: Δ = -4p³ - 27q²
    // Δ < 0: one real root + complex conjugate pair
    // Δ ≥ 0: three real roots (skip)
    float discriminant = -4.0 * p * p * p - 27.0 * q * q;

    if (discriminant >= 0.0) {
        // Three real roots - skip
        v_root = vec2(0.0);
        v_radius = 0.0;
        v_discriminant = 0.0;
        gl_Position = vec4(0.0);
        return;
    }

    // Cardano's formula
    // D = q²/4 + p³/27 > 0 when Δ < 0
    float D = q * q / 4.0 + p * p * p / 27.0;
    float sqrtD = sqrt(D);

    float u = cbrt(-q / 2.0 + sqrtD);
    float v = cbrt(-q / 2.0 - sqrtD);

    // Complex roots (upper half-plane):
    // t = -(u+v)/2 ± i(u-v)√3/2
    // x = t - p1/3
    float shift = p1 / 3.0;
    float re = -(u + v) / 2.0 - shift;
    float im = abs(u - v) * sqrt(3.0) / 2.0;

    // Only take upper half-plane (im > 0)
    if (im <= 0.0) {
        v_root = vec2(0.0);
        v_radius = 0.0;
        v_discriminant = 0.0;
        gl_Position = vec4(0.0);
        return;
    }

    v_root = vec2(re, im);
    v_discriminant = discriminant;

    // Compress discriminant range with sqrt for more reasonable radius variation
    v_radius = u_radiusScale * im / sqrt(abs(discriminant));

    gl_Position = vec4(0.0);
}
