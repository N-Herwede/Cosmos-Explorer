import * as THREE from 'three';
import { BODY_CATALOG, BELT_CATALOG } from './bodyCatalog.js?v=20260215-realshader16';
import { loadShaderFragmentRaw, createStablePlanetMaterial, prepareBillboardFragment, extractPlanetRadius, createBillboardShaderMaterial } from './shaderLibrary.js?v=20260215-billboard1';
import { createGlowTexture, createProminenceTexture, createNoiseTexture } from '../utils/textures.js?v=20260215-billboard1';
import { SUN_VERTEX_SHADER, SUN_FRAGMENT_SHADER } from '../shaders/sunShaders.js?v=20260214-sun2';

const ORBIT_SEGMENTS = 256;

export async function createPlanetSystem({ scene, backgroundScene, state, camera, controls, sunFreqs }) {
    const planets = {};
    const labels = {};
    const moonBodyKeys = new Set();
    const orbitLines = [];
    const belts = {};
    let raycastTargets = [];
    const shaderCache = new Map();
    const PLANET_RENDER_MODE = 'shader'; // 'basic' | 'baked' | 'shader'
    const ORBITS_ENABLED = true;

    const tempPlanetPos = new THREE.Vector3();
    const tempSunDir = new THREE.Vector3();
    const tempInvMatrix = new THREE.Matrix4();
    const sunWorldPos = new THREE.Vector3();
    const sunViewPos = new THREE.Vector3();
    const labelWorldPos = new THREE.Vector3();
    const orbitOrigin = new THREE.Vector3(0, 0, 0);
    let ringAsteroidTexture = null;
    const ringSunUniformRefs = [];
    const ringTimeUniformRefs = [];
    const LABEL_UPDATE_INTERVAL_MS = window.innerWidth < 900 ? 66 : 33;
    let lastLabelUpdateAt = 0;
    const yieldToMainThread = () => new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });

    let sunMesh = null;
    let sunGroup = null;
    let sunProminences = [];

    await preloadShaders();
    await createBodies();
    layoutBodies(0, false);
    createOrbitLines();
    createBelts();
    setMoonsVisible(state.showMoons !== false);
    setMoonLabelsVisible(state.showMoonLabels !== false);
    setMinorMoonLabelsVisible(!!state.showMinorMoonLabels);
    updateRaycastTargets();

    return {
        planets,
        labels,
        orbitLines,
        belts,
        sun: { mesh: sunMesh, group: sunGroup, prominences: sunProminences },
        update,
        updateLabels,
        updateRaycastTargets,
        applyPlanetScale,
        applyOrbitScale,
        setOrbitsVisible,
        setLabelsVisible,
        setMoonsVisible,
        setMoonLabelsVisible,
        setMinorMoonLabelsVisible,
        setAsteroidsVisible,
        setKuiperVisible
    };

    function getNobgUrl(url) {
        return url.replace('/webgl/', '/webgl/nobg/');
    }

    async function preloadShaders() {
        if (PLANET_RENDER_MODE === 'basic') return;
        const defs = BODY_CATALOG.filter(def => def.shader?.kind === 'glsl');
        for (const def of defs) {
            const nobgUrl = getNobgUrl(def.shader.url);
            if (shaderCache.has(nobgUrl)) continue;
            try {
                let fragment = await loadShaderFragmentRaw(nobgUrl, def.shader.scriptId);
                if (def.id === 'saturn') {
                    fragment = stripSaturnFlatRing(fragment);
                }
                const planetRadius = extractPlanetRadius(fragment);
                const prepared = prepareBillboardFragment(fragment);
                shaderCache.set(nobgUrl, { fragment: prepared, planetRadius });
            } catch (err) {
                console.warn(`Billboard shader load failed for ${def.id}: ${nobgUrl}`, err);
                shaderCache.set(nobgUrl, null);
            }
            await yieldToMainThread();
        }
    }

    function stripSaturnFlatRing(fragment) {
        let out = fragment;
        out = out.replace(
            /float\s+getRingDensity\s*\(\s*float\s+dist\s*\)\s*\{[\s\S]*?\}\s*(?=vec3\s+getRingColor\s*\()/,
            `float getRingDensity(float dist) {
            return 0.0;
        }
`
        );
        out = out.replace(
            /vec3\s+getRingColor\s*\(\s*float\s+dist\s*\)\s*\{[\s\S]*?\}\s*(?=float\s+raySphere\s*\()/,
            `vec3 getRingColor(float dist) {
            return vec3(0.0);
        }
`
        );
        return out;
    }

    async function createBodies() {
        for (let i = 0; i < BODY_CATALOG.length; i++) {
            const def = BODY_CATALOG[i];
            if (def.shader?.kind === 'sun') {
                const sunBody = createSunBody(def);
                sunMesh = sunBody.mesh;
                sunGroup = sunBody.group;
                sunProminences = sunBody.prominences;
                planets[def.id] = {
                    mesh: sunBody.mesh,
                    group: sunBody.group,
                    data: def.data,
                    angle: 0,
                    shaderMaterial: sunBody.mesh.material,
                    kind: def.kind
                };
                if (def.label) createLabel(def, sunBody.mesh);
                if (i < BODY_CATALOG.length - 1) await yieldToMainThread();
                continue;
            }

            const body = createPlanetBody(def);
            planets[def.id] = body;
            if (def.kind === 'moon' || def.isSatellite) moonBodyKeys.add(def.id);
            if (def.label) createLabel(def, body.mesh);
            if (i < BODY_CATALOG.length - 1) await yieldToMainThread();
        }
    }

    function getVisualRadius(def, radius) {
        if (!radius || def.id === 'sun') return radius;
        if (def.id === 'earth') return radius * 1.6;
        if (def.id === 'mercury' || def.id === 'venus' || def.id === 'mars') return radius * 1.45;
        if (def.id === 'moon') return radius * 1.9;
        if (def.kind === 'moon' || def.isSatellite) {
            if (def.majorMoon) return radius * 1.45;
            return radius * 1.15;
        }
        return radius;
    }

    function createSunBody(def) {
        const data = def.data;
        const group = new THREE.Group();
        group.userData = { ...data, key: def.id };

        const sunSize = data.radius * (def.radiusScale || 2.6);
        const sunGeom = new THREE.PlaneGeometry(sunSize, sunSize, 1, 1);

        const sunMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uFreqs: { value: sunFreqs },
                uNoiseTex: { value: createNoiseTexture() }
            },
            vertexShader: SUN_VERTEX_SHADER,
            fragmentShader: SUN_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(sunGeom, sunMat);
        mesh.renderOrder = 1;
        mesh.userData = { ...data, key: def.id };
        group.add(mesh);

        const glows = [
            { size: 16, op: 0.65, color1: 0xfff2b0, color2: 0xffb347 },
            { size: 24, op: 0.4, color1: 0xffd27a, color2: 0xff8a33 },
            { size: 34, op: 0.25, color1: 0xffa34a, color2: 0xff5c1a },
            { size: 48, op: 0.12, color1: 0xff7a2a, color2: 0xff2d00 }
        ];

        glows.forEach((g, i) => {
            const tex = createGlowTexture(g.color1, g.color2);
            const mat = new THREE.SpriteMaterial({
                map: tex, transparent: true, opacity: g.op,
                blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(g.size, g.size, 1);
            sprite.userData = { type: 'corona', baseScale: g.size, index: i };
            sprite.renderOrder = 3;
            group.add(sprite);
        });

        const prominenceTex = createProminenceTexture();
        const prominenceCount = 10;
        const prominences = [];
        for (let i = 0; i < prominenceCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: prominenceTex, transparent: true, opacity: 0.4 + Math.random() * 0.3,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            const angle = (i / prominenceCount) * Math.PI * 2;
            const dist = 6.8 + Math.random() * 0.4;
            sprite.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
            const scaleY = 2.5 + Math.random() * 2;
            const scaleX = 0.8 + Math.random() * 0.6;
            sprite.scale.set(scaleX, scaleY, 1);
            sprite.material.rotation = angle - Math.PI / 2;
            sprite.userData = {
                type: 'prominence',
                baseScaleX: scaleX,
                baseScaleY: scaleY,
                baseOpacity: mat.opacity,
                index: i
            };
            sprite.visible = false;
            prominences.push(sprite);
            group.add(sprite);
        }

        group.scale.setScalar(state.planetScale);
        scene.add(group);

        return { mesh, group, prominences };
    }

    function createPlanetBody(def) {
        const data = def.data;
        const group = new THREE.Group();
        group.userData = { ...data, key: def.id };

        const visualRadius = getVisualRadius(def, data.radius);
        const isMoonBody = def.kind === 'moon' || def.isSatellite;

        // Try billboard approach first (nobg shaders like the sun method)
        const nobgUrl = def.shader?.url ? getNobgUrl(def.shader.url) : null;
        const cached = nobgUrl ? shaderCache.get(nobgUrl) : null;
        const useBillboard = cached?.fragment;

        let geom, material, mesh;

        if (useBillboard) {
            // Billboard plane sized so the shader's planet matches visualRadius
            const BILLBOARD_SIZE_FACTOR = 2.7;
            const planeSize = visualRadius * BILLBOARD_SIZE_FACTOR;
            geom = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
            material = createBillboardShaderMaterial(cached.fragment);
            mesh = new THREE.Mesh(geom, material);
            mesh.renderOrder = 2;
        } else {
            // Fallback: sphere with procedural material
            const isMinorMoon = isMoonBody && !def.majorMoon;
            const isHeroPlanet = def.id === 'earth' || def.id === 'jupiter' || def.id === 'saturn' || def.id === 'neptune';
            const widthSegments = isMoonBody
                ? (window.innerWidth < 900
                    ? (isMinorMoon ? 16 : 22)
                    : (isMinorMoon ? 20 : 28))
                : (window.innerWidth < 900
                    ? (isHeroPlanet ? 80 : 64)
                    : (isHeroPlanet ? 112 : 80));
            const heightSegments = isMoonBody
                ? Math.max(10, Math.floor(widthSegments * 0.5))
                : Math.max(32, Math.floor(widthSegments * 0.5));
            geom = new THREE.SphereGeometry(visualRadius, widthSegments, heightSegments);
            material = createStableMaterialForDef(def, { ...data, type: data?.type || 'Rocky Moon' });

            if (material) {
                material.transparent = false;
                material.opacity = 1;
                material.depthWrite = true;
                material.depthTest = true;
                material.blending = THREE.NoBlending;
                material.toneMapped = false;
            }
            mesh = new THREE.Mesh(geom, material);
        }

        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData = { ...data, key: def.id };
        group.add(mesh);

        // Ring belt (Saturn's 3D asteroid ring - separate from shader)
        let ringBelt = null;
        if (def.features?.ringBelt) {
            ringBelt = createAsteroidRing(def.features.ringBelt);
            ringBelt.visible = state.showAsteroids;
            group.add(ringBelt);
            mesh.userData.ringBelt = ringBelt;
            belts.saturnRing = ringBelt;
        }

        group.scale.setScalar(state.planetScale);
        scene.add(group);

        return {
            mesh,
            group,
            data,
            visualRadius,
            angle: Math.random() * Math.PI * 2,
            shaderMaterial: material,
            orbit: def.orbit,
            rotationSpeed: def.rotationSpeed,
            isSatellite: def.isSatellite,
            majorMoon: !!def.majorMoon,
            minorMoon: !!def.minorMoon,
            kind: def.kind,
            features: { atmosphere: null, clouds: null, ringBelt }
        };
    }

    function createLabel(def, planetMesh) {
        const div = document.createElement('div');
        div.className = 'planet-label';
        div.textContent = def.data.name;
        document.body.appendChild(div);
        labels[def.id] = {
            element: div,
            planet: planetMesh,
            isMoon: def.kind === 'moon' || def.isSatellite,
            isMajorMoon: !!def.majorMoon,
            isMinorMoon: !!def.minorMoon
        };
    }

    function hashSeed(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = (hash * 31 + id.charCodeAt(i)) % 10000;
        }
        return (hash / 10000) * 6.28318;
    }


    function createStableMaterialForDef(def, data) {
        const type = (data.type || '').toLowerCase();
        const isGas = type.includes('gas');
        const isIce = type.includes('ice');
        const isMoon = def.kind === 'moon' || def.isSatellite;
        const seed = hashSeed(def.id);
        const bandScale = isGas ? 8.0 : isIce ? 6.0 : 3.2;
        const noiseScale = isGas ? 4.2 : isIce ? 3.8 : 4.6;
        const accentMix = isGas ? 0.38 : isIce ? 0.32 : 0.28;
        const bandMix = isGas ? 0.45 : isIce ? 0.35 : 0.4;
        const iceMix = isIce ? 0.7 : 0.45;
        const bandStrength = 0.0;
        const detailStrength = isGas ? 0.45 : isIce ? 0.5 : isMoon ? 0.8 : 0.7;
        const iceStrength = isIce ? 0.32 : 0.05;

        return createStablePlanetMaterial(data.color ?? 0x888888, {
            seed,
            bandScale,
            noiseScale,
            accentMix,
            bandMix,
            iceMix,
            bandStrength,
            detailStrength,
            iceStrength
        });
    }

    function createOrbitLines() {
        if (!ORBITS_ENABLED) return;
        const orbitScene = backgroundScene ?? scene;
        BODY_CATALOG.forEach(def => {
            if (!def.orbit || def.orbit.center !== 'sun') return;
            if (def.isSatellite) return;
            const points = [];
            for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
                const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
                points.push(new THREE.Vector3(
                    Math.cos(a) * def.orbit.radius * state.orbitScale,
                    0,
                    Math.sin(a) * def.orbit.radius * state.orbitScale
                ));
            }

            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending
            });
            mat.depthTest = false;
            mat.depthWrite = false;
            const line = new THREE.Line(geom, mat);
            line.renderOrder = -10;
            line.visible = state.showOrbits;
            orbitScene.add(line);
            orbitLines.push(line);
        });
    }

    function createBelts() {
        BELT_CATALOG.forEach(def => {
            const cfg = { ...def };
            if (def.id === 'asteroid-belt') {
                cfg.count = state.asteroidDensity;
                cfg.size = state.asteroidSize;
            } else if (def.id === 'kuiper-belt') {
                // Keep Kuiper density/size tied to belt tuning so controls remain consistent.
                cfg.count = Math.max(2200, Math.floor(state.asteroidDensity * 1.8));
                cfg.size = Math.max(0.2, state.asteroidSize * 0.92);
            }
            const mesh = createAsteroidBelt(cfg);
            if (!mesh) return;
            const attachToCenter = cfg.attachToCenter ?? (cfg.scaleWith === 'planetScale');
            if (attachToCenter && cfg.center && planets[cfg.center]?.group) {
                planets[cfg.center].group.add(mesh);
            } else {
                mesh.scale.set(state.orbitScale, 1, state.orbitScale);
                scene.add(mesh);
            }

            mesh.visible = cfg.visibleKey ? !!state[cfg.visibleKey] : true;
            if (cfg.id === 'asteroid-belt') belts.asteroidBelt = mesh;
            if (cfg.id === 'kuiper-belt') belts.kuiperBelt = mesh;
        });
    }

    function createAsteroidRing(cfg) {
        const def = {
            innerRadius: cfg.innerRadius,
            outerRadius: cfg.outerRadius,
            height: cfg.height ?? 0.5,
            count: cfg.count ?? 900,
            size: cfg.size ?? 0.12,
            color: cfg.color ?? 0xc8b39a,
            emissive: cfg.emissive ?? 0x2a1f15,
            emissiveIntensity: cfg.emissiveIntensity ?? 0.25
        };
        return createAsteroidBelt(def, true);
    }

    function getRingAsteroidTexture() {
        if (ringAsteroidTexture) return ringAsteroidTexture;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#d9ccb6';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 3200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 0.5 + Math.random() * 2.6;
            const shade = 172 + Math.floor(Math.random() * 68);
            const toneR = Math.min(255, shade + 12);
            const toneG = Math.min(255, shade + 4);
            const toneB = Math.max(98, shade - 24);
            ctx.fillStyle = `rgba(${toneR},${toneG},${toneB},${0.12 + Math.random() * 0.35})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 260; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 1.2 + Math.random() * 3.8;
            ctx.fillStyle = `rgba(72,56,42,${0.08 + Math.random() * 0.18})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 150; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 0.8 + Math.random() * 2.1;
            ctx.fillStyle = `rgba(245,236,218,${0.08 + Math.random() * 0.12})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const grain = ctx.createImageData(size, size);
        for (let i = 0; i < grain.data.length; i += 4) {
            const n = 232 + Math.floor(Math.random() * 24);
            grain.data[i] = n;
            grain.data[i + 1] = n - 4;
            grain.data[i + 2] = n - 10;
            grain.data[i + 3] = 18 + Math.floor(Math.random() * 20);
        }
        ctx.putImageData(grain, 0, 0);

        ringAsteroidTexture = new THREE.CanvasTexture(canvas);
        ringAsteroidTexture.colorSpace = THREE.SRGBColorSpace;
        ringAsteroidTexture.wrapS = THREE.RepeatWrapping;
        ringAsteroidTexture.wrapT = THREE.RepeatWrapping;
        ringAsteroidTexture.anisotropy = 8;
        ringAsteroidTexture.needsUpdate = true;
        return ringAsteroidTexture;
    }

    function createAsteroidBelt(cfg, isRing = false) {
        const geom = new THREE.IcosahedronGeometry(0.45, 0);
        const mat = isRing
            ? createRingAsteroidMaterial({
                color: cfg.color,
                emissive: cfg.emissive,
                emissiveIntensity: cfg.emissiveIntensity
            })
            : createAsteroidMaterial({
                color: cfg.color,
                roughness: 0.95,
                metalness: 0.02,
                emissive: cfg.emissive,
                emissiveIntensity: cfg.emissiveIntensity,
                texture: getRingAsteroidTexture(),
                albedoLift: 0.08,
                noiseStrength: 0.5
            });

        const mesh = new THREE.InstancedMesh(geom, mat, cfg.count);
        const dummy = new THREE.Object3D();
        const baseSize = Math.max(0.08, cfg.size);
        const radiusSpan = Math.max(0.01, cfg.outerRadius - cfg.innerRadius);

        for (let i = 0; i < cfg.count; i++) {
            let r = cfg.innerRadius + Math.random() * radiusSpan;
            let a = Math.random() * Math.PI * 2;
            if (isRing) {
                const split = 0.52;
                const bandPick = i % 7;
                if (bandPick <= 2) {
                    r = cfg.innerRadius + radiusSpan * (0.06 + Math.random() * (split - 0.2));
                } else {
                    r = cfg.innerRadius + radiusSpan * (split + 0.04 + Math.random() * (0.94 - split));
                }
                r += (Math.random() - 0.5) * radiusSpan * 0.01;
                r = Math.min(cfg.outerRadius, Math.max(cfg.innerRadius, r));

                const step = (Math.PI * 2) / Math.max(1, cfg.count);
                a = i * step + (Math.random() - 0.5) * step * 4.0;
            }
            const y = isRing
                ? (Math.random() - Math.random()) * cfg.height
                : (Math.random() - 0.5) * cfg.height;
            const s = isRing
                ? baseSize * (0.38 + Math.random() * 0.88)
                : baseSize * (0.5 + Math.random() * 1.4);
            const sx = s * (0.6 + Math.random() * 0.9);
            const sy = isRing
                ? s * (0.1 + Math.random() * 0.22)
                : s * (0.35 + Math.random() * 1.1);
            const sz = s * (0.6 + Math.random() * 0.9);

            dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.scale.set(sx, sy, sz);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            if (isRing) {
                const luma = 0.8 + Math.random() * 0.16;
                const warmShift = (Math.random() - 0.5) * 0.06;
                const neutralShift = (Math.random() - 0.5) * 0.03;
                mesh.setColorAt(i, new THREE.Color(
                    Math.min(1, Math.max(0, luma + 0.04 + warmShift)),
                    Math.min(1, Math.max(0, luma + warmShift * 0.3 + neutralShift * 0.12)),
                    Math.min(1, Math.max(0, luma - 0.07 + neutralShift))
                ));
            } else {
                const tint = 0.5 + Math.random() * 0.5;
                const warmth = 0.04 + Math.random() * 0.12;
                mesh.setColorAt(i, new THREE.Color(0.55 * tint + warmth, 0.5 * tint, 0.45 * tint));
            }
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        // Asteroid belts are visual-only; skip expensive instance ray tests.
        mesh.raycast = () => {};
        return mesh;
    }

    function createRingAsteroidMaterial({ color, emissive, emissiveIntensity }) {
        const texture = getRingAsteroidTexture();
        const mat = new THREE.MeshStandardMaterial({
            color,
            map: texture,
            bumpMap: texture,
            bumpScale: 0.15,
            roughness: 0.58,
            metalness: 0.05,
            emissive,
            emissiveMap: texture,
            emissiveIntensity: Math.max(0.55, emissiveIntensity ?? 0.55),
            vertexColors: true,
            flatShading: false
        });
        mat.toneMapped = false;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uRingMinLight = { value: 0.46 };
            shader.uniforms.uRingSunBoost = { value: 0.78 };
            shader.uniforms.uRingBaseGlow = { value: 0.28 };
            shader.uniforms.uRingSunPosView = { value: new THREE.Vector3() };
            shader.uniforms.uRingTime = { value: 0 };
            ringSunUniformRefs.push(shader.uniforms.uRingSunPosView);
            ringTimeUniformRefs.push(shader.uniforms.uRingTime);
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', `#include <common>
uniform float uRingTime;
float ringHash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}`)
                .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
#ifdef USE_INSTANCING
    vec3 instPos = instanceMatrix[3].xyz;
    float spinSeed = ringHash(instPos);
    float spinSpeed = 0.45 + spinSeed * 1.25;
    float spinAngle = uRingTime * spinSpeed + spinSeed * 6.28318530718;
    float c = cos(spinAngle);
    float s = sin(spinAngle);
    transformed = vec3(
        transformed.x * c - transformed.z * s,
        transformed.y,
        transformed.x * s + transformed.z * c
    );
#endif`
                );
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
uniform float uRingMinLight;
uniform float uRingSunBoost;
uniform float uRingBaseGlow;
uniform vec3 uRingSunPosView;`)
                .replace(
                    /vec3\s+outgoingLight\s*=\s*totalDiffuse\s*\+\s*totalSpecular\s*\+\s*totalEmissiveRadiance\s*;/,
                    `vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
                vec3 ringSunDir = normalize(uRingSunPosView + vViewPosition);
                float ringSun = max(dot(normal, ringSunDir), 0.0);
                vec3 ringFloor = diffuseColor.rgb * (uRingMinLight + ringSun * 0.18);
                outgoingLight += diffuseColor.rgb * (ringSun * uRingSunBoost);
                outgoingLight += diffuseColor.rgb * uRingBaseGlow;
                outgoingLight = max(outgoingLight, ringFloor);`
                )
                .replace(
                    '#include <output_fragment>',
                    `#include <output_fragment>
