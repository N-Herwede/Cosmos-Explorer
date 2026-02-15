export const MOON_SURFACE_VERTEX_SHADER = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

export const MOON_SURFACE_FRAGMENT_SHADER = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

#define R iResolution
#define N normalize

float n31(vec3 p) {
    vec3 s = vec3(7.0, 157.0, 113.0), ip = floor(p);
    p = fract(p);
    p = p * p * (3.0 - 2.0 * p);
    vec4 h = vec4(0.0, s.yz, 270.0) + dot(ip, s);
    h = mix(fract(sin(h) * 43.5453), fract(sin(h + s.x) * 43.5453), p.x);
    h.xy = mix(h.xz, h.yw, p.y);
    return mix(h.x, h.y, p.z);
}

mat2 rot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

float box(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
    float r, k, t, h;
    float bmp = (
        n31(p) +
        n31(p * 2.12) * 0.5 +
        n31(p * 4.42) * 0.25 +
        n31(p * 8.54) * 0.125 +
        n31(p * 16.32) * 0.062 +
        n31(p * 32.98) * 0.031 +
        n31(p * 63.52) * 0.0156
    ) * 0.5 * (0.5 + 2.0 * exp(-pow(length(p.xz - vec2(0.5, 2.2)), 2.0) * 0.26));

    float a = p.y - 0.27 - bmp;
    float b = (bmp * bmp * 0.5 - 0.5) * 0.12;
    p.xy = -p.xy;
    p.x /= 0.95 - cos((p.z + 1.2 - sign(p.x)) * 0.8) * 0.1;
    vec3 tp = p;
    tp.z = mod(tp.z - 0.5, 0.4) - 0.2;
    t = max(box(tp, vec3(2.0, 0.16, 0.12 + tp.y * 0.25)), box(p - vec3(0.0, 0.0, 1.1), vec3(2.0, 0.16, 1.7)));
    tp = p;
    tp.x = abs(p.x) - 1.65;
    tp.z -= 1.1;
    t = min(t, box(tp, vec3(0.53 - 0.12 * tp.z, 0.16, 1.6)));
    p.z /= cos(p.z * 0.1);
    vec2 q = p.xz;
    q.x = abs(q.x);
    k = q.x * 0.12 + q.y;
    if (k < 0.0) r = length(q) - 1.2;
    else if (k > 2.48) r = length(q - vec2(0.0, 2.5)) - 1.5;
    else r = dot(q, vec2(0.99, -0.12)) - 1.2;

    b -= max(max(r, p.y), -t);
    h = clamp(0.5 + 0.5 * (b - a) / -0.8, 0.0, 1.0);
    return mix(b, a, h) + 0.8 * h * (1.0 - h);
}

vec3 NM(vec3 p, float t) {
    vec3 n = vec3(0.0), e;
    for (int i = 0; i < 4; i++) {
        e = 0.5773 * (2.0 * vec3(((i + 3) >> 1) & 1, (i >> 1) & 1, i & 1) - 1.0);
        n += e * map(p + 0.005 * t * e);
    }
    return N(n);
}

float ao(vec3 p, vec3 n, float h) { return map(p + h * n) / h; }

vec3 lights(vec3 p, vec3 rd, float dist) {
    vec3 ld = N(vec3(6.0, 3.0, -10.0) - p);
    vec3 n = NM(p, dist) + n31(p * 79.0625) * 0.15 - 0.15;
    float aoV = 0.1 + 0.9 * dot(vec3(ao(p, n, 0.1), ao(p, n, 0.4), ao(p, n, 2.0)), vec3(0.2, 0.3, 0.5));
    float l1 = max(0.0, 0.1 + 0.9 * dot(ld, n));
    float l2 = max(0.0, 0.1 + 0.9 * dot(ld * vec3(-1.0, 0.0, -1.0), n)) * 0.2;
    float spe = max(0.0, dot(rd, reflect(ld, n))) * 0.1;
    float fre = smoothstep(0.7, 1.0, 1.0 + dot(rd, n));
    float s = 1.0;
    float t = 0.1;
    for (float i = 0.0; i < 30.0; i++) {
        float h = map(p + ld * t);
        s = min(s, 15.0 * h / t);
        t += h;
        if (s < 0.001) break;
    }
    l1 *= 0.1 + 0.9 * clamp(s, 0.0, 1.0);
    return mix(0.3, 0.4, fre) * ((l1 + l2) * aoV + spe) * vec3(2.0, 1.8, 1.7);
}

float d = 0.0;
vec3 march(vec3 ro, vec3 rd) {
    vec3 p;
    d = 0.01;
    for (float i = 0.0; i < 96.0; i++) {
        p = ro + rd * d;
        float h = map(p);
        if (abs(h) < 0.0015) break;
        d += h;
    }
    return lights(p, rd, d) * exp(-d * 0.14);
}

void mainImage(out vec4 fragColor, vec2 fc) {
    float t = mod(iTime * 0.2, 30.0);
    vec2 q = fc / R.xy;
    vec2 uv = (fc - 0.5 * R.xy) / R.y;
    vec2 m = iMouse / R.xy;
    vec2 mc = (m - 0.5) * 2.0;
    vec3 c, f, r;
    vec3 ro = vec3(0.0, 0.2, -4.0);
    ro.yz *= rot(-sin(t * 0.3) * 0.1 - 0.6 + mc.y * 0.4);
    ro.xz *= rot(1.1 + cos(t) * 0.2 + mc.x * 0.8);
    f = N(vec3(0.0, 0.0, 0.8) - ro);
    r = N(cross(vec3(0.0, 1.0, 0.0), f));
    c = pow(march(ro, N(f + r * uv.x + cross(f, r) * uv.y)), vec3(0.45));
    c *= 0.5 + 0.5 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.4);
    fragColor = vec4(c, mix(1.2, 0.0, (d + 1.0) / 8.0));
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
