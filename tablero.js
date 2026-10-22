import * as THREE from 'three';

export class TableroVR {
  constructor(banco) {
    this.banco = banco;
    this.group = new THREE.Group();
    this.group.position.set(-0.6, 0.45, 0.5);

    this.botones = [];
    this.sliders = [];
    this.etiquetasValores = [];

    this.onActivarAudio = null;

    // Fluidos disponibles para el selector ciclable
    this.fluidos = [
      { nombre: 'Agua',      rho: 1000, color: 0x0077ff },
      { nombre: 'Miel',      rho: 1420, color: 0xcc8800 },
      { nombre: 'Gasolina',  rho: 680,  color: 0x88aa00 },
      { nombre: 'Glicerina', rho: 1260, color: 0x99ccff }
    ];
    this.indiceFluido = 0;

    this._crearPanel();
    this._crearBotones();
    this._crearSliders();
  }

  _crearTexturaTexto(texto, bgColor = '#333333', textColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, 256, 128);

    return new THREE.CanvasTexture(canvas);
  }

  _crearPanel() {
    const geo = new THREE.PlaneGeometry(1.4, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const panel = new THREE.Mesh(geo, mat);
    this.group.add(panel);

    const texturaTitulo = this._crearTexturaTexto('CONTROLES', '#111111', '#00ffff');
    const matTitulo = new THREE.MeshBasicMaterial({ map: texturaTitulo, transparent: true });
    const titulo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), matTitulo);
    titulo.position.set(0, 0.32, 0.01);
    this.group.add(titulo);
  }

  _crearBoton(nombre, colorHex, posX, posY, callback) {
    const geo = new THREE.BoxGeometry(0.18, 0.08, 0.02);
    const colorBg = '#' + colorHex.toString(16).padStart(6, '0');

    const textura = this._crearTexturaTexto(nombre, colorBg);
    const mat = new THREE.MeshStandardMaterial({ map: textura });

    const boton = new THREE.Mesh(geo, mat);
    boton.position.set(posX, posY, 0.03);
    boton.userData = { tipo: 'boton', nombre: nombre, callback: callback, activo: false };
    this.group.add(boton);
    this.botones.push(boton);
    return boton;
  }

  _actualizarTextoBoton(boton, texto, colorHex) {
    const colorBg = '#' + colorHex.toString(16).padStart(6, '0');
    const nueva = this._crearTexturaTexto(texto, colorBg);
    boton.material.map.dispose();
    boton.material.map = nueva;
    boton.material.needsUpdate = true;
  }

  _crearBotones() {
    // Fila superior: accionamientos del circuito
    this._crearBoton('Bomba', 0xff5555, -0.55, 0.22, () => this.banco.toggleBombaVR());
    this._crearBoton('Llave Tanque', 0xff5555, -0.35, 0.22, () => this.banco.toggleLlaveEntradaVR());
    this._crearBoton('Válvula Tanque', 0xff5555, -0.15, 0.22, () => this.banco.toggleLlaveSalidaVR());
    this._crearBoton('Válvula Descarga', 0xff5555, 0.05, 0.22, () => this.banco.toggleValvulaDescargaVR());

    // Selector de fluido (botón que cicla entre los 4 fluidos)
    const f0 = this.fluidos[0];
    this.botonFluido = this._crearBoton(
      `Fluido: ${f0.nombre}`,
      f0.color,
      0.35, 0.22,
      () => {
        this.indiceFluido = (this.indiceFluido + 1) % this.fluidos.length;
        const f = this.fluidos[this.indiceFluido];
        this.banco.setFluidoVR(f.rho);
        this._actualizarTextoBoton(this.botonFluido, `Fluido: ${f.nombre}`, f.color);
      }
    );

    // Fila media: acciones generales
    this._crearBoton('Pausar', 0xffaa00, -0.55, 0.10, () => this.banco.pausarVectorVR());
    this._crearBoton('Informe', 0x2b579a, -0.15, 0.10, () => this.banco.generarInformeVR());
    this._crearBoton('Reset', 0x8888ff, 0.25, 0.10, () => this.banco.resetVR());
    this._crearBoton('Audio', 0xaa00ff, 0.55, 0.10, () => {
      if (this.onActivarAudio) this.onActivarAudio();
    });
  }

  _crearSliders() {
    this._crearSlider('Radio Tanque', -0.55, -0.05, 0.4, 1.0, 0.6, (val) => this.banco.setRadioTanqueVR(val), 'm');
    this._crearSlider('Radio Venturi', -0.55, -0.20, 0.02, 0.10, 0.08, (val) => this.banco.setRadioVenturiVR(val), 'm');
    this._crearSlider('Potencia', -0.55, -0.35, 100, 2000, 1000, (val) => this.banco.setPotenciaVR(val), 'W');
  }

  _crearSlider(nombre, posX, posY, min, max, valorInicial, callback, unidad) {
    const texturaLabel = this._crearTexturaTexto(nombre, '#000000', '#ffffff');
    const matLabel = new THREE.MeshBasicMaterial({ map: texturaLabel, transparent: true });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.10), matLabel);
    label.position.set(posX - 0.15, posY, 0.02);
    this.group.add(label);

    const texturaValor = this._crearTexturaTexto(`${valorInicial.toFixed(2)} ${unidad}`, '#000000', '#00ff00');
    const matValor = new THREE.MeshBasicMaterial({ map: texturaValor, transparent: true });
    const valorLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.08), matValor);
    valorLabel.position.set(posX + 0.55, posY, 0.02);
    this.group.add(valorLabel);

    const fondoGeo = new THREE.BoxGeometry(0.5, 0.02, 0.02);
    const fondoMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const fondo = new THREE.Mesh(fondoGeo, fondoMat);
    fondo.position.set(posX + 0.25, posY, 0.02);
    this.group.add(fondo);

    const perillaGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const perillaMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const perilla = new THREE.Mesh(perillaGeo, perillaMat);

    const pct = (valorInicial - min) / (max - min);
    perilla.position.set(posX + (pct * 0.5), posY, 0.04);

    perilla.userData = {
      tipo: 'slider',
      min: min,
      max: max,
      callback: callback,
      posX: posX,
      ancho: 0.5,
      arrastrando: false,
      valorLabel: valorLabel,
      unidad: unidad
    };
    this.group.add(perilla);
    this.sliders.push(perilla);
  }

  actualizarValorSlider(perilla, nuevoValor) {
    const texto = `${nuevoValor.toFixed(2)} ${perilla.userData.unidad}`;
    const nuevaTextura = this._crearTexturaTexto(texto, '#000000', '#00ff00');
    perilla.userData.valorLabel.material.map.dispose();
    perilla.userData.valorLabel.material.map = nuevaTextura;
    perilla.userData.valorLabel.material.needsUpdate = true;
  }

  verificarColision(raycaster) {
    const intersectBotones = raycaster.intersectObjects(this.botones);
    if (intersectBotones.length > 0) {
      const boton = intersectBotones[0].object;
      if (!boton.userData.iluminado) {
        boton.material.emissive.setHex(0x444444);
        boton.userData.iluminado = true;
      }
      return { tipo: 'boton', objeto: boton };
    } else {
      this.botones.forEach(b => {
        b.material.emissive.setHex(0x000000);
        b.userData.iluminado = false;
      });
    }

    const intersectSliders = raycaster.intersectObjects(this.sliders);
    if (intersectSliders.length > 0) {
      return { tipo: 'slider', objeto: intersectSliders[0].object };
    }

    return null;
  }

  presionarBoton(boton) {
    if (boton.userData.tipo === 'boton') {
      boton.userData.callback();
      boton.position.z = 0.01;
      setTimeout(() => { boton.position.z = 0.03; }, 100);
    }
  }
}