gl_FragColor.rgb = max(gl_FragColor.rgb, diffuseColor.rgb * (uRingMinLight + uRingBaseGlow));`
                );
        };
        return mat;
    }

    function createAsteroidMaterial({ color, roughness, metalness, emissive, emissiveIntensity, texture = null, albedoLift = 0.08, noiseStrength = 0.5 }) {
        const hasTexture = !!texture;
        const mat = new THREE.MeshStandardMaterial({
            color, roughness, metalness, emissive, emissiveIntensity,
            map: hasTexture ? texture : null,
            bumpMap: hasTexture ? texture : null,
            bumpScale: hasTexture ? 0.11 : 0.0,
            emissiveMap: hasTexture ? texture : null,
            flatShading: !hasTexture,
            vertexColors: true
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uNoiseScale = { value: 2.4 };
            shader.uniforms.uNoiseStrength = { value: noiseStrength };
            shader.uniforms.uAlbedoLift = { value: albedoLift };
            shader.uniforms.uDetailScale = { value: 7.2 };
            shader.uniforms.uCraterStrength = { value: 0.35 };

            shader.vertexShader = shader.vertexShader
                .replace(/void\s+main\s*\(\s*\)\s*\{/, 'varying vec3 vLocalPos;\nvarying float vSeed;\nvoid main() {')
                .replace('#include <begin_vertex>',
                    `#include <begin_vertex>
