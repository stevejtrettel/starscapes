#version 300 es
precision highp float;

in vec2 v_localPos;
in float v_discriminant;

out vec4 fragColor;

void main() {
    float r = length(v_localPos);

    // Discard pixels outside the disk
    if (r > 1.0) {
        discard;
    }

    // Soft edge for antialiasing
    float alpha = 1.0 - smoothstep(0.85, 1.0, r);

    // Simple solid dark color for debugging
    fragColor = vec4(0.2, 0.2, 0.2, alpha * 0.8);
}
