// Cosmos Explorer WebGL runtime.

import * as THREE from 'three';
import { SUN_SURFACE_VERTEX_SHADER, SUN_SURFACE_FRAGMENT_SHADER } from './src/shaders/sunSurfaceShaders.js?v=20260212-realshader6';
import { MOON_SURFACE_VERTEX_SHADER, MOON_SURFACE_FRAGMENT_SHADER } from './src/shaders/moonSurfaceShaders.js?v=20260212-realshader6';
import { PLANET_DATA } from './src/data/planetData.js?v=20260212-realshader6';
import { createGlowTexture, createNebulaTexture } from './src/utils/textures.js?v=20260212-realshader6';
import { setupCameraSystem, updateSmoothZoom, updateKeyboardPan, resetZoomState } from './src/utils/cameraSystem.js?v=20260212-realshader6';
import { createPlanetSystem } from './src/world/planetSystem.js?v=20260215-realshader21';
// GLOBAL STATE
let scene, backgroundScene, camera, renderer, controls;
let sun, sunLight, fillLight, sunProminences = [];
let ambientLights = [];
const sunFreqs = new THREE.Vector4();
let planets = {}, planetLabels = {};
let orbitLines = [], asteroidBelt, kuiperBelt;
let galaxy, nebulae = [], dustClouds = [], starLayers = [];
let raycaster, mouse;
let raycastTargets = [];
let hoverRaycastPending = false;
let captureNextFrame = false;
let pendingScreenshotName = null;
let clock = new THREE.Clock();
let sunSurfaceView = null;
let moonSurfaceView = null;
let planetSystem = null;
const followTargetWorldPos = new THREE.Vector3();
const followTargetDelta = new THREE.Vector3();
const clickWorldPos = new THREE.Vector3();
const clickScreenPos = new THREE.Vector3();
const cameraFocusLookAtPos = new THREE.Vector3();
const cameraFocusTargetPos = new THREE.Vector3();
const cameraFocusOffset = new THREE.Vector3();
const cameraCollisionPlanetPos = new THREE.Vector3();
const cameraCollisionDelta = new THREE.Vector3();
const hudTargetWorldPos = new THREE.Vector3();
let fpsSmoothed = 60;
let fpsUpdateAccumulator = 0;
let cameraAnimationToken = 0;
const BACKGROUND_DENSITY_SCALE = 1;
const MAIN_RENDER_PIXEL_RATIO_CAP = 2;
const SURFACE_RENDER_PIXEL_RATIO_CAP = 2;
const DEFAULT_ASTEROID_DENSITY = 1900;
const CAMERA_PLANET_PADDING = 0.55;
const USER_PRESET_STORAGE_KEY = 'cosmos-explorer-user-presets-v1';
const DAY_SECONDS = 86400;
const MONTH_SECONDS = 2629800;
const YEAR_SECONDS = 31557600;
const SIM_SECONDS_PER_DAY = DAY_SECONDS;
const TIME_SPEED_MIN = 0.01;
const TIME_SPEED_MAX = 50;
const PLANET_SCALE_MIN = 0.5;
const PLANET_SCALE_MAX = 2.5;
const ORBIT_SCALE_MIN = 0.5;
const ORBIT_SCALE_MAX = 2.5;
const HUD_FUEL_MIN = 24;
const HUD_FUEL_BURN_RATE = 0.022;
const DEFAULT_SIM_ACCENT_HEX = 0xdfe6f2;
const DEFAULT_SIM_WARM_HEX = 0xffd8a8;

const hudRuntime = {
    fuel: 88,
    updateAccumulator: 0
};

const state = {
    isPlaying: true,
    timeSpeed: 4,
    reverseTime: false,
    autoRotate: false,
    photoMode: false,
    adaptiveQuality: true,
    selectedObject: null,
    followTarget: null,
    showOrbits: true,
    showLabels: true,
    showMoons: true,
    showMoonLabels: false,
    showMinorMoonLabels: false,
    showAsteroids: true,
    animateAsteroids: true,
    showKuiper: true,
    showStars: true,
    showGalaxy: true,
    showNebulae: true,
    coronaIntensity: 1.25,
    flareIntensity: 1,
    sunLightIntensity: 3.8,
    ambientLightIntensity: 1.6,
    showProminences: false,
    planetScale: 1,
    orbitScale: 1,
    asteroidDensity: DEFAULT_ASTEROID_DENSITY,
    asteroidSize: 0.34,
    atmosphereIntensity: 1,
    fps: 60,
    isCameraAnimating: false,
    objectCount: 0,
    sunSurfaceSteps: window.innerWidth < 900 ? 40 : 56,
    simTime: 0
};

const LAUNCH_PRESETS = {
    explorer: {
        timeSpeed: 4,
        autoRotate: false,
        adaptiveQuality: true,
        showOrbits: true,
        showLabels: true,
        showMoons: true,
        showMoonLabels: false,
        showMinorMoonLabels: false,
        showAsteroids: true,
        showKuiper: true,
        showStars: true,
        showGalaxy: true,
        showNebulae: true,
        asteroidDensity: DEFAULT_ASTEROID_DENSITY,
        asteroidSize: 0.34,
        sunLightIntensity: 3.4,
        ambientLightIntensity: 1.6
    },
    cinematic: {
        timeSpeed: 0.05,
        autoRotate: true,
        adaptiveQuality: true,
        showOrbits: false,
        showLabels: false,
        showMoons: true,
        showMoonLabels: false,
        showMinorMoonLabels: false,
        showAsteroids: true,
        showKuiper: false,
        showStars: true,
        showGalaxy: true,
        showNebulae: true,
        asteroidDensity: Math.max(700, Math.floor(DEFAULT_ASTEROID_DENSITY * 0.78)),
        asteroidSize: 0.28,
        sunLightIntensity: 3.8,
        ambientLightIntensity: 1.45
    },
    performance: {
        timeSpeed: 0.08,
        autoRotate: false,
        adaptiveQuality: true,
        showOrbits: true,
        showLabels: false,
        showMoons: true,
        showMoonLabels: false,
        showMinorMoonLabels: false,
        showAsteroids: false,
        showKuiper: false,
        showStars: true,
        showGalaxy: false,
        showNebulae: false,
        asteroidDensity: Math.max(450, Math.floor(DEFAULT_ASTEROID_DENSITY * 0.55)),
        asteroidSize: 0.24,
        sunLightIntensity: 3.0,
        ambientLightIntensity: 1.25
    }
};

const MISSION_DEFS = [
    {
        id: 'select_saturn',
        title: 'Select Saturn',
        description: 'Click or focus Saturn to inspect rings.',
        isDone: progress => progress.selectedSaturn
    },
    {
        id: 'follow_earth',
        title: 'Follow Earth',
        description: 'Track Earth for 15 seconds total.',
        isDone: progress => progress.followEarthSeconds >= 15
    },
    {
        id: 'jump_year',
        title: 'Jump One Year',
        description: 'Use time jumps to advance at least +1 year.',
        isDone: progress => progress.jumpedOneYear
    },
    {
        id: 'photo_capture',
        title: 'Photo Capture',
        description: 'Enable Photo Mode and capture a screenshot.',
        isDone: progress => progress.photoCaptureComplete
    }
];

const TOUR_SEQUENCE = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const missionProgress = {
    selectedSaturn: false,
    followEarthSeconds: 0,
    jumpedOneYear: false,
    photoCaptureComplete: false
};
let lastMissionCompleteCount = 0;

const guidedTour = {
    active: false,
    index: 0,
    elapsed: 0,
    dwellSeconds: 8,
    focusOptions: {
        durationMs: 2200,
        distanceMultiplier: 0.58,
        minOffset: 7,
        maxOffset: 22,
        yawWeight: 0.5,
        pitchWeight: 0.24,
        depthWeight: 0.72
    }
};

const compareState = {
    visible: false,
    left: 'earth',
    right: 'mars'
};

const qualityState = {
    renderScale: 1,
    sampleElapsed: 0,
    sampleCount: 0,
    sampleSum: 0,
    lowStreak: 0,
    highStreak: 0,
    minScale: 0.6,
    maxScale: 1
};

const sceneQueryOverrides = parseSceneQueryOverrides();
const activeLaunchPreset = applyLaunchPresetFromQuery();
const DOM = {};

function colorToRgbString(color) {
    const r = Math.round(THREE.MathUtils.clamp(color.r, 0, 1) * 255);
    const g = Math.round(THREE.MathUtils.clamp(color.g, 0, 1) * 255);
    const b = Math.round(THREE.MathUtils.clamp(color.b, 0, 1) * 255);
    return `${r}, ${g}, ${b}`;
}

function parsePlanetAccentColor(rawColor) {
    if (typeof rawColor === 'number' && Number.isFinite(rawColor)) {
        return new THREE.Color(rawColor);
    }
    if (typeof rawColor !== 'string') {
        return null;
    }

    const value = rawColor.trim();
    if (!value) return null;

    const color = new THREE.Color();
    if (/^0x[0-9a-f]{6}$/i.test(value)) {
        color.setHex(Number.parseInt(value.replace(/^0x/i, ''), 16));
        return color;
    }

    try {
        color.setStyle(value);
        return color;
    } catch (err) {
        return null;
    }
}

function getSimulationAccentPalette(targetKey = null) {
    const fallbackAccent = new THREE.Color(DEFAULT_SIM_ACCENT_HEX);
    const fallbackWarm = new THREE.Color(DEFAULT_SIM_WARM_HEX);
    if (!targetKey || !PLANET_DATA[targetKey]) {
        return { accent: fallbackAccent, warm: fallbackWarm };
    }

    const data = PLANET_DATA[targetKey];
    const accentSource = parsePlanetAccentColor(data?.atmosphere?.color)
        || parsePlanetAccentColor(data?.color)
        || fallbackAccent;
    const accent = accentSource.clone();
    const accentHsl = { h: 0, s: 0, l: 0 };
    accent.getHSL(accentHsl);
    accent.setHSL(
        accentHsl.h,
        THREE.MathUtils.clamp(accentHsl.s * 1.08 + 0.1, 0.34, 0.94),
        THREE.MathUtils.clamp(accentHsl.l * 0.72 + 0.28, 0.5, 0.74)
    );

    const warm = accent.clone().lerp(new THREE.Color(DEFAULT_SIM_WARM_HEX), 0.32);
    const warmHsl = { h: 0, s: 0, l: 0 };
    warm.getHSL(warmHsl);
    warm.setHSL(
        warmHsl.h,
        THREE.MathUtils.clamp(warmHsl.s, 0.3, 0.9),
        THREE.MathUtils.clamp(warmHsl.l, 0.56, 0.8)
    );

    return { accent, warm };
}

function applySimulationAccent(targetKey = null) {
    const root = document.documentElement;
    if (!root) return;
    const { accent, warm } = getSimulationAccentPalette(targetKey);
    root.style.setProperty('--sim-accent', `#${accent.getHexString()}`);
    root.style.setProperty('--sim-accent-rgb', colorToRgbString(accent));
    root.style.setProperty('--sim-accent-warm', `#${warm.getHexString()}`);
    root.style.setProperty('--sim-accent-warm-rgb', colorToRgbString(warm));
}

function refreshSimulationAccent(preferredKey = null) {
    const targetKey = preferredKey || state.selectedObject || state.followTarget || null;
    applySimulationAccent(targetKey);
}

function isMoonObjectKey(key) {
    if (!key) return false;
    const body = planets[key];
    return !!(body && (body.kind === 'moon' || body.isSatellite || body.data?.isSatellite));
}

function scaleCount(base, min = 1) {
    return Math.max(min, Math.floor(base * BACKGROUND_DENSITY_SCALE));
}

function yieldToBrowser() {
    return new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });
}

function withTimeout(promise, timeoutMs, label) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}

function normalizePresetId(value) {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(LAUNCH_PRESETS, normalized)
        ? normalized
        : null;
}

function applyLaunchPresetFromQuery() {
    let presetId = null;
    try {
        const params = new URLSearchParams(window.location.search);
        presetId = normalizePresetId(params.get('preset'));
    } catch (err) {
        console.warn('Preset query parsing failed, continuing with default settings.', err);
        return null;
    }
    if (!presetId) return null;

    const preset = LAUNCH_PRESETS[presetId];
    Object.entries(preset).forEach(([key, value]) => {
        if (Object.prototype.hasOwnProperty.call(state, key)) {
            state[key] = value;
        }
    });
    return presetId;
}

function parseBooleanFlag(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim().toLowerCase();
    if (text === '1' || text === 'true' || text === 'on' || text === 'yes') return true;
    if (text === '0' || text === 'false' || text === 'off' || text === 'no') return false;
    return null;
}

function parseVectorParam(raw) {
    if (!raw) return null;
    const parts = String(raw).split(',').map(v => Number.parseFloat(v));
    if (parts.length !== 3 || parts.some(v => !Number.isFinite(v))) return null;
    return parts;
}

function clampTimeSpeed(value) {
    if (!Number.isFinite(value)) return state.timeSpeed;
    return Math.max(TIME_SPEED_MIN, Math.min(TIME_SPEED_MAX, value));
}

function formatTimeSpeed(value) {
    const v = Math.max(0, Number.isFinite(value) ? value : 0);
    const decimals = v < 0.1 ? 3 : (v < 1 ? 2 : 1);
    return `${v.toFixed(decimals)} d/s`;
}

function getTimeSpeedStep(currentSpeed) {
    const speed = Math.max(0, Number.isFinite(currentSpeed) ? currentSpeed : 0);
    if (speed < 0.1) return 0.01;
    if (speed < 1) return 0.1;
    if (speed < 10) return 0.5;
    return 1;
}

function updateSpeedUI() {
    const slider = document.getElementById('speed-slider');
    if (slider) slider.value = String(state.timeSpeed);

    const text = formatTimeSpeed(state.timeSpeed);
    const speedValue = document.getElementById('speed-value');
    if (speedValue) speedValue.textContent = text;

    const actionSpeed = document.getElementById('action-speed-value');
    if (actionSpeed) actionSpeed.textContent = text;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        const speed = Number.parseFloat(btn.dataset.speed || '0');
        btn.classList.toggle('active', Math.abs(speed - state.timeSpeed) < 0.0001);
    });
}

function setSimulationSpeed(rawValue, options = {}) {
    const commit = !!options.commit;
    state.timeSpeed = clampTimeSpeed(Number.parseFloat(rawValue));
    updateSpeedUI();
    if (commit) pushParamState();
}

