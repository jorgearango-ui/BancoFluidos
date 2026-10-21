import * as THREE from 'three';
import { Tanque } from './tanque.js';
import { Tuberia } from './tuberia.js';
import { Descarga } from './descarga.js';
import { Bomba } from './bomba.js';
import { VectorAgua } from './vector.js';

export class Banco {
  constructor() {
    this.group = new THREE.Group();
    this.rho = 1000;
    this.g = 9.8;
    this.P_atm = 101.325; 

    this.tanque = new Tanque(); 
    this.tuberia = new Tuberia(); 
    this.descarga = new Descarga(); 
    this.bomba = new Bomba();

    this.tanque.group.position.set(-3.0, 1.5, 0); 
    this.bomba.group.position.set(-3.0, 0, 0);
    this.descarga.group.position.set(-1.0, 1.5, 0);
    this.tuberia.group.position.set(-0.5, 1.2, 0);

    this.tanque.setRadio(0.6);

    this.group.add(this.tanque.group, this.descarga.group, this.tuberia.group, this.bomba.group);

    this.umbralDescarga = 0.08;
    this.umbralTanque = 0.1;

    this.radioTuboDescarga = 0.05;    
    this.vVenturi = 2.0;              
    this.factorEscalaChorro = 0.08;   

    this.vector = new VectorAgua();
    this.group.add(this.vector.group);
    this.cicloActivo = false;
    this.pausarVector = false;

    this.fluidoNombre = 'Agua';
    this.potenciaBombaWatts = 1000;

    this.gananciaBomba = null;
    this.gananciaAgua = null;

    this._crearTuberias();
    this._reset();
  }

