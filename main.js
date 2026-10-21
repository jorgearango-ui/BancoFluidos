import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { Banco } from './banco.js';
import { TableroVR } from './tablero.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a15); 
scene.fog = new THREE.Fog(0x0a0a15, 10, 35);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); // Altura de los ojos en AR

const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({ antialias: true, xrCompatible: true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- BOTÓN DE AR ---
const arButton = ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test'], // Detectar superficies
  optionalFeatures: ['dom-overlay', 'local-floor'],
  domOverlay: { root: document.body }
});
document.body.appendChild(arButton);

// --- CONTROLES DE RATÓN (Solo pantalla plana) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, -1);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

renderer.xr.addEventListener('sessionstart', () => {
  controls.enabled = false;
  scene.background = null; // En AR se ve el mundo real a través de la cámara
});

renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  scene.background = new THREE.Color(0x0a0a15);
});

// --- LUCES ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 2.0);
dir.position.set(10, 15, 10);
scene.add(dir);

// --- BANCO DE FLUIDOS ---
const banco = new Banco();

// CENTRAMOS EL BANCO FRENTE AL USUARIO
// Reducimos a 0.3 de tamaño y lo ponemos 1.5 metros al frente
banco.group.scale.set(0.3, 0.3, 0.3);
banco.group.position.set(0, 0, -1.5); // X=0 para centrarlo, Z=-1.5 para que esté al frente
scene.add(banco.group);

// --- TABLERO DE CONTROL ---
const tablero = new TableroVR(banco);
// El tablero lo ubicamos justo debajo del banco para que no estorbe
tablero.group.scale.set(0.3, 0.3, 0.3); 
tablero.group.position.set(0, -0.5, -1.2); 
scene.add(tablero.group);

// --- CONTROLADORES VR ---
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