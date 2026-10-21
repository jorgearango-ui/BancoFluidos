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
      new THREE.Vector3(-1.7, 1.20, 0)
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

    this.salidaChorro = new THREE.Vector3(-1.7, 1.20, 0);
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

    // Reservorio inicia al 64 % (80 % original − 20 %) para que la parábola sea más larga
    const volMaxBomba = this.bomba.getAreaBase() * this.bomba.alturaMaxima;
    this.bomba.setVolumen(volMaxBomba * 0.9);
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
    const maxX = Math.max(...datos.map(d => d.x)) || 1;
    const maxY = Math.max(...datos.map(d => d.y)) || 1;
    const maxV = Math.max(...datos.map(d => d.v)) || 1;

    const dibujarEjes = (ox, oy, w, h, maxXVal, maxYVal, tituloX, tituloY, titulo, colorY, colorX) => {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= 5; i++) {
        const xPos = ox + (i / 5) * w;
        const yPos = oy - (i / 5) * h;

        ctx.beginPath(); ctx.moveTo(xPos, oy); ctx.lineTo(xPos, oy - h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, yPos); ctx.lineTo(ox + w, yPos); ctx.stroke();

        ctx.fillText((i / 5 * maxXVal).toFixed(1), xPos, oy + 15);
        if (i > 0) {
          ctx.textAlign = 'right';
          ctx.fillText((i / 5 * maxYVal).toFixed(1), ox - 10, yPos);
          ctx.textAlign = 'center';
        }
      }

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + w, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - h); ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(titulo, ox + w / 2, oy - h - 25);

      ctx.font = '14px Arial';
      ctx.fillText(tituloX, ox + w / 2, oy + 40);

      ctx.save();
      ctx.translate(ox - 50, oy - h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(tituloY, 0, 0);
      ctx.restore();

      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      let legY = oy - h + 10;
      if (colorX) {
        ctx.fillStyle = colorX; ctx.fillRect(ox + w - 120, legY, 12, 12);
        ctx.fillStyle = '#000'; ctx.fillText('Eje X', ox + w - 100, legY + 6);
        legY += 20;
      }
      if (colorY) {
        ctx.fillStyle = colorY; ctx.fillRect(ox + w - 120, legY, 12, 12);
        ctx.fillStyle = '#000'; ctx.fillText('Eje Y', ox + w - 100, legY + 6);
      }
    };

    const g1_x = 80, g1_y = 250, g1_w = 650, g1_h = 180;
    dibujarEjes(g1_x, g1_y, g1_w, g1_h, maxX, maxY, 'X (m)', 'Y (m)', 'Trayectoria (Y vs X)', null, null);

    ctx.strokeStyle = '#0077ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g1_x + (d.x / maxX) * g1_w;
      const cy = g1_y - (d.y / maxY) * g1_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    const g2_x = 80, g2_y = 550, g2_w = 650, g2_h = 180;
    dibujarEjes(g2_x, g2_y, g2_w, g2_h, maxT, Math.max(maxX, maxY), 'Tiempo (s)', 'Posición (m)', 'Posición vs Tiempo', '#00aa00', '#0077ff');

    ctx.strokeStyle = '#00aa00';
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g2_x + (d.t / maxT) * g2_w;
      const cy = g2_y - (d.x / Math.max(maxX, maxY)) * g2_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    ctx.strokeStyle = '#0077ff';
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g2_x + (d.t / maxT) * g2_w;
      const cy = g2_y - (d.y / Math.max(maxX, maxY)) * g2_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    const g3_x = 80, g3_y = 850, g3_w = 650, g3_h = 180;
    dibujarEjes(g3_x, g3_y, g3_w, g3_h, maxT, maxV, 'Tiempo (s)', 'Velocidad (m/s)', 'Velocidad vs Tiempo', '#ff8800', '#0077ff');

    ctx.strokeStyle = '#00aa00';
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g3_x + (d.t / maxT) * g3_w;
      const cy = g3_y - (d.vx / maxV) * g3_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    ctx.strokeStyle = '#ff8800';
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g3_x + (d.t / maxT) * g3_w;
      const cy = g3_y - (d.vy / maxV) * g3_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    ctx.strokeStyle = '#0077ff';
    ctx.beginPath();
    datos.forEach((d, i) => {
      const cx = g3_x + (d.t / maxT) * g3_w;
      const cy = g3_y - (d.v / maxV) * g3_h;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    return canvas.toDataURL('image/png').split(',')[1];
  }

  _generarInforme() {
    if (!window.docx) {
      alert("La librería para generar Word aún no ha cargado.");
      return;
    }

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun } = window.docx;

    const nombreFluido = this.fluidoNombre;
    const densidadFluido = this.rho;
    const factorDensidad = 1000 / densidadFluido;
    const factorPotencia = this.potenciaBombaWatts / 1000;
    const v1_efectiva = 2.0 * factorDensidad * factorPotencia;

    const secciones = [];

    secciones.push(new Paragraph({
      text: "INFORME DE LABORATORIO: BANCO DE FLUIDOS",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    secciones.push(new Paragraph({
      text: `Fluido utilizado: ${nombreFluido} (Densidad: ${densidadFluido} kg/m³)`,
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));

    secciones.push(new Paragraph({
      text: `Potencia de la Motobomba: ${this.potenciaBombaWatts} W`,
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));

    secciones.push(new Paragraph({
      text: "1. DIMENSIONES DEL BANCO",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    }));

    const tablaDimensiones = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Elemento", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Dimensión / Valor", bold: true })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Tanque Principal" })] }),
            new TableCell({ children: [new Paragraph({ text: `Radio: ${this.tanque.radio.toFixed(2)} m | Altura: ${this.tanque.alturaMaxima.toFixed(2)} m` })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Tanque Dos" })] }),
            new TableCell({ children: [new Paragraph({ text: `Largo: ${this.descarga.largo.toFixed(2)} m | Profundidad: ${this.descarga.profundidad.toFixed(2)} m | Altura: ${this.descarga.alturaMaxima.toFixed(2)} m` })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Venturi" })] }),
            new TableCell({ children: [new Paragraph({ text: `Radio Garganta: ${this.tuberia.radioGarganta.toFixed(3)} m | Radio Ancho: ${this.tuberia.radioAncho.toFixed(3)} m` })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Tanque de Almacenamiento" })] }),
            new TableCell({ children: [new Paragraph({ text: `Radio: ${this.bomba.radioReservorio.toFixed(2)} m | Altura: ${this.bomba.alturaMaxima.toFixed(2)} m` })] }),
          ],
        }),
      ],
    });
    secciones.push(tablaDimensiones);
    secciones.push(new Paragraph({ text: "" }));

    secciones.push(new Paragraph({
      text: "2. REGISTRO DE DATOS DEL VECTOR DE AGUA",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    }));

    if (this.vector.registroDatos.length === 0) {
      secciones.push(new Paragraph({ text: "No se han registrado datos aún." }));
    } else {
      const filasDatos = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Elemento", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Presión (kPa)", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Velocidad (m/s)", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Caudal (L/s)", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Fluido", bold: true })] }),
          ],
        })
      ];

      const datosLimpios = [];
      let ultimoLugar = "";
      for (const d of this.vector.registroDatos) {
        if (d.lugar !== ultimoLugar) {
          datosLimpios.push(d);
          ultimoLugar = d.lugar;
        }
      }

      for (const d of datosLimpios) {
        filasDatos.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: d.lugar })] }),
            new TableCell({ children: [new Paragraph({ text: String(d.presion) })] }),
            new TableCell({ children: [new Paragraph({ text: String(d.velocidad) })] }),
            new TableCell({ children: [new Paragraph({ text: String(d.caudal) })] }),
            new TableCell({ children: [new Paragraph({ text: d.fluido })] }),
          ],
        }));
      }

      const tablaDatos = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: filasDatos,
      });
      secciones.push(tablaDatos);
    }
    secciones.push(new Paragraph({ text: "" }));

    secciones.push(new Paragraph({
      text: "3. ANÁLISIS DE LA TRAYECTORIA PARABÓLICA",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    }));

    secciones.push(new Paragraph({
      text: "Al salir del tubo de descarga del Venturi, el agua describe una trayectoria parabólica. Las siguientes gráficas muestran la evolución de la posición y la velocidad en función del tiempo, así como la trayectoria geométrica.",
      spacing: { after: 200 }
    }));

    const imgBase64 = this._generarGraficaParabola();
    if (imgBase64) {
      secciones.push(new Paragraph({
        children: [
          new ImageRun({
            data: imgBase64,
            transformation: { width: 600, height: 750 },
            type: "png"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      }));
    } else {
      secciones.push(new Paragraph({ text: "No hay suficientes datos de la parábola. Asegúrese de que el vector complete la caída libre." }));
    }

    secciones.push(new Paragraph({
      text: "4. PRINCIPIOS FÍSICOS Y ECUACIONES OBSERVADAS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    }));

    const areaGarganta = Math.PI * this.tuberia.radioGarganta ** 2;
    const areaAncha = Math.PI * this.tuberia.radioAncho ** 2;
    const v2 = (areaAncha * v1_efectiva) / areaGarganta;
    const caudal = areaGarganta * v2;
    const flujoMasico = densidadFluido * caudal;

    const ecuaciones = [
      {
        titulo: "4.1 Presión Hidrostática (Tanque Principal)",
        ecuacion: "P = P_atm + ρ · g · h",
        explicacion: `La presión en el fondo depende de la densidad. Con h=${this.tanque.alturaActual.toFixed(2)} m, ρ=${densidadFluido} kg/m³ y g=9.8 m/s², la presión registrada fue de ${(101.325 + densidadFluido * 9.8 * this.tanque.alturaActual / 1000).toFixed(2)} kPa.`
      },
      {
        titulo: "4.2 Ecuación de Continuidad (Venturi)",
        ecuacion: "A₁ · v₁ = A₂ · v₂",
        explicacion: `El caudal se conserva. Con el fluido actual (${nombreFluido}) y una potencia de bomba de ${this.potenciaBombaWatts} W, la velocidad de entrada es ${v1_efectiva.toFixed(2)} m/s. Al pasar por el área de la garganta (A₂ = ${areaGarganta.toFixed(4)} m²), la velocidad aumenta a ${v2.toFixed(2)} m/s.`
      },
      {
        titulo: "4.3 Ecuación de Bernoulli (Venturi)",
        ecuacion: "P₁ + ½ρv₁² = P₂ + ½ρv₂²",
        explicacion: `La presión en la garganta disminuye. La caída de presión es de ${((densidadFluido * (v2*v2 - v1_efectiva*v1_efectiva) * 0.5) / 1000).toFixed(2)} kPa, afectada directamente por la densidad de ${densidadFluido} kg/m³.`
      },
      {
        titulo: "4.4 Teorema de Torricelli (Caída libre)",
        ecuacion: "v = √(2 · g · h)",
        explicacion: `El agua que cae desde el tubo de salida al tanque de almacenamiento acelera por gravedad. La velocidad de salida horizontal es de ${this._calcularVelocidadSalida().toFixed(2)} m/s, lo que dicta el alcance de la parábola.`
      },
      {
        titulo: "4.5 Densidad de Flujo (Caudal másico)",
        ecuacion: "ṁ = ρ · Q",
        explicacion: `Con un caudal Q = ${(caudal*1000).toFixed(2)} L/s y una densidad de ρ = ${densidadFluido} kg/m³, la densidad de flujo (caudal másico) es ṁ ≈ ${flujoMasico.toFixed(3)} kg/s.`
      }
    ];

    for (const eq of ecuaciones) {
      secciones.push(new Paragraph({
        text: eq.titulo,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 150, after: 100 }
      }));
      secciones.push(new Paragraph({
        children: [new TextRun({ text: `Ecuación: ${eq.ecuacion}`, italics: true, color: "0055AA" })],
        spacing: { after: 100 }
      }));
      secciones.push(new Paragraph({
        text: eq.explicacion,
        spacing: { after: 200 }
      }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: secciones,
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_Banco_Fluidos_${new Date().getTime()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // --- MÉTODOS PARA EL TABLERO VR ---
  toggleBombaVR() {
    this.bomba.toggleBomba();
    if (this.gananciaBomba) {
      const t = this.gananciaBomba.context.currentTime;
      this.gananciaBomba.gain.setTargetAtTime(this.bomba.encendida ? 0.15 : 0.0, t, 0.5);
    }
  }

  toggleLlaveEntradaVR() {
    this.tanque.toggleLlaveEntrada();
  }

  toggleLlaveSalidaVR() {
    this.tanque.toggleLlaveSalida();
    this.fluidoManguera1.visible = this.tanque.llaveSalidaAbierta;
  }

  toggleValvulaDescargaVR() {
    this.descarga.toggleValvula();
    this.fluidoManguera2.visible = this.descarga.valvulaAbierta;
    this.tuberia.setFlujoActivo(this.descarga.valvulaAbierta);
    this.fluidoManguera3.visible = this.descarga.valvulaAbierta;

    if (this.gananciaAgua) {
      const t = this.gananciaAgua.context.currentTime;
      this.gananciaAgua.gain.setTargetAtTime(this.descarga.valvulaAbierta ? 0.4 : 0.0, t, 0.5);
    }
  }

  resetVR() {
    this._reset();
  }

  setFluidoVR(rho) {
    this.rho = rho;
    const color = rho === 1000 ? 0x0077ff : rho === 1420 ? 0xcc8800 : rho === 680 ? 0x88aa00 : 0x99ccff;

    this.tanque.setColorFluido(color);
    this.tuberia.setColorFluido(color);
    this.descarga.setColorFluido(color);
    this.bomba.setColorFluido(color);
    this.fluidoMat.color.setHex(color);
    this.chorroReservorioMat.color.setHex(color);

    this.fluidoNombre = rho === 1000 ? 'Agua' : rho === 1420 ? 'Miel' : rho === 680 ? 'Gasolina' : 'Glicerina';
    this.tuberia.rho = this.rho;
    this.tuberia.actualizarFisica();
    this._actualizar();
  }

  pausarVectorVR() {
    this.pausarVector = !this.pausarVector;
  }

  generarInformeVR() {
    this._generarInforme();
  }

  setRadioTanqueVR(val) {
    this.tanque.setRadio(val);
    this._actualizarManguera();
    const volTanqueActual = this.tanque.getVolumen();
    this.tanque.setVolumen(volTanqueActual);
    this._actualizar();
  }

  setRadioVenturiVR(val) {
    this.tuberia.setRadioGarganta(val);
  }

  setPotenciaVR(val) {
    this.potenciaBombaWatts = val;
    this.tuberia.v1 = 2.0 * (val / 1000);
    this.tuberia.actualizarFisica();
  }

  update(dt = 0.016) {
    const CAUDAL = 0.002 * (this.potenciaBombaWatts / 1000);

    // --- Transferencia 1: Reservorio → Tanque principal ---
    // Caudal subido a 0.02 para que el efecto sea visible y realista.
    // Al quitar el auto-llenado de Tanque.update(), esta es la ÚNICA vía
    // por la que el tanque principal recibe agua, garantizando conservación de volumen.
    if (this.tanque.llaveEntradaAbierta && this.bomba.encendida) {
      const volRes = this.bomba.getVolumen();
      const volTanque = this.tanque.getVolumen();
      const volTanqueMax = this.tanque.getAreaBase() * this.tanque.alturaMaxima;
      const caudalBomba = 0.02 * (this.potenciaBombaWatts / 1000);
      const transferir = Math.min(caudalBomba, volRes, volTanqueMax - volTanque);
      if (transferir > 0) {
        this.bomba.setVolumen(volRes - transferir);
        this.tanque.setVolumen(volTanque + transferir);
        this._actualizar();
      }
    }

    // --- Transferencia 2: Tanque principal → Tanque dos (descarga) ---
    if (this.tanque.llaveSalidaAbierta && this.tanque.alturaActual > this.umbralTanque) {
      const volTanque = this.tanque.getVolumen();
      const volDesc = this.descarga.getVolumen();
      const volDescMax = this.descarga._volumenHasta(this.descarga.alturaMaxima);
      const transferir = Math.min(CAUDAL, volTanque, volDescMax - volDesc);
      if (transferir > 0) {
        this.tanque.setVolumen(volTanque - transferir);
        this.descarga.setVolumen(volDesc + transferir);
        this._actualizar();
      }
    }

    // --- Transferencia 3: Tanque dos → Reservorio ---
    if (this.descarga.valvulaAbierta && this.descarga.alturaActual > this.umbralDescarga) {
      const volDesc = this.descarga.getVolumen();
      const volRes = this.bomba.getVolumen();
      const volResMax = this.bomba.getAreaBase() * this.bomba.alturaMaxima;
      const transferir = Math.min(CAUDAL, volDesc, volResMax - volRes);
      if (transferir > 0) {
        this.descarga.setVolumen(volDesc - transferir);
        this.bomba.setVolumen(volRes + transferir);
      }
    }

    if (this.bomba.encendida) {
      if (this.bomba.getVolumen() <= 0.0001) {
        this.bomba.encendida = false;
        this.bomba.fluidoManguera.visible = false;
      }
    }

    if (this.descarga.valvulaAbierta) {
      this._actualizarChorroParabolico();
    } else {
      this.chorroReservorio.visible = false;
    }

    if (this.chorroReservorio.visible) {
      this.chorroReservorio.material.opacity = 0.7 + 0.3 * Math.sin(Date.now() * 0.02);
    }

    this.tuberia.animarLlenado();
    this.cicloActivo = this.descarga.valvulaAbierta || this.bomba.encendida;

    if (!this.pausarVector) {
      this.vector.actualizar(dt, this);
    }

    this._actualizarBloqueos();
    this.tanque.update(); // ACTUALIZA LOS MANÓMETROS (ya no modifica el nivel)
    this.bomba.update();
  }
}