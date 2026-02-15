
const BASE_PLANETS = [
    { id: 'sun', name: 'Sun', shader: 'shaders/webgl/sun.html' },
    { id: 'mercury', name: 'Mercury', shader: 'shaders/webgl/mercury.html' },
    { id: 'venus', name: 'Venus', shader: 'shaders/webgl/venus.html' },
    { id: 'earth', name: 'Earth', shader: 'shaders/webgl/earth.html' },
    { id: 'moon', name: 'Moon', shader: 'shaders/webgl/moon.html' },
    { id: 'mars', name: 'Mars', shader: 'shaders/webgl/mars.html' },
    { id: 'jupiter', name: 'Jupiter', shader: 'shaders/webgl/jupiter.html' },
    { id: 'saturn', name: 'Saturn', shader: 'shaders/webgl/saturn.html' },
    { id: 'uranus', name: 'Uranus', shader: 'shaders/webgl/uranus.html' },
    { id: 'neptune', name: 'Neptune', shader: 'shaders/webgl/neptune.html' },
    { id: 'pluto', name: 'Pluto', shader: 'shaders/webgl/pluto.html' },
    { id: 'blackhole', name: 'Black Hole', shader: 'shaders/webgl/blackhole.html' }
];

const CUSTOM_PLANET_STORAGE_KEY = 'cosmos-custom-planets-v1';
const PLAYGROUND_STATE_STORAGE_KEY = 'cosmos-shader-playground-state-v1';

const QUALITY_PRESETS = {
    low: { exposure: 0.93, contrast: 0.92, saturation: 0.85, hue: 0, bloom: 0.08, vignette: 0.32, grain: 0.24 },
    medium: { exposure: 1.0, contrast: 1.0, saturation: 1.0, hue: 0, bloom: 0.28, vignette: 0.25, grain: 0.12 },
    high: { exposure: 1.08, contrast: 1.1, saturation: 1.18, hue: 0, bloom: 0.52, vignette: 0.18, grain: 0.06 }
};

const CUSTOM_TYPE_PRESETS = {
    rocky: {
        primaryColor: '#7f9dcb',
        secondaryColor: '#3d5d8f',
        atmosphereColor: '#8fd5ff',
        rotationSpeed: 0.45,
        bandStrength: 0.85,
        stormStrength: 0.35,
        cloudStrength: 0.64,
        landStrength: 1.2,
        rockiness: 1.25,
        craterStrength: 0.95,
        atmosphereDensity: 1.0,
        planetScale: 1.0,
        haloStrength: 0.62,
        reliefStrength: 1.15,
        specularStrength: 0.36
    },
    desert: {
        primaryColor: '#c9a06a',
        secondaryColor: '#7f5530',
        atmosphereColor: '#f0c68e',
        rotationSpeed: 0.42,
        bandStrength: 0.55,
        stormStrength: 0.25,
        cloudStrength: 0.3,
        landStrength: 1.6,
        rockiness: 1.45,
        craterStrength: 0.85,
        atmosphereDensity: 0.82,
        planetScale: 0.98,
        haloStrength: 0.28,
        reliefStrength: 1.35,
        specularStrength: 0.18
    },
    ocean: {
        primaryColor: '#4d8cc7',
        secondaryColor: '#1e466b',
        atmosphereColor: '#9fd6ff',
        rotationSpeed: 0.58,
        bandStrength: 0.65,
        stormStrength: 0.72,
        cloudStrength: 1.38,
        landStrength: 0.65,
        rockiness: 0.68,
        craterStrength: 0.24,
        atmosphereDensity: 1.2,
        planetScale: 1.02,
        haloStrength: 0.85,
        reliefStrength: 0.86,
        specularStrength: 0.62
    },
    barren: {
        primaryColor: '#9a8e7d',
        secondaryColor: '#53493f',
        atmosphereColor: '#c1b6a4',
        rotationSpeed: 0.35,
        bandStrength: 0.45,
        stormStrength: 0.14,
        cloudStrength: 0.22,
        landStrength: 1.45,
        rockiness: 1.7,
        craterStrength: 1.45,
        atmosphereDensity: 0.52,
        planetScale: 0.97,
        haloStrength: 0.18,
        reliefStrength: 1.55,
        specularStrength: 0.12
    },
    gas: {
        primaryColor: '#c8a66d',
        secondaryColor: '#6c4a2b',
        atmosphereColor: '#dcb892',
        rotationSpeed: 1.05,
        bandStrength: 1.65,
        stormStrength: 1.15,
        cloudStrength: 1.82,
        landStrength: 0.32,
        rockiness: 0.42,
        craterStrength: 0.1,
        atmosphereDensity: 1.5,
        planetScale: 1.08,
        haloStrength: 1.18,
        reliefStrength: 0.64,
        specularStrength: 0.52
    },
    ice: {
        primaryColor: '#9fdbff',
        secondaryColor: '#4e7dbd',
        atmosphereColor: '#d8f2ff',
        rotationSpeed: 0.72,
        bandStrength: 1.25,
        stormStrength: 0.62,
        cloudStrength: 1.08,
        landStrength: 0.9,
        rockiness: 0.72,
        craterStrength: 0.56,
        atmosphereDensity: 1.35,
        planetScale: 1.03,
        haloStrength: 0.96,
        reliefStrength: 1.02,
        specularStrength: 0.72
    },
    lava: {
        primaryColor: '#f06a3b',
        secondaryColor: '#4b1010',
        atmosphereColor: '#ff9a5f',
        rotationSpeed: 0.62,
        bandStrength: 0.95,
        stormStrength: 1.55,
        cloudStrength: 0.36,
        landStrength: 1.35,
        rockiness: 1.95,
        craterStrength: 1.55,
        atmosphereDensity: 0.74,
        planetScale: 1.0,
        haloStrength: 0.45,
        reliefStrength: 1.72,
        specularStrength: 0.22
    }
};

const TEMPLATE_LABELS = {
    rocky: 'Rocky',
    desert: 'Desert',
    ocean: 'Oceanic',
    barren: 'Barren',
    gas: 'Gas Giant',
    ice: 'Ice World',
    lava: 'Lava World'
};