function clampPlanetScale(value) {
    if (!Number.isFinite(value)) return state.planetScale;
    return Math.max(PLANET_SCALE_MIN, Math.min(PLANET_SCALE_MAX, value));
}

function clampOrbitScale(value) {
    if (!Number.isFinite(value)) return state.orbitScale;
    return Math.max(ORBIT_SCALE_MIN, Math.min(ORBIT_SCALE_MAX, value));
}

function formatScale(value) {
    const v = Number.isFinite(value) ? value : 1;
    return `${v.toFixed(2)}x`;
}

function parseSceneQueryOverrides() {
    try {
        const params = new URLSearchParams(window.location.search);
        const target = (params.get('target') || '').trim().toLowerCase();
        const speed = Number.parseFloat(params.get('speed'));
        return {
            target: target && PLANET_DATA[target] ? target : null,
            speed: Number.isFinite(speed) ? clampTimeSpeed(speed) : null,
            autoRotate: parseBooleanFlag(params.get('auto')),
            showOrbits: parseBooleanFlag(params.get('orbits')),
            showLabels: parseBooleanFlag(params.get('labels')),
            showMoons: parseBooleanFlag(params.get('moons')),
            showMoonLabels: parseBooleanFlag(params.get('moonlabels')),
            showMinorMoonLabels: parseBooleanFlag(params.get('minormoonlabels')),
            showAsteroids: parseBooleanFlag(params.get('asteroids')),
            showKuiper: parseBooleanFlag(params.get('kuiper')),
            showStars: parseBooleanFlag(params.get('stars')),
            showGalaxy: parseBooleanFlag(params.get('galaxy')),
            showNebulae: parseBooleanFlag(params.get('nebulae')),
            photoMode: parseBooleanFlag(params.get('photo')),
            adaptiveQuality: parseBooleanFlag(params.get('adaptive')),
            cameraPos: parseVectorParam(params.get('cam')),
            cameraTarget: parseVectorParam(params.get('look'))
        };
    } catch (err) {
        console.warn('Failed to parse scene query overrides.', err);
        return null;
    }
}

function applySceneQueryOverrides() {
    if (!sceneQueryOverrides) return;

    const applyBoolean = (key, value) => {
        if (value === null || value === undefined) return;
        state[key] = value;
    };

    if (Number.isFinite(sceneQueryOverrides.speed)) {
        state.timeSpeed = sceneQueryOverrides.speed;
    }

    applyBoolean('autoRotate', sceneQueryOverrides.autoRotate);
    applyBoolean('showOrbits', sceneQueryOverrides.showOrbits);
    applyBoolean('showLabels', sceneQueryOverrides.showLabels);
    applyBoolean('showMoons', sceneQueryOverrides.showMoons);
    applyBoolean('showMoonLabels', sceneQueryOverrides.showMoonLabels);
    applyBoolean('showMinorMoonLabels', sceneQueryOverrides.showMinorMoonLabels);
    applyBoolean('showAsteroids', sceneQueryOverrides.showAsteroids);
    applyBoolean('showKuiper', sceneQueryOverrides.showKuiper);
    applyBoolean('showStars', sceneQueryOverrides.showStars);
    applyBoolean('showGalaxy', sceneQueryOverrides.showGalaxy);
    applyBoolean('showNebulae', sceneQueryOverrides.showNebulae);
    applyBoolean('photoMode', sceneQueryOverrides.photoMode);
    applyBoolean('adaptiveQuality', sceneQueryOverrides.adaptiveQuality);

    if (sceneQueryOverrides.target) {
        state.followTarget = sceneQueryOverrides.target;
    }
}
// INITIALIZATION
function init() {
    cacheDOMElements();
    setupScene();
    setupRenderer();
    ({ camera, controls } = setupCameraSystem(renderer, state));
    applySceneQueryOverrides();
    state.timeSpeed = clampTimeSpeed(state.timeSpeed);
    applyQueryCameraOverrides();
    refreshSimulationAccent();
    controls.autoRotate = !!state.autoRotate;
    if (activeLaunchPreset) {
        console.info(`Launch preset applied: ${activeLaunchPreset}`);
    }
    setupRaycaster();
    initializeFeatureUI();
    createSceneElements();
    setupEventListeners();
    syncControlPanelFromState();
    pushParamState();
    updateParamHistoryButtons();
    setupKeyboardShortcuts();
    if (state.photoMode) applyPhotoModeState(true);
    animate();
}

function cacheDOMElements() {
    DOM.container = document.getElementById('canvas-container');
    DOM.loading = document.getElementById('loading');
    DOM.loadingProgress = document.getElementById('loading-progress');
    DOM.loadingStatus = document.getElementById('loading-status');
    DOM.infoPanel = document.getElementById('info-panel');
    DOM.controlPanel = document.getElementById('control-panel');
    DOM.panelToggle = document.getElementById('panel-toggle');
    DOM.shortcutsHelp = document.getElementById('shortcuts-help');
    DOM.fpsCounter = document.getElementById('fps-counter');
    DOM.simTime = document.getElementById('sim-time');
    DOM.objectCount = document.getElementById('object-count');
    DOM.missionList = document.getElementById('mission-list');
    DOM.missionProgress = document.getElementById('mission-progress');
    DOM.qualityScale = document.getElementById('quality-scale');
    DOM.tourStatus = document.getElementById('tour-status');
    DOM.savedPresetSelect = document.getElementById('saved-preset-select');
    DOM.presetNameInput = document.getElementById('preset-name-input');
    DOM.comparePanel = document.getElementById('compare-panel');
    DOM.compareContent = document.getElementById('compare-content');
    DOM.compareLeft = document.getElementById('compare-left');
    DOM.compareRight = document.getElementById('compare-right');
    DOM.commandPalette = document.getElementById('command-palette');
    DOM.commandInput = document.getElementById('command-input');
    DOM.toastStack = document.getElementById('toast-stack');
    DOM.hudShipStatus = document.getElementById('hud-ship-status');
    DOM.hudShipSpeed = document.getElementById('hud-ship-speed');
    DOM.hudShipAltitude = document.getElementById('hud-ship-altitude');
    DOM.hudShipFuel = document.getElementById('hud-ship-fuel');
    DOM.hudShipShields = document.getElementById('hud-ship-shields');
    DOM.hudDestination = document.getElementById('hud-destination');
    DOM.hudEta = document.getElementById('hud-eta');
    DOM.hudSystemHealth = document.getElementById('hud-system-health');
    DOM.hudConsoleAltitude = document.getElementById('hud-console-altitude');
    DOM.hudConsoleFuel = document.getElementById('hud-console-fuel');
    DOM.hudConsoleShields = document.getElementById('hud-console-shields');
    DOM.hudConsoleTarget = document.getElementById('hud-console-target');
    DOM.hudConsoleEta = document.getElementById('hud-console-eta');
    DOM.hudConsoleHealth = document.getElementById('hud-console-health');
    DOM.hudShipAltitude2 = document.getElementById('hud-ship-altitude2');
    DOM.hudShipFuel2 = document.getElementById('hud-ship-fuel2');
    DOM.hudShipShields2 = document.getElementById('hud-ship-shields2');
    DOM.gaugeSpeed = document.getElementById('gauge-speed');
    DOM.gaugeFuel = document.getElementById('gauge-fuel');
    DOM.consoleWaveform = document.getElementById('console-waveform');
    DOM.consoleRadar = document.getElementById('console-radar');
    DOM.consoleIndicators = Array.from(document.querySelectorAll('.console-indicator'));

    // New diagnostic elements
    DOM.perfGraph = document.getElementById('ci-perf-graph');
    DOM.diagFps = document.getElementById('ci-diag-fps');
    DOM.diagFrametime = document.getElementById('ci-diag-frametime');
    DOM.diagScale = document.getElementById('ci-diag-scale');
    DOM.diagObjects = document.getElementById('ci-diag-objects');
    DOM.diagFps2 = document.getElementById('ci-diag-fps2');
    DOM.diagFrametime2 = document.getElementById('ci-diag-frametime2');
    DOM.diagScale2 = document.getElementById('ci-diag-scale2');
    DOM.diagObjects2 = document.getElementById('ci-diag-objects2');
    DOM.paramUndo = document.getElementById('ci-param-undo');
    DOM.paramRedo = document.getElementById('ci-param-redo');
}

function applyQueryCameraOverrides() {
    if (!sceneQueryOverrides) return;
    const { cameraPos, cameraTarget } = sceneQueryOverrides;
    if (cameraPos) camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    if (cameraTarget) controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
}

function initConsoleWaveform() {
    const waveformCanvas = DOM.consoleWaveform;
    const radarCanvas = DOM.consoleRadar;
    if (!waveformCanvas && !radarCanvas) return;

    const waveformCtx = waveformCanvas?.getContext('2d');
    const radarCtx = radarCanvas?.getContext('2d');

    let waveOffset = 0;
    let radarSweep = 0;

    function resizeCanvas(canvas) {
        if (!canvas?.parentElement) return false;
        const w = canvas.parentElement.clientWidth;
        const h = canvas.parentElement.clientHeight;
        if (!w || !h) return false;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return true;
    }

    function drawWaveform() {
        if (!waveformCanvas || !waveformCtx) return;
        if (!resizeCanvas(waveformCanvas)) return;
        const w = waveformCanvas.width;
        const h = waveformCanvas.height;

        waveformCtx.clearRect(0, 0, w, h);

        waveformCtx.strokeStyle = 'rgba(94, 168, 236, 0.16)';
        waveformCtx.lineWidth = 0.5;
        for (let y = 0; y < h; y += 10) {
            waveformCtx.beginPath();
            waveformCtx.moveTo(0, y);
            waveformCtx.lineTo(w, y);
            waveformCtx.stroke();
        }
        for (let x = 0; x < w; x += 20) {
            waveformCtx.beginPath();
            waveformCtx.moveTo(x, 0);
            waveformCtx.lineTo(x, h);
            waveformCtx.stroke();
        }

        waveformCtx.strokeStyle = 'rgba(177, 228, 255, 0.84)';
        waveformCtx.lineWidth = 1.4;
        waveformCtx.shadowColor = 'rgba(180, 228, 255, 0.56)';
        waveformCtx.shadowBlur = 7;
        waveformCtx.beginPath();
        for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin((x + waveOffset) * 0.04) * h * 0.2
                + Math.sin((x + waveOffset) * 0.12) * h * 0.08
                + Math.sin((x + waveOffset * 0.5) * 0.02) * h * 0.12;
            if (x === 0) waveformCtx.moveTo(x, y);
            else waveformCtx.lineTo(x, y);
        }
        waveformCtx.stroke();
        waveformCtx.shadowBlur = 0;
    }

    function drawRadar() {
        if (!radarCanvas || !radarCtx) return;
        if (!resizeCanvas(radarCanvas)) return;
        const w = radarCanvas.width;
        const h = radarCanvas.height;
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        const radius = Math.min(w, h) * 0.42;

        radarCtx.clearRect(0, 0, w, h);
        radarCtx.fillStyle = 'rgba(5, 18, 30, 0.92)';
        radarCtx.fillRect(0, 0, w, h);

        radarCtx.strokeStyle = 'rgba(112, 184, 240, 0.25)';
        radarCtx.lineWidth = 1;
        for (let ring = 1; ring <= 3; ring++) {
            radarCtx.beginPath();
            radarCtx.arc(centerX, centerY, radius * (ring / 3), 0, Math.PI * 2);
            radarCtx.stroke();
        }

        for (let ray = 0; ray < 8; ray++) {
            const angle = (Math.PI * 2 * ray) / 8;
            radarCtx.beginPath();
            radarCtx.moveTo(centerX, centerY);
            radarCtx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            radarCtx.stroke();
        }

        const sweepX = centerX + Math.cos(radarSweep) * radius;
        const sweepY = centerY + Math.sin(radarSweep) * radius;
        radarCtx.strokeStyle = 'rgba(201, 238, 255, 0.86)';
        radarCtx.lineWidth = 1.5;
        radarCtx.beginPath();
        radarCtx.moveTo(centerX, centerY);
        radarCtx.lineTo(sweepX, sweepY);
        radarCtx.stroke();

        const blipSeed = state.timeSpeed * 0.04 + (state.isPlaying ? 0.6 : 0.2);
        for (let i = 0; i < 4; i++) {
            const angle = radarSweep * (0.5 + i * 0.14) + i * 1.2;
            const ring = radius * (0.25 + ((i * 0.21 + blipSeed) % 0.5));
            const bx = centerX + Math.cos(angle) * ring;
            const by = centerY + Math.sin(angle) * ring;
            const pulse = 0.45 + 0.55 * Math.sin(radarSweep * 2.2 + i * 1.3);

            radarCtx.fillStyle = `rgba(201, 238, 255, ${0.45 + pulse * 0.45})`;
            radarCtx.beginPath();
            radarCtx.arc(bx, by, 1.5 + pulse * 1.6, 0, Math.PI * 2);
            radarCtx.fill();
        }
    }

    function drawDisplays() {
        drawWaveform();
        drawRadar();

        waveOffset += 1.5;
        radarSweep += 0.028 + Math.min(0.028, state.timeSpeed * 0.0012);
        requestAnimationFrame(drawDisplays);
    }

    drawDisplays();
}

function initializeFeatureUI() {
    updateQualityScaleLabel();
    renderMissions();
    updateMissionStatus();
    updateTourStatus();
    refreshSavedPresetSelect();
    initializeComparePanel();
    syncPlayPauseUI();
    updateSimTime();
    updateBridgeHud(0);
    initConsoleWaveform();
}

function showToast(message) {
    if (!DOM.toastStack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    DOM.toastStack.appendChild(toast);
    setTimeout(() => toast.classList.add('hidden'), 2100);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2400);
}

