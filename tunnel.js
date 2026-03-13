import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


// config
const config = {
    backgroundColor: '#2042ff',
    lineColor: '#ffffff',
    signalColor1: '#e41aff',
    signalColor2: '#f826ff',
    signalColor3: '#ffffff',
    
    // Tunnel geometry
    lineCount: 50,              // Nombre de lignes parallèles
    segmentCount: 150,          // Nombre de points par ligne
    curveLength: 100,            // Longueur de la courbe
    straightLength: 100,        // Longueur de la section droite
    curvePower: 0.7,            // Contrôle la forme de la courbe
    
    // Spread (écartement des lignes)
    spreadHeight: 50,        // Hauteur totale du tunnel
    spreadDepth: 0,             // Profondeur du tunnel
    
    // Animation des lignes
    waveSpeed: 4,            // Vitesse des vagues
    waveHeight: 0.145,          // Amplitude des vagues
    lineOpacity: 0.5,         // Opacité des lignes de fond
    
    // Particules
    signalCount: 90,            // Nombre de signaux
    signalSpeed: 0.345,         // Vitesse de déplacement
    trailLength: 10,             // Longueur de la traîne
    
    // Bloom
    bloomStrength: 7.0,
    bloomRadius: 1
};

// SCene
const scene = new THREE.Scene();
scene.background = new THREE.Color(config.backgroundColor);
scene.fog = new THREE.FogExp2(config.backgroundColor, 0.002);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const tunnelContainer = document.getElementById('tunnel');
if (tunnelContainer) {
    tunnelContainer.appendChild(renderer.domElement);
} else {
    document.body.appendChild(renderer.domElement);
}

const tunnelGroup = new THREE.Group();
scene.add(tunnelGroup);


const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,    // strength
    0.4,    // radius
    0.85    // threshold
);
bloomPass.strength = config.bloomStrength;
bloomPass.radius = config.bloomRadius;

const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);


let elapsedTime = 0;

/**
 * @param {number} t
 * @param {number} lineIndex - 
 * @param {number} time
 * @returns {THREE.Vector3}
 */
function getPathPoint(t, lineIndex, time) {
    const totalLength = config.curveLength + config.straightLength;
    const currentX = -config.curveLength + t * totalLength;
    
    let y = 0;
    let z = 0;
    
    // Facteur d'écartement (de -1 à 1)
    const spreadFactor = (lineIndex / config.lineCount - 0.5) * 2;
    
    // Section courbe (avant x=0)
    if (currentX < 0) {
        // Normalise la position dans la courbe (0 à 1)
        const curveRatio = (currentX + config.curveLength) / config.curveLength;
        
        // Forme lisse de la courbe (cosinus)
        let shapeFactor = (Math.cos(curveRatio * Math.PI) + 1) / 2;
        shapeFactor = Math.pow(shapeFactor, config.curvePower);
        
        // Applique l'écartement avec la forme
        y = spreadFactor * config.spreadHeight * shapeFactor;
        z = spreadFactor * config.spreadDepth * shapeFactor;
        
        // Ajoute des vagues pour l'animation
        const wave = Math.sin(
            time * config.waveSpeed + 
            currentX * 0.1 + 
            lineIndex
        ) * config.waveHeight * shapeFactor;
        y += wave;
    }
    
    return new THREE.Vector3(currentX, y, z);
}

// MATERIAls
const lineMaterial = new THREE.LineBasicMaterial({
    color: config.lineColor,
    transparent: true,
    opacity: config.lineOpacity,
    depthWrite: false
});

const signalMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true
});

const signalColors = [
    new THREE.Color(config.signalColor1),
    new THREE.Color(config.signalColor2),
    new THREE.Color(config.signalColor3)
];

// OBJECTS
let backgroundLines = [];
let signals = [];

function createTunnelLines() {
    backgroundLines.forEach(line => {
        tunnelGroup.remove(line);
        line.geometry.dispose();
    });
    backgroundLines = [];
    
    for (let i = 0; i < config.lineCount; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.segmentCount * 3);
        
        for (let j = 0; j < config.segmentCount; j++) {
            const t = j / (config.segmentCount - 1);
            const point = getPathPoint(t, i, 0);
            positions[j * 3] = point.x;
            positions[j * 3 + 1] = point.y;
            positions[j * 3 + 2] = point.z;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geometry, lineMaterial.clone());
        tunnelGroup.add(line);
        backgroundLines.push(line);
    }
}

function createSignals() {
    signals.forEach(signal => {
        tunnelGroup.remove(signal.line);
        signal.line.geometry.dispose();
    });
    signals = [];
    
    for (let i = 0; i < config.signalCount; i++) {
        const signal = {
            progress: Math.random(),                    // Position (0 à 1)
            lineIndex: Math.floor(Math.random() * config.lineCount),  // Ligne aléatoire
            color: getRandomSignalColor(),              // Couleur THREE.Color
            history: []                                 // Historique des positions
        };
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array((config.trailLength + 1) * 3);
        const colors = new Float32Array((config.trailLength + 1) * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const signalLine = new THREE.Line(geometry, signalMaterial.clone());
        tunnelGroup.add(signalLine);
        
        signal.line = signalLine;
        signals.push(signal);
    }
}


function getRandomSignalColor() {
    return signalColors[Math.floor(Math.random() * signalColors.length)];
}


createTunnelLines();
createSignals();

// loop
const clock = new THREE.Clock();


function updateTunnelLines(time) {
    backgroundLines.forEach((line, lineIndex) => {
        const positions = line.geometry.attributes.position.array;
        
        for (let j = 0; j < config.segmentCount; j++) {
            const t = j / (config.segmentCount - 1);
            const point = getPathPoint(t, lineIndex, time);
            
            positions[j * 3] = point.x;
            positions[j * 3 + 1] = point.y;
            positions[j * 3 + 2] = point.z;
        }
        
        line.geometry.attributes.position.needsUpdate = true;
    });
}

function updateSignals(time) {
    signals.forEach(signal => {
        signal.progress += config.signalSpeed * 0.005;
        
        if (signal.progress > 1.0) {
            signal.progress = 0;
            signal.lineIndex = Math.floor(Math.random() * config.lineCount);
            signal.history = [];
        }
        
        const currentPos = getPathPoint(signal.progress, signal.lineIndex, time);
        signal.history.push(currentPos);
        
        if (signal.history.length > config.trailLength + 1) {
            signal.history.shift();
        }
        
        const positions = signal.line.geometry.attributes.position.array;
        const colors = signal.line.geometry.attributes.color.array;
        
        const historyLength = signal.history.length;
        
        for (let i = 0; i <= config.trailLength; i++) {
            const historyIndex = historyLength - 1 - i;
            const pos = historyIndex >= 0 ? signal.history[historyIndex] : currentPos;
            
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            
            const alpha = Math.max(0, 1 - i / (config.trailLength + 1));
            
            colors[i * 3] = signal.color.r * alpha;
            colors[i * 3 + 1] = signal.color.g * alpha;
            colors[i * 3 + 2] = signal.color.b * alpha;
        }
        
        signal.line.geometry.attributes.position.needsUpdate = true;
        signal.line.geometry.attributes.color.needsUpdate = true;
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    
    updateTunnelLines(time);
    updateSignals(time);
    
    composer.render();
}

// E listners

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
});

animate();
