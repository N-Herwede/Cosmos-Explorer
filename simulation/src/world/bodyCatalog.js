import { PLANET_DATA } from '../data/planetData.js';

const SHADER_BASE = '../shaders/webgl/';
const DAY_SECONDS = 86400;
const ORBITAL_PERIOD_DAYS = {
    mercury: 87.969,
    venus: 224.701,
    earth: 365.256,
    moon: 27.322,
    mars: 686.98,
    ceres: 1680.0,
    jupiter: 4332.59,
    saturn: 10759.22,
    uranus: 30685.4,
    neptune: 60189.0,
    pluto: 90560.0,
    haumea: 104060.0,
    makemake: 113240.0,
    eris: 203830.0
};

const shaderRef = (id) => ({ kind: 'glsl', url: `${SHADER_BASE}${id}.html`, scriptId: 'fs' });
const orbitSpeedFromDays = (days) => (Math.PI * 2) / (days * DAY_SECONDS);
const EARTH_DIAMETER_KM = 12742;

function formatMoonDiameter(radius) {
    const km = Math.max(600, Math.round(radius * EARTH_DIAMETER_KM));
    return `${km.toLocaleString('en-US')} km`;
}

function formatMoonPeriod(days) {
    if (days < 1) {
        const hours = Math.max(1, Math.round(days * 24));
        return `${hours} hours`;
    }
    if (days < 365) {
        return `${days.toFixed(1)} Earth days`;
    }
    return `${(days / 365).toFixed(1)} Earth years`;
}

function makeMoonData({ name, parent, radius, orbitalDays, major, color }) {
    const parentName = PLANET_DATA[parent]?.name || parent;
    return {
        name,
        type: major ? 'Major Natural Satellite' : 'Minor Natural Satellite',
        radius,
        distance: 0,
        orbitSpeed: 0,
        rotationSpeed: major ? 0.011 : 0.014,
        color,
        isSatellite: true,
        parent,
        distanceFromSun: `Orbits ${parentName}`,
        orbitalPeriod: formatMoonPeriod(orbitalDays),
        surfaceTemp: major ? 'Cold rocky surface' : 'Very cold rocky surface',
        gravity: major ? 'Low gravity' : 'Very low gravity',
        moons: '0',
        diameter: formatMoonDiameter(radius),
        composition: [
            { name: 'Silicates', value: 46, color: '#b7b1a7' },
            { name: 'Regolith', value: 34, color: '#8f877a' },
            { name: 'Ice', value: 20, color: '#d4dce8' }
        ],
        fact: major
            ? `${name} is a major moon orbiting ${parentName}.`
            : `${name} is a minor moon orbiting ${parentName}.`
    };
}

function createMoonDefinition({ id, name, parent, radius, orbitRadius, orbitalDays, major = false, color = 0xb9b2a8 }) {
    const data = makeMoonData({ name, parent, radius, orbitalDays, major, color });
    return {
        id,
        kind: 'moon',
        data,
        shader: shaderRef('moon'),
        orbit: {
            center: parent,
            radius: orbitRadius,
            speed: orbitSpeedFromDays(orbitalDays),
            scaleWith: 'planetScale',
            useTime: true
        },
        rotationSpeed: major ? 0.0105 : 0.014,
        isSatellite: true,
        majorMoon: major,
        minorMoon: !major,
        label: true
    };
}

function createDwarfPlanetDefinition(id) {
    const data = PLANET_DATA[id];
    return {
        id,
        kind: 'planet',
        data,
        shader: shaderRef('moon'),
        orbit: {
            center: 'sun',
            radius: data.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS[id]),
            useTime: true
        },
        rotationSpeed: data.rotationSpeed,
        label: true
    };
}

