import * as THREE from 'three';

// ─────────────────────────────────────────────
// [4.4] Named Configuration Constants
// ─────────────────────────────────────────────
const CONFIG = {
    // Camera
    initialZ: 35,
    zoomMin: 10,
    zoomMax: 120,
    zoomSpeed: 0.8,
    zoomLerp: 0.08,
    rotationStep: 0.03,
    rotationAutoReturnLerp: 0.02,
    autoReturnGracePeriodMs: 300,   // [2.5] ms before auto-rotate re-engages after gesture

    // Canvas text rasterization
    canvasWidth: 800,
    canvasHeight: 150,
    fontSize: 44,
    pixelStep: 2,
    pixelThreshold: 120,
    targetWorldWidth: 80.0,

    // Particles
    density: 8,
    jitterXY: 0.08,
    jitterZ: 1.6,

    // Explosion
    expansionDuration: 2.0,
    contractionDuration: 4.0,
    totalExplosionDuration: 6.0,    // expansionDuration + contractionDuration
    explosionMaxDistMultiplier: 15.0,
    explosionSpeedMin: 0.4,
    explosionSpeedRange: 0.8,

    // Mouse repulsion
    mouseInfluence: 7.0,
    repulsionStrength: 3.5,

    // Spring physics
    springK: 0.12,
    springDamping: 0.82,

    // Interaction
    tapCount: 5,
    tapWindowMs: 800,               // [3.1] widened from 500ms
    inputDebounceMs: 150,           // [1.5] debounce delay

    // Rendering
    pointSize: 0.5,
    pointSizeAttenuationScale: 120.0,
    clearColor: 0x020205,
    maxPixelRatio: 2,
};

// ─────────────────────────────────────────────
// Shaders
// [2.2] uPixelRatio uniform for HiDPI correction
// [2.3] Smooth heatmap using mix() instead of branching if/else
// ─────────────────────────────────────────────
const vertexShader = `
uniform vec3 uMouse;
uniform float uMouseInfluence;
uniform float uPointSize;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vAlpha;

void main() {
    // Smooth heatmap: red → yellow → white as distance from mouse increases
    float r = clamp(distance(uMouse, position) / uMouseInfluence, 0.0, 1.0);
    vec3 hot  = vec3(1.0, 0.0, 0.0);
    vec3 warm = vec3(1.0, 1.0, 0.0);
    vec3 cold = vec3(1.0, 1.0, 1.0);
    vColor = (r < 0.5)
        ? mix(hot, warm, r * 2.0)
        : mix(warm, cold, (r - 0.5) * 2.0);

    vAlpha = 0.9;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation — corrected for device pixel ratio [2.2]
    gl_PointSize = uPointSize * uPixelRatio * (${CONFIG.pointSizeAttenuationScale.toFixed(1)} / -mvPosition.z);
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    gl_FragColor = vec4(vColor, vAlpha);
}
`;

// ─────────────────────────────────────────────
// [4.1] State grouped into named objects
// ─────────────────────────────────────────────

// Rendering state
const render = {
    scene: null,
    camera: null,
    renderer: null,
    particles: null,
    clock: new THREE.Clock(),
    targetZ: CONFIG.initialZ,
    prevTime: 0,
};

// Physics state (dynamically allocated per text)
const physics = {
    posHome: null,      // Rest positions — never mutated after setup
    posLive: null,      // Live geometry buffer — mutated each frame [1.3] renamed from posCurrentArray
    springDisp: null,   // Current spring displacement
    springVel: null,    // Spring velocity
    randomDir: null,    // Explosion direction per particle
    randomSpeed: null,  // Explosion speed per particle
    explosionStartTime: -1,
};

// Interaction / UI state
const interaction = {
    keys: {},
    mouseWorld: new THREE.Vector3(-1000, -1000, 0),
    mouseLocal: new THREE.Vector3(),
    invMatrix: new THREE.Matrix4(),  // [1.1] Pre-allocated — reused every frame, no GC pressure
    clickCount: 0,
    lastClickTime: 0,
    lastPinchDist: null,
    lastMidpoint: new THREE.Vector2(),
    lastGestureEndTime: 0,
    inputDebounceTimer: null,
};

// Shader uniforms
const uniforms = {
    uMouse: { value: new THREE.Vector3(-1000, -1000, 0) },
    uMouseInfluence: { value: CONFIG.mouseInfluence },
    uPointSize: { value: CONFIG.pointSize },
    uPixelRatio: { value: 1.0 },    // [2.2] Pixel ratio — set on init and resize
};

