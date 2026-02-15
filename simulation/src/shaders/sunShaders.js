// Sun shader adapted from https://www.shadertoy.com/view/lsf3RH (trisomie21).
// License: CC BY-NC-SA 3.0.
export const SUN_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const SUN_FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec4 uFreqs;
uniform sampler2D uNoiseTex;

varying vec2 vUv;

float snoise(vec3 uv, float res)
{
    const vec3 s = vec3(1e0, 1e2, 1e4);

    uv *= res;

    vec3 uv0 = floor(mod(uv, res)) * s;
    vec3 uv1 = floor(mod(uv + vec3(1.0), res)) * s;

    vec3 f = fract(uv);
    f = f * f * (3.0 - 2.0 * f);

    vec4 v = vec4(
        uv0.x + uv0.y + uv0.z,
        uv1.x + uv0.y + uv0.z,
        uv0.x + uv1.y + uv0.z,
        uv1.x + uv1.y + uv0.z
    );

    vec4 r = fract(sin(v * 1e-3) * 1e5);
    float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

    r = fract(sin((v + uv1.z - uv0.z) * 1e-3) * 1e5);
    float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

    return mix(r0, r1, f.z) * 2.0 - 1.0;
}

void main() {
    float brightness = uFreqs.y * 0.25 + uFreqs.z * 0.25;
    float radius = 0.24 + brightness * 0.2;
    float invRadius = 1.0 / radius;

    vec3 orange = vec3(0.8, 0.65, 0.3);
    vec3 orangeRed = vec3(0.8, 0.35, 0.1);
    float time = uTime * 0.1;

    vec2 uv = vUv;
    vec2 p = -0.5 + uv;

    float fade = pow(length(2.0 * p), 0.5);
    float fVal1 = 1.0 - fade;
    float fVal2 = 1.0 - fade;

    float angle = atan(p.x, p.y) / 6.2832;
    float dist = length(p);
    vec3 coord = vec3(angle, dist, time * 0.1);

    float newTime1 = abs(snoise(coord + vec3(0.0, -time * (0.35 + brightness * 0.001), time * 0.015), 15.0));
    float newTime2 = abs(snoise(coord + vec3(0.0, -time * (0.15 + brightness * 0.001), time * 0.015), 45.0));
    for (int i = 1; i <= 7; i++) {
        float power = pow(2.0, float(i + 1));
        fVal1 += (0.5 / power) * snoise(coord + vec3(0.0, -time, time * 0.2), (power * (10.0) * (newTime1 + 1.0)));
        fVal2 += (0.5 / power) * snoise(coord + vec3(0.0, -time, time * 0.2), (power * (25.0) * (newTime2 + 1.0)));
    }

    float corona = pow(fVal1 * max(1.1 - fade, 0.0), 2.0) * 50.0;
    corona += pow(fVal2 * max(1.1 - fade, 0.0), 2.0) * 50.0;
    corona *= 1.2 - newTime1;

    vec3 starSphere = vec3(0.0);
    vec2 sp = -1.0 + 2.0 * uv;
    sp *= (2.0 - brightness);
    float r = dot(sp, sp);
    float f = (1.0 - sqrt(abs(1.0 - r))) / r + brightness * 0.5;
    if (dist < radius) {
        corona *= pow(dist * invRadius, 24.0);
        vec2 newUv;
        newUv.x = sp.x * f;
        newUv.y = sp.y * f;
        newUv += vec2(time, 0.0);

        vec3 texSample = texture2D(uNoiseTex, newUv).rgb;
        float uOff = (texSample.g * brightness * 4.5 + time);
        vec2 starUV = newUv + vec2(uOff, 0.0);
        starSphere = texture2D(uNoiseTex, starUV).rgb;
    }

    float starGlow = min(max(1.0 - dist * (1.0 - brightness), 0.0), 1.0);
    vec3 color = vec3(f * (0.75 + brightness * 0.3) * orange) + starSphere + corona * orange + starGlow * orangeRed;

    // Add spherical depth so the sun reads as volumetric rather than a flat disk.
    float coreRadius = max(radius, 0.18);
    float radial = clamp(dist / coreRadius, 0.0, 1.35);
    float sphereDepth = sqrt(max(0.0, 1.0 - min(1.0, radial * radial)));
    float limb = pow(1.0 - sphereDepth, 1.6);
    color *= mix(0.74, 1.24, sphereDepth);
    color += orangeRed * limb * (0.18 + brightness * 0.1);

    color = color / (color + vec3(1.3));
    float coreAlpha = smoothstep(coreRadius + 0.08, coreRadius - 0.02, dist);
    float coronaAlpha = smoothstep(coreRadius + 0.28, coreRadius + 0.02, dist) * 0.8;
    float alpha = clamp(max(coreAlpha, coronaAlpha), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;
