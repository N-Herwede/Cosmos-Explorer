import * as THREE from 'three';

const UNIFIED_SPHERE_VERTEX = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const BILLBOARD_VERTEX = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float scaleX = length(vec3(modelMatrix[0]));
        float scaleY = length(vec3(modelMatrix[1]));
        mvCenter.x += position.x * scaleX;
        mvCenter.y += position.y * scaleY;
        gl_Position = projectionMatrix * mvCenter;
    }
`;

const DETAIL_ENHANCE_GLSL = `
float csDetailWave(vec3 p) {
    float a = sin(p.x * 1.7 + p.y * 0.9 + p.z * 1.3);
    float b = cos(p.x * 2.6 - p.y * 1.8 + p.z * 2.1);
    float c = sin(p.x * 4.2 + p.y * 3.1 - p.z * 2.7);
    return (a * 0.5 + b * 0.35 + c * 0.15) * 0.5 + 0.5;
}

vec3 csEnhanceDetail(vec3 color, vec3 n, vec3 sunDir) {
    float micro = csDetailWave(n * 18.0 + vec3(0.7, 1.3, 2.1));
    float meso = csDetailWave(n * 8.0 + vec3(2.4, -1.1, 0.4));
    float detail = clamp(micro * 0.62 + meso * 0.38, 0.0, 1.0);
    float detailBoost = mix(0.92, 1.14, smoothstep(0.15, 0.85, detail));
    float sunWrap = clamp(dot(n, sunDir) * 0.5 + 0.5, 0.0, 1.0);
    float terminatorBoost = mix(1.04, 1.0, sunWrap);
    vec3 enhanced = color * detailBoost * terminatorBoost;
    float luma = dot(enhanced, vec3(0.2126, 0.7152, 0.0722));
    enhanced = mix(vec3(luma), enhanced, 1.06);
    return clamp(enhanced, 0.0, 1.0);
}
`;

export function extractShaderFromHtml(html, id = 'fs') {
    const re = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
    const match = html.match(re);
    return match ? match[1].trim() : '';
}

async function fetchTextWithTimeout(url, timeoutMs = 2500) {
    let timeoutId = null;
    let controller = null;
    try {
        if (typeof AbortController !== 'undefined') {
            controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }
        const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return await res.text();
    } catch (err) {
        if (err?.name === 'AbortError') {
            throw new Error(`Timeout after ${timeoutMs}ms for ${url}`);
        }
        throw err;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function loadShaderFromIframe(url, scriptId = 'fs', timeoutMs = 2500) {
    if (typeof document === 'undefined') {
        throw new Error('iframe shader fallback unavailable (no document)');
    }

    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.width = '0';
        iframe.height = '0';
        iframe.setAttribute('aria-hidden', 'true');

        let done = false;
        const finish = (fn, payload) => {
            if (done) return;
            done = true;
            if (timerId) clearTimeout(timerId);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            fn(payload);
        };

        const timerId = setTimeout(() => {
            finish(reject, new Error(`Iframe timeout after ${timeoutMs}ms for ${url}`));
        }, timeoutMs);

        iframe.onload = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) {
                    finish(reject, new Error(`No iframe document for ${url}`));
                    return;
                }
                const script = doc.getElementById(scriptId);
                const fragment = script?.textContent?.trim() || '';
                if (!fragment) {
                    finish(reject, new Error(`Fragment shader not found in iframe for ${url}`));
                    return;
                }
                finish(resolve, fragment);
            } catch (err) {
                finish(reject, err instanceof Error ? err : new Error(String(err)));
            }
        };

        iframe.onerror = () => {
            finish(reject, new Error(`Iframe load failed for ${url}`));
        };

        iframe.src = url;
        document.body.appendChild(iframe);
    });
}

export function prepareUnifiedFragment(fragment) {
    let out = fragment;
    // Remove extension lines because Three.js injects its own preamble before shader source.
    out = out.replace(/^\s*#extension[^\n]*\n/gm, '');
    out = out.replace(/void\s+main\s*\(\s*\)/m, 'void legacyMain()');

    const hasSunDirUniform = /uniform\s+vec3\s+uSunDir\b/.test(out);
    if (!/varying\s+vec3\s+vNormal\b/.test(out)) {
        const precisionMatch = out.match(/precision\s+\w+\s+float\s*;/);
        if (precisionMatch) {
            out = out.replace(
                precisionMatch[0],
                `${precisionMatch[0]}\n\nvarying vec3 vNormal;\n${hasSunDirUniform ? '' : 'uniform vec3 uSunDir;\n'}uniform float uAmbientBoost;\nuniform float uMinLight;\nuniform float uSunBoost;\nuniform float uNightBoost;\nuniform float uShadowStrength;`
            );
        } else if (/#extension[^\n]+/.test(out)) {
            out = out.replace(
                /(#extension[^\n]+)/,
                `$1\nprecision highp float;\n\nvarying vec3 vNormal;\n${hasSunDirUniform ? '' : 'uniform vec3 uSunDir;\n'}uniform float uAmbientBoost;\nuniform float uMinLight;\nuniform float uSunBoost;\nuniform float uNightBoost;\nuniform float uShadowStrength;`
            );
        } else {
            out = `precision highp float;\n\nvarying vec3 vNormal;\n${hasSunDirUniform ? '' : 'uniform vec3 uSunDir;\n'}uniform float uAmbientBoost;\nuniform float uMinLight;\nuniform float uSunBoost;\nuniform float uNightBoost;\nuniform float uShadowStrength;\n${out}`;
        }
    } else if (!/uniform\s+float\s+uAmbientBoost\b/.test(out)) {
        out = out.replace(
            /(varying\s+vec3\s+vNormal\s*;)/,
            `$1\n${hasSunDirUniform ? '' : 'uniform vec3 uSunDir;\n'}uniform float uAmbientBoost;\nuniform float uMinLight;\nuniform float uSunBoost;\nuniform float uNightBoost;\nuniform float uShadowStrength;`
        );
    }
    if (!/uniform\s+vec3\s+uSunDir\b/.test(out)) {
        out = out.replace(/(varying\s+vec3\s+vNormal\s*;)/, '$1\nuniform vec3 uSunDir;');
    }

    const hasMainImageFn = /void\s+mainImage\s*\(/.test(out);
    const hasBaseColorFn = /vec3\s+baseColor\s*\(/.test(out);
    const hasPlanetRadius = /PLANET_RADIUS/.test(out);
    const radiusExpr = hasPlanetRadius ? 'PLANET_RADIUS' : '1.0';
    if (hasMainImageFn) {
        out += `