const CUSTOM_PARAM_LIMITS = {
    rotationSpeed: [0.05, 3.2],
    bandStrength: [0.1, 3.4],
    stormStrength: [0, 3.0],
    cloudStrength: [0, 3.2],
    landStrength: [0, 3.0],
    rockiness: [0, 3.4],
    craterStrength: [0, 3.2],
    atmosphereDensity: [0, 3.0],
    planetScale: [0.65, 1.45],
    haloStrength: [0, 1.6],
    reliefStrength: [0.3, 2.8],
    specularStrength: [0, 1.8]
};

const FX_LIMITS = {
    exposure: [0.6, 1.8],
    contrast: [0.6, 1.8],
    saturation: [0.0, 2.5],
    hue: [-180, 180],
    bloom: [0, 1.2],
    vignette: [0, 1.0],
    grain: [0, 1.0]
};

const FX_QUERY_MAP = {
    fxExp: 'exposure',
    fxCon: 'contrast',
    fxSat: 'saturation',
    fxHue: 'hue',
    fxBloom: 'bloom',
    fxVig: 'vignette',
    fxGrain: 'grain'
};

let PLANETS = [];
let customPlanets = [];
let currentPlanetIndex = 3;
let isPaused = false;
let currentSpeed = 1.0;
let currentFactIndex = 0;
let factInterval = null;
let activePreviewPlanet = null;
let customPreviewTimer = null;

const playgroundState = {
    exposure: QUALITY_PRESETS.medium.exposure,
    contrast: QUALITY_PRESETS.medium.contrast,
    saturation: QUALITY_PRESETS.medium.saturation,
    hue: QUALITY_PRESETS.medium.hue,
    bloom: QUALITY_PRESETS.medium.bloom,
    vignette: QUALITY_PRESETS.medium.vignette,
    grain: QUALITY_PRESETS.medium.grain,
    profile: 'medium'
};

const loadingScreen = document.getElementById('loadingScreen');
const shaderFrame = document.getElementById('shaderFrame');
const viewport = document.getElementById('viewport');
const viewportFx = document.getElementById('viewportFx');
const planetGrid = document.getElementById('planetGrid');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const scaleModal = document.getElementById('scaleModal');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const factText = document.getElementById('factText');
const customStatus = document.getElementById('customStatus');
const customPanel = document.getElementById('customPanel');
const customPanelBackdrop = document.getElementById('customPanelBackdrop');
const customPanelToggleButton = document.getElementById('btnCustomPanel');

const CUSTOM_PREVIEW_ID = 'custom-live-preview';

const fxControlMap = {
    fxExposure: 'exposure',
    fxContrast: 'contrast',
    fxSaturation: 'saturation',
    fxHue: 'hue',
    fxBloom: 'bloom',
    fxVignette: 'vignette',
    fxGrain: 'grain'
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    const params = new URLSearchParams(window.location.search);
    customPlanets = loadCustomPlanets();

    const sharedCustom = decodeCustomPlanet(params.get('custom'));
    if (sharedCustom) upsertCustomPlanet(sharedCustom, false);

    rebuildPlanetList();
    restorePlaygroundState();
    applyPlaygroundFromQuery(params);
    applyPlaygroundStateToControls();
    applyPlaygroundEffects();
    applyQualityButtonState(playgroundState.profile);

    const planetParam = params.get('planet');
    if (planetParam) {
        const idx = findPlanetIndexById(planetParam);
        if (idx !== -1) currentPlanetIndex = idx;
    }

    shaderFrame.addEventListener('load', onShaderFrameLoaded);
    renderPlanetGrid();
    setupEventListeners();
    startFactRotation();
    syncCustomLabFromPlanet(PLANETS[currentPlanetIndex]);
    setCustomPanelOpen(Boolean(PLANETS[currentPlanetIndex]?.custom));
    loadPlanet(currentPlanetIndex);
    setTimeout(() => loadingScreen.classList.add('hidden'), 2500);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function readJsonStorage(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        // ignore storage limitations
    }
}

function sanitizeHexColor(raw, fallback) {
    const text = String(raw || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
    return fallback;
}

function toHexColor(value, fallback = '#888888') {
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
    }
    return fallback;
}