  _crearTuberias() {
    const tuboMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    this.fluidoMat = new THREE.MeshStandardMaterial({ color: 0x0077ff, transparent: true, opacity: 0.8 });

    this.curvaManguera1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, 1.6, 0),  
      new THREE.Vector3(-1.5, 1.6, 0)  
    ]);
    this.manguera1 = new THREE.Mesh(new THREE.TubeGeometry(this.curvaManguera1, 20, 0.04, 8, false), tuboMat);
    this.fluidoManguera1 = new THREE.Mesh(new THREE.TubeGeometry(this.curvaManguera1, 20, 0.03, 8, false), this.fluidoMat);
    this.fluidoManguera1.visible = false;
    this.group.add(this.manguera1, this.fluidoManguera1);

    const puntos2 = [
      new THREE.Vector3(-0.6, 1.45, 0),
      new THREE.Vector3( 0.3, 1.45, 0),
      new THREE.Vector3( 0.3, 1.2, 0),
      new THREE.Vector3( 0.0, 1.2, 0)
    ];
    const curva2 = new THREE.CatmullRomCurve3(puntos2, false, 'catmullrom', 0.0);
    this.curvaDescarga = curva2;
    this.manguera2 = new THREE.Mesh(new THREE.TubeGeometry(curva2, 60, 0.04, 8, false), tuboMat);
    this.fluidoManguera2 = new THREE.Mesh(new THREE.TubeGeometry(curva2, 60, 0.03, 8, false), this.fluidoMat);
    this.fluidoManguera2.visible = false;
    this.group.add(this.manguera2, this.fluidoManguera2);

    const puntos3 = [
      new THREE.Vector3(-1.0, 1.20, 0),   
      new THREE.Vector3(-1.3, 1.20, 0),   
      new THREE.Vector3(-1.3, 1.05, 0),   
      new THREE.Vector3(-1.7, 1.05, 0)    
    ];
    const curva3 = new THREE.CatmullRomCurve3(puntos3, false, 'catmullrom', 0.0);
    this.curvaSalidaVenturi = curva3;
    this.manguera3 = new THREE.Mesh(new THREE.TubeGeometry(curva3, 40, this.radioTuboDescarga, 8, false), tuboMat);
    this.fluidoManguera3 = new THREE.Mesh(new THREE.TubeGeometry(curva3, 40, this.radioTuboDescarga - 0.01, 8, false), this.fluidoMat);
    this.fluidoManguera3.visible = false;
    this.group.add(this.manguera3, this.fluidoManguera3);

    this.chorroReservorioMat = new THREE.MeshStandardMaterial({ 
      color: 0x0077ff, transparent: true, opacity: 0.85, depthWrite: true 
    });
    this.chorroReservorio = new THREE.Mesh(new THREE.BufferGeometry(), this.chorroReservorioMat);
    this.chorroReservorio.visible = false;
    this.group.add(this.chorroReservorio);

    this.salidaChorro = new THREE.Vector3(-1.7, 1.05, 0);
  }

  _actualizarManguera() {
    const salidaX = -3.0 + this.tanque.radio;
    const puntos = [
      new THREE.Vector3(salidaX, 1.6, 0),  
      new THREE.Vector3(-1.5, 1.6, 0)  
    ];
    this.curvaManguera1.points = puntos;
    this.manguera1.geometry.dispose();
    this.manguera1.geometry = new THREE.TubeGeometry(this.curvaManguera1, 20, 0.04, 8, false);
    this.fluidoManguera1.geometry.dispose();
    this.fluidoManguera1.geometry = new THREE.TubeGeometry(this.curvaManguera1, 20, 0.03, 8, false);
  }

  _reset() {
    this.pausarVector = false;

    // El repositorio inicia al 80% para no verse tan lleno
    const volMaxBomba = this.bomba.getAreaBase() * this.bomba.alturaMaxima;
    this.bomba.setVolumen(volMaxBomba * 0.8); 
    this.tanque.setVolumen(0.01);
    this.descarga.setVolumen(0);
    this.tuberia.setFlujoActivo(false);

    if (this.tanque.llaveEntradaAbierta) this.tanque.toggleLlaveEntrada();
    if (this.tanque.llaveSalidaAbierta) this.tanque.toggleLlaveSalida();
    if (this.descarga.valvulaAbierta) this.descarga.toggleValvula();
    if (this.bomba.encendida) this.bomba.toggleBomba();

    this.fluidoManguera1.visible = false;
    this.fluidoManguera2.visible = false;
    this.fluidoManguera3.visible = false;
    this.chorroReservorio.visible = false;

    if (this.gananciaBomba) {
      const t = this.gananciaBomba.context.currentTime;
      this.gananciaBomba.gain.setTargetAtTime(0.0, t, 0.5);
    }
    if (this.gananciaAgua) {
      const t = this.gananciaAgua.context.currentTime;
      this.gananciaAgua.gain.setTargetAtTime(0.0, t, 0.5);
    }

    this.vector.reiniciar();
    this.vector.group.visible = false;

    this._actualizar();
    this._actualizarBloqueos();
  }

  _actualizarBloqueos() {
    this.puedeAbrirTanque = this.tanque.alturaActual > this.umbralTanque;
    this.puedeAbrirDescarga = this.descarga.alturaActual > this.umbralDescarga;
  }

  _actualizar() {
    const h = this.tanque.alturaActual;
    this.pFondo = this.P_atm + (this.rho * this.g * h) / 1000;
  }

  _calcularVelocidadSalida() {
    const areaVenturi = Math.PI * this.tuberia.radioAncho * this.tuberia.radioAncho;
    const areaTubo = Math.PI * this.radioTuboDescarga * this.radioTuboDescarga;
    
    const factorPotencia = this.potenciaBombaWatts / 1000;
    const factorDensidad = 1000 / this.rho;
    
    return (areaVenturi / areaTubo) * this.vVenturi * factorDensidad * factorPotencia;
  }

  _actualizarChorroParabolico() {
    const p0 = this.salidaChorro;
    const g = this.g;

    let vx = this._calcularVelocidadSalida() * this.factorEscalaChorro;

    const nivelAguaRes = this.bomba.nivelAgua;
    const yObjetivo = Math.min(nivelAguaRes, 1.0);

    const dy = p0.y - yObjetivo;
    if (dy <= 0.02 || !isFinite(vx) || vx <= 0) {
      this.chorroReservorio.visible = false;
      return;
    }

    const tCaida = Math.sqrt((2 * dy) / g);
    const N = 30;
    const puntos = [];
    
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * tCaida;
      const x = p0.x - vx * t;
      const y = p0.y - 0.5 * g * t * t;
      puntos.push(new THREE.Vector3(x, y, 0));
    }

    try {
      const curva = new THREE.CatmullRomCurve3(puntos);
      const geo = new THREE.TubeGeometry(curva, N, this.radioTuboDescarga * 0.8, 8, false);
      this.chorroReservorio.geometry.dispose();
      this.chorroReservorio.geometry = geo;
      this.chorroReservorio.visible = true;
    } catch (e) {
      this.chorroReservorio.visible = false;
    }
  }

  _generarGraficaParabola() {
    const datos = this.vector.datosParabola || [];
    if (datos.length < 10) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxT = Math.max(...datos.map(d => d.t)) || 1;
    const max