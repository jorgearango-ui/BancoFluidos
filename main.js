import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { Banco } from './banco.js';
import { TableroVR } from './tablero.js';

const scene = new THREE.Scene();
// Fondo transparente para que en AR se vea el mundo real.
// Si no hay AR, este fondo se reemplaza con el color oscuro.
scene.background = null; 
scene.fog = null;

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); // Altura de los ojos

const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  xrCompatible: true, 
  alpha: true // Importante para AR (fondo transparente)
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
      // AR (Passthrough)
      xrButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor'],
        domOverlay: { root: document.body }
      });
    } else {
      // VR (con fondo oscuro)
      scene.background = new THREE.Color(0x0a0a15);
      xrButton = VRButton.createButton(renderer);
    }
    document.body.appendChild(xrButton);
  }).catch(() => {
    // Si falla la detección, usar VR por defecto
    scene.background = new THREE.Color(0x0a0a15);
    xrButton = VRButton.createButton(renderer);
    document.body.appendChild(xrButton);
  });
} else {
  // Navegador sin WebXR (solo pantalla plana)
  scene.background = new THREE.Color(0x0a0a15);
  xrButton = VRButton.createButton(renderer);
  document.body.appendChild(xrButton);
}

// --- CONTROLES DE RATÓN ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, -1.5);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Manejo de sesiones XR
renderer.xr.addEventListener('sessionstart', (event) => {
  controls.enabled = false;
  // Si es sesión AR, quitar fondo. Si es VR, mantener fondo oscuro.
  if (event.session.mode === 'immersive-ar' || event.session.environmentBlendMode === 'alpha-blend') {
    scene.background = null;
    scene.fog = null;
  }
});

renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  scene.background = new THREE.Color(0x0a0a15);
  scene.fog = new THREE.Fog(0x0a0a15, 10, 35);
});

// --- LUCES ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 2.0);
dir.position.set(10, 15, 10);
scene.add(dir);

// --- BANCO DE FLUIDOS (CENTRADO A LA DERECHA) ---
const banco = new Banco();
banco.group.scale.set(0.3, 0.3, 0.3);

// ¡AQUÍ ESTÁ EL TRUCO! Desplazamos a la DERECHA (X positiva)
// para compensar que los objetos internos están en X negativas.
// 1.5 metros a la derecha según tu indicación.
banco.group.position.set(1.5, 0, -1.5); 
scene.add(banco.group);

// --- TABLERO DE CONTROL ---
const tablero = new TableroVR(banco);
tablero.group.scale.set(0.3, 0.3, 0.3);
// El tablero lo movemos con el banco para que quede frente al usuario
tablero.group.position.set(1.5, -0.5, -1.2);
scene.add(tablero.group);

// --- CONTROLADORES VR/AR ---
const controller1 = renderer.xr.getController(0);
scene.add(controller1);

const controller2 = renderer.xr.getController(1);
scene.add(controller2);

// Líneas del láser
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