function hexToRgbString(hex, fallback = '255, 255, 255') {
    const value = toHexColor(hex, '#ffffff');
    const match = /^#([0-9a-fA-F]{6})$/.exec(value);
    if (!match) return fallback;
    const int = Number.parseInt(match[1], 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `${r}, ${g}, ${b}`;
}

function randomSeed() {
    return Math.floor(Math.random() * 10000);
}

function getTemplateLabel(templateId) {
    return TEMPLATE_LABELS[templateId] || 'Custom';
}

function sanitizePlanetName(raw) {
    const trimmed = String(raw || '').trim();
    return trimmed ? trimmed.slice(0, 22) : 'My Planet';
}
function hydrateCustomPlanetEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const template = Object.prototype.hasOwnProperty.call(CUSTOM_TYPE_PRESETS, raw.template)
        ? raw.template
        : 'rocky';
    const defaults = CUSTOM_TYPE_PRESETS[template];
    const idSource = String(raw.id || '').trim().toLowerCase();
    const idCore = idSource && /^[a-z0-9_-]+$/.test(idSource)
        ? idSource
        : `${Date.now().toString(36)}${Math.floor(Math.random() * 9999).toString(36)}`;

    const seed = Math.round(Number.isFinite(raw.seed) ? raw.seed : Number.parseFloat(raw.seed));
    const rotationSpeed = Number(raw.rotationSpeed);
    const bandStrength = Number(raw.bandStrength);
    const stormStrength = Number(raw.stormStrength);
    const cloudStrength = Number(raw.cloudStrength);
    const landStrength = Number(raw.landStrength);
    const rockiness = Number(raw.rockiness);
    const craterStrength = Number(raw.craterStrength);
    const atmosphereDensity = Number(raw.atmosphereDensity);
    const planetScale = Number(raw.planetScale);
    const haloStrength = Number(raw.haloStrength);
    const reliefStrength = Number(raw.reliefStrength);
    const specularStrength = Number(raw.specularStrength);

    return {
        id: idCore.startsWith('custom-') ? idCore : `custom-${idCore}`,
        name: sanitizePlanetName(raw.name),
        template,
        primaryColor: sanitizeHexColor(raw.primaryColor, defaults.primaryColor),
        secondaryColor: sanitizeHexColor(raw.secondaryColor, defaults.secondaryColor),
        atmosphereColor: sanitizeHexColor(raw.atmosphereColor, defaults.atmosphereColor),
        rotationSpeed: Number.isFinite(rotationSpeed) ? clamp(rotationSpeed, CUSTOM_PARAM_LIMITS.rotationSpeed[0], CUSTOM_PARAM_LIMITS.rotationSpeed[1]) : defaults.rotationSpeed,
        bandStrength: Number.isFinite(bandStrength) ? clamp(bandStrength, CUSTOM_PARAM_LIMITS.bandStrength[0], CUSTOM_PARAM_LIMITS.bandStrength[1]) : defaults.bandStrength,
        stormStrength: Number.isFinite(stormStrength) ? clamp(stormStrength, CUSTOM_PARAM_LIMITS.stormStrength[0], CUSTOM_PARAM_LIMITS.stormStrength[1]) : defaults.stormStrength,
        cloudStrength: Number.isFinite(cloudStrength) ? clamp(cloudStrength, CUSTOM_PARAM_LIMITS.cloudStrength[0], CUSTOM_PARAM_LIMITS.cloudStrength[1]) : defaults.cloudStrength,
        landStrength: Number.isFinite(landStrength) ? clamp(landStrength, CUSTOM_PARAM_LIMITS.landStrength[0], CUSTOM_PARAM_LIMITS.landStrength[1]) : defaults.landStrength,
        rockiness: Number.isFinite(rockiness) ? clamp(rockiness, CUSTOM_PARAM_LIMITS.rockiness[0], CUSTOM_PARAM_LIMITS.rockiness[1]) : defaults.rockiness,
        craterStrength: Number.isFinite(craterStrength) ? clamp(craterStrength, CUSTOM_PARAM_LIMITS.craterStrength[0], CUSTOM_PARAM_LIMITS.craterStrength[1]) : defaults.craterStrength,
        atmosphereDensity: Number.isFinite(atmosphereDensity) ? clamp(atmosphereDensity, CUSTOM_PARAM_LIMITS.atmosphereDensity[0], CUSTOM_PARAM_LIMITS.atmosphereDensity[1]) : defaults.atmosphereDensity,
        planetScale: Number.isFinite(planetScale) ? clamp(planetScale, CUSTOM_PARAM_LIMITS.planetScale[0], CUSTOM_PARAM_LIMITS.planetScale[1]) : defaults.planetScale,
        haloStrength: Number.isFinite(haloStrength) ? clamp(haloStrength, CUSTOM_PARAM_LIMITS.haloStrength[0], CUSTOM_PARAM_LIMITS.haloStrength[1]) : defaults.haloStrength,
        reliefStrength: Number.isFinite(reliefStrength) ? clamp(reliefStrength, CUSTOM_PARAM_LIMITS.reliefStrength[0], CUSTOM_PARAM_LIMITS.reliefStrength[1]) : defaults.reliefStrength,
        specularStrength: Number.isFinite(specularStrength) ? clamp(specularStrength, CUSTOM_PARAM_LIMITS.specularStrength[0], CUSTOM_PARAM_LIMITS.specularStrength[1]) : defaults.specularStrength,
        seed: Number.isFinite(seed) ? clamp(seed, 0, 9999) : randomSeed()
    };
}