const MARS_MOONS = [
    createMoonDefinition({ id: 'phobos', name: 'Phobos', parent: 'mars', radius: 0.11, orbitRadius: 1.7, orbitalDays: 0.319, major: true, color: 0x9a8f85 }),
    createMoonDefinition({ id: 'deimos', name: 'Deimos', parent: 'mars', radius: 0.09, orbitRadius: 2.3, orbitalDays: 1.263, major: true, color: 0x8f857b })
];

const JUPITER_MOONS = [
    createMoonDefinition({ id: 'io', name: 'Io', parent: 'jupiter', radius: 0.29, orbitRadius: 6.5, orbitalDays: 1.769, major: true, color: 0xd8c39d }),
    createMoonDefinition({ id: 'europa', name: 'Europa', parent: 'jupiter', radius: 0.25, orbitRadius: 7.6, orbitalDays: 3.551, major: true, color: 0xd8d8cf }),
    createMoonDefinition({ id: 'ganymede', name: 'Ganymede', parent: 'jupiter', radius: 0.41, orbitRadius: 9.0, orbitalDays: 7.155, major: true, color: 0xada08f }),
    createMoonDefinition({ id: 'callisto', name: 'Callisto', parent: 'jupiter', radius: 0.37, orbitRadius: 10.8, orbitalDays: 16.689, major: true, color: 0x8f8779 }),
    createMoonDefinition({ id: 'amalthea', name: 'Amalthea', parent: 'jupiter', radius: 0.11, orbitRadius: 5.6, orbitalDays: 0.498, color: 0x907a68 }),
    createMoonDefinition({ id: 'himalia', name: 'Himalia', parent: 'jupiter', radius: 0.14, orbitRadius: 12.3, orbitalDays: 250.57, color: 0x9a9185 }),
    createMoonDefinition({ id: 'elara', name: 'Elara', parent: 'jupiter', radius: 0.13, orbitRadius: 13.1, orbitalDays: 259.64, color: 0x8c8378 }),
    createMoonDefinition({ id: 'pasiphae', name: 'Pasiphae', parent: 'jupiter', radius: 0.1, orbitRadius: 14.0, orbitalDays: 743.6, color: 0x887f74 }),
    createMoonDefinition({ id: 'sinope', name: 'Sinope', parent: 'jupiter', radius: 0.09, orbitRadius: 14.8, orbitalDays: 758.9, color: 0x7e756a }),
    createMoonDefinition({ id: 'carme', name: 'Carme', parent: 'jupiter', radius: 0.1, orbitRadius: 15.4, orbitalDays: 702.3, color: 0x826f66 })
];