// ─────────────────────────────────────────────
// Text Rasterization
// ─────────────────────────────────────────────
function sampleTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width  = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${CONFIG.fontSize}px "Outfit", sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);

    const imgData = ctx.getImageData(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight).data;
    const rawPoints = [];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let y = 0; y < CONFIG.canvasHeight; y += CONFIG.pixelStep) {
        for (let x = 0; x < CONFIG.canvasWidth; x += CONFIG.pixelStep) {
            const index = (y * CONFIG.canvasWidth + x) * 4;
            if (imgData[index] > CONFIG.pixelThreshold) {
                rawPoints.push({ x, y });
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (rawPoints.length === 0) return null; // [3.3] Caller handles empty

    const scale = CONFIG.targetWorldWidth / Math.max(maxX - minX, 1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return rawPoints.map(p => ({
        x: (p.x - cx) * scale,
        y: (cy - p.y) * scale,
        z: 0,
    }));
}

// ─────────────────────────────────────────────
// Particle Setup
// ─────────────────────────────────────────────
function setupParticles(text) {
    // [4.2] Dispose old GPU geometry before removing to prevent VRAM leak
    if (render.particles) {
        render.particles.geometry.dispose();
        render.scene.remove(render.particles);
        render.particles = null;
    }

    const points = sampleTextPoints(text);
    if (!points) return; // [3.3] No-op for empty — caller passed a fallback

    const { density, jitterXY, jitterZ, explosionSpeedMin, explosionSpeedRange } = CONFIG;
    const count = points.length * density;

    physics.posHome    = new Float32Array(count * 3);
    physics.posLive    = new Float32Array(count * 3); // [1.3] renamed from posCurrentArray
    physics.springDisp = new Float32Array(count * 3);
    physics.springVel  = new Float32Array(count * 3);
    physics.randomDir  = new Float32Array(count * 3);
    physics.randomSpeed = new Float32Array(count);

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        for (let d = 0; d < density; d++) {
            const idx = i * density + d;
            const ix = idx * 3, iy = ix + 1, iz = ix + 2;

            const hx = p.x + (Math.random() - 0.5) * jitterXY;
            const hy = p.y + (Math.random() - 0.5) * jitterXY;
            const hz = p.z + (Math.random() - 0.5) * jitterZ;

            physics.posHome[ix] = physics.posLive[ix] = hx;
            physics.posHome[iy] = physics.posLive[iy] = hy;
            physics.posHome[iz] = physics.posLive[iz] = hz;

            // Spherical distribution for explosion direction
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos((Math.random() * 2) - 1);
            physics.randomDir[ix] = Math.sin(phi) * Math.cos(theta);
            physics.randomDir[iy] = Math.sin(phi) * Math.sin(theta);
            physics.randomDir[iz] = Math.cos(phi);

            physics.randomSpeed[idx] = explosionSpeedMin + Math.random() * explosionSpeedRange;
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(physics.posLive, 3));

    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });

    render.particles = new THREE.Points(geo, mat);
    render.scene.add(render.particles);
}

// ─────────────────────────────────────────────
// Mouse Utilities
// ─────────────────────────────────────────────
function updateMouse(clientX, clientY) {
    const vec = new THREE.Vector3(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
        0.5
    ).unproject(render.camera);
    const dir = vec.sub(render.camera.position).normalize();
    interaction.mouseWorld.copy(render.camera.position)
        .add(dir.multiplyScalar(-render.camera.position.z / dir.z));
}

// ─────────────────────────────────────────────
// Explosion
// ─────────────────────────────────────────────
function triggerExplosion() {
    // [2.4] Guard: ignore if an explosion is already in progress
    if (physics.explosionStartTime > 0) return;
    physics.explosionStartTime = render.clock.getElapsedTime();
}

// ─────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────
function onPointerDown(e) {
    if (e.target.closest('#control-panel')) return;
    if (e.pointerType === 'touch' && !e.isPrimary) return;

    const now = performance.now();
    // [3.1] Widened tap window: 800ms instead of 500ms
    interaction.clickCount = (now - interaction.lastClickTime < CONFIG.tapWindowMs)
        ? interaction.clickCount + 1
        : 1;
    interaction.lastClickTime = now;

    if (interaction.clickCount >= CONFIG.tapCount) {
        triggerExplosion();
        interaction.clickCount = 0;
    }
}

function onTouchStart(e) {
    if (e.target.closest('#control-panel')) return;
    if (e.touches.length === 1) {
        // [3.2] Update mouse on touchstart (not only touchmove) for immediate heatmap response
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        interaction.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        interaction.lastMidpoint.set(
            (e.touches[0].clientX + e.touches[1].clientX) / 2,
            (e.touches[0].clientY + e.touches[1].clientY) / 2
        );
    }
}

function onTouchMove(e) {
    if (e.target.closest('#control-panel')) return;
    e.preventDefault();

    if (e.touches.length === 1) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (interaction.lastPinchDist) render.targetZ -= (dist - interaction.lastPinchDist) * 0.15;
        interaction.lastPinchDist = dist;

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (render.particles) {
            render.particles.rotation.y += (midX - interaction.lastMidpoint.x) * 0.005;
            render.particles.rotation.x += (midY - interaction.lastMidpoint.y) * 0.005;
        }
        interaction.lastMidpoint.set(midX, midY);
    }
}