function loadCustomPlanets() {
    const parsed = readJsonStorage(CUSTOM_PLANET_STORAGE_KEY, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(hydrateCustomPlanetEntry).filter(Boolean);
}

function saveCustomPlanets() {
    writeJsonStorage(CUSTOM_PLANET_STORAGE_KEY, customPlanets);
}

function encodeCustomPlanet(entry) {
    try {
        return btoa(encodeURIComponent(JSON.stringify(entry)));
    } catch (err) {
        return '';
    }
}

function decodeCustomPlanet(value) {
    if (!value) return null;
    try {
        const decoded = decodeURIComponent(atob(value));
        return hydrateCustomPlanetEntry(JSON.parse(decoded));
    } catch (err) {
        return null;
    }
}

function buildCustomShaderUrl(entry) {
    const params = new URLSearchParams();
    params.set('v', '20260215-lab3');
    params.set('name', entry.name);
    params.set('template', entry.template);
    params.set('primary', entry.primaryColor);
    params.set('secondary', entry.secondaryColor);
    params.set('atmosphere', entry.atmosphereColor);
    params.set('rotation', entry.rotationSpeed.toFixed(3));
    params.set('band', entry.bandStrength.toFixed(3));
    params.set('storm', entry.stormStrength.toFixed(3));
    params.set('cloud', entry.cloudStrength.toFixed(3));
    params.set('land', entry.landStrength.toFixed(3));
    params.set('rock', entry.rockiness.toFixed(3));
    params.set('crater', entry.craterStrength.toFixed(3));
    params.set('atmoDensity', entry.atmosphereDensity.toFixed(3));
    params.set('planetScale', entry.planetScale.toFixed(3));
    params.set('halo', entry.haloStrength.toFixed(3));
    params.set('relief', entry.reliefStrength.toFixed(3));
    params.set('specular', entry.specularStrength.toFixed(3));
    params.set('seed', String(entry.seed));
    return `shaders/webgl/custom-lab.html?${params.toString()}`;
}

function customEntryToPlanet(entry) {
    return {
        id: entry.id,
        name: entry.name,
        shader: buildCustomShaderUrl(entry),
        custom: true,
        params: entry
    };
}

function rebuildPlanetList() {
    PLANETS = BASE_PLANETS.concat(customPlanets.map(customEntryToPlanet));
}

function findPlanetIndexById(planetId) {
    return PLANETS.findIndex(p => p.id === planetId);
}

function upsertCustomPlanet(entry, persist = true) {
    const idx = customPlanets.findIndex(p => p.id === entry.id);
    if (idx === -1) customPlanets.push(entry);
    else customPlanets[idx] = entry;
    if (persist) saveCustomPlanets();
}

function removeCustomPlanetById(planetId) {
    const before = customPlanets.length;
    customPlanets = customPlanets.filter(p => p.id !== planetId);
    if (customPlanets.length !== before) {
        saveCustomPlanets();
        return true;
    }
    return false;
}

function getPlanetSwatchColor(planet) {
    if (planet.custom && planet.params) return planet.params.primaryColor;
    const data = PLANET_DATA[planet.id];
    return data ? toHexColor(data.color) : '#888888';
}

function applyViewerTheme(planet) {
    const root = document.documentElement;
    if (!root) return;
    const swatch = getPlanetSwatchColor(planet || PLANETS[currentPlanetIndex]) || '#ffffff';
    root.style.setProperty('--viewer-accent', swatch);
    root.style.setProperty('--viewer-accent-rgb', hexToRgbString(swatch));
}

function getPlanetDetails(planet) {
    const data = PLANET_DATA[planet.id];
    if (data) return data;
    if (!planet.custom || !planet.params) return null;

    const params = planet.params;
    const impliedDiameter = Math.round(
        6200 +
        params.bandStrength * 17000 +
        params.landStrength * 3600 +
        params.craterStrength * 4200
    );
    const impliedTemp = Math.round(
        -180 +
        params.stormStrength * 220 +
        params.cloudStrength * -24 +
        params.rockiness * 35 +
        (params.template === 'lava' ? 460 : 0)
    );

    return {
        name: params.name,
        type: `${getTemplateLabel(params.template)} Custom`,
        diameter: `${impliedDiameter.toLocaleString()} km (procedural)`,
        mass: 'Generated profile',
        temperature: `${impliedTemp} C equivalent`,
        orbitalPeriod: 'Designer orbit',
        distanceFromSun: 'Free orbit',
        gravity: `${(2.8 + params.rockiness * 2.1 + params.landStrength * 1.4).toFixed(1)} m/s^2 (estimated)`,
        facts: [
            `Seed ${params.seed} drives this planet\'s terrain field.`,
            `${getTemplateLabel(params.template)} template blended with custom palettes.`,
            `Land ${params.landStrength.toFixed(2)}, rock ${params.rockiness.toFixed(2)}, craters ${params.craterStrength.toFixed(2)}.`,
            `Rotation ${params.rotationSpeed.toFixed(2)}x, storms ${params.stormStrength.toFixed(2)}, clouds ${params.cloudStrength.toFixed(2)}.`,
            `Atmosphere density ${params.atmosphereDensity.toFixed(2)} and halo ${params.haloStrength.toFixed(2)}.`,
            `Zoom ${params.planetScale.toFixed(2)}, relief ${params.reliefStrength.toFixed(2)}, specular ${params.specularStrength.toFixed(2)}.`,
            'Share URL to let others load the same generated world.'
        ]
    };
}

function onShaderFrameLoaded() {
    attachFrameTimeController();
    applyFrameTimeState();
    sendToShader('init', { paused: isPaused, speed: currentSpeed });
    if (activePreviewPlanet?.custom && activePreviewPlanet.params) {
        sendToShader('customConfig', activePreviewPlanet.params);
    }
    setTimeout(() => loadingScreen.classList.add('hidden'), 300);
}
function attachFrameTimeController() {
    try {
        const child = shaderFrame.contentWindow;
        if (!child || child.__cosmosTimeControlInstalled) return;

        const originalRAF = child.requestAnimationFrame.bind(child);
        const control = {
            paused: false,
            speed: 1,
            lastTimestamp: null,
            simulationTimestamp: 0
        };

        child.__cosmosTimeControl = control;
        child.requestAnimationFrame = function (callback) {
            return originalRAF((timestamp) => {
                if (control.lastTimestamp === null) control.lastTimestamp = timestamp;
                const delta = Math.max(0, timestamp - control.lastTimestamp);
                control.lastTimestamp = timestamp;
                if (!control.paused) control.simulationTimestamp += delta * control.speed;
                callback(control.simulationTimestamp);
            });
        };
        child.__cosmosTimeControlInstalled = true;
    } catch (err) {
        // iframe control is best effort for WebGL pages
    }
}

function applyFrameTimeState() {
    try {
        const control = shaderFrame.contentWindow?.__cosmosTimeControl;
        if (control) {
            control.paused = isPaused;
            control.speed = currentSpeed;
        }
    } catch (err) {
        // ignore iframe access failures
    }
    sendToShader(isPaused ? 'pause' : 'play');
    sendToShader('speed', currentSpeed);
}

function renderPlanetGrid() {
    planetGrid.innerHTML = PLANETS.map((planet, idx) => {
        const swatch = getPlanetSwatchColor(planet);
        const activeClass = idx === currentPlanetIndex ? 'active' : '';
        const customClass = planet.custom ? 'is-custom' : '';
        const customSuffix = planet.custom ? ' *' : '';
        return `<button class="planet-btn ${activeClass} ${customClass}" data-index="${idx}" title="${planet.name}">
            <div class="planet-icon" style="background: ${swatch}"></div>
            <span class="planet-name">${planet.name}${customSuffix}</span>
        </button>`;
    }).join('');

    planetGrid.querySelectorAll('.planet-btn').forEach(btn => {
        btn.addEventListener('click', () => selectPlanet(Number.parseInt(btn.dataset.index, 10)));
    });
}

function selectPlanet(index) {
    currentPlanetIndex = clamp(index, 0, Math.max(PLANETS.length - 1, 0));
    activePreviewPlanet = null;
    planetGrid.querySelectorAll('.planet-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === currentPlanetIndex);
    });
    const selectedPlanet = PLANETS[currentPlanetIndex];
    syncCustomLabFromPlanet(selectedPlanet);
    if (selectedPlanet?.custom) setCustomPanelOpen(true);
    loadPlanet(currentPlanetIndex);
    updateURL();
}

