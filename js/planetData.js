
const PLANET_DATA = {
    sun: {
        name: "The Sun",
        type: "Star",
        diameter: "1,392,700 km",
        mass: "1.99 octillion tonnes",
        temperature: "5,500°C (surface)",
        orbitalPeriod: "N/A",
        distanceFromSun: "0 km",
        distanceAU: 0,
        gravity: "274 m/s²",
        moons: 0,
        relativeSize: 109.2,
        facts: [
            "The Sun contains 99.86% of the mass in our solar system.",
            "Light from the Sun takes about 8 minutes to reach Earth.",
            "The Sun's core reaches temperatures of 15 million°C.",
            "About 1 million Earths could fit inside the Sun.",
            "The Sun is approximately 4.6 billion years old.",
            "Every second, the Sun converts 600 million tons of hydrogen into helium.",
            "The Sun's magnetic field is responsible for solar flares and sunspots."
        ],
        color: "#FDB813"
    },
    mercury: {
        name: "Mercury",
        type: "Terrestrial Planet",
        diameter: "4,879 km",
        mass: "328.5 quintillion tonnes",
        temperature: "-180°C to 430°C",
        orbitalPeriod: "88 Earth days",
        distanceFromSun: "57.9 million km",
        distanceAU: 0.39,
        gravity: "3.7 m/s²",
        moons: 0,
        relativeSize: 0.383,
        facts: [
            "Mercury is the smallest planet in our solar system.",
            "A day on Mercury lasts 59 Earth days.",
            "Mercury has no atmosphere to retain heat.",
            "Despite being closest to the Sun, Mercury is not the hottest planet.",
            "Mercury's surface is covered in craters, similar to our Moon.",
            "Mercury has a massive iron core that takes up 75% of its radius.",
            "The Caloris Basin on Mercury is one of the largest impact craters in the solar system."
        ],
        color: "#B5B5B5"
    },
    venus: {
        name: "Venus",
        type: "Terrestrial Planet",
        diameter: "12,104 km",
        mass: "4.87 sextillion tonnes",
        temperature: "465°C (average)",
        orbitalPeriod: "225 Earth days",
        distanceFromSun: "108.2 million km",
        distanceAU: 0.72,
        gravity: "8.87 m/s²",
        moons: 0,
        relativeSize: 0.949,
        facts: [
            "Venus is the hottest planet in our solar system.",
            "Venus rotates backwards compared to most planets.",
            "A day on Venus is longer than its year.",
            "Venus is often called Earth's 'sister planet' due to similar size.",
            "The atmospheric pressure on Venus is 90 times that of Earth.",
            "Venus has over 1,600 major volcanoes on its surface.",
            "Sulfuric acid clouds completely cover the planet."
        ],
        color: "#E6C229"
    },
    earth: {
        name: "Earth",
        type: "Terrestrial Planet",
        diameter: "12,742 km",
        mass: "5.97 sextillion tonnes",
        temperature: "15°C (average)",
        orbitalPeriod: "365.25 days",
        distanceFromSun: "149.6 million km",
        distanceAU: 1.0,
        gravity: "9.81 m/s²",
        moons: 1,
        relativeSize: 1.0,
        facts: [
            "Earth is the only known planet to harbor life.",
            "71% of Earth's surface is covered by water.",
            "Earth's atmosphere is 78% nitrogen and 21% oxygen.",
            "The Earth's core is as hot as the surface of the Sun.",
            "Earth is the densest planet in the solar system.",
            "Earth's magnetic field protects us from solar radiation.",
            "The Earth is gradually slowing down - days are getting longer."
        ],
        color: "#6B93D6"
    },
    moon: {
        name: "The Moon",
        type: "Natural Satellite",
        diameter: "3,474 km",
        mass: "73.4 quintillion tonnes",
        temperature: "-173°C to 127°C",
        orbitalPeriod: "27.3 Earth days",
        distanceFromSun: "149.6 million km",
        distanceAU: 1.0,
        gravity: "1.62 m/s²",
        moons: 0,
        relativeSize: 0.273,
        facts: [
            "The Moon is slowly drifting away from Earth at 3.8 cm per year.",
            "The Moon's gravity causes Earth's ocean tides.",
            "Only 12 humans have ever walked on the Moon.",
            "The Moon has no atmosphere, so footprints last millions of years.",
            "The dark spots on the Moon are ancient volcanic plains called 'maria'.",
            "The Moon is the fifth largest satellite in the solar system.",
            "A lunar day lasts about 29.5 Earth days."
        ],
        color: "#C0C0C0"
    },
    mars: {
        name: "Mars",
        type: "Terrestrial Planet",
        diameter: "6,779 km",
        mass: "639 quintillion tonnes",
        temperature: "-65°C (average)",
        orbitalPeriod: "687 Earth days",
        distanceFromSun: "227.9 million km",
        distanceAU: 1.52,
        gravity: "3.71 m/s²",
        moons: 2,
        relativeSize: 0.532,
        facts: [
            "Mars is known as the 'Red Planet' due to iron oxide on its surface.",
            "Mars has the largest volcano in the solar system: Olympus Mons.",
            "Mars has two small moons: Phobos and Deimos.",
            "A day on Mars is only 37 minutes longer than on Earth.",
            "Mars has seasons similar to Earth due to its axial tilt.",
            "The Valles Marineris canyon system stretches 4,000 km.",
            "Mars has polar ice caps made of water and carbon dioxide ice."
        ],
        color: "#E27B58"
    },
    jupiter: {
        name: "Jupiter",
        type: "Gas Giant",
        diameter: "139,820 km",
        mass: "1.90 septillion tonnes",
        temperature: "-110°C (cloud top)",
        orbitalPeriod: "11.86 Earth years",
        distanceFromSun: "778.5 million km",
        distanceAU: 5.2,
        gravity: "24.79 m/s²",
        moons: 95,
        relativeSize: 10.97,
        facts: [
            "Jupiter is the largest planet in our solar system.",
            "The Great Red Spot is a storm that has raged for over 400 years.",
            "Jupiter has at least 95 known moons.",
            "Jupiter's magnetic field is 20,000 times stronger than Earth's.",
            "A day on Jupiter is only about 10 hours long.",
            "Jupiter acts as a cosmic vacuum cleaner, protecting inner planets from asteroids.",
            "Jupiter's moon Europa may have a subsurface ocean that could harbor life."
        ],
        color: "#C9A56C"
    },
    saturn: {
        name: "Saturn",
        type: "Gas Giant",
        diameter: "116,460 km",
        mass: "568 sextillion tonnes",
        temperature: "-140°C (cloud top)",
        orbitalPeriod: "29.46 Earth years",
        distanceFromSun: "1.43 billion km",
        distanceAU: 9.54,
        gravity: "10.44 m/s²",
        moons: 146,
        relativeSize: 9.14,
        facts: [
            "Saturn's rings are made mostly of ice particles and rocky debris.",
            "Saturn is the least dense planet - it would float in water!",
            "Saturn has 146 known moons, including giant Titan.",
            "Saturn's rings span up to 282,000 km but are only 10 meters thick.",
            "The Cassini Division in Saturn's rings is 4,800 km wide.",
            "Winds on Saturn can reach speeds of 1,800 km/h.",
            "Saturn's moon Titan has lakes of liquid methane and ethane."
        ],
        color: "#E4C48A"
    },
    uranus: {
        name: "Uranus",
        type: "Ice Giant",
        diameter: "50,724 km",
        mass: "86.8 sextillion tonnes",
        temperature: "-195°C (cloud top)",
        orbitalPeriod: "84 Earth years",
        distanceFromSun: "2.87 billion km",
        distanceAU: 19.2,
        gravity: "8.69 m/s²",
        moons: 28,
        relativeSize: 3.98,
        facts: [
            "Uranus rotates on its side with a 98° axial tilt.",
            "Uranus was the first planet discovered using a telescope.",
            "Uranus has 13 known rings, discovered in 1977.",
            "The blue-green color comes from methane in the atmosphere.",
            "Uranus has 28 known moons, named after Shakespeare characters.",
            "A season on Uranus lasts 21 Earth years.",
            "Uranus is the coldest planet in the solar system despite not being farthest."
        ],
        color: "#B2D8D8"
    },
    neptune: {
        name: "Neptune",
        type: "Ice Giant",
        diameter: "49,244 km",
        mass: "102 sextillion tonnes",
        temperature: "-200°C (cloud top)",
        orbitalPeriod: "164.8 Earth years",
        distanceFromSun: "4.5 billion km",
        distanceAU: 30.1,
        gravity: "11.15 m/s²",
        moons: 16,
        relativeSize: 3.86,
        facts: [
            "Neptune has the strongest winds in the solar system, up to 2,100 km/h.",
            "Neptune was discovered through mathematical predictions before being seen.",
            "Neptune's moon Triton orbits backwards (retrograde).",
            "Neptune has completed only one orbit since its discovery in 1846.",
            "The Great Dark Spot was a storm as large as Earth.",
            "Neptune radiates more heat than it receives from the Sun.",
            "Neptune's largest moon Triton may be a captured Kuiper Belt object."
        ],
        color: "#5B7FDE"
    },
    pluto: {
        name: "Pluto",
        type: "Dwarf Planet",
        diameter: "2,377 km",
        mass: "13.0 quintillion tonnes",
        temperature: "-230°C (average)",
        orbitalPeriod: "248 Earth years",
        distanceFromSun: "5.9 billion km",
        distanceAU: 39.5,
        gravity: "0.62 m/s²",
        moons: 5,
        relativeSize: 0.186,
        facts: [
            "Pluto was reclassified as a dwarf planet in 2006.",
            "Pluto's heart-shaped region is called Tombaugh Regio.",
            "Pluto has five known moons, the largest being Charon.",
            "Pluto and Charon are sometimes called a 'double dwarf planet'.",
            "New Horizons spacecraft flew by Pluto in 2015.",
            "Pluto's atmosphere freezes and falls as snow when it moves away from the Sun.",
            "Pluto is smaller than Earth's Moon."
        ],
        color: "#C9AA8B"
    },
    blackhole: {
        name: "Black Hole",
        type: "Singularity",
        diameter: "Variable",
        mass: "Millions to billions of solar masses",
        temperature: "Near absolute zero (Hawking radiation)",
        orbitalPeriod: "N/A",
        distanceFromSun: "N/A",
        distanceAU: null,
        gravity: "Infinite at singularity",
        moons: 0,
        relativeSize: null,
        facts: [
            "Nothing, not even light, can escape a black hole's event horizon.",
            "Time slows down near a black hole due to gravitational time dilation.",
            "The nearest known black hole is about 1,000 light-years away.",
            "Black holes can be detected by observing their effect on nearby matter.",
            "Supermassive black holes exist at the center of most galaxies.",
            "The accretion disk around a black hole can be hotter than stars.",
            "Black holes can theoretically evaporate over time via Hawking radiation.",
            "Spaghettification is the stretching effect on objects falling into a black hole."
        ],
        color: "#1a1a2e"
    }
};

const DISTANCE_SCALE = 100;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PLANET_DATA, DISTANCE_SCALE };
}