function onTouchEnd() {
    interaction.lastPinchDist = null;
    // [2.5] Record gesture end time for grace period
    interaction.lastGestureEndTime = performance.now();
}

function onResize() {
    render.camera.aspect = window.innerWidth / window.innerHeight;
    render.camera.updateProjectionMatrix();
    render.renderer.setSize(window.innerWidth, window.innerHeight);
    // [2.2] Keep pixel ratio uniform in sync on resize
    const dpr = Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio);
    render.renderer.setPixelRatio(dpr);
    uniforms.uPixelRatio.value = dpr;
}

// ─────────────────────────────────────────────
// UI Setup
// ─────────────────────────────────────────────
function setupUI() {
    const textInput = document.getElementById('text-input');
    textInput.addEventListener('input', () => {
        // [1.5] Debounce: only rebuild geometry when user pauses typing
        clearTimeout(interaction.inputDebounceTimer);
        interaction.inputDebounceTimer = setTimeout(() => {
            const val = textInput.value.trim();
            // [3.3] Fall back to default message for empty input
            setupParticles(val.length > 0 ? val : 'Define your message!');
        }, CONFIG.inputDebounceMs);
    });
}

// ─────────────────────────────────────────────
// Animation Loop
// ─────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    const time = render.clock.getElapsedTime();
    // [1.2] Compute delta time for frame-rate-independent physics
    const dt = Math.min(time - render.prevTime, 0.05); // cap at 50ms to avoid physics explosions on tab blur
    render.prevTime = time;

    const { keys, invMatrix, lastGestureEndTime } = interaction;
    const { particles, camera } = render;

    // Keyboard rotation
    if (particles) {
        if (keys.ArrowUp)    particles.rotation.x -= CONFIG.rotationStep;
        if (keys.ArrowDown)  particles.rotation.x += CONFIG.rotationStep;
        if (keys.ArrowLeft)  particles.rotation.y -= CONFIG.rotationStep;
        if (keys.ArrowRight) particles.rotation.y += CONFIG.rotationStep;

        // [2.5] Only auto-return if not rotating via keys, not pinching, and grace period elapsed
        const isKeyRotating = keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
        const gestureGraceActive = (performance.now() - lastGestureEndTime) < CONFIG.autoReturnGracePeriodMs;
        if (!isKeyRotating && !interaction.lastPinchDist && !gestureGraceActive) {
            const lr = CONFIG.rotationAutoReturnLerp;
            particles.rotation.x = THREE.MathUtils.lerp(particles.rotation.x, 0, lr);
            particles.rotation.y = THREE.MathUtils.lerp(particles.rotation.y, 0, lr);
        }
    }

    // Zoom controls
    if (keys['+'] || keys['=']) render.targetZ -= CONFIG.zoomSpeed;
    if (keys['-']) render.targetZ += CONFIG.zoomSpeed;
    render.targetZ = THREE.MathUtils.clamp(render.targetZ, CONFIG.zoomMin, CONFIG.zoomMax);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, render.targetZ, CONFIG.zoomLerp);

    if (!particles) {
        render.renderer.render(render.scene, camera);
        return;
    }

    // [1.1] Transform mouse to local space — uses pre-allocated invMatrix, no per-frame allocation
    invMatrix.copy(particles.matrixWorld).invert();
    interaction.mouseLocal.copy(interaction.mouseWorld).applyMatrix4(invMatrix);
    uniforms.uMouse.value.copy(interaction.mouseLocal);

    // ── CPU Physics ──────────────────────────────────────────
    const posAttr = particles.geometry.attributes.position;
    const pos = posAttr.array;
    const count = posAttr.count;
    const { posHome, springDisp, springVel, randomDir, randomSpeed } = physics;
    const mouseInfluence  = CONFIG.mouseInfluence;
    const mouseInfluence2 = mouseInfluence * mouseInfluence; // [1.4] precomputed for sqrt avoidance
    const repulsionStr    = CONFIG.repulsionStrength;
    const ml = interaction.mouseLocal;

    // [1.2] Frame-rate-independent spring constants
    // At exactly 60fps: kFrame = springK, dampFrame = springDamping (identical to original)
    const kFrame    = CONFIG.springK * (dt * 60);
    const dampFrame = Math.pow(CONFIG.springDamping, dt * 60);

    // Explosion elapsed time
    let elapsed = -1;
    if (physics.explosionStartTime > 0) {
        elapsed = time - physics.explosionStartTime;
        if (elapsed > CONFIG.totalExplosionDuration) {
            physics.explosionStartTime = -1;
            elapsed = -1;
        }
    }

    for (let i = 0; i < count; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2;

        // 1. Base position (home + explosion offset)
        let bx = posHome[ix], by = posHome[iy], bz = posHome[iz];

        if (elapsed > 0.0) {
            const maxDist = randomSpeed[i] * CONFIG.explosionMaxDistMultiplier;
            const rx = randomDir[ix], ry = randomDir[iy], rz = randomDir[iz];

            let dist;
            if (elapsed < CONFIG.expansionDuration) {
                // Expansion: quadratic ease-out (fast → slow)
                const t = elapsed / CONFIG.expansionDuration;
                dist = maxDist * t * (2.0 - t);
            } else {
                // Contraction: cubic ease-in (slow → fast, accelerating home)
                const t = (elapsed - CONFIG.expansionDuration) / CONFIG.contractionDuration;
                dist = maxDist * (1.0 - t * t * t);
            }
            bx += rx * dist;
            by += ry * dist;
            bz += rz * dist;
        }

        // 2. Mouse repulsion
        // [1.4] Early-exit using squared distance to avoid sqrt unless inside influence radius
        const cur_x = pos[ix], cur_y = pos[iy], cur_z = pos[iz];
        const ddx = cur_x - ml.x;
        const ddy = cur_y - ml.y;
        const ddz = cur_z - ml.z;
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz;

        let tdx = 0, tdy = 0, tdz = 0;
        if (d2 < mouseInfluence2 && d2 > 0.00001) {
            const d    = Math.sqrt(d2);   // sqrt only called when inside radius
            const invD = 1.0 / d;
            const force = (mouseInfluence - d) / mouseInfluence;
            const push  = repulsionStr * force;
            tdx = ddx * invD * push;
            tdy = ddy * invD * push;
            tdz = ddz * invD * push;
        }

        // 3. Elastic spring physics — [1.2] frame-rate-independent
        springVel[ix] = (springVel[ix] + (tdx - springDisp[ix]) * kFrame) * dampFrame;
        springVel[iy] = (springVel[iy] + (tdy - springDisp[iy]) * kFrame) * dampFrame;
        springVel[iz] = (springVel[iz] + (tdz - springDisp[iz]) * kFrame) * dampFrame;

        springDisp[ix] += springVel[ix];
        springDisp[iy] += springVel[iy];
        springDisp[iz] += springVel[iz];

        // 4. Write final position
        pos[ix] = bx + springDisp[ix];
        pos[iy] = by + springDisp[iy];
        pos[iz] = bz + springDisp[iz];
    }

    posAttr.needsUpdate = true;
    render.renderer.render(render.scene, camera);
}

