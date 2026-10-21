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

// --- BOTÓN HÍBRIDO: AR si está disponible, si no VR ---
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

// --- BANCO DE FLUIDOS (Escala 0.86 = 20% más grande que 0.8) ---
const banco = new Banco();
banco.group.scale.set(0.5, 0.5, 0.5); 
banco.group.position.set(1.5, -1.0, -1.5); 
scene.add(banco.group);

// --- TABLERO DE CONTROL (Escala proporcional al banco) ---
const tablero = new TableroVR(banco);
tablero.group.scale.set(1.3, 1.3, 1.3);
tablero.group.position.set(1.5, -0.6, -1.0);
scene.add(tablero.group);

// --- SONIDO SINTÉTICO ---
const ctx = listener.context;

function crearRuidoBlanco() {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

const fuenteBomba = ctx.createBufferSource();
fuenteBomba.buffer = crearRuidoBlanco();
fuenteBomba.loop = true;

const filtroBomba = ctx.createBiquadFilter();
filtroBomba.type = 'lowpass';
filtroBomba.frequency.value = 150;

const gananciaBomba = ctx.createGain();
gananciaBomba.gain.value = 0;

fuenteBomba.connect(filtroBomba);
filtroBomba.connect(gananciaBomba);
gananciaBomba.connect(ctx.destination);
fuenteBomba.start();

const fuenteAgua = ctx.createBufferSource();
fuenteAgua.buffer = crearRuidoBlanco();
fuenteAgua.loop = true;

const filtroAgua = ctx.createBiquadFilter();
filtroAgua.type = 'bandpass';
filtroAgua.frequency.value = 1000;
filtroAgua.Q.value = 0.5;

const gananciaAgua = ctx.createGain();
gananciaAgua.gain.value = 0;

fuenteAgua.connect(filtroAgua);
filtroAgua.connect(gananciaAgua);
gananciaAgua.connect(ctx.destination);
fuenteAgua.start();

banco.gananciaBomba = gananciaBomba;
banco.gananciaAgua = gananciaAgua;

// --- CONTROLADORES VR/AR ---
const controller1 = renderer.xr.getController(0);
scene.add(controller1);

const controller2 = renderer.xr.getController(1);
scene.add(controller2);

const geometryLaser = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const materialLaser = new THREE.LineBasicMaterial({ color: 0xff0000 });
const laser1 = new THREE.Line(geometryLaser, materialLaser);
laser1.scale.z = 5; 
controller1.add(laser1);

const laser2 = new THREE.Line(geometryLaser, materialLaser.clone());
laser2.scale.z = 5;
controller2.add(laser2);

const raycaster = new THREE.Raycaster();

function onSelectStart(event) {
  const controller = event.target;
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const colision = tablero.verificarColision(raycaster);
  
  if (colision && colision.tipo === 'boton') {
    tablero.presionarBoton(colision.objeto);
  } else if (colision && colision.tipo === 'slider') {
    colision.objeto.userData.arrastrando = true;
  }
}

function onSelectEnd(event) {
  tablero.sliders.forEach(s => s.userData.arrastrando = false);
}

controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);

function moverSliders(controller) {
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const colision = tablero.verificarColision(raycaster);
  
  if (colision && colision.tipo === 'slider') {
    const perilla = colision.objeto;
    const interseccion = raycaster.intersectObject(perilla)[0];
    if (interseccion) {
      const escalaTablero = tablero.group.scale.x; 
      let xLocal = (interseccion.point.x - tablero.group.position.x) / escalaTablero;
      
      let minX = perilla.userData.posX;
      let maxX = perilla.userData.posX + perilla.userData.ancho;
      
      xLocal = Math.max(minX, Math.min(maxX, xLocal));
      perilla.position.x = xLocal;

      const pct = (xLocal - minX) / perilla.userData.ancho;
      const valor = perilla.userData.min + (perilla.userData.max - perilla.userData.min) * pct;
      
      perilla.userData.callback(valor);
      tablero.actualizarValorSlider(perilla, valor);
    }
  }
}

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  
  if (renderer.xr.isPresenting) {
    moverSliders(controller1);
    moverSliders(controller2);
  } else {
    controls.update();
  }

  banco.update(dt);
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});