function renderPlanetToViewport(planet) {
    if (!planet) return;
    loadingScreen.classList.remove('hidden');
    applyViewerTheme(planet);
    shaderFrame.src = planet.shader;
    updateInfoPanel(planet);
    updateFactDisplay(planet);
    applyPlaygroundEffects();
}

function loadPlanet(index) {
    const planet = PLANETS[index];
    if (!planet) return;
    activePreviewPlanet = null;
    renderPlanetToViewport(planet);
}

function loadPreviewPlanet(planet) {
    if (!planet) return;
    activePreviewPlanet = planet;
    renderPlanetToViewport(planet);
}

function updateInfoPanel(planet) {
    const data = getPlanetDetails(planet);
    if (!data) return;
    const swatch = getPlanetSwatchColor(planet);
    document.getElementById('infoIcon').style.background = swatch;
    document.getElementById('infoName').textContent = data.name;
    document.getElementById('infoType').textContent = data.type;
    document.getElementById('infoStats').innerHTML = `
        <div class="stat-item"><div class="stat-label">Diameter</div><div class="stat-value">${data.diameter || '-'}</div></div>
        <div class="stat-item"><div class="stat-label">Mass</div><div class="stat-value">${data.mass || '-'}</div></div>
        <div class="stat-item"><div class="stat-label">Temperature</div><div class="stat-value">${data.temperature || '-'}</div></div>
        <div class="stat-item"><div class="stat-label">Orbital Period</div><div class="stat-value">${data.orbitalPeriod || '-'}</div></div>
        <div class="stat-item"><div class="stat-label">Distance</div><div class="stat-value">${data.distanceFromSun || '-'}</div></div>
        <div class="stat-item"><div class="stat-label">Gravity</div><div class="stat-value">${data.gravity || '-'}</div></div>`;
}

function updateFactDisplay(planet) {
    const data = getPlanetDetails(planet);
    if (!data?.facts || data.facts.length === 0) return;
    currentFactIndex = 0;
    factText.textContent = data.facts[0];
}

function startFactRotation() {
    if (factInterval) clearInterval(factInterval);
    factInterval = setInterval(() => {
        const sourcePlanet = activePreviewPlanet || PLANETS[currentPlanetIndex];
        const data = getPlanetDetails(sourcePlanet);
        if (!data?.facts || data.facts.length === 0) return;
        currentFactIndex = (currentFactIndex + 1) % data.facts.length;
        factText.style.opacity = 0;
        setTimeout(() => {
            factText.textContent = data.facts[currentFactIndex];
            factText.style.opacity = 1;
        }, 200);
    }, 7000);
}
function formatFxValue(key, value) {
    if (key === 'hue') return `${Math.round(value)}`;
    return Number(value).toFixed(2);
}

function applyPlaygroundEffects() {
    shaderFrame.style.filter = `brightness(${playgroundState.exposure}) contrast(${playgroundState.contrast}) saturate(${playgroundState.saturation}) hue-rotate(${playgroundState.hue}deg)`;
    viewport.style.setProperty('--fx-bloom-size', `${Math.round(16 + playgroundState.bloom * 92)}px`);
    viewport.style.setProperty('--fx-bloom-alpha', (0.02 + playgroundState.bloom * 0.46).toFixed(3));

    const vignetteStop = Math.round(58 - playgroundState.vignette * 20);
    const vignetteAlpha = (0.08 + playgroundState.vignette * 0.72).toFixed(3);
    const grainAlpha = (playgroundState.grain * 0.22).toFixed(3);
    viewportFx.style.backgroundImage = `
        radial-gradient(circle at center, rgba(255,255,255,0) ${vignetteStop}%, rgba(0,0,0,${vignetteAlpha}) 100%),
        repeating-linear-gradient(0deg, rgba(255,255,255,${grainAlpha}) 0 1px, rgba(0,0,0,0) 1px 3px),
        repeating-linear-gradient(90deg, rgba(255,255,255,${grainAlpha}) 0 1px, rgba(0,0,0,0) 1px 3px)`;
}

function applyPlaygroundStateToControls() {
    Object.entries(fxControlMap).forEach(([elementId, key]) => {
        const input = document.getElementById(elementId);
        const valueEl = document.getElementById(`${elementId}Value`);
        if (input) input.value = String(playgroundState[key]);
        if (valueEl) valueEl.textContent = formatFxValue(key, playgroundState[key]);
    });
}

function applyQualityButtonState(profile) {
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.quality === profile);
    });
}

function persistPlaygroundState() {
    writeJsonStorage(PLAYGROUND_STATE_STORAGE_KEY, playgroundState);
}

function restorePlaygroundState() {
    const saved = readJsonStorage(PLAYGROUND_STATE_STORAGE_KEY, null);
    if (!saved || typeof saved !== 'object') return;
    Object.keys(FX_LIMITS).forEach(key => {
        const value = Number(saved[key]);
        if (!Number.isFinite(value)) return;
        const [min, max] = FX_LIMITS[key];
        playgroundState[key] = clamp(value, min, max);
    });
    if (saved.profile && Object.prototype.hasOwnProperty.call(QUALITY_PRESETS, saved.profile)) {
        playgroundState.profile = saved.profile;
    } else {
        playgroundState.profile = 'custom';
    }
}

function applyPlaygroundFromQuery(params) {
    Object.entries(FX_QUERY_MAP).forEach(([queryKey, stateKey]) => {
        const raw = params.get(queryKey);
        if (raw === null) return;
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) return;
        const [min, max] = FX_LIMITS[stateKey];
        playgroundState[stateKey] = clamp(parsed, min, max);
        playgroundState.profile = 'custom';
    });

    const profile = params.get('fxProfile');
    if (profile && Object.prototype.hasOwnProperty.call(QUALITY_PRESETS, profile)) {
        Object.assign(playgroundState, QUALITY_PRESETS[profile], { profile });
    }
}

