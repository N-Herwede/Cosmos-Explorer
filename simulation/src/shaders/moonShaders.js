export const MOON_VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
varying float vHeight;

vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(
            mix(hash3(i).x, hash3(i + vec3(1.0, 0.0, 0.0)).x, f.x),
            mix(hash3(i + vec3(0.0, 1.0, 0.0)).x, hash3(i + vec3(1.0, 1.0, 0.0)).x, f.x),
            f.y
        ),
        mix(
            mix(hash3(i + vec3(0.0, 0.0, 1.0)).x, hash3(i + vec3(1.0, 0.0, 1.0)).x, f.x),
            mix(hash3(i + vec3(0.0, 1.0, 1.0)).x, hash3(i + vec3(1.0, 1.0, 1.0)).x, f.x),
            f.y
        ),
        f.z
    );
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
        f += amp * noise(p);
        p *= 2.02;
        amp *= 0.5;
    }
    return f;
}

float voronoiCrater(vec3 p, float sparsity) {
    vec3 n = floor(p);
    vec3 f = fract(p);
    float d = 1.0;

    for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
                vec3 g = vec3(float(i), float(j), float(k));
                vec3 h = hash3(n + g);
                if (h.z > sparsity) continue;
                vec3 r = g + h - f;
                float d2 = dot(r, r);
                d = min(d, d2);
            }
        }
    }

    d = sqrt(d);
    float hole = smoothstep(0.55, 0.1, d);
    float rim = smoothstep(0.55, 0.7, d) * smoothstep(0.85, 0.7, d);
    return -1.0 * hole + 0.15 * rim;
}

float getSurfaceHeight(vec3 p) {
    float shape = noise(p * 1.5) * 0.05;
    float mariaNoise = fbm(p * 0.8);
    float mariaMask = smoothstep(0.4, 0.65, mariaNoise);
    vec3 q = p + fbm(p * 3.0) * 0.05;
    float c1 = voronoiCrater(q * 2.5, 0.2);
    float c2 = voronoiCrater(q * 6.0, 0.25) * 0.4;
    float dust = fbm(p * 50.0) * 0.008;
    float craters = (c1 + c2) * mix(0.1, 1.0, mariaMask);
    return shape + (craters * 0.08) + dust;
}

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 p = position;
    float h = getSurfaceHeight(p);
    vHeight = h;
    vec3 newPos = p + normalize(p) * h * 0.8;
    vPosition = newPos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

export const MOON_FRAGMENT_SHADER = `
precision highp float;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vHeight;

uniform vec3 sunPosition;

vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(
            mix(hash3(i).x, hash3(i + vec3(1.0, 0.0, 0.0)).x, f.x),
            mix(hash3(i + vec3(0.0, 1.0, 0.0)).x, hash3(i + vec3(1.0, 1.0, 0.0)).x, f.x),
            f.y
        ),
        mix(
            mix(hash3(i + vec3(0.0, 0.0, 1.0)).x, hash3(i + vec3(1.0, 0.0, 1.0)).x, f.x),
            mix(hash3(i + vec3(0.0, 1.0, 1.0)).x, hash3(i + vec3(1.0, 1.0, 1.0)).x, f.x),
            f.y
        ),
        f.z
    );
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
        f += amp * noise(p);
        p *= 2.02;
        amp *= 0.5;
    }
    return f;
}

float voronoiCrater(vec3 p, float sparsity) {
    vec3 n = floor(p);
    vec3 f = fract(p);
    float d = 1.0;

    for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
                vec3 g = vec3(float(i), float(j), float(k));
                vec3 h = hash3(n + g);
                if (h.z > sparsity) continue;
                vec3 r = g + h - f;
                float d2 = dot(r, r);
                d = min(d, d2);
            }
        }
    }

    d = sqrt(d);
    float hole = smoothstep(0.55, 0.1, d);
    float rim = smoothstep(0.55, 0.7, d) * smoothstep(0.85, 0.7, d);
    return -1.0 * hole + 0.15 * rim;
}

float getSurfaceHeight(vec3 p) {
    float shape = noise(p * 1.5) * 0.05;
    float mariaNoise = fbm(p * 0.8);
    float mariaMask = smoothstep(0.4, 0.65, mariaNoise);
    vec3 q = p + fbm(p * 3.0) * 0.05;
    float c1 = voronoiCrater(q * 2.5, 0.2);
    float c2 = voronoiCrater(q * 6.0, 0.25) * 0.4;
    float dust = fbm(p * 50.0) * 0.008;
    float craters = (c1 + c2) * mix(0.1, 1.0, mariaMask);
    return shape + (craters * 0.08) + dust;
}

void main() {
    vec3 p = vPosition;
    float eps = 0.005;
    float h = getSurfaceHeight(p);
    float hx = getSurfaceHeight(p + vec3(eps, 0.0, 0.0));
    float hy = getSurfaceHeight(p + vec3(0.0, eps, 0.0));
    float hz = getSurfaceHeight(p + vec3(0.0, 0.0, eps));

    vec3 nA = normalize(vec3(hx - h, hy - h, hz - h));
    vec3 normal = normalize(vNormal - nA * 8.0);

    vec3 lightDir = normalize(sunPosition);
    float diff = max(dot(normal, lightDir), 0.0);
    diff = smoothstep(-0.15, 0.15, diff);

    vec3 dustColor = vec3(0.65, 0.63, 0.6);
    vec3 mariaColor = vec3(0.25, 0.23, 0.25);

    float mariaMask = smoothstep(0.4, 0.65, fbm(normalize(p) * 0.8));
    vec3 albedo = mix(mariaColor, dustColor, mariaMask);

    float noiseVar = fbm(p * 10.0);
    albedo *= 0.85 + 0.3 * noiseVar;

    vec3 col = albedo * diff;

    float shadow = smoothstep(-0.2, 0.2, dot(normal, lightDir));
    col *= shadow;

    col += vec3(0.01);
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}
`;
