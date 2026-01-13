#version 300 es
precision highp float;

in vec2 v_localPos;
in float v_discriminant;

out vec4 fragColor;

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    float r = length(v_localPos);

    // Discard pixels outside the disk
    if (r > 1.0) {
        discard;
    }

    // Soft edge for antialiasing
    float alpha = 1.0 - smoothstep(0.85, 1.0, r);

    // Map discriminant to color
    // Discriminant is negative for complex roots, typically -10000 to ~0
    // Use log scale for better distribution
    float d = -v_discriminant; // Make positive
    float t = log(d + 1.0) / log(10001.0); // Normalize to 0-1 range

    // Map to hue (blue to red spectrum)
    float hue = 0.7 - t * 0.7; // Blue (0.7) to Red (0.0)
    vec3 color = hsv2rgb(vec3(hue, 0.8, 0.4)); // Dark, saturated colors

    fragColor = vec4(color, alpha * 0.7);
}