function applyQualityPreset(profile, persist = true) {
    const preset = QUALITY_PRESETS[profile];
    if (!preset) return;
    Object.assign(playgroundState, preset, { profile });
    applyPlaygroundStateToControls();
    applyPlaygroundEffects();
    applyQualityButtonState(profile);
    if (persist) persistPlaygroundState();
}

function setCustomStatus(text) {
    if (customStatus) customStatus.textContent = text;
}

function setCustomPanelOpen(isOpen) {
    const open = Boolean(isOpen);
    if (customPanel) {
        customPanel.classList.toggle('open', open);
        customPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (customPanelBackdrop) {
        customPanelBackdrop.classList.toggle('open', open);
        customPanelBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (customPanelToggleButton) customPanelToggleButton.classList.toggle('active', open);
}

function openCustomPanel() {
    setCustomPanelOpen(true);
}

function closeCustomPanel() {
    setCustomPanelOpen(false);
}

function toggleCustomPanel() {
    const currentlyOpen = customPanel?.classList.contains('open');
    setCustomPanelOpen(!currentlyOpen);
}

function applyTemplateToCustomForm(templateId) {
    const template = CUSTOM_TYPE_PRESETS[templateId] || CUSTOM_TYPE_PRESETS.rocky;
    document.getElementById('customPrimary').value = template.primaryColor;
    document.getElementById('customSecondary').value = template.secondaryColor;
    document.getElementById('customAtmosphere').value = template.atmosphereColor;
    document.getElementById('customRotation').value = String(template.rotationSpeed);
    document.getElementById('customBand').value = String(template.bandStrength);
    document.getElementById('customStorm').value = String(template.stormStrength);
    document.getElementById('customCloud').value = String(template.cloudStrength);
    document.getElementById('customLand').value = String(template.landStrength);
    document.getElementById('customRock').value = String(template.rockiness);
    document.getElementById('customCrater').value = String(template.craterStrength);
    document.getElementById('customAtmoDensity').value = String(template.atmosphereDensity);
    document.getElementById('customPlanetScale').value = String(template.planetScale);
    document.getElementById('customHalo').value = String(template.haloStrength);
    document.getElementById('customRelief').value = String(template.reliefStrength);
    document.getElementById('customSpecular').value = String(template.specularStrength);
}

function collectCustomPlanetForm(existingId = null) {
    const template = document.getElementById('customTemplate').value;
    const defaults = CUSTOM_TYPE_PRESETS[template] || CUSTOM_TYPE_PRESETS.rocky;
    const id = existingId || `custom-${Date.now().toString(36)}${Math.floor(Math.random() * 9999).toString(36)}`;
    const seedValue = Math.round(Number.parseFloat(document.getElementById('customSeed').value));

    return hydrateCustomPlanetEntry({
        id,
        name: sanitizePlanetName(document.getElementById('customName').value),
        template,
        primaryColor: sanitizeHexColor(document.getElementById('customPrimary').value, defaults.primaryColor),
        secondaryColor: sanitizeHexColor(document.getElementById('customSecondary').value, defaults.secondaryColor),
        atmosphereColor: sanitizeHexColor(document.getElementById('customAtmosphere').value, defaults.atmosphereColor),
        rotationSpeed: Number.parseFloat(document.getElementById('customRotation').value),
        bandStrength: Number.parseFloat(document.getElementById('customBand').value),
        stormStrength: Number.parseFloat(document.getElementById('customStorm').value),
        cloudStrength: Number.parseFloat(document.getElementById('customCloud').value),
        landStrength: Number.parseFloat(document.getElementById('customLand').value),
        rockiness: Number.parseFloat(document.getElementById('customRock').value),
        craterStrength: Number.parseFloat(document.getElementById('customCrater').value),
        atmosphereDensity: Number.parseFloat(document.getElementById('customAtmoDensity').value),
        planetScale: Number.parseFloat(document.getElementById('customPlanetScale').value),
        haloStrength: Number.parseFloat(document.getElementById('customHalo').value),
        reliefStrength: Number.parseFloat(document.getElementById('customRelief').value),
        specularStrength: Number.parseFloat(document.getElementById('customSpecular').value),
        seed: Number.isFinite(seedValue) ? seedValue : randomSeed()
    });
}

function isCustomLabShaderActive() {
    const src = shaderFrame.getAttribute('src') || '';
    return src.includes('custom-lab.html');
}

function previewCustomPlanetFromForm() {
    const selected = PLANETS[currentPlanetIndex];
    const draftId = selected?.custom ? selected.id : CUSTOM_PREVIEW_ID;
    const entry = collectCustomPlanetForm(draftId);
    if (!entry) {
        setCustomStatus('Invalid custom planet values.');
        return;
    }

    const previewPlanet = customEntryToPlanet(entry);
    const canHotUpdate = isCustomLabShaderActive();
    if (selected?.custom) {
        activePreviewPlanet = previewPlanet;
        if (canHotUpdate) {
            sendToShader('customConfig', previewPlanet.params);
            updateInfoPanel(previewPlanet);
            updateFactDisplay(previewPlanet);
            applyPlaygroundEffects();
        } else {
            loadPreviewPlanet(previewPlanet);
        }
        setCustomStatus(`Previewing changes for ${entry.name}. Click Create + Save to persist.`);
        return;
    }

    if (activePreviewPlanet && canHotUpdate) {
        activePreviewPlanet = previewPlanet;
        sendToShader('customConfig', previewPlanet.params);
        updateInfoPanel(previewPlanet);
        updateFactDisplay(previewPlanet);
        applyPlaygroundEffects();
    } else {
        loadPreviewPlanet(previewPlanet);
    }
    setCustomStatus('Live preview active. Click Create + Save to add this custom planet.');
}

function scheduleCustomPreview(delayMs = 80) {
    if (customPreviewTimer) window.clearTimeout(customPreviewTimer);
    customPreviewTimer = window.setTimeout(() => {
        previewCustomPlanetFromForm();
    }, delayMs);
}

function syncCustomLabFromPlanet(planet) {
    const deleteButton = document.getElementById('btnDeleteCustom');
    if (planet?.custom && planet.params) {
        const p = planet.params;
        const defaults = CUSTOM_TYPE_PRESETS[p.template] || CUSTOM_TYPE_PRESETS.rocky;
        document.getElementById('customName').value = p.name;
        document.getElementById('customTemplate').value = p.template;
        document.getElementById('customPrimary').value = p.primaryColor;
        document.getElementById('customSecondary').value = p.secondaryColor;
        document.getElementById('customAtmosphere').value = p.atmosphereColor;
        document.getElementById('customRotation').value = String(p.rotationSpeed);
        document.getElementById('customBand').value = String(p.bandStrength);
        document.getElementById('customStorm').value = String(p.stormStrength);
        document.getElementById('customCloud').value = String(p.cloudStrength);
        document.getElementById('customLand').value = String(p.landStrength);
        document.getElementById('customRock').value = String(p.rockiness);
        document.getElementById('customCrater').value = String(p.craterStrength);
        document.getElementById('customAtmoDensity').value = String(p.atmosphereDensity);
        document.getElementById('customPlanetScale').value = String(Number.isFinite(p.planetScale) ? p.planetScale : defaults.planetScale);
        document.getElementById('customHalo').value = String(Number.isFinite(p.haloStrength) ? p.haloStrength : defaults.haloStrength);
        document.getElementById('customRelief').value = String(Number.isFinite(p.reliefStrength) ? p.reliefStrength : defaults.reliefStrength);
        document.getElementById('customSpecular').value = String(Number.isFinite(p.specularStrength) ? p.specularStrength : defaults.specularStrength);
        document.getElementById('customSeed').value = String(p.seed);
        if (deleteButton) deleteButton.disabled = false;
        setCustomStatus(`Selected custom: ${p.name}`);
        return;
    }
    if (deleteButton) deleteButton.disabled = true;
    setCustomStatus('No custom planets selected.');
}

function createOrUpdateCustomPlanet() {
    const selected = PLANETS[currentPlanetIndex];
    const editingId = selected?.custom ? selected.id : null;
    const entry = collectCustomPlanetForm(editingId);
    if (!entry) {
        setCustomStatus('Invalid custom planet values.');
        return;
    }
    upsertCustomPlanet(entry, true);
    rebuildPlanetList();
    renderPlanetGrid();
    const idx = findPlanetIndexById(entry.id);
    if (idx !== -1) selectPlanet(idx);
    openCustomPanel();
    setCustomStatus(`Saved custom planet: ${entry.name}`);
}

function deleteSelectedCustomPlanet() {
    const selected = PLANETS[currentPlanetIndex];
    if (!selected?.custom) return;
    const deleted = removeCustomPlanetById(selected.id);
    if (!deleted) return;

    rebuildPlanetList();
    renderPlanetGrid();
    const fallbackIndex = findPlanetIndexById('earth');
    selectPlanet(fallbackIndex === -1 ? 0 : fallbackIndex);
    setCustomStatus('Deleted selected custom planet.');
}

function randomizeCustomForm() {
    const templates = Object.keys(CUSTOM_TYPE_PRESETS);
    const template = templates[Math.floor(Math.random() * templates.length)];
    document.getElementById('customTemplate').value = template;
    applyTemplateToCustomForm(template);
    document.getElementById('customSeed').value = String(randomSeed());
    document.getElementById('customName').value = `My ${getTemplateLabel(template)}`;
    setCustomStatus('Custom form randomized. Live preview updated.');
    scheduleCustomPreview(0);
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (document.body.classList.contains('fullscreen-mode')) toggleFullscreen();
            if (scaleModal.classList.contains('active')) closeScaleModal();
            if (customPanel?.classList.contains('open')) closeCustomPanel();
            return;
        }

        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                navigatePlanet(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigatePlanet(1);
                break;
            case 'Space':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'KeyF':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'KeyS':
                e.preventDefault();
                takeScreenshot();
                break;
        }
    });

    document.getElementById('btnPlayPause')?.addEventListener('click', togglePlayPause);
    document.getElementById('btnFullscreen')?.addEventListener('click', toggleFullscreen);
    document.getElementById('btnScreenshot')?.addEventListener('click', takeScreenshot);
    document.getElementById('btnScale')?.addEventListener('click', openScaleModal);
    document.getElementById('closeScaleModal')?.addEventListener('click', closeScaleModal);
    scaleModal.addEventListener('click', (e) => {
        if (e.target === scaleModal) closeScaleModal();
    });
    document.getElementById('btnBack')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('btnCustomPanel')?.addEventListener('click', toggleCustomPanel);
    document.getElementById('btnCustomPanelOpenFromSidebar')?.addEventListener('click', openCustomPanel);
    document.getElementById('btnCustomPanelClose')?.addEventListener('click', closeCustomPanel);
    customPanelBackdrop?.addEventListener('click', closeCustomPanel);

    speedSlider.addEventListener('input', (e) => {
        currentSpeed = Number.parseFloat(e.target.value) / 100;
        speedValue.textContent = `${currentSpeed.toFixed(1)}x`;
        applyFrameTimeState();
    });

    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const profile = btn.dataset.quality;
            applyQualityPreset(profile, true);
        });
    });
    Object.entries(fxControlMap).forEach(([elementId, stateKey]) => {
        const input = document.getElementById(elementId);
        const valueEl = document.getElementById(`${elementId}Value`);
        if (!input) return;
        input.addEventListener('input', () => {
            const [min, max] = FX_LIMITS[stateKey];
            const parsed = Number.parseFloat(input.value);
            if (!Number.isFinite(parsed)) return;
            playgroundState[stateKey] = clamp(parsed, min, max);
            playgroundState.profile = 'custom';
            if (valueEl) valueEl.textContent = formatFxValue(stateKey, playgroundState[stateKey]);
            applyQualityButtonState('custom');
            applyPlaygroundEffects();
            persistPlaygroundState();
        });
    });

    document.getElementById('btnFxReset')?.addEventListener('click', () => {
        applyQualityPreset('medium', true);
        setCustomStatus('Playground reset to medium profile.');
    });
    document.getElementById('btnFxSave')?.addEventListener('click', () => {
        persistPlaygroundState();
        setCustomStatus('Playground settings saved locally.');
    });
    document.getElementById('btnFxShare')?.addEventListener('click', copyFxShareUrl);

    document.getElementById('customTemplate')?.addEventListener('change', (e) => {
        applyTemplateToCustomForm(e.target.value);
        scheduleCustomPreview(0);
    });
    document.getElementById('btnCreateCustom')?.addEventListener('click', createOrUpdateCustomPlanet);
    document.getElementById('btnDeleteCustom')?.addEventListener('click', deleteSelectedCustomPlanet);
    document.getElementById('btnCustomRandom')?.addEventListener('click', randomizeCustomForm);

    ['customName', 'customSeed', 'customPrimary', 'customSecondary', 'customAtmosphere', 'customRotation', 'customBand', 'customStorm', 'customCloud', 'customLand', 'customRock', 'customCrater', 'customAtmoDensity', 'customPlanetScale', 'customHalo', 'customRelief', 'customSpecular'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => scheduleCustomPreview(80));
        input.addEventListener('change', () => scheduleCustomPreview(0));
    });
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
}