function getSavedUserPresets() {
    try {
        const raw = window.localStorage.getItem(USER_PRESET_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        console.warn('Failed to load user presets.', err);
        return {};
    }
}

function setSavedUserPresets(presets) {
    try {
        window.localStorage.setItem(USER_PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (err) {
        console.warn('Failed to save user presets.', err);
    }
}

function captureCurrentPresetSnapshot() {
    return {
        timeSpeed: state.timeSpeed,
        reverseTime: state.reverseTime,
        autoRotate: state.autoRotate,
        showOrbits: state.showOrbits,
        showLabels: state.showLabels,
        showMoons: state.showMoons,
        showMoonLabels: state.showMoonLabels,
        showMinorMoonLabels: state.showMinorMoonLabels,
        showAsteroids: state.showAsteroids,
        showKuiper: state.showKuiper,
        showStars: state.showStars,
        showGalaxy: state.showGalaxy,
        showNebulae: state.showNebulae,
        sunLightIntensity: state.sunLightIntensity,
        ambientLightIntensity: state.ambientLightIntensity,
        coronaIntensity: state.coronaIntensity,
        atmosphereIntensity: state.atmosphereIntensity,
        planetScale: state.planetScale,
        orbitScale: state.orbitScale,
        adaptiveQuality: state.adaptiveQuality,
        followTarget: state.followTarget || null
    };
}

function applyAtmosphereIntensity() {
    Object.values(planets).forEach(p => {
        if (p?.mesh?.userData?.atmosphere && p?.data?.atmosphere) {
            p.mesh.userData.atmosphere.material.opacity = p.data.atmosphere.opacity * state.atmosphereIntensity;
        }
    });
}

function applyLiveSceneState({ focusFollowTarget = false } = {}) {
    state.timeSpeed = clampTimeSpeed(state.timeSpeed);

    if (!state.showMoons) {
        if (isMoonObjectKey(state.followTarget)) state.followTarget = null;
        if (isMoonObjectKey(state.selectedObject)) closeInfoPanel();
    }

    controls.autoRotate = !!state.autoRotate;
    applyPlanetScale(state.planetScale);
    applyOrbitScale(state.orbitScale);
    applyAmbientLight();
    if (sunLight) sunLight.intensity = state.sunLightIntensity;
    planetSystem?.setOrbitsVisible(state.showOrbits);
    planetSystem?.setLabelsVisible(state.showLabels);
    planetSystem?.setMoonsVisible(state.showMoons);
    planetSystem?.setMoonLabelsVisible(state.showMoonLabels);
    planetSystem?.setMinorMoonLabelsVisible(state.showMinorMoonLabels);
    refreshRaycastTargets();
    planetSystem?.setAsteroidsVisible(state.showAsteroids);
    planetSystem?.setKuiperVisible(state.showKuiper);
    starLayers.forEach(layer => { layer.visible = state.showStars; });
    if (galaxy) galaxy.visible = state.showGalaxy;
    dustClouds.forEach(layer => { layer.visible = state.showGalaxy; });
    nebulae.forEach(n => { n.visible = state.showNebulae; });
    applyAtmosphereIntensity();

    // Prominences are intentionally disabled in this UI pass.
    state.showProminences = false;
    sunProminences.forEach(p => { p.visible = false; });

    if (!state.adaptiveQuality) setRendererScale(1);

    if (focusFollowTarget && state.followTarget && planets[state.followTarget]) {
        focusOnObject(state.followTarget);
    }

    syncPlayPauseUI();
    syncControlPanelFromState();
    updateQualityScaleLabel();
    updateBridgeHud(0);
    updateSimTime();
}

function applyPresetSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;

    const applyIfFinite = (key) => {
        const v = snapshot[key];
        if (Number.isFinite(v)) state[key] = v;
    };
    const applyIfBool = (key) => {
        const v = snapshot[key];
        if (typeof v === 'boolean') state[key] = v;
    };

    applyIfFinite('timeSpeed');
    applyIfFinite('sunLightIntensity');
    applyIfFinite('ambientLightIntensity');
    applyIfFinite('coronaIntensity');
    applyIfFinite('atmosphereIntensity');
    applyIfFinite('planetScale');
    applyIfFinite('orbitScale');

    applyIfBool('reverseTime');
    applyIfBool('autoRotate');
    applyIfBool('showOrbits');
    applyIfBool('showLabels');
    applyIfBool('showMoons');
    applyIfBool('showMoonLabels');
    applyIfBool('showMinorMoonLabels');
    applyIfBool('showAsteroids');
    applyIfBool('showKuiper');
    applyIfBool('showStars');
    applyIfBool('showGalaxy');
    applyIfBool('showNebulae');
    applyIfBool('adaptiveQuality');

    state.followTarget = typeof snapshot.followTarget === 'string' ? snapshot.followTarget : null;
    applyLiveSceneState({ focusFollowTarget: true });
}

function refreshSavedPresetSelect() {
    if (!DOM.savedPresetSelect) return;
    const presets = getSavedUserPresets();
    const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
    if (names.length === 0) {
        DOM.savedPresetSelect.innerHTML = '<option value="">No saved presets</option>';
        return;
    }
    DOM.savedPresetSelect.innerHTML = names
        .map(name => `<option value="${name}">${name}</option>`)
        .join('');
}

function saveCurrentPreset() {
    const rawName = DOM.presetNameInput?.value?.trim() || '';
    if (!rawName) {
        showToast('Preset name required.');
        return;
    }
    const name = rawName.slice(0, 32);
    const presets = getSavedUserPresets();
    presets[name] = captureCurrentPresetSnapshot();
    setSavedUserPresets(presets);
    refreshSavedPresetSelect();
    if (DOM.savedPresetSelect) DOM.savedPresetSelect.value = name;
    if (DOM.presetNameInput) DOM.presetNameInput.value = '';
    showToast(`Preset saved: ${name}`);
}

function loadSelectedPreset() {
    const name = DOM.savedPresetSelect?.value;
    if (!name) return;
    const presets = getSavedUserPresets();
    if (!presets[name]) return;
    applyPresetSnapshot(presets[name]);
    showToast(`Preset loaded: ${name}`);
}

function deleteSelectedPreset() {
    const name = DOM.savedPresetSelect?.value;
    if (!name) return;
    const presets = getSavedUserPresets();
    if (!Object.prototype.hasOwnProperty.call(presets, name)) return;
    delete presets[name];
    setSavedUserPresets(presets);
    refreshSavedPresetSelect();
    showToast(`Preset deleted: ${name}`);
}

function getMissionStatusMap() {
    const out = {};
    MISSION_DEFS.forEach(def => {
        out[def.id] = !!def.isDone(missionProgress);
    });
    return out;
}

function renderMissions() {
    if (!DOM.missionList) return;
    const status = getMissionStatusMap();
    DOM.missionList.innerHTML = MISSION_DEFS.map(def => {
        const done = status[def.id];
        return `
            <li class="mission-item${done ? ' is-done' : ''}" data-mission="${def.id}">
                <span class="mission-dot"></span>
                <div class="mission-copy">
                    <span class="mission-title">${def.title}</span>
                    <span class="mission-desc">${def.description}</span>
                </div>
            </li>
        `;
    }).join('');
}

function updateMissionStatus() {
    const status = getMissionStatusMap();
    let doneCount = 0;
    Object.values(status).forEach(done => { if (done) doneCount += 1; });
    if (doneCount > lastMissionCompleteCount) {
        showToast(`Mission complete (${doneCount}/${MISSION_DEFS.length}).`);
    }
    lastMissionCompleteCount = doneCount;
    if (DOM.missionProgress) {
        DOM.missionProgress.textContent = `${doneCount} / ${MISSION_DEFS.length} complete`;
    }
    if (!DOM.missionList) return;
    DOM.missionList.querySelectorAll('.mission-item').forEach(item => {
        const id = item.getAttribute('data-mission');
        item.classList.toggle('is-done', !!status[id]);
    });
}

function resetMissions() {
    missionProgress.selectedSaturn = false;
    missionProgress.followEarthSeconds = 0;
    missionProgress.jumpedOneYear = false;
    missionProgress.photoCaptureComplete = false;
    lastMissionCompleteCount = 0;
    updateMissionStatus();
    showToast('Missions reset.');
}

function initializeComparePanel() {
    if (!DOM.compareLeft || !DOM.compareRight) return;
    const keys = Object.keys(PLANET_DATA).filter(key => key !== 'blackhole');
    const options = keys.map(key => `<option value="${key}">${PLANET_DATA[key]?.name || key}</option>`).join('');
    DOM.compareLeft.innerHTML = options;
    DOM.compareRight.innerHTML = options;
    DOM.compareLeft.value = compareState.left;
    DOM.compareRight.value = compareState.right;
    updateComparePanel();
}

function updateComparePanel() {
    if (!DOM.compareContent) return;
    const left = PLANET_DATA[compareState.left];
    const right = PLANET_DATA[compareState.right];
    if (!left || !right) {
        DOM.compareContent.innerHTML = '<div class="compare-cell">Select two planets.</div>';
        return;
    }

    const rows = [
        ['Planet', left.name, right.name, 'planet'],
        ['Type', left.type, right.type],
        ['Diameter', left.diameter, right.diameter],
        ['Gravity', left.gravity, right.gravity],
        ['Orbital Period', left.orbitalPeriod, right.orbitalPeriod],
        ['Temp', left.surfaceTemp, right.surfaceTemp],
        ['Moons', left.moons, right.moons],
        ['Distance', left.distanceFromSun, right.distanceFromSun]
    ];

    DOM.compareContent.innerHTML = `
        <div class="compare-grid">
            ${rows.map(([label, l, r, kind]) => `
                <div class="compare-cell label">${label}</div>
                <div class="compare-cell${kind === 'planet' ? ' planet' : ''}">${l}</div>
                <div class="compare-cell${kind === 'planet' ? ' planet' : ''}">${r}</div>
            `).join('')}
        </div>
    `;
}

function toggleComparePanel(forceValue = null) {
    compareState.visible = forceValue === null ? !compareState.visible : !!forceValue;
    DOM.comparePanel?.classList.toggle('hidden', !compareState.visible);
    if (compareState.visible) updateComparePanel();
    document.body.classList.toggle('compare-panel-open', compareState.visible);
}

function updateTourStatus() {
    if (!DOM.tourStatus) return;
    if (!guidedTour.active) {
        DOM.tourStatus.textContent = 'Idle';
        return;
    }
    const current = TOUR_SEQUENCE[guidedTour.index] || 'complete';
    const name = PLANET_DATA[current]?.name || current;
    const remaining = Math.max(0, Math.ceil(guidedTour.dwellSeconds - guidedTour.elapsed));
    DOM.tourStatus.textContent = `${name} (${remaining}s)`;
}

function startGuidedTour() {
    if (!planetSystem || Object.keys(planets).length === 0) {
        showToast('Tour unavailable until scene load completes.');
        return;
    }
    const tourSpeed = clampTimeSpeed(1);
    if (Math.abs(state.timeSpeed - tourSpeed) > 0.0001) {
        setSimulationSpeed(tourSpeed, { commit: true });
    }
    guidedTour.active = true;
    guidedTour.index = 0;
    guidedTour.elapsed = 0;
    guidedTour.dwellSeconds = 8;
    if (!jumpToGuidedTourTarget()) {
        guidedTour.active = false;
        updateTourStatus();
        showToast('Could not start tour target.');
        return;
    }
    updateTourStatus();
    showToast('Guided tour started.');
}

function stopGuidedTour() {
    if (!guidedTour.active) return;
    guidedTour.active = false;
    guidedTour.elapsed = 0;
    updateTourStatus();
    showToast('Guided tour stopped.');
}

function jumpToGuidedTourTarget() {
    const key = TOUR_SEQUENCE[guidedTour.index];
    if (!key || !planets[key]) return false;
    const ok = selectObject(key, guidedTour.focusOptions);
    if (!ok) return false;
    // Keep tracking the guided target so the camera stays centered.
    state.followTarget = key;
    const select = document.getElementById('camera-target');
    if (select) select.value = key;
    return true;
}

function updateGuidedTour(delta) {
    if (!guidedTour.active) return;
    if (guidedTour.index >= TOUR_SEQUENCE.length) {
        guidedTour.active = false;
        updateTourStatus();
        showToast('Guided tour complete.');
        return;
    }
    guidedTour.elapsed += delta;
    if (guidedTour.elapsed < guidedTour.dwellSeconds) {
        updateTourStatus();
        return;
    }
    guidedTour.elapsed = 0;
    guidedTour.index += 1;
    if (guidedTour.index < TOUR_SEQUENCE.length) {
        if (!jumpToGuidedTourTarget()) {
            guidedTour.active = false;
            showToast('Tour paused: target unavailable.');
        }
    } else {
        guidedTour.active = false;
        state.followTarget = null;
        const select = document.getElementById('camera-target');
        if (select) select.value = 'free';
        showToast('Guided tour complete.');
    }
    updateTourStatus();
}

function updateQualityScaleLabel() {
    if (!DOM.qualityScale) return;
    DOM.qualityScale.textContent = `${Math.round(qualityState.renderScale * 100)}%`;
}

function syncControlPanelFromState() {
    const setChecked = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    };
    const setSlider = (id, value) => {
        const el = document.getElementById(id);
        if (el && Number.isFinite(value)) el.value = String(value);
    };
    const setValueText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    updateSpeedUI();

    setChecked('reverse-time', state.reverseTime);
    setChecked('auto-rotate', state.autoRotate);
    setChecked('show-orbits', state.showOrbits);
    setChecked('show-labels', state.showLabels);
    setChecked('show-moons', state.showMoons);
    setChecked('show-moon-labels', state.showMoonLabels);
    setChecked('show-minor-moon-labels', state.showMinorMoonLabels);
    setChecked('show-asteroids', state.showAsteroids);
    setChecked('show-kuiper', state.showKuiper);
    setChecked('show-stars', state.showStars);
    setChecked('show-galaxy', state.showGalaxy);
    setChecked('show-nebulae', state.showNebulae);
    setChecked('adaptive-quality', state.adaptiveQuality);

    setSlider('ambient-light', state.ambientLightIntensity);
    setValueText('ambient-value', state.ambientLightIntensity.toFixed(1));
    setSlider('corona-intensity', state.coronaIntensity);
    setValueText('corona-value', state.coronaIntensity.toFixed(1));
    setSlider('sun-light', state.sunLightIntensity);
    setValueText('light-value', state.sunLightIntensity.toFixed(1));
    setSlider('atmosphere-intensity', state.atmosphereIntensity);
    setValueText('atmo-value', state.atmosphereIntensity.toFixed(1));
    setSlider('planet-scale', state.planetScale);
    setValueText('planet-scale-value', formatScale(state.planetScale));
    setSlider('orbit-scale', state.orbitScale);
    setValueText('orbit-scale-value', formatScale(state.orbitScale));

    const camSelect = document.getElementById('camera-target');
    if (camSelect) {
        const hasOption = state.followTarget ? !!camSelect.querySelector(`option[value="${state.followTarget}"]`) : false;
        camSelect.value = hasOption ? state.followTarget : 'free';
    }

    updateQualityScaleLabel();
    updateTourStatus();
}

function setupScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070f, 0.00055);
    backgroundScene = new THREE.Scene();
    backgroundScene.fog = scene.fog;
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
    });
    renderer.autoClear = false;
    renderer.setSize(window.innerWidth, window.innerHeight);
    setRendererScale(qualityState.renderScale);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 1);
    DOM.container.appendChild(renderer.domElement);
}

