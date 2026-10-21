import * as THREE from 'three';

export class Bomba {
  constructor() {
    this.group = new THREE.Group();
    this.colorFluido = 0x0077ff;
    this.nivelAgua = 0.0;
    this.encendida = false;

    this.radioReservorio = 1.3;
    this.alturaMaxima = 1.0;

    // 1. CRISTAL (Sin tapa)
    const cristalMat = new THREE.MeshPhongMaterial({ 
      color: 0x88ccff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false 
    });
    const cristal = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radioReservorio, this.radioReservorio, this.alturaMaxima, 48, 1, true), 
      cristalMat
    );
    cristal.position.y = this.alturaMaxima / 2;
    this.group.add(cristal);

    // Base inferior
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.5, roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(this.radioReservorio, this.radioReservorio, 0.02, 48), baseMat);
    base.position.y = 0.01;
    this.group.add(base);

    // 2. FLUIDO
    this.fluidoMat = new THREE.MeshStandardMaterial({ color: this.colorFluido, transparent: true, opacity: 0.85, depthWrite: true });
    this.fluidoGeo = new THREE.CylinderGeometry(this.radioReservorio - 0.02, this.radioReservorio - 0.02, 1, 48);
    this.fluidoGeo.translate(0, 0.5, 0);
    this.fluido = new THREE.Mesh(this.fluidoGeo, this.fluidoMat);
    this.fluido.scale.y = 0.001;
    this.group.add(this.fluido);

    // 3. MOTO BOMBA (Parte TRASERA)
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 });
    
    const baseBomba = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), metalMat);
    baseBomba.position.set(0, 0.05, -this.radioReservorio - 0.3);
    this.group.add(baseBomba);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 20), metalMat);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0, 0.25, -this.radioReservorio - 0.3);
    this.group.add(motor);

    this.aspaMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.5 });
    this.aspa = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.03), this.aspaMat);
    this.aspa.position.set(0, 0.25, -this.radioReservorio - 0.5);
    this.group.add(this.aspa);

    const tuboSuccion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16),
      metalMat
    );
    tuboSuccion.rotation.x = Math.PI / 2;
    tuboSuccion.position.set(0, 0.15, -this.radioReservorio - 0.05);
    this.group.add(tuboSuccion);

    // 4. MANGUERA DE RETORNO (Conecta exacto a la parte superior de la llave)
    this.mangueraMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    this.fluidoMangueraMat = new THREE.MeshStandardMaterial({ color: this.colorFluido, transparent: true, opacity: 0.8 });

    // Coordenadas locales (grupo bomba en -3.0, 0, 0)
    // La llave del tanque (en tanque.js) está en Y = 1.5 + 1.3 = 2.8 global.
    // Por lo tanto, el tubo debe llegar a Y = 2.8 y bajar a la boquilla.
    this.puntosManguera = [
      new THREE.Vector3(0.0, 0.15, -this.radioReservorio - 0.3), // Sale de la motobomba
      new THREE.Vector3(0.0, 0.30, -this.radioReservorio - 0.3), // Empieza a subir
      new THREE.Vector3(0.0, 2.80, -this.radioReservorio - 0.3), // Sube vertical por atrás (llega a Y=2.8)
      new THREE.Vector3(0.0, 2.80, -0.50),                        // Cruza al frente (por arriba del tanque)
      new THREE.Vector3(0.0, 2.80, 0.00),                         // Entra a la llave desde arriba
      new THREE.Vector3(0.0, 2.60, 0.00)                          // Baja para asegurar conexión
    ];

    this.curvaManguera = new THREE.CatmullRomCurve3(this.puntosManguera, false, 'catmullrom', 0.0);
    this.manguera = new THREE.Mesh(new THREE.TubeGeometry(this.curvaManguera, 120, 0.03, 8, false), this.mangueraMat);
    this.fluidoManguera = new THREE.Mesh(new THREE.TubeGeometry(this.curvaManguera, 120, 0.02, 8, false), this.fluidoMangueraMat);
    this.fluidoManguera.visible = false;
    this.group.add(this.manguera, this.fluidoManguera);

    // 5. Escala visual
    this._crearEscala();
  }

  _crearEscala() {
    const zFrente = this.radioReservorio + 0.02;
    for (let i = 1; i <= 5; i++) {
      const y = i * 0.2;
      const taco = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.02, 0.02),
        new THREE.MeshBasicMaterial({ color: i === 5 ? 0xff0000 : 0xffffff })
      );
      taco.position.set(0, y, zFrente);
      this.group.add(taco);
    }
  }

  getAreaBase() {
    return Math.PI * this.radioReservorio * this.radioReservorio;
  }

  getVolumen() {
    return this.getAreaBase() * this.nivelAgua;
  }

  setVolumen(v) {
    const h = v / this.getAreaBase();
    this.setNivel(h);
  }

  setNivel(nivel) {
    this.nivelAgua = Math.min(Math.max(nivel, 0.001), this.alturaMaxima);
    this.fluido.scale.y = this.nivelAgua;
  }

  toggleBomba() {
    this.encendida = !this.encendida;
    this.fluidoManguera.visible = this.encendida;
  }

  setColorFluido(color) {
    this.fluidoMat.color.setHex(color);
    this.fluidoMangueraMat.color.setHex(color);
  }

  update() {
    if (this.encendida) {
      this.aspa.rotation.z += 0.3;
    }
  }
}