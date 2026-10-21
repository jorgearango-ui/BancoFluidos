import * as THREE from 'three';
import { crearManometro, crearEtiqueta3D } from './medidores.js';

export class Descarga {
  constructor() {
    this.group = new THREE.Group();
    this.colorFluido = 0x0077ff;
    this.alturaActual = 0.0;
    this.alturaMaxima = 0.5;
    this.largo = 1.0;
    this.profundidad = 0.6;
    this.valvulaAbierta = false;

    this.cristalMat = new THREE.MeshPhongMaterial({ 
      color: 0x88ccff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false 
    });
    const cristal = new THREE.Mesh(new THREE.BoxGeometry(this.largo, this.alturaMaxima, this.profundidad), this.cristalMat);
    cristal.position.y = this.alturaMaxima / 2;
    this.group.add(cristal);

    const shape = new THREE.Shape();
    const anchoSuperior = 0.6; 
    const anchoInferior = 0.2; 
    const alturaTrapecio = 0.35;
    const yBaseInferior = 0.15; 

    shape.moveTo(-anchoInferior / 2, yBaseInferior);
    shape.lineTo(anchoInferior / 2, yBaseInferior);
    shape.lineTo(anchoSuperior / 2, yBaseInferior + alturaTrapecio);
    shape.lineTo(-anchoSuperior / 2, yBaseInferior + alturaTrapecio);
    shape.lineTo(-anchoInferior / 2, yBaseInferior);

    const extrudeSettings = { depth: this.profundidad, bevelEnabled: false };
    const trapecioGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    trapecioGeo.translate(0, 0, -this.profundidad / 2);
    const trapecioMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, transparent: true, opacity: 0.9 });
    const trapecio = new THREE.Mesh(trapecioGeo, trapecioMat);
    this.group.add(trapecio);

    this.fluidoMat = new THREE.MeshStandardMaterial({ color: this.colorFluido, transparent: true, opacity: 0.6 });
    
    this.fluidoInferiorGeo = new THREE.BoxGeometry(this.largo - 0.02, 1, this.profundidad - 0.02);
    this.fluidoInferiorGeo.translate(0, 0.5, 0);
    this.fluidoInferior = new THREE.Mesh(this.fluidoInferiorGeo, this.fluidoMat);
    this.fluidoInferior.scale.y = 0.001;
    this.group.add(this.fluidoInferior);

    this.fluidoSuperiorGeo = new THREE.BoxGeometry(this.largo - 0.02, 1, this.profundidad - 0.02);
    this.fluidoSuperiorGeo.translate(0, 0.5, 0);
    this.fluidoSuperior = new THREE.Mesh(this.fluidoSuperiorGeo, this.fluidoMat);
    this.fluidoSuperior.scale.y = 0.001;
    this.fluidoSuperior.visible = false;
    this.group.add(this.fluidoSuperior);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    this.valvula = new THREE.Group();
    this.valvula.position.set(0.4, -0.05, 0); 
    const cuerpoValvula = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 16), metalMat);
    this.valvula.add(cuerpoValvula);
    this.volanteValvula = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), metalMat);
    this.volanteValvula.rotation.x = Math.PI / 2;
    this.volanteValvula.position.y = 0.08;
    this.valvula.add(this.volanteValvula);
    this.group.add(this.valvula);

    this._crearEscalaFrontal();
    this.m1 = crearManometro(new THREE.Vector3(-0.6, 0.25, 0), 'P1', 0.25);
    this.m2 = crearManometro(new THREE.Vector3(0, 0.1, 0.5), 'P2', 0.25);
    this.m3 = crearManometro(new THREE.Vector3(0.6, 0.45, 0), 'P3', 0.25);
    this.group.add(this.m1.group, this.m2.group, this.m3.group);
  }

  _crearEscalaFrontal() {
    const zFrente = this.profundidad / 2 + 0.02; 
    const linea = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.45, 0, zFrente), new THREE.Vector3(-0.45, this.alturaMaxima, zFrente)]), 
        new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    this.group.add(linea);
    
    for (let i = 1; i <= 5; i++) {
        const y = i * 0.1;
        const esMedio = i % 5 === 0;

        const taco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: esMedio ? 0xffff00 : 0x00ff00 }));
        taco.position.set(-0.45, y, zFrente); 
        this.group.add(taco);

        // Números en la escala
        if (esMedio) {
            const etiqueta = crearEtiqueta3D(`${y.toFixed(1)} m`, 'rgba(0, 50, 0, 0.8)');
            etiqueta.sprite.scale.set(0.35, 0.1, 1);
            etiqueta.sprite.position.set(-0.6, y, zFrente);
            this.group.add(etiqueta.sprite);
        }
    }
  }

  toggleValvula() {
      this.valvulaAbierta = !this.valvulaAbierta;
      this.volanteValvula.rotation.z += Math.PI / 2;
  }

  setNivel(nivel) {
    this.alturaActual = Math.min(Math.max(nivel, 0), this.alturaMaxima);
    this.actualizarGeometria();
  }

  actualizarGeometria() {
    const h = Math.max(this.alturaActual, 0.001);
    if (h <= 0.15) {
        this.fluidoInferior.scale.y = h;
        this.fluidoSuperior.visible = false;
    } else {
        this.fluidoInferior.scale.y = 0.15;
        this.fluidoSuperior.visible = true;
        this.fluidoSuperior.scale.y = h - 0.15;
        this.fluidoSuperior.position.y = 0.15;
    }
    
    const rho = 1000; const g = 9.8; const Patm = 101.325;
    this.m1.setValor(Patm + (rho*g*Math.max(h-0.25,0))/1000, 100, 110);
    this.m2.setValor(Patm + (rho*g*Math.max(h-0.1,0))/1000, 100, 110);
    this.m3.setValor(Patm + (rho*g*Math.max(h-0.45,0))/1000, 100, 110);
  }

  setColorFluido(color) {
    this.colorFluido = color;
    this.fluidoMat.color.setHex(color);
  }

  // --- CONSERVACIÓN DE VOLUMEN ---

  /**
   * Área transversal del recipiente a una altura h.
   * El recipiente es un trapecio (base inferior 0.2, base superior 0.6,
   * altura 0.35, arrancando en y=0.15) extruido a lo largo de profundidad=0.6.
   * Por encima del trapecio el ancho se mantiene en 0.6.
   */
  getAreaEnAltura(h) {
    const anchoInferior = 0.2;
    const anchoSuperior = 0.6;
    const alturaTrapecio = 0.35;
    const yBaseInferior = 0.15;

    // Altura relativa dentro del trapecio
    const hRel = h - yBaseInferior;

    let ancho;
    if (hRel <= 0) {
      // Debajo del arranque del trapecio: no hay recipiente útil
      ancho = anchoInferior;
    } else if (hRel <= alturaTrapecio) {
      // Dentro del trapecio: interpolación lineal del ancho
      ancho = anchoInferior + (anchoSuperior - anchoInferior) * (hRel / alturaTrapecio);
    } else {
      // Por encima del trapecio: ancho constante
      ancho = anchoSuperior;
    }
    return ancho * this.profundidad;
  }

  /**
   * Volumen acumulado hasta una altura h (integración numérica).
   * Se usa para calcular el volumen actual y para la búsqueda binaria en setVolumen.
   */
  _volumenHasta(h) {
    if (h <= 0) return 0;
    const pasos = 30;
    const dh = h / pasos;
    let vol = 0;
    for (let i = 0; i < pasos; i++) {
      const hh = (i + 0.5) * dh;
      vol += this.getAreaEnAltura(hh) * dh;
    }
    return vol;
  }

  /**
   * Volumen actual de agua en el recipiente.
   */
  getVolumen() {
    return this._volumenHasta(this.alturaActual);
  }

  /**
   * Establece el volumen de agua y calcula la altura correspondiente
   * mediante búsqueda binaria (la relación V(h) es monótona creciente).
   */
  setVolumen(v) {
    let lo = 0, hi = this.alturaMaxima;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const volMid = this._volumenHasta(mid);
      if (volMid < v) lo = mid; else hi = mid;
    }
    this.alturaActual = (lo + hi) / 2;
    this.actualizarGeometria();
  }
}