vLocalPos = transformed;
#ifdef USE_INSTANCING
    vec3 instPos = instanceMatrix[3].xyz;
    vSeed = dot(instPos, vec3(0.1031, 0.11369, 0.13787));
#else
    vSeed = 0.0;
#endif`);

            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>',
                    `#include <common>
varying vec3 vLocalPos;
varying float vSeed;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uAlbedoLift;
uniform float uDetailScale;
uniform float uCraterStrength;

vec4 rmPerm(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 rmTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec4 rmFade(vec4 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float rmNoise(vec3 P) {
    vec3 i0 = floor(P);
    vec3 f0 = fract(P);
    vec3 i1 = i0 + vec3(1.0);
    vec3 f1 = f0 - vec3(1.0);
    vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x);
    vec4 iy = vec4(i0.yy, i1.yy);
    vec4 iz0 = i0.zzzz;
    vec4 iz1 = i1.zzzz;

    vec4 ixy = rmPerm(rmPerm(ix) + iy);
    vec4 ixy0 = rmPerm(ixy + iz0);
    vec4 ixy1 = rmPerm(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = rmTaylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = rmTaylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, f0);
    float n100 = dot(g100, vec3(f1.x, f0.yz));
    float n010 = dot(g010, vec3(f0.x, f1.y, f0.z));
    float n110 = dot(g110, vec3(f1.xy, f0.z));
    float n001 = dot(g001, vec3(f0.xy, f1.z));
    float n101 = dot(g101, vec3(f1.x, f0.y, f1.z));
    float n011 = dot(g011, vec3(f0.x, f1.yz));
    float n111 = dot(g111, f1);

    vec4 fade_xyz = rmFade(vec4(f0, 0.0));
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

float rmFbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) {
        v += a * rmNoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}`);

            shader.fragmentShader = shader.fragmentShader
                .replace('#include <color_fragment>',
                    `#include <color_fragment>
vec3 p = vLocalPos * uNoiseScale + vec3(vSeed);
float base = rmFbm(p);
float detail = rmFbm(p * (uDetailScale / uNoiseScale) + 17.0);
float craters = smoothstep(0.45, 0.85, rmFbm(p * 3.1 + 29.0));
float rocky = mix(base, detail, 0.5);
float shade = mix(1.0, mix(0.75, 1.25, rocky), uNoiseStrength);
float pit = mix(1.0, 1.0 - uCraterStrength, craters);
diffuseColor.rgb = diffuseColor.rgb * shade * pit + vec3(uAlbedoLift);`);
        };

        return mat;
    }

    function layoutBodies(timeline = 0, isAnimating = false) {
        const dir = state.reverseTime ? -1 : 1;
        BODY_CATALOG.forEach(def => {
            const body = planets[def.id];
            if (!body || !body.orbit) return;

            const orbit = body.orbit;
            const centerBody = orbit.center ? planets[orbit.center] : null;
            const centerPos = centerBody?.group?.position || orbitOrigin;
            const rawScale = orbit.scaleWith === 'planetScale' ? state.planetScale : state.orbitScale;
            const radiusScale = Math.max(0.1, Number.isFinite(rawScale) ? rawScale : 1);
            const radius = orbit.radius * radiusScale;

            const orbitSpeed = Number.isFinite(orbit.speed) ? orbit.speed : 0;
            const useTimeline = orbit.useTime !== false;
            let angle = body.angle;
            if (useTimeline) {
                angle = body.angle + timeline * orbitSpeed;
            } else if (isAnimating) {
                angle += orbitSpeed * state.timeSpeed * dir;
                body.angle = angle;
            }

            body.group.position.set(
                centerPos.x + Math.cos(angle) * radius,
                0,
                centerPos.z + Math.sin(angle) * radius
            );

            if (isAnimating && body.features?.clouds) {
                body.features.clouds.rotation.y += 0.002 * state.timeSpeed * dir;
            }
        });
    }

    function update({ time, simTime }) {
        updateShaderUniforms(time, simTime);
        const timeline = Number.isFinite(simTime)
            ? simTime
            : time * state.timeSpeed * (state.reverseTime ? -1 : 1);
        const isAnimating = !!state.isPlaying;
        const dir = state.reverseTime ? -1 : 1;
        layoutBodies(timeline, isAnimating);

        if (isAnimating && state.animateAsteroids) {
            if (belts.asteroidBelt) belts.asteroidBelt.rotation.y += 0.0002 * state.timeSpeed * dir;
            if (belts.kuiperBelt) belts.kuiperBelt.rotation.y += 0.00005 * state.timeSpeed * dir;
            if (belts.saturnRing) belts.saturnRing.rotation.y += 0.0014 * state.timeSpeed * dir;
        }
    }

    function updateShaderUniforms(time, simTime) {
        if (planets.sun?.group) {
            planets.sun.group.getWorldPosition(sunWorldPos);
        } else {
            sunWorldPos.set(0, 0, 0);
        }
        camera.updateMatrixWorld();
        sunViewPos.copy(sunWorldPos).applyMatrix4(camera.matrixWorldInverse);
        for (let i = 0; i < ringSunUniformRefs.length; i++) {
            ringSunUniformRefs[i].value.copy(sunViewPos);
        }
        const ringTimeline = Number.isFinite(simTime)
            ? simTime
            : time * state.timeSpeed * (state.reverseTime ? -1 : 1);
        for (let i = 0; i < ringTimeUniformRefs.length; i++) {
            ringTimeUniformRefs[i].value = ringTimeline;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const minRes = Math.min(window.innerWidth, window.innerHeight) * pixelRatio;

        Object.values(planets).forEach(body => {
            const mat = body.shaderMaterial;
            if (!mat?.uniforms) return;

            if (mat.uniforms.iTime) {
                mat.uniforms.iTime.value = time;
            }
            if (mat.uniforms.iResolution) {
                mat.uniforms.iResolution.value.set(minRes, minRes, 1);
            }
            if (mat.uniforms.uSunDir) {
                body.mesh.getWorldPosition(tempPlanetPos);
                tempSunDir.copy(sunWorldPos).sub(tempPlanetPos);
                if (tempSunDir.lengthSq() > 0.00001) {
                    tempSunDir.normalize();
                    tempInvMatrix.copy(body.mesh.matrixWorld).invert();
                    tempSunDir.transformDirection(tempInvMatrix);
                } else {
                    tempSunDir.set(1, 0, 0);
                }
                mat.uniforms.uSunDir.value.copy(tempSunDir);
            }
        });
    }

    function updateLabels(nowMs = performance.now()) {
        if (!state.showLabels) {
            Object.values(labels).forEach(l => l.element.style.display = 'none');
            return;
        }

        if (nowMs - lastLabelUpdateAt < LABEL_UPDATE_INTERVAL_MS) return;
        lastLabelUpdateAt = nowMs;

        Object.entries(labels).forEach(([key, label]) => {
            const body = planets[key];
            if (!body) return;
            if (label.isMoon) {
                const isEarthMoon = key === 'moon';
                if (!state.showMoons) {
                    label.element.style.display = 'none';
                    return;
                }
                if (!isEarthMoon && !state.showMoonLabels) {
                    label.element.style.display = 'none';
                    return;
                }
                if (label.isMinorMoon && !state.showMinorMoonLabels) {
                    label.element.style.display = 'none';
                    return;
                }
            }
            if (!body.group?.visible && body.group !== undefined) {
                label.element.style.display = 'none';
                return;
            }

            const pos = labelWorldPos;
            body.mesh.getWorldPosition(pos);
            const radiusForLabel = body.visualRadius ?? body.data.radius;
            pos.y += radiusForLabel * state.planetScale * 1.5;

            const screen = pos.project(camera);
            if (screen.z > 1) {
                label.element.style.display = 'none';
                return;
            }

            label.element.style.display = 'block';
            label.element.style.left = (screen.x * 0.5 + 0.5) * window.innerWidth + 'px';
            label.element.style.top = (-screen.y * 0.5 + 0.5) * window.innerHeight + 'px';
        });
    }

    function updateRaycastTargets() {
        raycastTargets = Object.values(planets)
            .map(p => p.group || p.mesh)
            .filter(target => !!target && target.visible !== false);
        return raycastTargets;
    }

    function applyPlanetScale(newScale) {
        if (!newScale || newScale === state.planetScale) return;
        const factor = newScale / state.planetScale;
        Object.values(planets).forEach(p => {
            if (!p?.group) return;
            p.group.scale.multiplyScalar(factor);
        });
        state.planetScale = newScale;
    }

    function applyOrbitScale(newScale) {
        const safeScale = Math.max(0.1, Number.isFinite(newScale) ? newScale : state.orbitScale);
        if (!safeScale || safeScale === state.orbitScale) return;
        const factor = safeScale / Math.max(0.1, state.orbitScale);
        orbitLines.forEach(line => {
            line.scale.x *= factor;
            line.scale.z *= factor;
        });
        if (belts.asteroidBelt) {
            belts.asteroidBelt.scale.x *= factor;
            belts.asteroidBelt.scale.z *= factor;
        }
        if (belts.kuiperBelt) {
            belts.kuiperBelt.scale.x *= factor;
            belts.kuiperBelt.scale.z *= factor;
        }
        state.orbitScale = safeScale;
    }

    function setOrbitsVisible(show) {
        orbitLines.forEach(line => line.visible = show);
    }

    function setLabelsVisible(show) {
        if (!show) {
            Object.values(labels).forEach(l => l.element.style.display = 'none');
            return;
        }
        lastLabelUpdateAt = 0;
    }

    function setMoonsVisible(show) {
        moonBodyKeys.forEach(key => {
            const body = planets[key];
            if (body?.group) body.group.visible = !!show;
        });
        if (!show) {
            Object.values(labels).forEach(label => {
                if (label.isMoon) label.element.style.display = 'none';
            });
        } else {
            lastLabelUpdateAt = 0;
        }
        updateRaycastTargets();
    }

    function setMoonLabelsVisible(show) {
        if (!show) {
            Object.entries(labels).forEach(([key, label]) => {
                if (label.isMoon && key !== 'moon') label.element.style.display = 'none';
            });
            return;
        }
        lastLabelUpdateAt = 0;
    }

    function setMinorMoonLabelsVisible(show) {
        if (!show) {
            Object.values(labels).forEach(label => {
                if (label.isMinorMoon) label.element.style.display = 'none';
            });
            return;
        }
        lastLabelUpdateAt = 0;
    }

    function setAsteroidsVisible(show) {
        if (belts.asteroidBelt) belts.asteroidBelt.visible = show;
        if (belts.saturnRing) belts.saturnRing.visible = show;
    }

    function setKuiperVisible(show) {
        if (belts.kuiperBelt) belts.kuiperBelt.visible = show;
    }
}
