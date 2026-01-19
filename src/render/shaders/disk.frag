#version 300 es
precision highp float;

in vec2 v_localPos;
in float v_discriminant;

uniform float u_highlightDiscriminant;

out vec4 fragColor;

void main() {
    float r = length(v_localPos);

    // Discard pixels outside the disk
    if (r > 1.0) {
        discard;
    }

    // Soft edge for antialiasing
    float alpha = 1.0 - smoothstep(0.85, 1.0, r);

    // Default: black
    vec3 color = vec3(0.0);

    // Highlight if discriminant matches (tolerance for integer comparison)
    if (abs(v_discriminant - u_highlightDiscriminant) < 0.5) {
        color = vec3(0.9, 0.1, 0.1); // red
    }

    fragColor = vec4(color, alpha * 0.8);
}