async function copyFxShareUrl() {
    const selectedPlanet = PLANETS[currentPlanetIndex];
    const planet = activePreviewPlanet || selectedPlanet;
    const url = new URL(window.location.href);
    url.searchParams.set('planet', selectedPlanet.id);
    url.searchParams.set('fxExp', playgroundState.exposure.toFixed(2));
    url.searchParams.set('fxCon', playgroundState.contrast.toFixed(2));
    url.searchParams.set('fxSat', playgroundState.saturation.toFixed(2));
    url.searchParams.set('fxHue', String(Math.round(playgroundState.hue)));
    url.searchParams.set('fxBloom', playgroundState.bloom.toFixed(2));
    url.searchParams.set('fxVig', playgroundState.vignette.toFixed(2));
    url.searchParams.set('fxGrain', playgroundState.grain.toFixed(2));

    if (planet?.custom && planet.params) {
        url.searchParams.set('custom', encodeCustomPlanet(planet.params));
    } else {
        url.searchParams.delete('custom');
    }

    try {
        await copyText(url.toString());
        setCustomStatus('Share URL copied to clipboard.');
    } catch (err) {
        setCustomStatus('Copy failed. Clipboard permission denied.');
    }
}

function navigatePlanet(direction) {
    let newIndex = currentPlanetIndex + direction;
    if (newIndex < 0) newIndex = PLANETS.length - 1;
    if (newIndex >= PLANETS.length) newIndex = 0;
    selectPlanet(newIndex);
}