const SATURN_MOONS = [
    createMoonDefinition({ id: 'titan', name: 'Titan', parent: 'saturn', radius: 0.41, orbitRadius: 8.2, orbitalDays: 15.945, major: true, color: 0xd2b88a }),
    createMoonDefinition({ id: 'rhea', name: 'Rhea', parent: 'saturn', radius: 0.12, orbitRadius: 9.0, orbitalDays: 4.518, major: true, color: 0xc4beb2 }),
    createMoonDefinition({ id: 'iapetus', name: 'Iapetus', parent: 'saturn', radius: 0.11, orbitRadius: 10.8, orbitalDays: 79.321, major: true, color: 0x9f947e }),
    createMoonDefinition({ id: 'dione', name: 'Dione', parent: 'saturn', radius: 0.09, orbitRadius: 11.7, orbitalDays: 2.737, major: true, color: 0xc9c4bc }),
    createMoonDefinition({ id: 'tethys', name: 'Tethys', parent: 'saturn', radius: 0.08, orbitRadius: 12.5, orbitalDays: 1.888, major: true, color: 0xd5d2cd }),
    createMoonDefinition({ id: 'enceladus', name: 'Enceladus', parent: 'saturn', radius: 0.07, orbitRadius: 13.2, orbitalDays: 1.37, major: true, color: 0xdbdde2 }),
    createMoonDefinition({ id: 'mimas', name: 'Mimas', parent: 'saturn', radius: 0.06, orbitRadius: 13.8, orbitalDays: 0.942, major: true, color: 0xb5b1ac }),
    createMoonDefinition({ id: 'hyperion', name: 'Hyperion', parent: 'saturn', radius: 0.05, orbitRadius: 9.8, orbitalDays: 21.277, color: 0x9c8f81 }),
    createMoonDefinition({ id: 'phoebe', name: 'Phoebe', parent: 'saturn', radius: 0.08, orbitRadius: 15.5, orbitalDays: 550.48, color: 0x7e776f }),
    createMoonDefinition({ id: 'janus', name: 'Janus', parent: 'saturn', radius: 0.04, orbitRadius: 8.6, orbitalDays: 0.695, color: 0xaea89f }),
    createMoonDefinition({ id: 'epimetheus', name: 'Epimetheus', parent: 'saturn', radius: 0.035, orbitRadius: 8.9, orbitalDays: 0.694, color: 0xb2aba2 }),
    createMoonDefinition({ id: 'helene', name: 'Helene', parent: 'saturn', radius: 0.028, orbitRadius: 11.8, orbitalDays: 2.737, color: 0xbdb6ac }),
    createMoonDefinition({ id: 'calypso', name: 'Calypso', parent: 'saturn', radius: 0.026, orbitRadius: 12.8, orbitalDays: 1.888, color: 0xb4aea4 }),
    createMoonDefinition({ id: 'telesto', name: 'Telesto', parent: 'saturn', radius: 0.026, orbitRadius: 13.0, orbitalDays: 1.888, color: 0xafa99f }),
    createMoonDefinition({ id: 'pandora', name: 'Pandora', parent: 'saturn', radius: 0.03, orbitRadius: 8.0, orbitalDays: 0.629, color: 0x978f84 }),
    createMoonDefinition({ id: 'pan', name: 'Pan', parent: 'saturn', radius: 0.022, orbitRadius: 7.8, orbitalDays: 0.575, color: 0x938d84 }),
    createMoonDefinition({ id: 'atlas', name: 'Atlas', parent: 'saturn', radius: 0.024, orbitRadius: 8.1, orbitalDays: 0.602, color: 0x948d82 }),
    createMoonDefinition({ id: 'prometheus', name: 'Prometheus', parent: 'saturn', radius: 0.03, orbitRadius: 8.4, orbitalDays: 0.613, color: 0x9c9488 })
];

const URANUS_MOONS = [
    createMoonDefinition({ id: 'titania', name: 'Titania', parent: 'uranus', radius: 0.12, orbitRadius: 6.6, orbitalDays: 8.706, major: true, color: 0xbfc6cd }),
    createMoonDefinition({ id: 'oberon', name: 'Oberon', parent: 'uranus', radius: 0.12, orbitRadius: 7.3, orbitalDays: 13.463, major: true, color: 0xaeb6bf }),
    createMoonDefinition({ id: 'umbriel', name: 'Umbriel', parent: 'uranus', radius: 0.09, orbitRadius: 8.1, orbitalDays: 4.144, major: true, color: 0x8f98a3 }),
    createMoonDefinition({ id: 'ariel', name: 'Ariel', parent: 'uranus', radius: 0.09, orbitRadius: 8.8, orbitalDays: 2.52, major: true, color: 0xcad2da }),
    createMoonDefinition({ id: 'miranda', name: 'Miranda', parent: 'uranus', radius: 0.07, orbitRadius: 9.5, orbitalDays: 1.413, major: true, color: 0xb5bcc4 }),
    createMoonDefinition({ id: 'puck', name: 'Puck', parent: 'uranus', radius: 0.035, orbitRadius: 5.7, orbitalDays: 0.762, color: 0x99a2ad }),
    createMoonDefinition({ id: 'portia', name: 'Portia', parent: 'uranus', radius: 0.03, orbitRadius: 6.0, orbitalDays: 0.513, color: 0x8d97a1 }),
    createMoonDefinition({ id: 'juliet', name: 'Juliet', parent: 'uranus', radius: 0.028, orbitRadius: 6.3, orbitalDays: 0.493, color: 0x8b93a0 }),
    createMoonDefinition({ id: 'belinda', name: 'Belinda', parent: 'uranus', radius: 0.027, orbitRadius: 6.6, orbitalDays: 0.624, color: 0x87909a })
];