void main() {
    vec3 n = normalize(vNormal);
    float minRes = min(iResolution.x, iResolution.y);
    vec2 fragCoord = iResolution.xy * 0.5 + n.xy * ${radiusExpr} * (0.5 * minRes);
    vec4 color;
    mainImage(color, fragCoord);
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    gl_FragColor = vec4(color.rgb, 1.0);
}
`;
    } else if (hasBaseColorFn) {
        out += `
${DETAIL_ENHANCE_GLSL}
void main() {
    vec3 n = normalize(vNormal);
    vec3 color = clamp(baseColor(n), 0.0, 1.0);
    float sunWrap = clamp(dot(n, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
    float shadow = mix(1.0 - uShadowStrength, 1.0, sunWrap);
    color *= shadow;
    float nightFactor = 1.0 - sunWrap;
    color += vec3(uAmbientBoost);
    color *= mix(1.0, uNightBoost, nightFactor);
    color *= mix(1.0, 1.0 + uSunBoost, sunWrap);
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    if (luma < uMinLight) {
        float scale = (luma < 0.0001) ? 0.0 : (uMinLight / luma);
        color = (luma < 0.0001) ? vec3(uMinLight) : color * scale;
    }
    color = csEnhanceDetail(color, n, normalize(uSunDir));
    gl_FragColor = vec4(color, 1.0);
}
`;
    }

    return out;
}

export function prepareBaseColorFragment(fragment) {
    let out = fragment;
    // Remove extension lines because Three.js injects its own preamble before shader source.
    out = out.replace(/^\s*#extension[^\n]*\n/gm, '');
    out = out.replace(/void\s+main\s*\(\s*\)/m, 'void legacyMain()');

    if (!/vec3\s+baseColor\s*\(/.test(out)) {
        return null;
    }

    if (!/varying\s+vec3\s+vNormal\b/.test(out)) {
        const precisionMatch = out.match(/precision\s+\w+\s+float\s*;/);
        if (precisionMatch) {
            out = out.replace(precisionMatch[0], `${precisionMatch[0]}\n\nvarying vec3 vNormal;\nuniform vec3 uSunDir;\nuniform float uShadowStrength;\nuniform float uMinLight;`);
        } else if (/#extension[^\n]+/.test(out)) {
            out = out.replace(/(#extension[^\n]+)/, `$1\nprecision highp float;\n\nvarying vec3 vNormal;\nuniform vec3 uSunDir;\nuniform float uShadowStrength;\nuniform float uMinLight;`);
        } else {
            out = `precision highp float;\n\nvarying vec3 vNormal;\nuniform vec3 uSunDir;\nuniform float uShadowStrength;\nuniform float uMinLight;\n${out}`;
        }
    } else if (!/uniform\s+vec3\s+uSunDir\b/.test(out)) {
        out = out.replace(/(varying\s+vec3\s+vNormal\s*;)/, `$1\nuniform vec3 uSunDir;\nuniform float uShadowStrength;\nuniform float uMinLight;`);
    }

    if (!/uniform\s+float\s+uShadowStrength\b/.test(out)) {
        if (/uniform\s+vec3\s+uSunDir\b/.test(out)) {
            out = out.replace(/(uniform\s+vec3\s+uSunDir\s*;)/, `$1\nuniform float uShadowStrength;`);
        } else {
            out = out.replace(/(varying\s+vec3\s+vNormal\s*;)/, `$1\nuniform float uShadowStrength;`);
        }
    }

    if (!/uniform\s+float\s+uMinLight\b/.test(out)) {
        if (/uniform\s+float\s+uShadowStrength\b/.test(out)) {
            out = out.replace(/(uniform\s+float\s+uShadowStrength\s*;)/, `$1\nuniform float uMinLight;`);
        } else {
            out = out.replace(/(varying\s+vec3\s+vNormal\s*;)/, `$1\nuniform float uMinLight;`);
        }
    }

    out += `
${DETAIL_ENHANCE_GLSL}
void main() {
    vec3 n = normalize(vNormal);
    vec3 base = baseColor(n);
    float sunWrap = clamp(dot(n, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
    float shadow = mix(1.0 - uShadowStrength, 1.0, sunWrap);
    vec3 color = clamp(base * shadow, 0.0, 1.0);
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    if (luma < uMinLight) {
        float scale = (luma < 0.0001) ? 0.0 : (uMinLight / luma);
        color = (luma < 0.0001) ? vec3(uMinLight) : color * scale;
    }
    color = csEnhanceDetail(color, n, normalize(uSunDir));
    color = pow(color, vec3(0.4545));
    gl_FragColor = vec4(color, 1.0);
}
`;

    return out;
}

export function createUnifiedShaderMaterial(fragmentShader) {
    const material = new THREE.ShaderMaterial({
        vertexShader: UNIFIED_SPHERE_VERTEX,
        fragmentShader,
        uniforms: {
            iResolution: { value: new THREE.Vector3(2, 2, 1) },
            iTime: { value: 0 },
            uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uCamPos: { value: new THREE.Vector3(0, 0, 5.5) },
            uCamTarget: { value: new THREE.Vector3(0, 0, 0) },
            uAmbientBoost: { value: 0.0 },
            uMinLight: { value: 0.2 },
            uSunBoost: { value: 0.0 },
            uNightBoost: { value: 1.0 },
            uShadowStrength: { value: 0.18 }
        },
        transparent: false,
        depthWrite: true,
        depthTest: true,
        toneMapped: false
    });
    material.blending = THREE.NoBlending;
    material.opacity = 1;
    material.side = THREE.FrontSide;
    material.extensions = { derivatives: true };
    return material;
}

export function createBaseColorShaderMaterial(fragmentShader) {
    const material = new THREE.ShaderMaterial({
        vertexShader: UNIFIED_SPHERE_VERTEX,
        fragmentShader,
        uniforms: {
            iResolution: { value: new THREE.Vector3(2, 2, 1) },
            iTime: { value: 0 },
            uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uShadowStrength: { value: 0.18 },
            uMinLight: { value: 0.2 }
        },
        transparent: false,
        depthWrite: true,
        depthTest: true,
        toneMapped: false
    });
    material.blending = THREE.NoBlending;
    material.opacity = 1;
    material.side = THREE.FrontSide;
    return material;
}

export function createFallbackShaderMaterial(color = 0x888888) {
    const col = new THREE.Color(color);
    const material = new THREE.ShaderMaterial({
        vertexShader: UNIFIED_SPHERE_VERTEX,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float light = dot(normalize(vNormal), normalize(vec3(0.2, 0.8, 0.3))) * 0.5 + 0.5;
                vec3 base = vec3(${col.r.toFixed(3)}, ${col.g.toFixed(3)}, ${col.b.toFixed(3)});
                gl_FragColor = vec4(base * (0.5 + 0.5 * light), 1.0);
            }
        `,
        transparent: false,
        depthWrite: true,
        depthTest: true
    });
    material.blending = THREE.NoBlending;
    material.opacity = 1;
    material.side = THREE.FrontSide;
    return material;
}

export function createStablePlanetMaterial(color = 0x888888, options = {}) {
    const base = new THREE.Color(color);
    const accent = options.accentColor ?? base.clone().lerp(new THREE.Color(0xffffff), options.accentMix ?? 0.35);
    const band = options.bandColor ?? base.clone().lerp(new THREE.Color(0x000000), options.bandMix ?? 0.35);
    const ice = options.iceColor ?? base.clone().lerp(new THREE.Color(0xffffff), options.iceMix ?? 0.6);
    const seed = options.seed ?? 1.0;
    const bandScale = options.bandScale ?? 6.0;
    const noiseScale = options.noiseScale ?? 3.2;
    const bandStrength = options.bandStrength ?? 0.6;
    const detailStrength = options.detailStrength ?? 0.5;
    const iceStrength = options.iceStrength ?? 0.2;

    const material = new THREE.ShaderMaterial({
        vertexShader: UNIFIED_SPHERE_VERTEX,
        fragmentShader: `
            precision highp float;
            varying vec3 vNormal;
            uniform vec3 uBaseColor;
            uniform vec3 uAccentColor;
            uniform vec3 uBandColor;
            uniform vec3 uIceColor;
            uniform vec3 uSunDir;
            uniform float uShadowStrength;
            uniform float uSeed;
            uniform float uBandScale;
            uniform float uNoiseScale;
            uniform float uBandStrength;
            uniform float uDetailStrength;
            uniform float uIceStrength;

            float hash(vec3 p) {
                p = fract(p * vec3(0.1031, 0.1030, 0.0973));
                p += dot(p, p.yxz + 33.33);
                return fract((p.x + p.y) * p.z);
            }

            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                               mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                           mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                               mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
            }

            float fbm(vec3 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p = p * 2.0 + vec3(1.7, -2.1, 0.9);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec3 n = normalize(vNormal);
                float lat = n.y;
                float detail = fbm(n * uNoiseScale + uSeed);
                float bands = sin((lat * uBandScale + detail * 0.6) * 3.14159265);
                float bandMask = smoothstep(-0.2, 0.2, bands);

                vec3 banded = mix(uBandColor, uBaseColor, bandMask);
                banded = mix(banded, uAccentColor, detail * 0.4);
                vec3 color = mix(uBaseColor, banded, uBandStrength);

                float rock = fbm(n * (uNoiseScale * 2.4) + uSeed * 1.7);
                vec3 rocky = color * (0.75 + 0.5 * rock);
                color = mix(color, rocky, uDetailStrength);

                float polar = smoothstep(0.65, 0.95, abs(lat));
                color = mix(color, uIceColor, polar * uIceStrength);

                float sunWrap = clamp(dot(n, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
                float shadow = mix(1.0 - uShadowStrength, 1.0, sunWrap);
                color *= shadow;

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        uniforms: {
            uBaseColor: { value: base },
            uAccentColor: { value: accent },
            uBandColor: { value: band },
            uIceColor: { value: ice },
            uSunDir: { value: new THREE.Vector3(1, 0, 0) },
            uShadowStrength: { value: 0.18 },
            uSeed: { value: seed },
            uBandScale: { value: bandScale },
            uNoiseScale: { value: noiseScale },
            uBandStrength: { value: bandStrength },
            uDetailStrength: { value: detailStrength },
            uIceStrength: { value: iceStrength }
        },
        transparent: false,
        depthWrite: true,
        depthTest: true,
        toneMapped: false
    });
    material.blending = THREE.NoBlending;
    material.opacity = 1;
    material.side = THREE.FrontSide;
    return material;
}

export async function loadShaderFragment(url, scriptId = 'fs') {
    const fragment = await loadShaderFragmentRaw(url, scriptId);
    return prepareUnifiedFragment(fragment);
}

export async function loadShaderFragmentRaw(url, scriptId = 'fs') {
    const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';

    if (isFileProtocol) {
        try {
            return await loadShaderFromIframe(url, scriptId, 2200);
        } catch (iframeErr) {
            const iframeMessage = iframeErr instanceof Error ? iframeErr.message : String(iframeErr);
            throw new Error(`Shader load failed for ${url} on file://; iframe fallback failed: ${iframeMessage}`);
        }
    }

    let fetchErr = null;
    try {
        const html = await fetchTextWithTimeout(url);
        const fragment = extractShaderFromHtml(html, scriptId);
        if (fragment) return fragment;
        fetchErr = new Error(`Fragment shader not found in ${url}`);
    } catch (err) {
        fetchErr = err instanceof Error ? err : new Error(String(err));
    }

    try {
        return await loadShaderFromIframe(url, scriptId);
    } catch (iframeErr) {
        const iframeMessage = iframeErr instanceof Error ? iframeErr.message : String(iframeErr);
        throw new Error(`${fetchErr?.message ?? `Shader load failed for ${url}`}; iframe fallback failed: ${iframeMessage}`);
    }
}

export function prepareBillboardFragment(fragment) {
    let out = fragment;
    out = out.replace(/^\s*#extension[^\n]*\n/gm, '');
    out = out.replace(/void\s+main\s*\(\s*\)/m, 'void legacyMain()');

    if (!/varying\s+vec2\s+vUv\b/.test(out)) {
        const precisionMatch = out.match(/precision\s+\w+\s+float\s*;/);
        if (precisionMatch) {
            out = out.replace(precisionMatch[0], `${precisionMatch[0]}\nvarying vec2 vUv;`);
        } else {
            out = `precision highp float;\nvarying vec2 vUv;\n${out}`;
        }
    }

    out += `
void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec4 color;
    mainImage(color, fragCoord);
    if (color.a < 0.003) discard;
    gl_FragColor = color;
}
`;
    return out;
}

export function extractPlanetRadius(fragment) {
    const match = fragment.match(/#define\s+PLANET_RADIUS\s+([0-9.]+)/);
    if (match) return parseFloat(match[1]);
    const constMatch = fragment.match(/const\s+float\s+PLANET_RADIUS\s*=\s*([0-9.]+)/);
    return constMatch ? parseFloat(constMatch[1]) : 0.75;
}

export function createBillboardShaderMaterial(fragmentShader) {
    const material = new THREE.ShaderMaterial({
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader,
        uniforms: {
            iResolution: { value: new THREE.Vector3(2, 2, 1) },
            iTime: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    material.blending = THREE.NormalBlending;
    material.extensions = { derivatives: true };
    return material;
}