function togglePlayPause() {
    isPaused = !isPaused;
    const icon = document.getElementById('playPauseIcon');
    if (isPaused) {
        icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        statusDot.classList.add('paused');
        statusText.textContent = 'PAUSED';
    } else {
        icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        statusDot.classList.remove('paused');
        statusText.textContent = 'PLAYING';
    }
    applyFrameTimeState();
}

function sendToShader(type, value) {
    try {
        shaderFrame.contentWindow?.postMessage({ type, value }, '*');
    } catch (err) {
        // ignore unavailable iframe
    }
}

function toggleFullscreen() {
    document.body.classList.toggle('fullscreen-mode');
    if (document.body.classList.contains('fullscreen-mode')) {
        closeCustomPanel();
        document.documentElement.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

function takeScreenshot() {
    try {
        const canvas = (shaderFrame.contentDocument || shaderFrame.contentWindow.document).querySelector('canvas');
        if (!canvas) {
            setCustomStatus('Screenshot unavailable for this shader.');
            return;
        }
        const link = document.createElement('a');
        link.download = `cosmos-${PLANETS[currentPlanetIndex].id}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setCustomStatus('Screenshot captured.');
    } catch (err) {
        setCustomStatus('Screenshot not available.');
    }
}
function openScaleModal() {
    scaleModal.classList.add('active');
    renderScaleComparison();
    renderDistanceVisualization();
}

function closeScaleModal() {
    scaleModal.classList.remove('active');
}

function renderScaleComparison() {
    const container = document.getElementById('scaleContainer');
    const planetsWithSize = BASE_PLANETS.filter(p => PLANET_DATA[p.id]?.relativeSize > 0);
    const maxRelSize = Math.max(...planetsWithSize.map(p => PLANET_DATA[p.id].relativeSize));
    container.innerHTML = planetsWithSize.map(planet => {
        const data = PLANET_DATA[planet.id];
        const color = toHexColor(data.color);
        const size = Math.max(10, (Math.log(data.relativeSize + 1) / Math.log(maxRelSize + 1)) * 120);
        return `<div class="scale-planet"><div class="scale-sphere" style="width:${size}px;height:${size}px;background:${color};"></div><span class="scale-name">${planet.name}</span></div>`;
    }).join('');
}

function renderDistanceVisualization() {
    const container = document.getElementById('distanceLine');
    const planetsWithDistance = BASE_PLANETS.filter(p => PLANET_DATA[p.id]?.distanceAU != null);
    container.innerHTML = planetsWithDistance.map(planet => {
        const data = PLANET_DATA[planet.id];
        return `<div class="distance-marker" style="left:${(data.distanceAU / 40) * 100}%"><div class="distance-dot" style="background:${toHexColor(data.color)}"></div><span class="distance-label">${planet.name}<br>${data.distanceAU} AU</span></div>`;
    }).join('');
}

function updateURL() {
    const selected = PLANETS[currentPlanetIndex];
    const url = new URL(window.location.href);
    url.searchParams.set('planet', selected.id);
    if (selected?.custom && selected.params) {
        url.searchParams.set('custom', encodeCustomPlanet(selected.params));
    } else {
        url.searchParams.delete('custom');
    }
    window.history.replaceState({}, '', url);
}
