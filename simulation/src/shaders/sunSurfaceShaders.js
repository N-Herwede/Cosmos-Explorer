export const SUN_SURFACE_VERTEX_SHADER = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

export const SUN_SURFACE_FRAGMENT_SHADER = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform sampler2D iChannel0;
uniform int iSteps;

#define DITHERING
#define pi 3.14159265
#define R(p, a) p = cos(a) * p + sin(a) * vec2(p.y, -p.x)

float pn(in vec3 p) {
    vec3 ip = floor(p);
    p = fract(p);
    p *= p * (3.0 - 2.0 * p);
    vec2 uv = (ip.xy + vec2(37.0, 17.0) * ip.z) + p.xy;
    uv = texture2D(iChannel0, (uv + 0.5) / 256.0).yx;
    return mix(uv.x, uv.y, p.z);
}

float fpn(vec3 p) {
    return pn(p * 0.06125) * 0.57 + pn(p * 0.125) * 0.28 + pn(p * 0.25) * 0.15;
}

float rand(vec2 co) {
    return fract(sin(dot(co * 0.123, vec2(12.9898, 78.233))) * 43758.5453);
}

float cosNoise(in vec2 p) {
    return 0.5 * (sin(p.x) + sin(p.y));
}

const mat2 m2 = mat2(1.6, -1.2, 1.2, 1.6);

float sdTorus(vec3 p, vec2 t) {
    return length(vec2(length(p.xz) - t.x * 1.2, p.y)) - t.y;
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float SunSurface(in vec3 pos) {
    float h = 0.0;
    vec2 q = pos.xz * 0.5;
    float s = 0.5;
    float d2 = 0.0;

    for (int i = 0; i < 6; i++) {
        h += s * cosNoise(q);
        q = m2 * q * 0.85;
        q += vec2(2.41, 8.13);
        s *= 0.48 + 0.2 * h;
    }
    h *= 2.0;

    float d1 = pos.y - h;

    vec3 r1 = mod(2.3 + pos + 1.0, 10.0) - 5.0;
    r1.y = pos.y - 0.1 - 0.7 * h + 0.5 * sin(3.0 * iTime + pos.x + 3.0 * pos.z);
    float c = cos(pos.x);
    float s1 = 1.0;
    r1.xz = c * r1.xz + s1 * vec2(r1.z, -r1.x);
    d2 = sdTorus(r1.xzy, vec2(clamp(abs(pos.x / pos.z), 0.7, 2.5), 0.20));

    return smin(d1, d2, 1.0);
}

float map(vec3 p) {
    p.z += 1.0;
    R(p.yz, -25.5);
    R(p.xz, iMouse.x * 0.008 * pi + iTime * 0.1);
    return SunSurface(p) + fpn(p * 50.0 + iTime * 25.0) * 0.45;
}

vec3 firePalette(float i) {
    float T = 1400.0 + 1300.0 * i;
    vec3 L = vec3(7.4, 5.6, 4.4);
    L = pow(L, vec3(5.0)) * (exp(1.43876719683e5 / (T * L)) - 1.0);
    return 1.0 - exp(-5e8 / L);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec3 rd = normalize(vec3((fragCoord - 0.5 * iResolution.xy) / iResolution.y, 1.0));
    vec3 ro = vec3(0.0, 0.0, -22.0);

    float ld = 0.0;
    float td = 0.0;
    float w = 0.0;
    float d = 1.0;
    float t = 1.0;
    const float h = 0.1;
    vec3 tc = vec3(0.0);

#ifdef DITHERING
    vec2 pos = fragCoord / iResolution.xy;
    vec2 seed = pos + fract(iTime);
#endif

    const int MAX_STEPS = 56;
    for (int i = 0; i < MAX_STEPS; i++) {
        if (i >= iSteps) break;
        if (td > (1.0 - 1.0 / 80.0) || d < 0.001 * t || t > 40.0) break;

        d = map(ro + t * rd);

        ld = (h - d) * step(d, h);
        w = (1.0 - td) * ld;

        tc += w * w + 1.0 / 50.0;
        td += w + 1.0 / 200.0;

#ifdef DITHERING
        d = abs(d) * (0.8 + 0.28 * rand(seed * vec2(float(i))));
        d = max(d, 0.04);
#else
        d = max(d, 0.04);
#endif

        t += d * 0.5;
    }

    tc = firePalette(tc.x);
    gl_FragColor = vec4(tc, 1.0);
}
`;