const NEPTUNE_MOONS = [
    createMoonDefinition({ id: 'triton', name: 'Triton', parent: 'neptune', radius: 0.21, orbitRadius: 6.9, orbitalDays: 5.877, major: true, color: 0xcfd7df }),
    createMoonDefinition({ id: 'proteus', name: 'Proteus', parent: 'neptune', radius: 0.052, orbitRadius: 7.8, orbitalDays: 1.122, major: true, color: 0x979fa8 }),
    createMoonDefinition({ id: 'nereid', name: 'Nereid', parent: 'neptune', radius: 0.093, orbitRadius: 9.8, orbitalDays: 360.13, major: true, color: 0xb4bcc6 }),
    createMoonDefinition({ id: 'larissa', name: 'Larissa', parent: 'neptune', radius: 0.03, orbitRadius: 5.5, orbitalDays: 0.555, color: 0x949da6 }),
    createMoonDefinition({ id: 'galatea', name: 'Galatea', parent: 'neptune', radius: 0.028, orbitRadius: 5.9, orbitalDays: 0.429, color: 0x9099a1 }),
    createMoonDefinition({ id: 'despina', name: 'Despina', parent: 'neptune', radius: 0.026, orbitRadius: 6.2, orbitalDays: 0.335, color: 0x8c959e }),
    createMoonDefinition({ id: 'thalassa', name: 'Thalassa', parent: 'neptune', radius: 0.024, orbitRadius: 6.5, orbitalDays: 0.311, color: 0x879099 }),
    createMoonDefinition({ id: 'naiad', name: 'Naiad', parent: 'neptune', radius: 0.022, orbitRadius: 6.8, orbitalDays: 0.295, color: 0x838d96 }),
    createMoonDefinition({ id: 'halimede', name: 'Halimede', parent: 'neptune', radius: 0.02, orbitRadius: 10.4, orbitalDays: 1879.7, color: 0x6f7783 }),
    createMoonDefinition({ id: 'sao', name: 'Sao', parent: 'neptune', radius: 0.02, orbitRadius: 10.8, orbitalDays: 2914.0, color: 0x717b86 }),
    createMoonDefinition({ id: 'laomedeia', name: 'Laomedeia', parent: 'neptune', radius: 0.02, orbitRadius: 11.2, orbitalDays: 3179.0, color: 0x6e7782 }),
    createMoonDefinition({ id: 'psamathe', name: 'Psamathe', parent: 'neptune', radius: 0.02, orbitRadius: 11.8, orbitalDays: 9115.0, color: 0x676f79 }),
    createMoonDefinition({ id: 'neso', name: 'Neso', parent: 'neptune', radius: 0.02, orbitRadius: 12.2, orbitalDays: 9740.0, color: 0x646d77 })
];