function createSunSurfaceNoiseTexture(size) {
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i++) {
        data[i] = Math.random() * 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}

function setupRaycaster() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
}

function refreshRaycastTargets() {
    raycastTargets = Object.values(planets)
        .map(p => p.group || p.mesh)
        .filter(target => !!target && target.visible !== false);
}
// SCENE CREATION
async function createSceneElements() {
    try {
        updateLoading('Creating galaxy...', 15);
        await yieldToBrowser();
        await withTimeout(createGalaxy(), 12000, 'Galaxy generation');

        updateLoading('Generating nebulae...', 25);
        await yieldToBrowser();
        createNebulae();

        updateLoading('Placing stars...', 35);
        await yieldToBrowser();
        await withTimeout(createStarfield(), 12000, 'Starfield generation');

        updateLoading('Setting up lighting...', 50);
        await yieldToBrowser();
        createLighting();

        updateLoading('Loading planet shaders...', 65);
        await yieldToBrowser();
        planetSystem = await withTimeout(
            createPlanetSystem({ scene, backgroundScene, state, camera, controls, sunFreqs }),
            60000,
            'Planet system init'
        );
        planets = planetSystem.planets;
        planetLabels = planetSystem.labels;
        orbitLines = planetSystem.orbitLines;
        asteroidBelt = planetSystem.belts.asteroidBelt;
        kuiperBelt = planetSystem.belts.kuiperBelt;
        sun = planetSystem.sun.mesh;
        sunProminences = planetSystem.sun.prominences;
        refreshRaycastTargets();

        if (sceneQueryOverrides?.target && planets[sceneQueryOverrides.target]) {
            selectObject(sceneQueryOverrides.target);
        }

        updateLoading('Finalizing...', 100);

        state.objectCount = countObjects();
        if (DOM.objectCount) DOM.objectCount.textContent = state.objectCount;

        setTimeout(() => DOM.loading?.classList.add('hidden'), 500);
    } catch (err) {
        console.error('Scene initialization failed, continuing with partial scene:', err);
        updateLoading('Loaded with fallback mode', 100);
        state.objectCount = countObjects();
        if (DOM.objectCount) DOM.objectCount.textContent = state.objectCount;
        setTimeout(() => DOM.loading?.classList.add('hidden'), 700);
    }
}

function updateLoading(status, progress) {
    if (DOM.loadingStatus) DOM.loadingStatus.textContent = status;
    if (DOM.loadingProgress) DOM.loadingProgress.style.width = progress + '%';
}

