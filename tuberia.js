import * as THREE from 'three';
import { crearManometro, crearEtiqueta3D, crearMedidorVelocidad } from './medidores.js';

export class Tuberia {
  constructor() {
    this.group = new THREE.Group();
    this.radioGarganta = 0.04;
    this.colorFluido = 0x00aaff;
    this.v1 = 2.0;
    this.rho = 1000;

    this.largoEntrada = 0.3;
    this.largoCono = 0.15;
    this.largoGarganta = 0.1;
    this.radioAncho = 0.15;

    this.flujoActivo = false;
    this.avanceFluido = 0.0;

    this.vidrioMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false
    });
    this.fluidoMat = new THREE.MeshStandardMaterial({
      color: this.colorFluido, transparent: true, opacity: 0.85, depthWrite: true
    });

    this.tuboGarganta = new THREE.Mesh(new THREE.CylinderGeometry(this.radioGarganta, this.radioGarganta, this.largoGarganta, 32, 1, true), this.vidrioMat);
    this.tuboGarganta.rotation.z = Math.PI / 2;
    this.group.add(this.tuboGarganta);

    this.conoReduccion = new THREE.Mesh(new THREE.CylinderGeometry(this.radioGarganta, this.radioAncho, this.largoCono, 32, 1, true), this.vidrioMat);
    this.conoReduccion.rotation.z = Math.PI / 2;
    this.conoReduccion.position.set(0.125, 0, 0);
    this.group.add(this.conoReduccion);

    this.conoExpansion = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho, this.radioGarganta, this.largoCono, 32, 1, true), this.vidrioMat);
    this.conoExpansion.rotation.z = Math.PI / 2;
    this.conoExpansion.position.set(-0.125, 0, 0);
    this.group.add(this.conoExpansion);

    this.tuboEntrada = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho, this.radioAncho, this.largoEntrada, 32, 1, true), this.vidrioMat);
    this.tuboEntrada.rotation.z = Math.PI / 2;
    this.tuboEntrada.position.set(0.35, 0, 0);
    this.group.add(this.tuboEntrada);

    this.tuboSalida = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho, this.radioAncho, this.largoEntrada, 32, 1, true), this.vidrioMat);
    this.tuboSalida.rotation.z = Math.PI / 2;
    this.tuboSalida.position.set(-0.35, 0, 0);
    this.group.add(this.tuboSalida);

    this.fluidoEntrada = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho-0.005, this.radioAncho-0.005, this.largoEntrada, 32), this.fluidoMat);
    this.fluidoEntrada.rotation.z = Math.PI / 2;
    this.fluidoEntrada.position.set(0.35, 0, 0);
    this.fluidoEntrada.visible = false;
    this.group.add(this.fluidoEntrada);

    this.fluidoConoReduccion = new THREE.Mesh(new THREE.CylinderGeometry(this.radioGarganta-0.005, this.radioAncho-0.005, this.largoCono, 32), this.fluidoMat);
    this.fluidoConoReduccion.rotation.z = Math.PI / 2;
    this.fluidoConoReduccion.position.set(0.125, 0, 0);
    this.fluidoConoReduccion.visible = false;
    this.group.add(this.fluidoConoReduccion);

    this.fluidoGarganta = new THREE.Mesh(new THREE.CylinderGeometry(this.radioGarganta-0.005, this.radioGarganta-0.005, this.largoGarganta, 32), this.fluidoMat);
    this.fluidoGarganta.rotation.z = Math.PI / 2;
    this.fluidoGarganta.visible = false;
    this.group.add(this.fluidoGarganta);

    this.fluidoConoExpansion = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho-0.005, this.radioGarganta-0.005, this.largoCono, 32), this.fluidoMat);
    this.fluidoConoExpansion.rotation.z = Math.PI / 2;
    this.fluidoConoExpansion.position.set(-0.125, 0, 0);
    this.fluidoConoExpansion.visible = false;
    this.group.add(this.fluidoConoExpansion);

    this.fluidoSalida = new THREE.Mesh(new THREE.CylinderGeometry(this.radioAncho-0.005, this.radioAncho-0.005, this.largoEntrada, 32), this.fluidoMat);
    this.fluidoSalida.rotation.z = Math.PI / 2;
    this.fluidoSalida.position.set(-0.35, 0, 0);
    this.fluidoSalida.visible = false;
    this.group.add(this.fluidoSalida);

    // --- MEDIDORES ---
    // Manómetros movidos hacia el frente (Z+) para no ser tapados por el tubo de descarga
    this.mEntrada  = crearManometro(new THREE.Vector3( 0.35, 0.25, 0.45), 'P1', 0.30);
    this.mGarganta = crearManometro(new THREE.Vector3( 0.00, 0.25, 0.55), 'P2', 0.30);
    this.mSalida   = crearManometro(new THREE.Vector3(-0.35, 0.25, 0.45), 'P3', 0.30);
    this.group.add(this.mEntrada.group, this.mGarganta.group, this.mSalida.group);

    this.vEntrada  = crearMedidorVelocidad(new THREE.Vector3( 0.35, -0.25, 0.45), 'v1', 0.30);
    this.vGarganta = crearMedidorVelocidad(new THREE.Vector3( 0.00, -0.25, 0.55), 'v2', 0.30);
    this.vSalida   = crearMedidorVelocidad(new THREE.Vector3(-0.35, -0.25, 0.45), 'v3', 0.30);
    this.group.add(this.vEntrada.group, this.vGarganta.group, this.vSalida.group);
  }

  setRadioGarganta(radio) {
    this.radioGarganta = radio;

    this.tuboGarganta.geometry.dispose();
    this.tuboGarganta.geometry = new THREE.CylinderGeometry(this.radioGarganta, this.radioGarganta, this.largoGarganta, 32, 1, true);
    this.fluidoGarganta.geometry.dispose();
    this.fluidoGarganta.geometry = new THREE.CylinderGeometry(this.radioGarganta-0.005, this.radioGarganta-0.005, this.largoGarganta, 32);

    this.conoReduccion.geometry.dispose();
    this.conoReduccion.geometry = new THREE.CylinderGeometry(this.radioGarganta, this.radioAncho, this.largoCono, 32, 1, true);
    this.conoExpansion.geometry.dispose();
    this.conoExpansion.geometry = new THREE.CylinderGeometry(this.radioAncho, this.radioGarganta, this.largoCono, 32, 1, true);

    this.fluidoConoReduccion.geometry.dispose();
    this.fluidoConoReduccion.geometry = new THREE.CylinderGeometry(this.radioGarganta-0.005, this.radioAncho-0.005, this.largoCono, 32);
    this.fluidoConoExpansion.geometry.dispose();
    this.fluidoConoExpansion.geometry = new THREE.CylinderGeometry(this.radioAncho-0.005, this.radioGarganta-0.005, this.largoCono, 32);

    if (this.flujoActivo) this.actualizarFisica();
  }

  setColorFluido(color) {
    this.colorFluido = color;
    this.fluidoMat.color.setHex(color);
  }

  setFlujoActivo(activo) {
    this.flujoActivo = activo;
    if (!activo) {
      this.avanceFluido = 0.0;
      this._aplicarLlenado();
      this.actualizarFisica();
    } else {
      this.actualizarFisica();
    }
  }

  animarLlenado() {
    if (this.flujoActivo && this.avanceFluido < 1.0) {
      this.avanceFluido += 0.02;
      if (this.avanceFluido > 1.0) this.avanceFluido = 1.0;
      this._aplicarLlenado();
    }
  }

  _aplicarLlenado() {
    const t = this.avanceFluido;
    if (t <= 0.0) {
      this.fluidoEntrada.visible = false;
      this.fluidoConoReduccion.visible = false;
      this.fluidoGarganta.visible = false;
      this.fluidoConoExpansion.visible = false;
      this.fluidoSalida.visible = false;
      return;
    }

    if (t > 0) {
      this.fluidoEntrada.visible = true;
      const pctEntrada = Math.min(t / 0.3, 1);
      this.fluidoEntrada.scale.x = pctEntrada;
      this.fluidoEntrada.position.x = 0.35 + (1 - pctEntrada) * (this.largoEntrada / 2);
    } else {
      this.fluidoEntrada.visible = false;
    }

    if (t > 0.3) {
      this.fluidoConoReduccion.visible = true;
      const pctCono = Math.min((t - 0.3) / 0.2, 1);
      this.fluidoConoReduccion.scale.x = pctCono;
      this.fluidoConoReduccion.position.x = 0.125 + (1 - pctCono) * (this.largoCono / 2);
    } else {
      this.fluidoConoReduccion.visible = false;
    }

    if (t > 0.5) {
      this.fluidoGarganta.visible = true;
      const pctGarganta = Math.min((t - 0.5) / 0.2, 1);
      this.fluidoGarganta.scale.x = pctGarganta;
      this.fluidoGarganta.position.x = 0 + (1 - pctGarganta) * (this.largoGarganta / 2);
    } else {
      this.fluidoGarganta.visible = false;
    }

    if (t > 0.7) {
      this.fluidoConoExpansion.visible = true;
      const pctConoExp = Math.min((t - 0.7) / 0.2, 1);
      this.fluidoConoExpansion.scale.x = pctConoExp;
      this.fluidoConoExpansion.position.x = -0.125 + (1 - pctConoExp) * (this.largoCono / 2);
    } else {
      this.fluidoConoExpansion.visible = false;
    }

    if (t > 0.9) {
      this.fluidoSalida.visible = true;
      const pctSalida = Math.min((t - 0.9) / 0.1, 1);
      this.fluidoSalida.scale.x = pctSalida;
      this.fluidoSalida.position.x = -0.35 + (1 - pctSalida) * (this.largoEntrada / 2);
    } else {
      this.fluidoSalida.visible = false;
    }
  }

  actualizarFisica() {
    if (!this.flujoActivo) {
      this.vEntrada.setValor(0);
      this.vGarganta.setValor(0);
      this.vSalida.setValor(0);
      this.mEntrada.setValor(101.3, 100, 150);
      this.mGarganta.setValor(101.3, 100, 150);
      this.mSalida.setValor(101.3, 100, 150);
      return;
    }
    const areaAncha = Math.PI * this.radioAncho * this.radioAncho;
    const areaGarganta = Math.PI * this.radioGarganta * this.radioGarganta;
    const v2 = (areaAncha * this.v1) / areaGarganta;

    this.vEntrada.setValor(this.v1);
    this.vGarganta.setValor(v2);
    this.vSalida.setValor(this.v1);

    this.mEntrada.setValor(101.3 + 10, 100, 150);
    this.mGarganta.setValor(101.3 + 10 - (v2*v2*0.5)/1000, 100, 150);
    this.mSalida.setValor(101.3 + 9, 100, 150);
  }
}