// ─────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────
async function init() {
    render.scene  = new THREE.Scene();
    render.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    render.camera.position.z = render.targetZ;

    const dpr = Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio);
    render.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
    });
    render.renderer.setClearColor(CONFIG.clearColor, 1);
    render.renderer.setSize(window.innerWidth, window.innerHeight);
    render.renderer.setPixelRatio(dpr);
    uniforms.uPixelRatio.value = dpr; // [2.2]

    // [5.2] Accessible canvas label
    const canvas = render.renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Kinetic particle sculpture — interactive particle animation');
    document.body.appendChild(canvas);

    // [2.1] Wait for fonts before rasterizing text to avoid fallback font layout
    await document.fonts.ready;

    const textInputEl = document.getElementById('text-input');
    const initialText = textInputEl?.value.trim() || 'Define your message!';
    setupParticles(initialText.length > 0 ? initialText : 'Define your message!');

    setupUI();

    window.addEventListener('pointermove', e => updateMouse(e.clientX, e.clientY));
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', e => interaction.keys[e.key] = true);
    window.addEventListener('keyup',   e => interaction.keys[e.key] = false);

    // [3.4] Debug-only: auto-trigger explosion via URL param (dev mode only)
    if (import.meta.env.DEV) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('explode') === 'true') {
            setTimeout(triggerExplosion, 1000);
        }
    }

    animate();
}

init();