function countObjects() {
    let count = 0;
    scene.traverse(() => count++);
    return count;
}
// GALAXY & STARS
async function createGalaxy() {
    const count = scaleCount(35000, 12000);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const coreColor = new THREE.Color(0xffd1a6);
    const armColor = new THREE.Color(0x7fb2ff);
    const tempColor = new THREE.Color();

    const armCount = 4;
    const maxRadius = 1100;
    const minRadius = 120;
    const coreRadius = 220;
    const coreRatio = 0.18;

    const batchSize = 2400;
    for (let start = 0; start < count; start += batchSize) {
        const end = Math.min(count, start + batchSize);
        for (let i = start; i < end; i++) {
            const i3 = i * 3;
            const isCore = Math.random() < coreRatio;
            let radius = 0;
            let x = 0;
            let y = 0;
            let z = 0;

            if (isCore) {
                radius = Math.pow(Math.random(), 0.35) * coreRadius;
                const angle = Math.random() * Math.PI * 2;
                const jitter = (Math.random() - 0.5) * 18;
                x = Math.cos(angle) * radius + jitter;
                z = Math.sin(angle) * radius + jitter;
                y = (Math.random() - 0.5) * 40;
            } else {
                radius = minRadius + Math.pow(Math.random(), 0.72) * (maxRadius - minRadius);
                const arm = i % armCount;
                const branch = (arm / armCount) * Math.PI * 2;
                const angle = branch + radius * 0.0028 + (Math.random() - 0.5) * 0.2;
                const armWidth = 18 + (radius / maxRadius) * 120;
                const offset = (Math.random() - 0.5) * armWidth;
                const perp = angle + Math.PI * 0.5;
                x = Math.cos(angle) * radius + Math.cos(perp) * offset;
                z = Math.sin(angle) * radius + Math.sin(perp) * offset;
                y = (Math.random() - 0.5) * (10 + radius * 0.03);
            }

            positions[i3] = x;
            positions[i3 + 1] = y - 260;
            positions[i3 + 2] = z - 600;

            const radialT = isCore ? 0 : Math.min(1, radius / maxRadius);
            tempColor.copy(coreColor).lerp(armColor, Math.pow(radialT, 0.7));
            const twinkle = (Math.random() - 0.5) * 0.08;
            tempColor.r = Math.min(1, tempColor.r + twinkle);
            tempColor.g = Math.min(1, tempColor.g + twinkle * 0.6);
            tempColor.b = Math.min(1, tempColor.b + twinkle * 0.9);

            const bright = isCore
                ? 0.55 + Math.random() * 0.35
                : 0.08 + Math.pow(1 - radialT, 1.6) * 0.35;

            colors[i3] = tempColor.r * bright;
            colors[i3 + 1] = tempColor.g * bright;
            colors[i3 + 2] = tempColor.b * bright;
        }

        if (end < count) await yieldToBrowser();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starTex = createGlowTexture(0xffffff, 0xffffff);
    const mat = new THREE.PointsMaterial({
        size: 1.25, map: starTex, vertexColors: true, transparent: true,
        opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
        sizeAttenuation: true
    });
    mat.depthTest = true;

    galaxy = new THREE.Points(geom, mat);
    galaxy.rotation.x = Math.PI * 0.08;
    galaxy.visible = state.showGalaxy;
    dustClouds.push(galaxy);
    backgroundScene.add(galaxy);

    const dustTex = createNebulaTexture(0x5c6ea5);
    const dustMat = new THREE.SpriteMaterial({
        map: dustTex, transparent: true, opacity: 0.12,
        blending: THREE.NormalBlending, depthWrite: false
    });
    dustMat.depthTest = true;
    const dust = new THREE.Sprite(dustMat);
    dust.position.set(0, -220, -700);
    dust.scale.set(1800, 900, 1);
    dust.rotation.z = Math.PI * 0.1;
    dust.visible = state.showGalaxy;
    dustClouds.push(dust);
    backgroundScene.add(dust);

    const dustTex2 = createNebulaTexture(0x2b2a4a);
    const dustMat2 = new THREE.SpriteMaterial({
        map: dustTex2, transparent: true, opacity: 0.08,
        blending: THREE.NormalBlending, depthWrite: false
    });
    dustMat2.depthTest = true;
    const dust2 = new THREE.Sprite(dustMat2);
    dust2.position.set(0, -225, -690);
    dust2.scale.set(1500, 700, 1);
    dust2.rotation.z = -Math.PI * 0.12;
    dust2.visible = state.showGalaxy;
    dustClouds.push(dust2);
    backgroundScene.add(dust2);

    const coreTex = createGlowTexture(0xffd6a6, 0xff8b4a);
    const coreMat = new THREE.SpriteMaterial({
        map: coreTex, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    coreMat.depthTest = true;
    const core = new THREE.Sprite(coreMat);
    core.position.set(0, -220, -700);
    core.scale.set(600, 600, 1);
    core.visible = state.showGalaxy;
    dustClouds.push(core);
    backgroundScene.add(core);
}

function createNebulae() {
    const configs = [
        { color: 0x5637a3, pos: [-520, 120, -900], scale: 950, op: 0.16 },
        { color: 0x3b6fb1, pos: [540, -160, -880], scale: 900, op: 0.15 },
        { color: 0xb054c7, pos: [180, 240, -820], scale: 1050, op: 0.14 },
        { color: 0x2f87bf, pos: [-260, -220, -700], scale: 780, op: 0.16 }
    ];

    configs.forEach(cfg => {
        const tex = createNebulaTexture(cfg.color);
        const mat = new THREE.SpriteMaterial({
            map: tex, transparent: true, opacity: cfg.op,
            blending: THREE.NormalBlending, depthWrite: false
        });
        mat.depthTest = true;
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(...cfg.pos);
        sprite.scale.set(cfg.scale, cfg.scale, 1);
        sprite.rotation.z = Math.random() * Math.PI * 2;
        sprite.visible = state.showNebulae;
        nebulae.push(sprite);
        backgroundScene.add(sprite);
    });
}

async function createStarfield() {
    const layers = [
        { count: scaleCount(15000, 5000), size: 0.3, minR: 400, maxR: 900, op: 0.5 },
        { count: scaleCount(5000, 1800), size: 0.8, minR: 250, maxR: 500, op: 0.7 },
        { count: scaleCount(1500, 600), size: 1.5, minR: 150, maxR: 350, op: 0.9 }
    ];

    const starColors = [
        new THREE.Color(0xffffff), new THREE.Color(0xffeedd),
        new THREE.Color(0xaaccff), new THREE.Color(0xffddaa)
    ];

    for (const layer of layers) {
        const positions = new Float32Array(layer.count * 3);
        const colors = new Float32Array(layer.count * 3);

        const batchSize = 2500;
        for (let start = 0; start < layer.count; start += batchSize) {
            const end = Math.min(layer.count, start + batchSize);
            for (let i = start; i < end; i++) {
                const i3 = i * 3;
                const r = layer.minR + Math.random() * (layer.maxR - layer.minR);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                positions[i3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i3 + 2] = r * Math.cos(phi);

                const col = starColors[Math.floor(Math.random() * starColors.length)];
                const b = 0.6 + Math.random() * 0.4;
                colors[i3] = col.r * b;
                colors[i3 + 1] = col.g * b;
                colors[i3 + 2] = col.b * b;
            }
            if (end < layer.count) await yieldToBrowser();
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: layer.size, vertexColors: true, transparent: true,
            opacity: layer.op, blending: THREE.AdditiveBlending
        });
        mat.depthTest = true;

        const stars = new THREE.Points(geom, mat);
        stars.userData.isStarfield = true;
        stars.visible = state.showStars;
        backgroundScene.add(stars);
        starLayers.push(stars);
        await yieldToBrowser();
    }
}
// LIGHTING
function createLighting() {
    ambientLights = [];
    const ambientA = new THREE.AmbientLight(0x0f1320, 0.18);
    ambientA.userData.baseIntensity = 0.18;
    scene.add(ambientA);
    ambientLights.push(ambientA);

    const ambientB = new THREE.AmbientLight(0x2a3144, 0.35);
    ambientB.userData.baseIntensity = 0.35;
    scene.add(ambientB);
    ambientLights.push(ambientB);

    sunLight = new THREE.PointLight(0xfff4dc, state.sunLightIntensity, 850, 1.05);
    sunLight.castShadow = false;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    fillLight = new THREE.HemisphereLight(0x6f8fd6, 0x0a0a15, 0.45);
    fillLight.userData.baseIntensity = 0.45;
    scene.add(fillLight);
    ambientLights.push(fillLight);

    scene.add(new THREE.PointLight(0xffc07a, 0.55, 260));

    const rim = new THREE.DirectionalLight(0x7aa8ff, 0.18);
    rim.position.set(0, 120, -160);
    scene.add(rim);

    applyAmbientLight();
}

function applyAmbientLight() {
    ambientLights.forEach(light => {
        const base = light.userData.baseIntensity ?? light.intensity;
        light.intensity = base * state.ambientLightIntensity;
    });
}

function applyPlanetScale(newScale) {
    const safeScale = clampPlanetScale(newScale);
    if (planetSystem) {
        planetSystem.applyPlanetScale(safeScale);
    } else {
        state.planetScale = safeScale;
    }
}

function applyOrbitScale(newScale) {
    const safeScale = clampOrbitScale(newScale);
    if (planetSystem) {
        planetSystem.applyOrbitScale(safeScale);
    } else {
        state.orbitScale = safeScale;
    }
}

function setRendererScale(scale) {
    qualityState.renderScale = Math.max(qualityState.minScale, Math.min(qualityState.maxScale, scale));
    const devicePixelRatio = window.devicePixelRatio || 1;
    const target = Math.min(devicePixelRatio, MAIN_RENDER_PIXEL_RATIO_CAP) * qualityState.renderScale;
    renderer.setPixelRatio(target);
    updateQualityScaleLabel();
}

function updateAdaptiveQuality(instantFps, delta) {
    if (!state.adaptiveQuality) {
        qualityState.sampleElapsed = 0;
        qualityState.sampleCount = 0;
        qualityState.sampleSum = 0;
        qualityState.lowStreak = 0;
        qualityState.highStreak = 0;
        return;
    }

    qualityState.sampleElapsed += delta;
    qualityState.sampleCount += 1;
    qualityState.sampleSum += instantFps;
    if (qualityState.sampleElapsed < 1.25) return;

    const avgFps = qualityState.sampleSum / Math.max(1, qualityState.sampleCount);
    qualityState.sampleElapsed = 0;
    qualityState.sampleCount = 0;
    qualityState.sampleSum = 0;

    if (avgFps < 45) {
        qualityState.lowStreak += 1;
        qualityState.highStreak = 0;
    } else if (avgFps > 58) {
        qualityState.highStreak += 1;
        qualityState.lowStreak = 0;
    } else {
        qualityState.lowStreak = 0;
        qualityState.highStreak = 0;
    }

    if (qualityState.lowStreak >= 2) {
        setRendererScale(qualityState.renderScale - 0.1);
        qualityState.lowStreak = 0;
        showToast(`Adaptive quality: ${Math.round(qualityState.renderScale * 100)}%`);
    } else if (qualityState.highStreak >= 3) {
        setRendererScale(qualityState.renderScale + 0.05);
        qualityState.highStreak = 0;
        showToast(`Adaptive quality: ${Math.round(qualityState.renderScale * 100)}%`);
    }
}

function jumpSimulationTime(seconds, label = '') {
    if (!Number.isFinite(seconds) || seconds === 0) return;
    state.simTime += seconds;
    if (Math.abs(seconds) >= YEAR_SECONDS) {
        missionProgress.jumpedOneYear = true;
    }
    updateMissionStatus();
    if (planetSystem) {
        planetSystem.update({ time: clock.getElapsedTime(), simTime: state.simTime });
        if (state.followTarget && planets[state.followTarget]?.mesh) {
            const targetMesh = planets[state.followTarget].mesh;
            targetMesh.getWorldPosition(followTargetWorldPos);
            followTargetDelta.copy(followTargetWorldPos).sub(controls.target);
            controls.target.add(followTargetDelta);
            camera.position.add(followTargetDelta);
        }
    }
    updateSimTime();
    updateBridgeHud(0);
    if (label) {
        const totalDays = Math.floor(Math.abs(state.simTime) / DAY_SECONDS);
        const sign = state.simTime < 0 ? '-' : '+';
        showToast(`Time jump: ${label} (D${sign}${totalDays})`);
    }
}

function vectorToParam(v) {
    return `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
}

function buildShareSceneUrl() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('speed', state.timeSpeed.toFixed(2));
    params.set('auto', state.autoRotate ? '1' : '0');
    params.set('orbits', state.showOrbits ? '1' : '0');
    params.set('labels', state.showLabels ? '1' : '0');
    params.set('moons', state.showMoons ? '1' : '0');
    params.set('moonlabels', state.showMoonLabels ? '1' : '0');
    params.set('minormoonlabels', state.showMinorMoonLabels ? '1' : '0');
    params.set('asteroids', state.showAsteroids ? '1' : '0');
    params.set('kuiper', state.showKuiper ? '1' : '0');
    params.set('stars', state.showStars ? '1' : '0');
    params.set('galaxy', state.showGalaxy ? '1' : '0');
    params.set('nebulae', state.showNebulae ? '1' : '0');
    params.set('photo', state.photoMode ? '1' : '0');
    params.set('adaptive', state.adaptiveQuality ? '1' : '0');
    params.set('cam', vectorToParam(camera.position));
    params.set('look', vectorToParam(controls.target));
    if (state.followTarget) params.set('target', state.followTarget);
    else params.delete('target');
    return url.toString();
}

async function copyShareSceneUrl() {
    const url = buildShareSceneUrl();
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
        } else {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        showToast('Share URL copied.');
    } catch (err) {
        console.warn('Failed to copy share URL.', err);
        showToast('Copy failed. URL logged in console.');
        console.log(url);
    }
}

function applyPhotoModeState(enabled) {
    state.photoMode = !!enabled;
    document.body.classList.toggle('photo-mode', state.photoMode);
    const btn = document.getElementById('btn-photo-mode');
    btn?.classList.toggle('photo-active', state.photoMode);
    const panelBtn = document.getElementById('btn-photo-mode-panel');
    panelBtn?.classList.toggle('photo-active', state.photoMode);
    if (panelBtn) {
        panelBtn.setAttribute('aria-label', state.photoMode ? 'Exit photo mode' : 'Enable photo mode');
        panelBtn.setAttribute('title', state.photoMode ? 'Exit photo mode' : 'Photo mode');
    }
    const panelPhotoLabel = document.getElementById('panel-photo-label');
    if (panelPhotoLabel) panelPhotoLabel.textContent = state.photoMode ? 'Exit' : 'Photo';
}

function togglePhotoMode(forceValue = null) {
    const next = forceValue === null ? !state.photoMode : !!forceValue;
    applyPhotoModeState(next);
    showToast(next ? 'Photo mode enabled.' : 'Photo mode disabled.');
}

function openCommandPalette() {
    if (!DOM.commandPalette || !DOM.commandInput) return;
    DOM.commandPalette.classList.remove('hidden');
    DOM.commandInput.value = '';
    DOM.commandInput.focus();
}

function closeCommandPalette() {
    DOM.commandPalette?.classList.add('hidden');
}

function normalizePlanetAlias(alias) {
    if (!alias) return null;
    const key = alias.trim().toLowerCase();
    if (planets[key]) return key;
    if (PLANET_DATA[key]) return key;
    const hit = Object.entries(PLANET_DATA).find(([, data]) => data.name.toLowerCase() === key);
    if (hit) return hit[0];
    const sceneHit = Object.entries(planets).find(([, body]) => (body?.data?.name || '').toLowerCase() === key);
    return sceneHit ? sceneHit[0] : null;
}

function runCommand(raw) {
    const input = (raw || '').trim();
    if (!input) return false;
    const parts = input.toLowerCase().split(/\s+/);
    const cmd = parts[0];

    if (cmd === 'focus') {
        const key = normalizePlanetAlias(parts[1]);
        if (key) {
            selectObject(key);
            return true;
        }
        showToast('Unknown planet.');
        return false;
    }

    if (cmd === 'follow') {
        const key = normalizePlanetAlias(parts[1]);
        if (parts[1] === 'off' || parts[1] === 'free') {
            state.followTarget = null;
            const select = document.getElementById('camera-target');
            if (select) select.value = 'free';
            refreshSimulationAccent();
            showToast('Follow target cleared.');
            return true;
        }
        if (key) {
            state.followTarget = key;
            const select = document.getElementById('camera-target');
            if (select) select.value = key;
            refreshSimulationAccent(key);
            const targetName = PLANET_DATA[key]?.name || planets[key]?.data?.name || key;
            showToast(`Following ${targetName}.`);
            return true;
        }
        showToast('Unknown follow target.');
        return false;
    }

    if (cmd === 'speed') {
        const value = Number.parseFloat(parts[1]);
        if (!Number.isFinite(value)) {
            showToast('Speed value required.');
            return false;
        }
        setSimulationSpeed(value, { commit: true });
        showToast(`Speed set to ${formatTimeSpeed(state.timeSpeed)}.`);
        return true;
    }

    if (cmd === 'toggle') {
        const key = parts[1];
        const map = {
            orbits: 'showOrbits',
            labels: 'showLabels',
            moons: 'showMoons',
            moonlabels: 'showMoonLabels',
            minormoonlabels: 'showMinorMoonLabels',
            asteroids: 'showAsteroids',
            galaxy: 'showGalaxy',
            stars: 'showStars',
            nebulae: 'showNebulae'
        };
        if (!map[key]) {
            showToast('Unknown toggle target.');
            return false;
        }
        state[map[key]] = !state[map[key]];
        applyPresetSnapshot(captureCurrentPresetSnapshot());
        showToast(`Toggled ${key}.`);
        return true;
    }

    if (cmd === 'jump') {
        const unit = parts[1];
        if (unit === '1d') jumpSimulationTime(DAY_SECONDS, '+1 day');
        else if (unit === '1m') jumpSimulationTime(MONTH_SECONDS, '+1 month');
        else if (unit === '1y') jumpSimulationTime(YEAR_SECONDS, '+1 year');
        else {
            showToast('Use jump 1d / 1m / 1y.');
            return false;
        }
        return true;
    }

    if (cmd === 'tour') {
        if (parts[1] === 'start') startGuidedTour();
        else if (parts[1] === 'stop') stopGuidedTour();
        else {
            showToast('Use tour start / stop.');
            return false;
        }
        return true;
    }

    if (cmd === 'photo') {
        if (parts[1] === 'on') togglePhotoMode(true);
        else if (parts[1] === 'off') togglePhotoMode(false);
        else togglePhotoMode();
        return true;
    }

    if (cmd === 'share') {
        copyShareSceneUrl();
        return true;
    }

    if (cmd === 'help') {
        DOM.shortcutsHelp?.classList.remove('hidden');
        return true;
    }

    showToast('Unknown command.');
    return false;
}
// ANIMATION
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    const instantFps = delta > 0 ? (1 / delta) : 60;
    updateAdaptiveQuality(instantFps, delta);
    fpsSmoothed += (instantFps - fpsSmoothed) * 0.08;
    fpsUpdateAccumulator += delta;
    if (fpsUpdateAccumulator >= 0.25) {
        state.fps = Math.round(fpsSmoothed);
        if (DOM.fpsCounter) DOM.fpsCounter.textContent = state.fps;
        fpsUpdateAccumulator = 0;
    }

    if (state.isPlaying) {
        state.simTime += delta * state.timeSpeed * SIM_SECONDS_PER_DAY * (state.reverseTime ? -1 : 1);
        if (state.followTarget === 'earth') {
            const prevWhole = Math.floor(missionProgress.followEarthSeconds);
            missionProgress.followEarthSeconds += delta;
            if (Math.floor(missionProgress.followEarthSeconds) !== prevWhole) {
                updateMissionStatus();
            }
        }
        updateSimTime();
        animateBackground();
    }

    updateGuidedTour(delta);
    updateBridgeHud(delta);

    planetSystem?.update({ time, simTime: state.simTime });
    animateSun(time);

    if (state.followTarget && planets[state.followTarget] && !state.isCameraAnimating) {
        const targetMesh = planets[state.followTarget].mesh;
        targetMesh.getWorldPosition(followTargetWorldPos);
        followTargetDelta.copy(followTargetWorldPos).sub(controls.target);
        controls.target.add(followTargetDelta);
        camera.position.add(followTargetDelta);
    }

    updateSmoothZoom();
    updateKeyboardPan(state);
    preventCameraPlanetClipping();
    updateHoverState();
    planetSystem?.updateLabels(time * 1000);
    controls.update();
    renderer.clear();
    renderer.render(backgroundScene, camera);
    renderer.clearDepth();
    renderer.render(scene, camera);

    if (captureNextFrame) {
        captureNextFrame = false;
        const link = document.createElement('a');
        link.download = pendingScreenshotName || `cosmos-${Date.now()}.png`;
        link.href = renderer.domElement.toDataURL('image/png');
        link.click();
        showToast('Screenshot saved.');
        pendingScreenshotName = null;
    }
}

function updateSimTime() {
    if (!Number.isFinite(state.simTime)) {
        state.simTime = 0;
    }
    const total = Math.floor(Math.abs(state.simTime));
    const days = Math.floor(total / DAY_SECONDS);
    const h = Math.floor(total / 3600) % 24;
    const m = Math.floor(total / 60) % 60;
    const s = total % 60;
    const sign = state.simTime < 0 ? '-' : '+';
    if (DOM.simTime) DOM.simTime.textContent =
        `${sign}${days.toString().padStart(4,'0')}d ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function setHudText(el, text) {
    if (el) el.textContent = text;
}

function formatHudAltitude(value) {
    const au = Math.max(0, value);
    return `${au.toFixed(2)} AU`;
}

function computeHudAltitude() {
    if (state.followTarget && planets[state.followTarget]?.mesh) {
        planets[state.followTarget].mesh.getWorldPosition(hudTargetWorldPos);
        return camera.position.distanceTo(hudTargetWorldPos);
    }
    return camera.position.distanceTo(controls.target);
}

function updateBridgeHud(delta = 0) {
    hudRuntime.updateAccumulator += delta;
    if (state.isPlaying) {
        const burn = HUD_FUEL_BURN_RATE * (0.4 + Math.max(0.1, state.timeSpeed));
        hudRuntime.fuel = Math.max(HUD_FUEL_MIN, hudRuntime.fuel - burn * delta);
    }

    if (delta > 0 && hudRuntime.updateAccumulator < 0.1) return;
    hudRuntime.updateAccumulator = 0;

    const destinationKey = state.followTarget || state.selectedObject || 'neptune';
    const destinationLabel = PLANET_DATA[destinationKey]?.name?.toUpperCase() || 'FREE NAV';
    const altitude = computeHudAltitude();
    const altitudeText = formatHudAltitude(altitude);
    const speedKmh = Math.round(state.timeSpeed * 175000);
    const speedText = `${speedKmh.toLocaleString()} KM/H`;
    const etaDays = state.timeSpeed > 0
        ? Math.max(1, Math.round((Math.max(altitude, 0.6) * 12) / Math.max(0.25, state.timeSpeed)))
        : Infinity;
    const etaText = Number.isFinite(etaDays) ? `${etaDays} DAYS` : 'N/A';
    const fuelText = `${Math.round(hudRuntime.fuel)}%`;
    const shipState = state.isPlaying
        ? (state.reverseTime ? 'REVERSE' : 'NOMINAL')
        : 'HOLD';
    const shieldState = state.showAsteroids ? 'ACTIVE' : 'STABLE';

    const reactorTemp = `${Math.round(72 + state.timeSpeed * 2.6 + (state.isPlaying ? 8 : 2))} C`;
    const batteryLevel = `${Math.round(Math.min(99, 64 + hudRuntime.fuel * 0.34))}%`;
    const oxygenLevel = `${Math.round(Math.max(91, 99 - Math.min(8, state.timeSpeed * 0.18)))}%`;

    const engineThrust = `${Math.min(100, Math.round(34 + state.timeSpeed * 9 + (state.isPlaying ? 10 : 0)))}%`;

    let hyperdriveLabel = 'READY';
    let hyperdriveClass = 'status-green';
    if (!state.isPlaying) {
        hyperdriveLabel = 'HOLD';
        hyperdriveClass = 'status-amber';
    } else if (state.reverseTime) {
        hyperdriveLabel = 'REV LOCK';
        hyperdriveClass = 'status-red';
    } else if (state.timeSpeed < 0.5) {
        hyperdriveLabel = 'STANDBY';
        hyperdriveClass = 'status-amber';
    }

    let runtimeHealthLabel = 'GREEN';
    if (state.fps < 36) {
        runtimeHealthLabel = 'RED';
    } else if (state.fps < 50) {
        runtimeHealthLabel = 'AMBER';
    }

    const systemLog = state.reverseTime
        ? 'REVERSE FLOW'
        : (state.isPlaying ? 'CLEAR' : 'PAUSE HOLD');
    const commChannel = `${(14.2 + Math.sin(performance.now() * 0.00015) * 0.35 + state.timeSpeed * 0.01).toFixed(1)} GHZ`;
    const radiation = `${(0.02 + Math.max(0, (52 - state.fps) * 0.0016) + state.timeSpeed * 0.0005).toFixed(2)} MSV`;

    setHudText(DOM.hudShipStatus, shipState);
    setHudText(DOM.hudShipSpeed, speedText);
    setHudText(DOM.hudShipAltitude, altitudeText);
    setHudText(DOM.hudShipFuel, fuelText);
    setHudText(DOM.hudShipShields, shieldState);
    setHudText(DOM.hudDestination, destinationLabel);
    setHudText(DOM.hudEta, engineThrust);
    setHudText(DOM.hudSystemHealth, hyperdriveLabel);
    if (DOM.hudSystemHealth) {
        DOM.hudSystemHealth.classList.remove('status-green', 'status-amber', 'status-red');
        DOM.hudSystemHealth.classList.add(hyperdriveClass);
    }

    setHudText(DOM.hudConsoleAltitude, systemLog);
    setHudText(DOM.hudConsoleFuel, commChannel);
    setHudText(DOM.hudConsoleShields, radiation);
    setHudText(DOM.hudConsoleTarget, destinationLabel);
    setHudText(DOM.hudConsoleEta, etaText);
    setHudText(DOM.hudConsoleHealth, runtimeHealthLabel);

    setHudText(DOM.hudShipAltitude2, reactorTemp);
    setHudText(DOM.hudShipFuel2, batteryLevel);
    setHudText(DOM.hudShipShields2, oxygenLevel);

    if (Array.isArray(DOM.consoleIndicators) && DOM.consoleIndicators.length) {
        const indicatorCount = DOM.consoleIndicators.length;
        const activeCount = Math.max(1, Math.min(indicatorCount, Math.round((state.fps / 60) * indicatorCount)));
        DOM.consoleIndicators.forEach((indicator, index) => {
            const isActive = index < activeCount;
            const isAlert = state.reverseTime && index >= activeCount - 1;
            indicator.classList.toggle('active', isActive);
            indicator.classList.toggle('alert', isAlert);
        });
    }

    // Update gauge dials
    if (DOM.gaugeSpeed) {
        const speedVal = parseFloat(String(speedText).replace(/[^0-9.]/g, '')) || 0;
        const speedAngle = Math.min(speedVal / 500000, 1) * 240 - 120;
        DOM.gaugeSpeed.style.setProperty('--gauge-rotation', speedAngle + 'deg');
    }
    if (DOM.gaugeFuel) {
        const fuelVal = parseFloat(String(fuelText).replace(/[^0-9.]/g, '')) || 0;
        const fuelAngle = (fuelVal / 100) * 240 - 120;
        DOM.gaugeFuel.style.setProperty('--gauge-rotation', fuelAngle + 'deg');
    }

    // Update new diagnostic readouts
    const fpsStr = String(Math.round(state.fps || 60));
    const ftStr = state.fps > 0 ? (1000 / state.fps).toFixed(1) + 'ms' : '--';
    const scaleStr = (qualityState?.renderScale != null ? Math.round(qualityState.renderScale * 100) : 100) + '%';
    const objStr = String(state.objectCount || 0);
    setHudText(DOM.diagFps, fpsStr);
    setHudText(DOM.diagFrametime, ftStr);
    setHudText(DOM.diagScale, scaleStr);
    setHudText(DOM.diagObjects, objStr);
    setHudText(DOM.diagFps2, fpsStr);
    setHudText(DOM.diagFrametime2, ftStr);
    setHudText(DOM.diagScale2, scaleStr);
    setHudText(DOM.diagObjects2, objStr);

    // Update perf graph
    if (DOM.perfGraph) updatePerfGraph(DOM.perfGraph, delta);
}

// --- Performance Graph ---
const perfHistory = [];
const PERF_HISTORY_MAX = 120;

function updatePerfGraph(canvas, delta) {
    const ft = delta > 0 ? delta * 1000 : 16.67;
    perfHistory.push(ft);
    if (perfHistory.length > PERF_HISTORY_MAX) perfHistory.shift();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // 16.67ms target line
    const targetY = h - (16.67 / 50) * h;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Frame time line
    if (perfHistory.length < 2) return;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = w / (PERF_HISTORY_MAX - 1);
    for (let i = 0; i < perfHistory.length; i++) {
        const x = i * step;
        const y = h - Math.min(perfHistory[i] / 50, 1) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// --- Parameter History (Undo/Redo) ---
const paramHistory = { stack: [], index: -1, maxSize: 50 };

function captureParamState() {
    return {
        timeSpeed: state.timeSpeed,
        planetScale: state.planetScale,
        orbitScale: state.orbitScale,
        reverseTime: state.reverseTime,
        showOrbits: state.showOrbits,
        showLabels: state.showLabels,
        showMoons: state.showMoons,
        showMoonLabels: state.showMoonLabels,
        showMinorMoonLabels: state.showMinorMoonLabels,
        showAsteroids: state.showAsteroids,
        showKuiper: state.showKuiper,
        showStars: state.showStars,
        showGalaxy: state.showGalaxy,
        showNebulae: state.showNebulae,
        ambientLightIntensity: state.ambientLightIntensity,
        sunLightIntensity: state.sunLightIntensity,
        coronaIntensity: state.coronaIntensity,
        atmosphereIntensity: state.atmosphereIntensity,
        autoRotate: state.autoRotate,
        adaptiveQuality: state.adaptiveQuality,
        followTarget: state.followTarget || null,
    };
}

function pushParamState() {
    const snap = captureParamState();
    const prev = paramHistory.stack[paramHistory.index];
    if (prev && JSON.stringify(prev) === JSON.stringify(snap)) return;
    paramHistory.stack = paramHistory.stack.slice(0, paramHistory.index + 1);
    paramHistory.stack.push(snap);
    if (paramHistory.stack.length > paramHistory.maxSize) paramHistory.stack.shift();
    paramHistory.index = paramHistory.stack.length - 1;
    updateParamHistoryButtons();
}

function restoreParamState(snap) {
    Object.assign(state, snap);
    applyLiveSceneState({ focusFollowTarget: true });
}

function undoParam() {
    if (paramHistory.index <= 0) return;
    paramHistory.index--;
    restoreParamState(paramHistory.stack[paramHistory.index]);
    updateParamHistoryButtons();
}

function redoParam() {
    if (paramHistory.index >= paramHistory.stack.length - 1) return;
    paramHistory.index++;
    restoreParamState(paramHistory.stack[paramHistory.index]);
    updateParamHistoryButtons();
}

function updateParamHistoryButtons() {
    if (DOM.paramUndo) DOM.paramUndo.disabled = paramHistory.index <= 0;
    if (DOM.paramRedo) DOM.paramRedo.disabled = paramHistory.index >= paramHistory.stack.length - 1;
}

function preventCameraPlanetClipping() {
    const planetEntries = Object.entries(planets);
    for (let i = 0; i < planetEntries.length; i++) {
        const [name, body] = planetEntries[i];
        if (!body?.mesh || name === 'sun') continue;

        body.mesh.getWorldPosition(cameraCollisionPlanetPos);
        cameraCollisionDelta.copy(camera.position).sub(cameraCollisionPlanetPos);

        const distance = cameraCollisionDelta.length();
        const localRadius = body.visualRadius ?? body.data?.radius ?? 1;
        const groupScale = body.group?.scale?.x ?? 1;
        const minDistance = localRadius * groupScale + CAMERA_PLANET_PADDING;
        if (distance >= minDistance) continue;

        if (distance < 0.0001) {
            cameraCollisionDelta.set(0, 0, 1);
        } else {
            cameraCollisionDelta.multiplyScalar(1 / distance);
        }

        const push = minDistance - Math.max(distance, 0.0001);
        camera.position.addScaledVector(cameraCollisionDelta, push);
    }
}

function animateSun(time) {
    if (!planets.sun) return;
    const group = planets.sun.group;

    if (sun?.material?.uniforms) {
        sun.material.uniforms.uTime.value = time;
        sunFreqs.set(
            0.12 + 0.08 * Math.sin(time * 0.7),
            0.18 + 0.1 * Math.sin(time * 0.4 + 1.2),
            0.2 + 0.12 * Math.sin(time * 0.5 + 2.6),
            0.16 + 0.08 * Math.sin(time * 0.6 + 3.8)
        );
    }

    if (sun) {
        sun.lookAt(camera.position);
    }

    group.children.forEach(child => {
        if (child.userData.type === 'corona') {
            const pulse = 1 + Math.sin(time * 2 + child.userData.index) * 0.08;
            const scale = child.userData.baseScale * pulse * state.coronaIntensity;
            child.scale.set(scale, scale, 1);
        }
        if (child.userData.type === 'prominence') {
            const flutter = 0.85 + Math.sin(time * 2.6 + child.userData.index) * 0.15;
            child.scale.set(
                child.userData.baseScaleX * (0.9 + Math.sin(time * 1.6 + child.userData.index) * 0.1),
                child.userData.baseScaleY * flutter,
                1
            );
            child.material.opacity = child.userData.baseOpacity * (0.75 + Math.sin(time * 1.8 + child.userData.index) * 0.15);
        }
    });

    if (sunLight) sunLight.intensity = state.sunLightIntensity;
}

function animateBackground() {
    if (galaxy) galaxy.rotation.y += 0.00005 * state.timeSpeed;
}
// SURFACE VIEWS
function initSunSurfaceView() {
    if (sunSurfaceView) return;
    const modal = document.getElementById('sun-surface-modal');
    const host = document.getElementById('sun-surface-canvas');
    if (!modal || !host) return;

    const scn = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const rnd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rnd.setPixelRatio(Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP));
    rnd.outputColorSpace = THREE.SRGBColorSpace;
    rnd.domElement.style.width = '100%';
    rnd.domElement.style.height = '100%';
    rnd.domElement.style.display = 'block';
    host.appendChild(rnd.domElement);

    const material = new THREE.ShaderMaterial({
        vertexShader: SUN_SURFACE_VERTEX_SHADER,
        fragmentShader: SUN_SURFACE_FRAGMENT_SHADER,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(1, 1) },
            iMouse: { value: new THREE.Vector2(0, 0) },
            iChannel0: { value: createSunSurfaceNoiseTexture(256) },
            iSteps: { value: state.sunSurfaceSteps }
        }
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scn.add(quad);

    const mousePos = new THREE.Vector2(0, 0);
    let pixelRatio = Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP);

    const updateSize = () => {
        const rect = host.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP);
        rnd.setPixelRatio(pixelRatio);
        rnd.setSize(w, h, true);
        material.uniforms.iResolution.value.set(w * pixelRatio, h * pixelRatio);
        mousePos.set(w * pixelRatio * 0.5, h * pixelRatio * 0.5);
    };

    updateSize();

    host.addEventListener('pointermove', (e) => {
        const rect = host.getBoundingClientRect();
        const x = (e.clientX - rect.left) * pixelRatio;
        const y = (rect.height - (e.clientY - rect.top)) * pixelRatio;
        mousePos.set(x, y);
    });

    sunSurfaceView = { modal, host, scene: scn, camera: cam, renderer: rnd, material, mouse: mousePos, raf: null, active: false, updateSize };
}

function openSunSurfaceView() {
    initSunSurfaceView();
    if (!sunSurfaceView || sunSurfaceView.active) return;
    sunSurfaceView.active = true;
    sunSurfaceView.modal.classList.remove('hidden');
    sunSurfaceView.updateSize();

    const tick = () => {
        if (!sunSurfaceView || !sunSurfaceView.active) return;
        sunSurfaceView.raf = requestAnimationFrame(tick);
        sunSurfaceView.material.uniforms.iTime.value = performance.now() * 0.001;
        sunSurfaceView.material.uniforms.iMouse.value.copy(sunSurfaceView.mouse);
        sunSurfaceView.renderer.render(sunSurfaceView.scene, sunSurfaceView.camera);
    };
    tick();
}

function closeSunSurfaceView() {
    if (!sunSurfaceView || !sunSurfaceView.active) return;
    sunSurfaceView.active = false;
    sunSurfaceView.modal.classList.add('hidden');
    if (sunSurfaceView.raf) {
        cancelAnimationFrame(sunSurfaceView.raf);
        sunSurfaceView.raf = null;
    }
}

function initMoonSurfaceView() {
    if (moonSurfaceView) return;
    const modal = document.getElementById('moon-surface-modal');
    const host = document.getElementById('moon-surface-canvas');
    if (!modal || !host) return;

    const scn = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const rnd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rnd.setPixelRatio(Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP));
    rnd.outputColorSpace = THREE.SRGBColorSpace;
    rnd.domElement.style.width = '100%';
    rnd.domElement.style.height = '100%';
    rnd.domElement.style.display = 'block';
    host.appendChild(rnd.domElement);

    const material = new THREE.ShaderMaterial({
        vertexShader: MOON_SURFACE_VERTEX_SHADER,
        fragmentShader: MOON_SURFACE_FRAGMENT_SHADER,
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(1, 1) },
            iMouse: { value: new THREE.Vector2(0, 0) }
        },
        transparent: true
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scn.add(quad);

    const mousePos = new THREE.Vector2(0, 0);
    let pixelRatio = Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP);

    const updateSize = () => {
        const rect = host.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio, SURFACE_RENDER_PIXEL_RATIO_CAP);
        rnd.setPixelRatio(pixelRatio);
        rnd.setSize(w, h, true);
        material.uniforms.iResolution.value.set(w * pixelRatio, h * pixelRatio);
        mousePos.set(w * pixelRatio * 0.5, h * pixelRatio * 0.5);
    };

    updateSize();

    host.addEventListener('pointermove', (e) => {
        const rect = host.getBoundingClientRect();
        const x = (e.clientX - rect.left) * pixelRatio;
        const y = (rect.height - (e.clientY - rect.top)) * pixelRatio;
        mousePos.set(x, y);
    });

    moonSurfaceView = { modal, host, scene: scn, camera: cam, renderer: rnd, material, mouse: mousePos, raf: null, active: false, updateSize };
}

