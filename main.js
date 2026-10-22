import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { Banco } from './banco.js';
import { TableroVR } from './tablero.js';

console.log("✅ main.js v5 cargado correctamente");

const scene = new THREE.Scene();
// Color de fondo para pantalla normal
scene.background = new THREE.Color(0x0a0a15);
scene.fog = new THREE.Fog(0x0a0a15, 10, 35);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 2);

const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  xrCompatible: true,
  alpha: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- CREACIÓN DINÁMICA DEL BOTÓN AR/VR ---
let xrButton;
const arSupported = navigator.xr && navigator.xr.isSessionSupported;

if (arSupported) {
  navigator.xr.isSessionSupported('immersive-ar').then((supportedAR) => {
    if (supportedAR) {
      // Si soporta AR, mostramos AR
      xrButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay') }
      });
      document.body.appendChild(xrButton);
    } else {
      // Si no soporta AR, probamos VR
      navigator.xr.isSessionSupported('immersive-vr').then((supportedVR) => {
        if (supportedVR) {
          xrButton = VRButton.createButton(renderer);
          document.body.appendChild(xrButton);
        }
      }).catch(() => {});
    }
  }).catch(() => {
    // Fallback si falla la detección
  });
}

// --- BOTÓN DE ACTIVAR SONIDO ---
const btnSonido = document.createElement('button');
btnSonido.textContent = '🔊 ACTIVAR SONIDO';
btnSonido.style.position = 'fixed';
btnSonido.style.top = '20px';
btnSonido.style.right = '20px';
btnSonido.style.padding = '15px 25px';
btnSonido.style.fontSize = '20px';
btnSonido.style.fontWeight = 'bold';
btnSonido.style.background = '#aa00ff';
btnSonido.style.color = 'white';
btnSonido.style.border = '3px solid #ffffff';
btnSonido.style.borderRadius = '10px';
btnSonido.style.cursor = 'pointer';
btnSonido.style.zIndex = '99999';
btnSonido.style.boxShadow = '0 0 15px rgba(170, 0, 255, 0.8)';
document.body.appendChild(btnSonido);

function activarAudio() {
  if (listener.context.state === 'suspended') {
    listener.context.resume().then(() => {
      console.log('🔊 Audio activado');
    });
  }
}

btnSonido.addEventListener('click', () => {
  activarAudio();
  btnSonido.style.display = 'none';
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, -1.5);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 2.0);
dir.position.set(10, 15, 10);
scene.add(dir);

// --- BANCO DE FLUIDOS ---
const banco = new Banco();
banco.group.scale.set(0.5, 0.5, 0.5);
banco.group.position.set(1.5, -0.8, -1.5);
scene.add(banco.group);

const posOriginalBanco = banco.group.position.clone();
const escalaOriginalBanco = banco.group.scale.clone();

// --- TABLERO DE CONTROL (Ajustado para no tapar velocímetros) ---
const tablero = new TableroVR(banco);
tablero.group.scale.set(0.8, 0.8, 0.8);
tablero.group.position.set(1.2, 0.85, -1.4); // Subido y alejado un poco
scene.add(tablero.group);

const posOriginalTablero = tablero.group.position.clone();
const escalaOriginalTablero = tablero.group.scale.clone();

tablero.onActivarAudio = () => {
  activarAudio();
};

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

// --- HIT-TEST PARA AR ---
let hitTestSource = null;
let bancoColocado = false;

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

renderer.xr.addEventListener('sessionstart', async (event) => {
  controls.enabled = false;

  const session = event.session;
  const isAR = session.mode === 'immersive-ar' || session.environmentBlendMode === 'alpha-blend';

  if (isAR) {
    scene.background = null;
    scene.fog = null;
    btnSonido.style.display = 'none';
    
    // Ocultar todo hasta que se apunte a una superficie
    banco.group.visible = false;
    tablero.group.visible = false;
    bancoColocado = false;

    try {
      const viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
      console.warn('Hit test no disponible:', e);
    }
  } else {
    // Si es VR (no AR), dejamos todo visible
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 10, 35);
    btnSonido.style.display = 'none';
    banco.group.visible = true;
    tablero.group.visible = true;
  }

  if (listener.context.state === 'suspended') {
    listener.context.resume();
  }
});

renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  scene.background = new THREE.Color(0x0a0a15);
  scene.fog = new THREE.Fog(0x0a0a15, 10, 35);

  banco.group.position.copy(posOriginalBanco);
  banco.group.scale.copy(escalaOriginalBanco);
  banco.group.visible = true;

  tablero.group.position.copy(posOriginalTablero);
  tablero.group.scale.copy(escalaOriginalTablero);
  tablero.group.visible = true;

  hitTestSource = null;
  bancoColocado = false;
  reticle.visible = false;
});

// --- CONTROLADORES VR/AR ---
const controller1 = renderer.xr.getController(0);
scene.add(controller1);
const controller2 = renderer.xr.getController(1);
scene.add(controller2);

const geometryLaser = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1)
]);
const materialLaser = new THREE.LineBasicMaterial({ color: 0xff0000 });
const laser1 = new THREE.Line(geometryLaser, materialLaser);
laser1.scale.z = 5;
controller1.add(laser1);

const laser2 = new THREE.Line(geometryLaser, materialLaser.clone());
laser2.scale.z = 5;
controller2.add(laser2);

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

function onSelectStart(event) {
  const controller = event.target;
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  if (listener.context.state === 'suspended') {
    listener.context.resume();
  }

  // Colocar en AR
  if (renderer.xr.isPresenting && renderer.xr.getSession().mode === 'immersive-ar' && !bancoColocado && reticle.visible) {
    banco.group.position.setFromMatrixPosition(reticle.matrix);
    banco.group.scale.set(0.25, 0.25, 0.25);
    banco.group.visible = true;

    tablero.group.position.copy(banco.group.position);
    tablero.group.position.y += 0.6; // Subido un poco para que no tape en AR
    tablero.group.position.z += 0.3;
    tablero.group.scale.set(0.3, 0.3, 0.3);
    tablero.group.visible = true;

    bancoColocado = true;
    reticle.visible = false;
    return;
  }

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

renderer.setAnimationLoop((timestamp, frame) => {
  const dt = clock.getDelta();

  if (frame && hitTestSource) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(hitTestSource);

    if (hitTestResults.length > 0) {
      const pose = hitTestResults[0].getPose(referenceSpace);
      if (pose && !bancoColocado) {
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    } else {
      reticle.visible = false;
    }
  }

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