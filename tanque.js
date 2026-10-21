import * as THREE from 'three';
import { crearManometro, crearEtiqueta3D } from './medidores.js';

export class Tanque {
  constructor() {
    this.group = new THREE.Group();
    this.alturaActual = 0.5;
    this.alturaMaxima = 1.0;
    this.radio = 0.6;
    this.llaveEntradaAbierta = false;
    this.llaveSalidaAbierta = false;
    this.colorFluido = 0x0077ff;

    this.cristalMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false
    });
    this.cristal = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, this.alturaMaxima, 32, 1, true), this.cristalMat);
    this.cristal.position.y = this.alturaMaxima / 2;
    this.group.add(this.cristal);

    this.fluidoMat = new THREE.MeshStandardMaterial({ color: this.colorFluido, transparent: true, opacity: 0.85 });
    this.fluidoGeo = new THREE.CylinderGeometry(0.98, 0.98, 1, 32);
    this.fluidoGeo.translate(0, 0.5, 0);
    this.fluido = new THREE.Mesh(this.fluidoGeo, this.fluidoMat);
    this.group.add(this.fluido);

    this.superficieMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    this.superficie = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.02, 32), this.superficieMat);
    this.group.add(this.superficie);

    this._crearEscalaFrontal();
    this._crearLlaveEntrada();

    this.grupoLlaveSalida = new THREE.Group();
    this._crearLlaveSalida();
    this.group.add(this.grupoLlaveSalida);

    this.grupoManometros = new THREE.Group();
    this.group.add(this.grupoManometros);

    this.manometroFondo = crearManometro(new THREE.Vector3(0, 0, 0), 'P Fondo', 0.25);
    this.manometroMedio = crearManometro(new THREE.Vector3(0, 0, 0), 'P Medio', 0.25);
    this.manometroSup = crearManometro(new THREE.Vector3(0, 0, 0), 'P Sup', 0.25);
    this.grupoManometros.add(this.manometroFondo.group, this.manometroMedio.group, this.manometroSup.group);

    const tuboMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
    this.tubosManometros = [];
    [0.1, 0.5, 0.9].forEach(y => {
      const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), tuboMat);
      tubo.rotation.z = Math.PI / 2;
      this.grupoManometros.add(tubo);
      this.tubosManometros.push({ mesh: tubo, y: y });
    });

    this.labelAltura = crearEtiqueta3D('h = 0.5 m', 'rgba(0, 100, 200, 0.9)');
    this.labelAltura.sprite.position.set(0, 1.3, 0);
    this.group.add(this.labelAltura.sprite);

    this.actualizarGeometria();
    this.actualizarPosicionManometros();
  }

  _crearEscalaFrontal() {
    const zFrente = 1.02;
    const linea = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, zFrente), new THREE.Vector3(0, this.alturaMaxima, zFrente)]),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    this.group.add(linea);

    for (let i = 1; i <= 10; i++) {
      const y = i * 0.1;
      const esMedio = i % 5 === 0;
      const taco = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.015), new THREE.MeshBasicMaterial({ color: esMedio ? 0xff0000 : 0xffffff }));
      taco.position.set(-0.05, y, zFrente);
      this.group.add(taco);
      if (esMedio) {
        const etiqueta = crearEtiqueta3D(`${y.toFixed(1)} m`, 'rgba(0,0,0,0.8)');
        etiqueta.sprite.scale.set(0.4, 0.1, 1);
        etiqueta.sprite.position.set(-0.3, y, zFrente);
        this.group.add(etiqueta.sprite);
      }
    }
  }

  _crearLlaveEntrada() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    this.grupoLlaveEntrada = new THREE.Group();
    this.grupoLlaveEntrada.position.set(0, this.alturaMaxima + 0.3, 0);

    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), metalMat);
    this.grupoLlaveEntrada.add(cuerpo);

    const boquilla = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 16), metalMat);
    boquilla.position.set(0, -0.3, 0);
    this.grupoLlaveEntrada.add(boquilla);

    this.volanteEntrada = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 24), metalMat);
    this.volanteEntrada.rotation.x = Math.PI / 2;
    this.volanteEntrada.position.set(0, 0.25, 0);
    this.grupoLlaveEntrada.add(this.volanteEntrada);

    this.group.add(this.grupoLlaveEntrada);

    this.chorroMat = new THREE.MeshStandardMaterial({ color: this.colorFluido, transparent: true, opacity: 0.9 });
    this.chorro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 16), this.chorroMat);
    this.group.add(this.chorro);
  }

  _crearLlaveSalida() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });

    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16), metalMat);
    cuerpo.rotation.z = Math.PI / 2;
    this.grupoLlaveSalida.add(cuerpo);

    this.volanteSalida = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 24), metalMat);
    this.volanteSalida.rotation.x = Math.PI / 2;
    this.volanteSalida.position.set(0, 0.2, 0);
    this.grupoLlaveSalida.add(this.volanteSalida);
  }

  actualizarPosicionManometros() {
    const xManometro = -(this.radio + 0.4);
    this.manometroFondo.group.position.set(xManometro, 0.1, 0);
    this.manometroMedio.group.position.set(xManometro, 0.5, 0);
    this.manometroSup.group.position.set(xManometro, 0.9, 0);

    this.tubosManometros.forEach(tuboData => {
      const largo = 0.4;
      tuboData.mesh.position.set(-(this.radio + largo / 2), tuboData.y, 0);
      tuboData.mesh.scale.y = largo;
    });
  }

  setRadio(nuevoRadio) {
    this.radio = nuevoRadio;
    this.cristal.scale.x = this.cristal.scale.z = this.radio;
    this.fluido.scale.x = this.fluido.scale.z = this.radio;
    this.superficie.scale.x = this.superficie.scale.z = this.radio;

    this.grupoLlaveSalida.position.set(this.radio, 0.1, 0);

    this.actualizarPosicionManometros();
    this.actualizarGeometria();
  }

  setNivel(nivel) {
    this.alturaActual = Math.min(Math.max(nivel, 0.01), this.alturaMaxima);
    this.actualizarGeometria();
  }

  toggleLlaveEntrada() {
    this.llaveEntradaAbierta = !this.llaveEntradaAbierta;
    this.volanteEntrada.rotation.z += Math.PI / 2;
  }

  toggleLlaveSalida() {
    this.llaveSalidaAbierta = !this.llaveSalidaAbierta;
    this.volanteSalida.rotation.z += Math.PI / 2;
  }

  actualizarGeometria() {
    const h = this.alturaActual;
    this.fluido.scale.y = h;
    this.superficie.position.y = h;

    const boquillaY = this.alturaMaxima + 0.3 - 0.4;
    if (this.llaveEntradaAbierta && h < this.alturaMaxima) {
      this.chorro.visible = true;
      const distancia = boquillaY - h;
      this.chorro.scale.y = distancia;
      this.chorro.position.set(0, h + (distancia / 2), 0);
    } else {
      this.chorro.visible = false;
    }

    this.labelAltura.setTexto(`h = ${h.toFixed(1)} m`);
  }

  setColorFluido(color) {
    this.colorFluido = color;
    this.fluidoMat.color.setHex(color);
    this.chorroMat.color.setHex(color);
  }

  update() {
    // ✅ El nivel YA NO se modifica aquí.
    // El agua llega exclusivamente desde Banco (transferencia reservorio → tanque),
    // que llama setVolumen() y actualiza alturaActual correctamente.
    // Esto garantiza conservación de volumen en todo el circuito.

    // Animación visual del chorro de entrada (no afecta volumen)
    if (this.chorro.visible) {
      this.chorro.material.opacity = 0.7 + 0.3 * Math.sin(Date.now() * 0.02);
    }

    // Manómetros: leen alturaActual en tiempo real (sin cambios)
    const rho = 1000;
    const g = 9.8;
    const Patm = 101.3;

    const pFondo = Patm + (rho * g * this.alturaActual) / 1000;
    const pMedio = Patm + (rho * g * Math.max(this.alturaActual - 0.5, 0)) / 1000;
    const pSup   = Patm + (rho * g * Math.max(this.alturaActual - 0.9, 0)) / 1000;

    this.manometroFondo.setValor(pFondo, 100, 120);
    this.manometroMedio.setValor(pMedio, 100, 120);
    this.manometroSup.setValor(pSup, 100, 120);
  }

  getAreaBase() {
    return Math.PI * this.radio * this.radio;
  }

  getVolumen() {
    return this.getAreaBase() * this.alturaActual;
  }

  setVolumen(v) {
    const h = v / this.getAreaBase();
    this.alturaActual = Math.min(Math.max(h, 0.01), this.alturaMaxima);
    this.actualizarGeometria();
  }
}