function openMoonSurfaceView() {
    initMoonSurfaceView();
    if (!moonSurfaceView || moonSurfaceView.active) return;
    moonSurfaceView.active = true;
    moonSurfaceView.modal.classList.remove('hidden');
    moonSurfaceView.updateSize();

    const tick = () => {
        if (!moonSurfaceView || !moonSurfaceView.active) return;
        moonSurfaceView.raf = requestAnimationFrame(tick);
        moonSurfaceView.material.uniforms.iTime.value = performance.now() * 0.001;
        moonSurfaceView.material.uniforms.iMouse.value.copy(moonSurfaceView.mouse);
        moonSurfaceView.renderer.render(moonSurfaceView.scene, moonSurfaceView.camera);
    };
    tick();
}

function closeMoonSurfaceView() {
    if (!moonSurfaceView || !moonSurfaceView.active) return;
    moonSurfaceView.active = false;
    moonSurfaceView.modal.classList.add('hidden');
    if (moonSurfaceView.raf) {
        cancelAnimationFrame(moonSurfaceView.raf);
        moonSurfaceView.raf = null;
    }
}
// EVENT HANDLERS
function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        setRendererScale(qualityState.renderScale);
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (sunSurfaceView?.active) sunSurfaceView.updateSize();
        if (moonSurfaceView?.active) moonSurfaceView.updateSize();
    });

    window.addEventListener('mousemove', onMouseMove);

    let pointerDownPos = null;
    let pointerDownTime = 0;

    window.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (isUIInteraction(e.target)) return;
        pointerDownPos = { x: e.clientX, y: e.clientY };
        pointerDownTime = e.timeStamp;
    });

    window.addEventListener('pointerup', (e) => {
        if (!pointerDownPos) return;
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = e.timeStamp - pointerDownTime;
        pointerDownPos = null;

        if (distance > 20 || duration > 400) return;
        if (isUIInteraction(e.target)) return;
        handleSceneClick(e.clientX, e.clientY);
    });

    DOM.panelToggle?.addEventListener('click', () => DOM.controlPanel?.classList.toggle('collapsed'));
    document.getElementById('panel-close')?.addEventListener('click', () =>
        DOM.controlPanel?.classList.add('collapsed'));
    DOM.paramUndo?.addEventListener('click', undoParam);
    DOM.paramRedo?.addEventListener('click', redoParam);

    // Quick buttons
    document.getElementById('btn-reset-camera')?.addEventListener('click', resetCamera);
    document.getElementById('btn-toggle-orbits')?.addEventListener('click', toggleOrbits);
    document.getElementById('btn-toggle-labels')?.addEventListener('click', toggleLabels);
    document.getElementById('btn-toggle-asteroids')?.addEventListener('click', toggleAsteroids);
    document.getElementById('btn-screenshot')?.addEventListener('click', takeScreenshot);
    document.getElementById('btn-share-scene')?.addEventListener('click', copyShareSceneUrl);
    document.getElementById('btn-photo-mode')?.addEventListener('click', () => togglePhotoMode());
    document.getElementById('btn-command-palette')?.addEventListener('click', openCommandPalette);
    document.getElementById('btn-play-pause')?.addEventListener('click', togglePlayPause);
    document.getElementById('btn-play-pause-panel')?.addEventListener('click', togglePlayPause);
    document.getElementById('btn-speed-down')?.addEventListener('click', () => {
        const step = getTimeSpeedStep(state.timeSpeed);
        setSimulationSpeed(state.timeSpeed - step, { commit: true });
    });
    document.getElementById('btn-speed-up')?.addEventListener('click', () => {
        const step = getTimeSpeedStep(state.timeSpeed);
        setSimulationSpeed(state.timeSpeed + step, { commit: true });
    });
    document.getElementById('btn-speed-reset')?.addEventListener('click', () =>
        setSimulationSpeed(4, { commit: true }));
    document.getElementById('btn-screenshot-panel')?.addEventListener('click', takeScreenshot);
    document.getElementById('btn-reset-camera-panel')?.addEventListener('click', resetCamera);
    document.getElementById('btn-share-scene-panel')?.addEventListener('click', copyShareSceneUrl);
    document.getElementById('btn-photo-mode-panel')?.addEventListener('click', () => togglePhotoMode());

    // Console toolbar buttons (duplicates in bottom console)
    document.getElementById('btn-reset-camera2')?.addEventListener('click', resetCamera);
    document.getElementById('btn-toggle-orbits2')?.addEventListener('click', toggleOrbits);
    document.getElementById('btn-toggle-labels2')?.addEventListener('click', toggleLabels);
    document.getElementById('btn-toggle-asteroids2')?.addEventListener('click', toggleAsteroids);
    document.getElementById('btn-screenshot2')?.addEventListener('click', takeScreenshot);
    document.getElementById('btn-share-scene2')?.addEventListener('click', copyShareSceneUrl);
    document.getElementById('btn-photo-mode2')?.addEventListener('click', () => togglePhotoMode());
    document.getElementById('btn-play-pause2')?.addEventListener('click', togglePlayPause);

    document.getElementById('close-panel')?.addEventListener('click', closeInfoPanel);
    document.getElementById('btn-focus-planet')?.addEventListener('click', () =>
        state.selectedObject && focusOnObject(state.selectedObject));
    document.getElementById('btn-follow-planet')?.addEventListener('click', () => {
        if (state.selectedObject) {
            state.followTarget = state.selectedObject;
            const sel = document.getElementById('camera-target');
            if (sel) sel.value = state.selectedObject;
            refreshSimulationAccent(state.selectedObject);
        }
    });

    const sunSurfaceBtn = document.getElementById('btn-sun-surface');
    if (sunSurfaceBtn) {
        sunSurfaceBtn.style.display = 'none';
        sunSurfaceBtn.addEventListener('click', () => openSunSurfaceView());
    }
    const moonSurfaceBtn = document.getElementById('btn-moon-surface');
    if (moonSurfaceBtn) {
        moonSurfaceBtn.style.display = 'none';
        moonSurfaceBtn.addEventListener('click', () => openMoonSurfaceView());
    }
    document.getElementById('sun-surface-close')?.addEventListener('click', closeSunSurfaceView);
    document.getElementById('sun-surface-modal')?.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'sun-surface-modal') closeSunSurfaceView();
    });
    document.getElementById('moon-surface-close')?.addEventListener('click', closeMoonSurfaceView);
    document.getElementById('moon-surface-modal')?.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'moon-surface-modal') closeMoonSurfaceView();
    });

    // Shader viewer button
    document.getElementById('btn-view-shader')?.addEventListener('click', () => {
        if (state.selectedObject) openShaderViewer(state.selectedObject);
    });
    document.getElementById('btn-compare-panel')?.addEventListener('click', () => {
        if (state.selectedObject) {
            compareState.left = state.selectedObject;
            if (DOM.compareLeft) DOM.compareLeft.value = compareState.left;
            updateComparePanel();
        }
        toggleComparePanel();
    });
    document.getElementById('shader-modal-close')?.addEventListener('click', closeShaderViewer);
    document.getElementById('shader-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'shader-modal') closeShaderViewer();
    });
    document.getElementById('shader-fullscreen')?.addEventListener('click', toggleShaderFullscreen);
    document.getElementById('shader-enhanced')?.addEventListener('click', () => {
        if (state.selectedObject) {
            window.open(`../viewer.html?planet=${state.selectedObject}`, '_blank');
        }
    });

    document.getElementById('compare-close')?.addEventListener('click', () => toggleComparePanel(false));
    document.getElementById('compare-swap')?.addEventListener('click', () => {
        const prev = compareState.left;
        compareState.left = compareState.right;
        compareState.right = prev;
        if (DOM.compareLeft) DOM.compareLeft.value = compareState.left;
        if (DOM.compareRight) DOM.compareRight.value = compareState.right;
        updateComparePanel();
    });
    DOM.compareLeft?.addEventListener('change', () => {
        compareState.left = DOM.compareLeft.value;
        updateComparePanel();
    });
    DOM.compareRight?.addEventListener('change', () => {
        compareState.right = DOM.compareRight.value;
        updateComparePanel();
    });

    // Speed slider
    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
        speedSlider.addEventListener('input', () => {
            setSimulationSpeed(speedSlider.value);
        });
        speedSlider.addEventListener('change', () => setSimulationSpeed(speedSlider.value, { commit: true }));
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setSimulationSpeed(btn.dataset.speed, { commit: true });
        });
    });

    document.querySelectorAll('.jump-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const seconds = Number.parseFloat(btn.dataset.jump || '0');
            const label = btn.textContent?.trim() || '';
            jumpSimulationTime(seconds, label);
        });
    });

    document.getElementById('btn-reset-missions')?.addEventListener('click', resetMissions);
    document.getElementById('btn-save-preset')?.addEventListener('click', saveCurrentPreset);
    document.getElementById('btn-load-preset')?.addEventListener('click', loadSelectedPreset);
    document.getElementById('btn-delete-preset')?.addEventListener('click', deleteSelectedPreset);
    DOM.presetNameInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveCurrentPreset();
        }
    });
    document.getElementById('btn-tour-start')?.addEventListener('click', startGuidedTour);
    document.getElementById('btn-tour-stop')?.addEventListener('click', stopGuidedTour);

    // Toggles
    const toggles = [
        ['reverse-time', v => state.reverseTime = v],
        ['auto-rotate', v => { state.autoRotate = v; controls.autoRotate = v; }],
        ['show-orbits', v => { state.showOrbits = v; planetSystem?.setOrbitsVisible(v); }],
        ['show-labels', v => { state.showLabels = v; planetSystem?.setLabelsVisible(v); }],
        ['show-moons', v => {
            state.showMoons = v;
            planetSystem?.setMoonsVisible(v);
            refreshRaycastTargets();
            if (!v) {
                if (isMoonObjectKey(state.followTarget)) {
                    state.followTarget = null;
                    const select = document.getElementById('camera-target');
                    if (select) select.value = 'free';
                }
                if (isMoonObjectKey(state.selectedObject)) closeInfoPanel();
            }
        }],
        ['show-moon-labels', v => { state.showMoonLabels = v; planetSystem?.setMoonLabelsVisible(v); }],
        ['show-minor-moon-labels', v => { state.showMinorMoonLabels = v; planetSystem?.setMinorMoonLabelsVisible(v); }],
        ['show-asteroids', v => { state.showAsteroids = v; planetSystem?.setAsteroidsVisible(v); }],
        ['show-kuiper', v => { state.showKuiper = v; planetSystem?.setKuiperVisible(v); }],
        ['show-stars', v => { state.showStars = v; starLayers.forEach(layer => layer.visible = v); }],
        ['show-galaxy', v => {
            state.showGalaxy = v;
            if (galaxy) galaxy.visible = v;
            dustClouds.forEach(layer => { layer.visible = v; });
        }],
        ['show-nebulae', v => { state.showNebulae = v; nebulae.forEach(n => n.visible = v); }],
        ['adaptive-quality', v => {
            state.adaptiveQuality = v;
            if (!v) setRendererScale(1);
            showToast(v ? 'Adaptive quality on.' : 'Adaptive quality off.');
        }]
    ];

    toggles.forEach(([id, cb]) => {
        const el = document.getElementById(id);
        el?.addEventListener('change', () => {
            cb(el.checked);
            pushParamState();
        });
    });

    // Sliders
    const sliders = [
        ['ambient-light', 'ambient-value', v => {
            state.ambientLightIntensity = v;
            applyAmbientLight();
        }, v => v.toFixed(1)],
        ['corona-intensity', 'corona-value', v => state.coronaIntensity = v, v => v.toFixed(1)],
        ['sun-light', 'light-value', v => {
            state.sunLightIntensity = v;
            if (sunLight) sunLight.intensity = v;
        }, v => v.toFixed(1)],
        ['atmosphere-intensity', 'atmo-value', v => {
            state.atmosphereIntensity = v;
            applyAtmosphereIntensity();
        }, v => v.toFixed(1)],
        ['planet-scale', 'planet-scale-value', v => applyPlanetScale(v), v => formatScale(v)],
        ['orbit-scale', 'orbit-scale-value', v => applyOrbitScale(v), v => formatScale(v)]
    ];

    sliders.forEach(([sid, vid, cb, formatter]) => {
        const slider = document.getElementById(sid);
        const val = document.getElementById(vid);
        slider?.addEventListener('input', () => {
            const v = parseFloat(slider.value);
            cb(v);
            if (val) val.textContent = (typeof formatter === 'function' ? formatter(v) : String(v));
        });
        slider?.addEventListener('change', pushParamState);
    });

    // Camera target
    document.getElementById('camera-target')?.addEventListener('change', e => {
        const t = e.target.value;
        if (t === 'free') state.followTarget = null;
        else { focusOnObject(t); state.followTarget = t; }
        refreshSimulationAccent(t === 'free' ? null : t);
        pushParamState();
    });

    DOM.commandPalette?.addEventListener('click', e => {
        if (e.target === DOM.commandPalette) closeCommandPalette();
    });
    DOM.commandInput?.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = DOM.commandInput.value;
            if (runCommand(text)) {
                closeCommandPalette();
            }
        }
    });
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    hoverRaycastPending = true;
}