export const BODY_CATALOG = [
    {
        id: 'sun',
        kind: 'star',
        data: PLANET_DATA.sun,
        shader: { kind: 'sun' },
        radiusScale: 2.6,
        rotationSpeed: PLANET_DATA.sun.rotationSpeed,
        label: true
    },
    {
        id: 'mercury',
        kind: 'planet',
        data: PLANET_DATA.mercury,
        shader: shaderRef('mercury'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.mercury.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.mercury),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.mercury.rotationSpeed,
        label: true
    },
    {
        id: 'venus',
        kind: 'planet',
        data: PLANET_DATA.venus,
        shader: shaderRef('venus'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.venus.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.venus),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.venus.rotationSpeed,
        label: true
    },
    {
        id: 'earth',
        kind: 'planet',
        data: PLANET_DATA.earth,
        shader: shaderRef('earth'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.earth.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.earth),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.earth.rotationSpeed,
        label: true
    },
    {
        id: 'moon',
        kind: 'moon',
        data: {
            ...PLANET_DATA.moon,
            type: 'Major Natural Satellite'
        },
        shader: shaderRef('moon'),
        orbit: {
            center: 'earth',
            radius: 2.5,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.moon),
            scaleWith: 'planetScale',
            useTime: true
        },
        rotationSpeed: PLANET_DATA.moon.rotationSpeed,
        isSatellite: true,
        majorMoon: true,
        minorMoon: false,
        label: true
    },
    {
        id: 'mars',
        kind: 'planet',
        data: PLANET_DATA.mars,
        shader: shaderRef('mars'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.mars.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.mars),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.mars.rotationSpeed,
        label: true
    },
    ...MARS_MOONS,
    createDwarfPlanetDefinition('ceres'),
    {
        id: 'jupiter',
        kind: 'planet',
        data: PLANET_DATA.jupiter,
        shader: shaderRef('jupiter'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.jupiter.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.jupiter),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.jupiter.rotationSpeed,
        label: true
    },
    ...JUPITER_MOONS,
    {
        id: 'saturn',
        kind: 'planet',
        data: PLANET_DATA.saturn,
        shader: shaderRef('saturn'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.saturn.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.saturn),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.saturn.rotationSpeed,
        label: true,
        features: {
            ringBelt: {
                innerRadius: PLANET_DATA.saturn.ringInnerRadius,
                outerRadius: PLANET_DATA.saturn.ringOuterRadius,
                count: 8800,
                height: 0.36,
                size: 0.11,
                color: 0xe7dcc9,
                emissive: 0xbba88f,
                emissiveIntensity: 0.55
            }
        }
    },
    ...SATURN_MOONS,
    {
        id: 'uranus',
        kind: 'planet',
        data: PLANET_DATA.uranus,
        shader: shaderRef('uranus'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.uranus.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.uranus),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.uranus.rotationSpeed,
        label: true
    },
    ...URANUS_MOONS,
    {
        id: 'neptune',
        kind: 'planet',
        data: PLANET_DATA.neptune,
        shader: shaderRef('neptune'),
        orbit: {
            center: 'sun',
            radius: PLANET_DATA.neptune.distance,
            speed: orbitSpeedFromDays(ORBITAL_PERIOD_DAYS.neptune),
            useTime: true
        },
        rotationSpeed: PLANET_DATA.neptune.rotationSpeed,
        label: true
    },
    ...NEPTUNE_MOONS,
    createDwarfPlanetDefinition('pluto'),
    createDwarfPlanetDefinition('haumea'),
    createDwarfPlanetDefinition('makemake'),
    createDwarfPlanetDefinition('eris')
];

export const BELT_CATALOG = [
    {
        id: 'asteroid-belt',
        kind: 'belt',
        center: 'sun',
        innerRadius: 33,
        outerRadius: 38,
        height: 2.4,
        count: 1600,
        size: 0.32,
        speed: 0.0002,
        visibleKey: 'showAsteroids',
        scaleWith: 'orbitScale',
        color: 0xd4c8b8,
        emissive: 0x4a3c2e,
        emissiveIntensity: 0.85
    },
    {
        id: 'kuiper-belt',
        kind: 'belt',
        center: 'sun',
        innerRadius: 78,
        outerRadius: 108,
        height: 6.2,
        count: 3200,
        size: 0.28,
        speed: 0.00005,
        visibleKey: 'showKuiper',
        scaleWith: 'orbitScale',
        color: 0xd4c8b8,
        emissive: 0x4a3c2e,
        emissiveIntensity: 0.85
    }
];
