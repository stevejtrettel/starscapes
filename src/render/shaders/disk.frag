#version 300 es
precision highp float;

in vec2 v_localPos;

out vec4 fragColor;

void main() {
    float r = length(v_localPos);

    // Discard pixels outside the disk
    if (r > 1.0) {
        discard;
    }

    // Soft edge for antialiasing
    float alpha = 1.0 - smoothstep(0.85, 1.0, r);

    // White disk with transparency for additive blending
    fragColor = vec4(1.0, 1.0, 1.0, alpha * 0.3);
}