function updateHoverState() {
    if (!hoverRaycastPending) return;
    hoverRaycastPending = false;
    if (raycastTargets.length === 0) {
        document.body.classList.remove('hovering-planet');
        return;
    }
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(raycastTargets, true);
    document.body.classList.toggle('hovering-planet', intersects.length > 0);
}

function handleSceneClick(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const clickTargets = raycastTargets.length
        ? raycastTargets
        : Object.values(planets).map(p => p.group || p.mesh).filter(Boolean);
    const intersects = raycaster.intersectObjects(clickTargets, true);

    let sunHit = null;
    for (const hit of intersects) {
        const name = getPlanetNameFromObject(hit.object);
        if (!name) continue;
        if (name === 'sun') {
            if (!sunHit) sunHit = name;
            continue;
        }
        selectObject(name);
        return;
    }

    const nearest = findNearestPlanetAtScreenPos(clientX, clientY);
    if (nearest) {
        selectObject(nearest);
        return;
    }

    if (sunHit) selectObject(sunHit);
}

function findNearestPlanetAtScreenPos(clientX, clientY) {
    let bestNonSun = null;
    let bestNonSunDistSq = Infinity;
    let sunDistSq = Infinity;

    Object.entries(planets).forEach(([name, body]) => {
        if (!body?.mesh) return;
        body.mesh.getWorldPosition(clickWorldPos);
        clickScreenPos.copy(clickWorldPos).project(camera);

        if (clickScreenPos.z < -1 || clickScreenPos.z > 1.2) return;

        const sx = (clickScreenPos.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-clickScreenPos.y * 0.5 + 0.5) * window.innerHeight;
        const dx = sx - clientX;
        const dy = sy - clientY;
        const distSq = dx * dx + dy * dy;

        const baseRadius = name === 'sun' ? 40 : 24;
        const radiusForPick = body.visualRadius ?? body.data?.radius ?? 1;
        const pickRadius = baseRadius + Math.min(28, radiusForPick * state.planetScale * 3);
        if (distSq > pickRadius * pickRadius) return;

        if (name === 'sun') {
            if (distSq < sunDistSq) sunDistSq = distSq;
            return;
        }

        if (distSq < bestNonSunDistSq) {
            bestNonSunDistSq = distSq;
            bestNonSun = name;
        }
    });

    if (bestNonSun) return bestNonSun;
    if (Number.isFinite(sunDistSq)) return 'sun';
    return null;
}

function getPlanetNameFromObject(object) {
    let current = object;
    while (current) {
        if (current.userData) {
            if (current.userData.key) return current.userData.key;
            if (current.userData.name) {
                if (PLANET_DATA[current.userData.name]) return current.userData.name;
                const lower = current.userData.name.toLowerCase();
                if (PLANET_DATA[lower]) return lower;
            }
        }
        current = current.parent;
    }
    return null;
}

