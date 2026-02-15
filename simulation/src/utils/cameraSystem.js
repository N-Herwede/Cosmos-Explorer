import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera;
let controls;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const tempZoomDirection = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempMovement = new THREE.Vector3();

const zoomState = {
    targetDistance: null,
    currentDistance: null,
    isZooming: false
};

const panState = {
    left: false,
    right: false,
    forward: false,
    backward: false,
    up: false,
    down: false
};

export function setupCameraSystem(renderer, state) {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(60, 45, 90);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 15;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = false;

    controls.addEventListener('start', () => {
        if (state.followTarget) {
            state.followTarget = null;
            const sel = document.getElementById('camera-target');
            if (sel) sel.value = 'free';
        }
    });

    setupSmoothZoom(renderer, state);
    setupKeyboardPan(state);

    return { camera, controls };
}

function setupSmoothZoom(renderer, state) {
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();

        if (state.followTarget) {
            state.followTarget = null;
            const sel = document.getElementById('camera-target');
            if (sel) sel.value = 'free';
        }

        const currentDist = camera.position.distanceTo(controls.target);

        if (zoomState.targetDistance === null) {
            zoomState.targetDistance = currentDist;
            zoomState.currentDistance = currentDist;
        }

        const zoomFactor = e.deltaY > 0 ? 1.03 : 0.97;
        zoomState.targetDistance = Math.max(
            controls.minDistance,
            Math.min(controls.maxDistance, zoomState.targetDistance * zoomFactor)
        );

        zoomState.isZooming = true;
    }, { passive: false });
}

export function updateSmoothZoom() {
    if (!camera || !controls) return;
    if (!zoomState.isZooming && zoomState.targetDistance === null) return;

    const currentDist = camera.position.distanceTo(controls.target);

    if (zoomState.currentDistance === null) {
        zoomState.currentDistance = currentDist;
        zoomState.targetDistance = currentDist;
        return;
    }

    const lerpFactor = 0.08;
    const newDistance = zoomState.currentDistance + (zoomState.targetDistance - zoomState.currentDistance) * lerpFactor;

    tempZoomDirection.copy(camera.position).sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(tempZoomDirection, newDistance);

    zoomState.currentDistance = newDistance;

    if (Math.abs(zoomState.targetDistance - zoomState.currentDistance) < 0.01) {
        zoomState.isZooming = false;
    }
}

function setupKeyboardPan(state) {
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'ArrowLeft': panState.left = true; break;
            case 'ArrowRight': panState.right = true; break;
            case 'ArrowUp': panState.forward = true; break;
            case 'ArrowDown': panState.backward = true; break;
            case 'q': case 'Q': panState.up = true; break;
            case 'e': case 'E': panState.down = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowLeft': panState.left = false; break;
            case 'ArrowRight': panState.right = false; break;
            case 'ArrowUp': panState.forward = false; break;
            case 'ArrowDown': panState.backward = false; break;
            case 'q': case 'Q': panState.up = false; break;
            case 'e': case 'E': panState.down = false; break;
        }
    });
}

export function updateKeyboardPan(state) {
    if (!camera || !controls) return;

    if (!panState.left && !panState.right && !panState.forward && !panState.backward && !panState.up && !panState.down) {
        return;
    }

    if (state.followTarget) {
        state.followTarget = null;
        const sel = document.getElementById('camera-target');
        if (sel) sel.value = 'free';
    }

    const panSpeed = 1.5;
    camera.getWorldDirection(tempForward);
    tempForward.y = 0;
    tempForward.normalize();
    tempRight.crossVectors(tempForward, WORLD_UP).normalize();

    tempMovement.set(0, 0, 0);
    if (panState.left) tempMovement.addScaledVector(tempRight, -panSpeed);
    if (panState.right) tempMovement.addScaledVector(tempRight, panSpeed);
    if (panState.forward) tempMovement.addScaledVector(tempForward, panSpeed);
    if (panState.backward) tempMovement.addScaledVector(tempForward, -panSpeed);
    if (panState.up) tempMovement.y += panSpeed;
    if (panState.down) tempMovement.y -= panSpeed;

    camera.position.add(tempMovement);
    controls.target.add(tempMovement);
}

export function resetZoomState() {
    zoomState.targetDistance = null;
    zoomState.currentDistance = null;
    zoomState.isZooming = false;
}
