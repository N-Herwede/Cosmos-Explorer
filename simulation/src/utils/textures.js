import * as THREE from 'three';

let sharedShaderBakeCanvas = null;
let sharedShaderBakeGL = null;

function getSharedShaderBakeContext(width, height) {
    if (!sharedShaderBakeCanvas) {
        sharedShaderBakeCanvas = document.createElement('canvas');
    }

    if (sharedShaderBakeCanvas.width !== width || sharedShaderBakeCanvas.height !== height) {
        sharedShaderBakeCanvas.width = width;
        sharedShaderBakeCanvas.height = height;
    }

    if (!sharedShaderBakeGL) {
        sharedShaderBakeGL = sharedShaderBakeCanvas.getContext('webgl', {
            antialias: false,
            alpha: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        });
    }

    return sharedShaderBakeGL
        ? { canvas: sharedShaderBakeCanvas, gl: sharedShaderBakeGL }
        : null;
}

export function createGlowTexture(c1, c2) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const col1 = new THREE.Color(c1), col2 = new THREE.Color(c2);
    
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, `rgba(${col1.r*255|0},${col1.g*255|0},${col1.b*255|0},1)`);
    grad.addColorStop(0.3, `rgba(${col1.r*255|0},${col1.g*255|0},${col1.b*255|0},0.5)`);
    grad.addColorStop(0.6, `rgba(${col2.r*255|0},${col2.g*255|0},${col2.b*255|0},0.2)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createPlanetTexture(key, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const c = new THREE.Color(data.color);
    
    ctx.fillStyle = `rgb(${c.r*255|0},${c.g*255|0},${c.b*255|0})`;
    ctx.fillRect(0, 0, 1024, 512);
    
    // Add variation
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 1024, y = Math.random() * 512;
        const v = (Math.random() - 0.5) * 0.3;
        ctx.fillStyle = `rgba(${Math.min(255, c.r*255+v*80)|0},${Math.min(255, c.g*255+v*80)|0},${Math.min(255, c.b*255+v*80)|0},0.5)`;
        ctx.fillRect(x, y, 3 + Math.random() * 5, 3 + Math.random() * 5);
    }
    
    // Planet-specific features
    if (key === 'earth') {
        ctx.fillStyle = '#3d6b3d';
        ctx.fillRect(100, 150, 150, 180); // Americas
        ctx.fillRect(400, 130, 200, 160); // Africa/Eurasia
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(0, 0, 1024, 30); // Ice caps
        ctx.fillRect(0, 482, 1024, 30);
    }
    
    if (key === 'jupiter') {
        const bands = ['#e8d5b7', '#c9a97a', '#dfc9a8', '#b8956e'];
        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = bands[i % 4];
            ctx.globalAlpha = 0.4;
            ctx.fillRect(0, i * 42, 1024, 42);
        }
        ctx.globalAlpha = 1;
        // Great Red Spot
        ctx.fillStyle = '#c44d3c';
        ctx.beginPath();
        ctx.ellipse(650, 280, 50, 30, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (key === 'mars') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(0, 0, 1024, 20);
        ctx.fillRect(0, 492, 1024, 20);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function buildBakeFragment(fragment) {
    let out = fragment;
    out = out.replace(/void\s+main\s*\(\s*\)/m, 'void legacyMain()');

    const hasPrecision = /precision\s+\w+\s+float\s*;/.test(out);
    const hasUvVarying = /varying\s+vec2\s+vUv\b/.test(out);

    if (!hasPrecision) {
        out = `precision highp float;\n${out}`;
    }

    if (!hasUvVarying) {
        const precisionMatch = out.match(/precision\s+\w+\s+float\s*;/);
        if (precisionMatch) {
            out = out.replace(precisionMatch[0], `${precisionMatch[0]}\n\nvarying vec2 vUv;`);
        } else {
            out = `precision highp float;\n\nvarying vec2 vUv;\n${out}`;
        }
    }

    const hasPI = /\bPI\b/.test(out) || /\bM_PI\b/.test(out);
    if (!hasPI) {
        out = `#define PI 3.14159265\n${out}`;
    }

    out += `
void main() {
    vec2 uv = vUv;
    float lon = (uv.x * 2.0 - 1.0) * PI;
    float lat = (uv.y * 2.0 - 1.0) * 0.5 * PI;
    vec3 n = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    vec3 col = max(baseColor(n), vec3(0.0));
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

    return out;
}

export function createShaderTexture(fragment, options = {}) {
    const width = options.width ?? 1024;
    const height = options.height ?? 512;
    const time = options.time ?? 0;
    const shared = getSharedShaderBakeContext(width, height);
    if (!shared) return null;
    const { canvas, gl } = shared;

    const vsSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
            vUv = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fsSource = buildBakeFragment(fragment);
    if (/OES_standard_derivatives/.test(fsSource)) {
        gl.getExtension('OES_standard_derivatives');
    }

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'iResolution');
    if (resLoc) gl.uniform3f(resLoc, width, height, 1.0);
    const timeLoc = gl.getUniformLocation(program, 'iTime');
    if (timeLoc) gl.uniform1f(timeLoc, time);

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;
    outCtx.drawImage(canvas, 0, 0, width, height);

    const texture = new THREE.CanvasTexture(outCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 512);
    
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * 1024, y = Math.random() * 512;
        const size = 20 + Math.random() * 50;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, 'rgba(255,255,255,0.6)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, 'rgba(180,160,140,0)');
    grad.addColorStop(0.1, 'rgba(200,180,160,0.9)');
    grad.addColorStop(0.2, 'rgba(180,160,140,0.3)');
    grad.addColorStop(0.3, 'rgba(210,190,170,0.95)');
    grad.addColorStop(0.5, 'rgba(220,200,180,0.9)');
    grad.addColorStop(0.7, 'rgba(200,180,160,0.8)');
    grad.addColorStop(0.9, 'rgba(180,160,140,0.6)');
    grad.addColorStop(1, 'rgba(150,130,110,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createNebulaTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const c = new THREE.Color(baseColor);
    
    for (let i = 0; i < 6; i++) {
        const x = 256 + (Math.random() - 0.5) * 150;
        const y = 256 + (Math.random() - 0.5) * 150;
        const r = 100 + Math.random() * 150;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.4)`);
        grad.addColorStop(0.5, `rgba(${c.r*200|0},${c.g*200|0},${c.b*200|0},0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createProminenceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.2, 'rgba(255,160,70,0.25)');
    grad.addColorStop(0.55, 'rgba(255,120,40,0.6)');
    grad.addColorStop(1, 'rgba(255,220,150,0.85)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(64, 256);
    ctx.quadraticCurveTo(18, 190, 40, 40);
    ctx.quadraticCurveTo(64, 10, 88, 40);
    ctx.quadraticCurveTo(110, 190, 64, 256);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(64, 256);
    ctx.quadraticCurveTo(30, 200, 54, 70);
    ctx.quadraticCurveTo(64, 45, 74, 70);
    ctx.quadraticCurveTo(98, 200, 64, 256);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createNoiseTexture() {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size * 4; i++) {
        data[i] = Math.random() * 255;
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}