function isUIInteraction(target) {
    if (!target) return false;
    return !!target.closest(
        '#control-panel, #quick-actions, #panel-toggle, #info-panel, #compare-panel, #main-header, #loading, #shortcuts-help, #command-palette, #sun-surface-modal, #moon-surface-modal, #shader-modal, #hud-root, #ci-header-bar, #ci-bottom-bar, button, input, select, textarea, .ci-btn, .quick-btn, .action-btn, .preset-btn, .toggle-switch, .panel-toggle, .control-section'
    );
}

function showPlanetInfoPanel() {
    DOM.infoPanel?.classList.remove('hidden');
    document.body.classList.add('planet-panel-open');
}

function buildInfoDataForObject(name, body) {
    if (PLANET_DATA[name]) return PLANET_DATA[name];
    const bodyData = body?.data;
    if (!bodyData) return null;
    const parentKey = bodyData.parent || body?.orbit?.center || null;
    const parentName = parentKey ? (PLANET_DATA[parentKey]?.name || planets[parentKey]?.data?.name || parentKey) : null;
    const orbitalText = bodyData.orbitalPeriod || (body?.orbit?.speed ? 'Orbital period available in simulation' : 'N/A');

    return {
        name: bodyData.name || name,
        type: bodyData.type || 'Celestial Body',
        color: bodyData.color,
        distanceFromSun: bodyData.distanceFromSun || (parentName ? `Orbits ${parentName}` : 'N/A'),
        orbitalPeriod: orbitalText,
        surfaceTemp: bodyData.surfaceTemp || 'Rocky and cold',
        gravity: bodyData.gravity || 'Low gravity',
        moons: bodyData.moons || '0',
        diameter: bodyData.diameter || 'Variable',
        composition: Array.isArray(bodyData.composition) ? bodyData.composition : [
            { name: 'Silicates', value: 54, color: '#b7b1a7' },
            { name: 'Regolith', value: 30, color: '#8f877a' },
            { name: 'Ice', value: 16, color: '#d4dce8' }
        ],
        fact: bodyData.fact || `${bodyData.name || name} is available in the moon catalog.`
    };
}

function selectObject(name, focusOptions = null) {
    state.selectedObject = name;
    const body = planets[name];
    const data = buildInfoDataForObject(name, body);
    if (!data) return false;
    if (!body?.mesh) {
        showToast(`${data.name} is not ready yet.`);
        return false;
    }
    if (name === 'saturn') {
        missionProgress.selectedSaturn = true;
        updateMissionStatus();
    }

    refreshSimulationAccent(name);
    showPlanetInfoPanel();

    const sunSurfaceBtn = document.getElementById('btn-sun-surface');
    if (sunSurfaceBtn) {
        sunSurfaceBtn.style.display = name === 'sun' ? 'inline-flex' : 'none';
    }
    const moonSurfaceBtn = document.getElementById('btn-moon-surface');
    if (moonSurfaceBtn) {
        moonSurfaceBtn.style.display = name === 'moon' ? 'inline-flex' : 'none';
    }
    if (name !== 'sun') closeSunSurfaceView();
    if (name !== 'moon') closeMoonSurfaceView();

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('planet-name', data.name);
    setEl('planet-type', data.type);
    setEl('planet-distance', data.distanceFromSun);
    setEl('planet-period', data.orbitalPeriod);
    setEl('planet-temp', data.surfaceTemp);
    setEl('planet-gravity', data.gravity);
    setEl('planet-moons', data.moons);
    setEl('planet-diameter', data.diameter);
    setEl('planet-fact', data.fact);
    const avatar = document.getElementById('planet-avatar');
    if (avatar) {
        const rawColor = data.color;
        const fallback = '#9fb6d4';
        let hex = fallback;
        if (typeof rawColor === 'number' && Number.isFinite(rawColor)) {
            hex = `#${rawColor.toString(16).padStart(6, '0').slice(-6)}`;
        } else if (typeof rawColor === 'string' && /^#([0-9a-f]{6})$/i.test(rawColor)) {
            hex = rawColor;
        }
        avatar.style.background = `radial-gradient(circle at 30% 28%, rgba(255,255,255,.88), ${hex})`;
    }

    const compBars = document.getElementById('composition-bars');
    if (compBars && data.composition) {
        compBars.innerHTML = data.composition.map(c => `
            <div class="composition-bar">
                <span class="bar-label">${c.name}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${c.value}%;background:${c.color}"></div></div>
                <span class="bar-value">${c.value}%</span>
            </div>
        `).join('');
    }

    if (DOM.compareLeft && compareState.visible && PLANET_DATA[name]) {
        compareState.left = name;
        DOM.compareLeft.value = compareState.left;
        updateComparePanel();
    }

    focusOnObject(name, focusOptions);
    state.followTarget = name;
    const sel = document.getElementById('camera-target');
    if (sel) {
        const hasOption = !!sel.querySelector(`option[value="${name}"]`);
        sel.value = hasOption ? name : 'free';
    }

    resetZoomState();

    return true;
}

function focusOnObject(name, options = null) {
    const p = planets[name];
    if (!p?.mesh) return;

    const opts = options && typeof options === 'object' ? options : {};
    const distanceMultiplier = Number.isFinite(opts.distanceMultiplier) ? opts.distanceMultiplier : 1;
    const minOffset = Number.isFinite(opts.minOffset) ? opts.minOffset : 15;
    const maxOffset = Number.isFinite(opts.maxOffset) ? opts.maxOffset : 35;
    const durationMs = Number.isFinite(opts.durationMs) ? opts.durationMs : 1200;
    const yawWeight = Number.isFinite(opts.yawWeight) ? opts.yawWeight : 0.6;
    const pitchWeight = Number.isFinite(opts.pitchWeight) ? opts.pitchWeight : 0.3;
    const depthWeight = Number.isFinite(opts.depthWeight) ? opts.depthWeight : 0.8;

    let offset;
    if (name === 'sun') {
        offset = 25 * distanceMultiplier;
    } else {
        const radiusForOffset = p.visualRadius ?? p.data.radius;
        offset = Math.min(
            Math.max((radiusForOffset * state.planetScale * 4 + 10) * distanceMultiplier, minOffset),
            maxOffset
        );
    }

    cameraFocusOffset.set(offset * yawWeight, offset * pitchWeight, offset * depthWeight);

    const resolveLookAt = () => {
        if (!p?.mesh) return null;
        p.mesh.getWorldPosition(cameraFocusLookAtPos);
        return cameraFocusLookAtPos;
    };
    const resolveCamera = () => {
        const lookAt = resolveLookAt();
        if (!lookAt) return null;
        cameraFocusTargetPos.copy(lookAt).add(cameraFocusOffset);
        return cameraFocusTargetPos;
    };

    animateCamera(resolveCamera, resolveLookAt, durationMs);
}

function animateCamera(targetPosOrResolver, lookAtOrResolver, duration = 1200) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const start = performance.now();
    const durationMs = Math.max(1, Number.isFinite(duration) ? duration : 1200);
    const animationToken = ++cameraAnimationToken;
    const resolveTargetPos = typeof targetPosOrResolver === 'function'
        ? targetPosOrResolver
        : () => targetPosOrResolver;
    const resolveLookAt = typeof lookAtOrResolver === 'function'
        ? lookAtOrResolver
        : () => lookAtOrResolver;

    state.isCameraAnimating = true;

    function update() {
        if (animationToken !== cameraAnimationToken) return;

        const t = Math.min((performance.now() - start) / durationMs, 1);
        const ease = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) * 0.5;

        const targetPos = resolveTargetPos();
        const lookAt = resolveLookAt();
        if (targetPos) camera.position.lerpVectors(startPos, targetPos, ease);
        if (lookAt) controls.target.lerpVectors(startTarget, lookAt, ease);
        controls.update();

        if (t < 1) {
            requestAnimationFrame(update);
        } else if (animationToken === cameraAnimationToken) {
            state.isCameraAnimating = false;
        }
    }
    update();
}

// UI Actions
function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    syncPlayPauseUI();
}

function syncPlayPauseUI() {
    const pause = document.getElementById('icon-pause');
    const play = document.getElementById('icon-play');
    const btn = document.getElementById('btn-play-pause');
    if (pause) pause.style.display = state.isPlaying ? 'block' : 'none';
    if (play) play.style.display = state.isPlaying ? 'none' : 'block';
    btn?.classList.toggle('active', state.isPlaying);
    const panelBtn = document.getElementById('btn-play-pause-panel');
    const panelPlayIcon = document.getElementById('panel-play-icon');
    const panelPlayLabel = document.getElementById('panel-play-label');
    if (panelBtn) {
        panelBtn.classList.toggle('active', state.isPlaying);
        panelBtn.setAttribute('aria-label', state.isPlaying ? 'Pause simulation' : 'Resume simulation');
        panelBtn.setAttribute('title', state.isPlaying ? 'Pause / Play simulation' : 'Pause / Play simulation');
    }
    if (panelPlayIcon) panelPlayIcon.textContent = state.isPlaying ? 'II' : '>';
    if (panelPlayLabel) panelPlayLabel.textContent = state.isPlaying ? 'Pause' : 'Play';
}

function resetCamera() {
    state.followTarget = null;
    const sel = document.getElementById('camera-target');
    if (sel) sel.value = 'free';
    refreshSimulationAccent();
    animateCamera(new THREE.Vector3(60, 45, 90), new THREE.Vector3(0, 0, 0));
}

function toggleOrbits() {
    state.showOrbits = !state.showOrbits;
    const el = document.getElementById('show-orbits');
    if (el) el.checked = state.showOrbits;
    planetSystem?.setOrbitsVisible(state.showOrbits);
}

function toggleLabels() {
    state.showLabels = !state.showLabels;
    const el = document.getElementById('show-labels');
    if (el) el.checked = state.showLabels;
    planetSystem?.setLabelsVisible(state.showLabels);
}

function toggleAsteroids() {
    state.showAsteroids = !state.showAsteroids;
    const el = document.getElementById('show-asteroids');
    if (el) el.checked = state.showAsteroids;
    planetSystem?.setAsteroidsVisible(state.showAsteroids);
}

function takeScreenshot() {
    pendingScreenshotName = `cosmos-${Date.now()}.png`;
    captureNextFrame = true;
    if (state.photoMode) {
        missionProgress.photoCaptureComplete = true;
        updateMissionStatus();
    }
    showToast('Screenshot queued.');
}

function closeInfoPanel() {
    DOM.infoPanel?.classList.add('hidden');
    document.body.classList.remove('planet-panel-open');
    state.selectedObject = null;
    refreshSimulationAccent();
    closeSunSurfaceView();
    closeMoonSurfaceView();
}

// Keyboard
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
        const targetTag = e.target?.tagName;
        if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') return;

        if (e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            openCommandPalette();
            return;
        }

        switch (e.key.toLowerCase()) {
            case ' ': e.preventDefault(); togglePlayPause(); break;
            case 'r': resetCamera(); break;
            case 'o': toggleOrbits(); break;
            case 'l': toggleLabels(); break;
            case 'a': toggleAsteroids(); break;
            case 'g':
                state.showGalaxy = !state.showGalaxy;
                if (galaxy) galaxy.visible = state.showGalaxy;
                dustClouds.forEach(layer => { layer.visible = state.showGalaxy; });
                syncControlPanelFromState();
                break;
            case 'p':
                togglePhotoMode();
                break;
            case 'c':
                toggleComparePanel();
                break;
            case 't':
                if (guidedTour.active) stopGuidedTour();
                else startGuidedTour();
                break;
            case 'f':
                document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
                break;
            case 's': if (!e.ctrlKey) takeScreenshot(); break;
            case 'escape': 
                if (!DOM.commandPalette?.classList.contains('hidden')) {
                    closeCommandPalette();
                    break;
                }
                toggleComparePanel(false);
                state.followTarget = null;
                closeInfoPanel();
                closeShaderViewer();
                if (state.photoMode) applyPhotoModeState(false);
                break;
            case '?': DOM.shortcutsHelp?.classList.toggle('hidden'); break;
            case '0': selectObject('sun'); break;
            case '1': selectObject('mercury'); break;
            case '2': selectObject('venus'); break;
            case '3': selectObject('earth'); break;
            case '4': selectObject('mars'); break;
            case '5': selectObject('jupiter'); break;
            case '6': selectObject('saturn'); break;
            case '7': selectObject('uranus'); break;
            case '8': selectObject('neptune'); break;
            case 'v': 
                if (state.selectedObject) openShaderViewer(state.selectedObject);
                break;
        }
    });
}
// SHADER VIEWER FUNCTIONS
const SHADER_VIEW_BASE = '../shaders/webgl/';
const SHADER_MAP = {
    sun: '../shaders/webgl/sun.html',
    mercury: `${SHADER_VIEW_BASE}mercury.html`,
    venus: `${SHADER_VIEW_BASE}venus.html`,
    earth: `${SHADER_VIEW_BASE}earth.html`,
    moon: `${SHADER_VIEW_BASE}moon.html`,
    mars: `${SHADER_VIEW_BASE}mars.html`,
    jupiter: `${SHADER_VIEW_BASE}jupiter.html`,
    saturn: `${SHADER_VIEW_BASE}saturn.html`,
    uranus: `${SHADER_VIEW_BASE}uranus.html`,
    neptune: `${SHADER_VIEW_BASE}neptune.html`,
    ceres: `${SHADER_VIEW_BASE}moon.html`,
    pluto: `${SHADER_VIEW_BASE}moon.html`,
    haumea: `${SHADER_VIEW_BASE}moon.html`,
    makemake: `${SHADER_VIEW_BASE}moon.html`,
    eris: `${SHADER_VIEW_BASE}moon.html`
};

function openShaderViewer(planetId) {
    const modal = document.getElementById('shader-modal');
    const iframe = document.getElementById('shader-iframe');
    const title = document.getElementById('shader-modal-title');
    
    const shaderUrl = SHADER_MAP[planetId];
    if (!shaderUrl) {
        console.warn(`No shader found for ${planetId}`);
        return;
    }
    
    const data = PLANET_DATA[planetId];
    if (title && data) {
        title.textContent = `${data.name} — Procedural Shader`;
    }
    
    if (iframe) iframe.src = shaderUrl;
    if (modal) modal.classList.remove('hidden');
}

function closeShaderViewer() {
    const modal = document.getElementById('shader-modal');
    const iframe = document.getElementById('shader-iframe');
    
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('fullscreen');
    }
    if (iframe) iframe.src = '';
}

function toggleShaderFullscreen() {
    const modal = document.getElementById('shader-modal');
    if (modal) modal.classList.toggle('fullscreen');
}

init();
