import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { Banco } from './banco.js';
import { TableroVR } from './tablero.js';

const scene = new THREE.Scene();
scene.background = null; 
scene.fog = null;

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); 

const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  xrCompatible: true, 
  alpha: true 
});
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- BOTÓN DE AR/VR ---
let xrButton;
const arSupported = navigator.xr && navigator.xr.isSessionSupported;

if (arSupported) {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (supported) {
      xrButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor'],
        domOverlay: { root: document.body }
      });
    } else {
      scene.background = new THREE.Color(0x0a0a15);
      xrButton = VRButton.createButton(renderer);
    }
    document.body.appendChild(xrButton);
  }).catch(() => {
    scene.background = new THREE.Color(0x0a0a15);
    xrButton = VRButton.createButton(renderer);
    document.body.appendChild(xrButton);
  });
} else {
  scene.background = new THREE.Color(0x0a0a15);
  xrButton = VRButton.createButton(renderer);
  document.body.appendChild(xrButton);
}

// --- BOTÓN DE SONIDO HTML ---
const btnSonido = document.createElement('button');
btnSonido.textContent = '🔊 ACTIVAR SONIDO';
btnSonido.style.position = 'absolute';
btnSonido.style.top = '20px';
btnSonido.style.right = '20px';
btnSonido.style.padding = '10px 20px';
btnSonido.style.fontSize = '16px';
btnSonido.style.background = '#aa00ff';
btnSonido.style.color = 'white';
btnSonido.style.border = 'none';
btnSonido.style.borderRadius = '8px';
btnSonido.style.cursor = 'pointer';
btnSonido.style.zIndex = '1000';
document.body.appendChild(btnSonido);

btnSonido.addEventListener('click', () => {
  if (listener.context.state === 'suspended') {
    listener.context.resume().then(() => {
      alert('¡Sonido activado!');
      btnSonido.style.display = 'none';
    });
  }
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, -1.5);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

renderer.xr.addEventListener('sessionstart', (event) => {
  controls.enabled = false;
  if (event.session.mode === 'immersive-ar' || event.session.environmentBlendMode === 'alpha-blend') {
    scene.background = null;
    scene.fog = null;
  }
  if (listener.context.state === 'suspended') {
    listener.context.resume();
  }
});

renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  scene.background = new THREE.Color(0x0a0a15);
  scene.fog = new THREE.Fog(0x0a0a15, 10, 35);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 2.0);
dir.position.set(10, 15, 10);
scene.add(dir);

// --- BANCO DE FLUIDOS ---
const banco = new Banco();
banco.group.scale.set(0.5, 0.5, 0.5); 
banco.group.position.set(1.5, -1.0, -1.5); 
scene.add(banco.group);

// --- TABLERO DE CONTROL ---
const tablero = new TableroVR(banco);
tablero.group.scale.set(0.936, 0.936, 0.936);

// ¡AQUÍ ESTÁ EL TRUCO! Calculamos la posición exacta sobre la descarga.
// La descarga está en el banco en Y=1.5 (escala 0.5 => Y=0.75 real). 
// Su altura máxima es 0.5 (escala 0.5 => 0.25 real). 
// La suma es 1.0 real. Le sumamos 0.05 para los 5 cm.
// Nota: Las coordenadas son relativas al grupo del banco, no a la escena.
// Si el tablero está fuera del grupo del banco, calculamos la posición global:
const alturaDescargaGlobal = (1.5 + 0.5) * 0.5 + 0.05; // 1.05
tablero.group.position.set(1.5, alturaDescargaGlobal + 0.5, -1.0); 
// El +0.5 en Y es un ajuste visual para que flote sobre el banco (ajústalo si es necesario)
scene.add(tablero.group);