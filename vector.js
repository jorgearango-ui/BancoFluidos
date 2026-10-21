import * as THREE from 'three';

export class VectorAgua {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    
    const esferaMat = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, emissive: 0xaaaa00, metalness: 0.8, roughness: 0.2 
    });
    this.esfera = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), esferaMat);
    this.group.add(this.esfera);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 160; 
    this.ctx = this.canvas.getContext('2d');
    this.textura = new THREE.CanvasTexture(this.canvas);
    
    const spriteMat = new THREE.SpriteMaterial({ map: this.textura, depthTest: false, transparent: true });
    this.etiqueta = new THREE.Sprite(spriteMat);
    this.etiqueta.scale.set(0.6, 0.375, 1); 
    this.etiqueta.position.set(-1.3, 0.8, 0);  
    this.group.add(this.etiqueta);

    this.fase = 0; 
    this.progresoFase = 0;
    this.textoActual = "";
    this.posicion = new THREE.Vector3(-3.0, 0.05, -1.3);

    this.tCaida = 0;
    this.vxParabola = 0;
    this.yInicioCaida = 0;

    this.registroDatos = [];
    this.ultimaFaseRegistrada = -1;
    this.datosParabola = [];
  }

  _actualizarTexto(titulo, linea1, linea2, linea3 = null) {
    const claveTexto = titulo + linea1 + linea2 + (linea3 || '');
    if (this.textoActual === claveTexto) return;
    this.textoActual = claveTexto;

    this.ctx.clearRect(0, 0, 256, 160);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, 256, 160);
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)'; 
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, 256, 160);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(titulo, 128, 30);

    this.ctx.font = '16px sans-serif';
    this.ctx.fillStyle = '#ffff99'; 
    this.ctx.fillText(linea1, 128, 65);
    this.ctx.fillText(linea2, 128, 95);
    if (linea3) {
      this.ctx.fillText(linea3, 128, 125);
    }

    this.textura.needsUpdate = true;
  }

  _registrarDato(nombreLugar, presion, velocidad, caudal = '-', fluido = 'Agua', densidad = 1000) {
    if (this.ultimaFaseRegistrada === nombreLugar) return;
    this.ultimaFaseRegistrada = nombreLugar;

    this.registroDatos.push({
      lugar: nombreLugar,
      presion: typeof presion === 'number' ? presion.toFixed(2) : presion,
      velocidad: typeof velocidad === 'number' ? velocidad.toFixed(2) : velocidad,
      caudal: typeof caudal === 'number' ? caudal.toFixed(2) : caudal,
      fluido: fluido,
      densidad: densidad
    });
  }

  reiniciar() {
    this.fase = 0;
    this.progresoFase = 0;
    this.posicion.set(-3.0, 0.05, -1.3);
    this.group.visible = true;
    this.registroDatos = [];
    this.ultimaFaseRegistrada = -1;
    this.datosParabola = [];
  }

  actualizar(dt, banco) {
    if (!banco.cicloActivo) {
      if (!banco.pausarVector) this.group.visible = false;
      return;
    }
    this.group.visible = true;
    
    const factorPotencia = banco.potenciaBombaWatts / 1000;
    const factorDensidad = 1000 / banco.rho;
    const factorVelocidad = 0.5 * factorDensidad * factorPotencia; 
    const vBase = 2.0 * factorDensidad * factorPotencia;

    if (this.fase === 0) {
      if (!banco.bomba.encendida) return; 
      this.progresoFase += dt * 1.5 * factorVelocidad;
      
      if (this.progresoFase >= 1.0) {
        this.fase = 1;
        this.progresoFase = 0;
      } else {
        banco.bomba.curvaManguera.getPoint(this.progresoFase, this.posicion);
        this.posicion.add(banco.bomba.group.position); 
        const p = 101.3 + (banco.rho * banco.g * this.posicion.y) / 1000;
        this._actualizarTexto("Bomba (Impulsión)", `P: ${p.toFixed(1)} kPa`, `v: ${vBase.toFixed(2)} m/s`);
      }
    }
    
    else if (this.fase === 1) {
      const nivelAgua = banco.tanque.alturaActual;
      if (nivelAgua <= 0.05) return;

      const yBoquilla = banco.tanque.group.position.y + 1.0; 
      const ySalida = banco.tanque.group.position.y + 0.1;   

      this.progresoFase += dt * 1.5 * factorVelocidad;
      if (this.progresoFase >= 1.0) {
        this.progresoFase = 1.0;
        if (banco.tanque.llaveSalidaAbierta) {
          this.fase = 2;
          this.progresoFase = 0;
        } else {
          this.posicion.set(-3.0, ySalida, 0);
          const p = 101.3 + (banco.rho * banco.g * nivelAgua) / 1000;
          this._actualizarTexto("Esperando Válvula", `P: ${p.toFixed(1)} kPa`, `v: 0.00 m/s`);
          this.esfera.position.copy(this.posicion);
          return;
        }
      }

      const yActual = yBoquilla - (yBoquilla - ySalida) * this.progresoFase;
      this.posicion.set(-3.0, yActual, 0);
      const p = 101.3 + (banco.rho * banco.g * (yActual - ySalida)) / 1000;
      this._actualizarTexto("Dentro del Tanque Principal", `P: ${p.toFixed(1)} kPa`, `v: ${vBase.toFixed(2)} m/s`);
      if (this.progresoFase > 0.5) this._registrarDato("Tanque Principal", p, vBase, '-', banco.fluidoNombre, banco.rho);
    }

    else if (this.fase === 2) {
      if (!banco.tanque.llaveSalidaAbierta) {
        this.posicion.set(-2.4, 1.60, 0);
        this._actualizarTexto("Esperando Válvula", `P: 101.4 kPa`, `v: 0.00 m/s`);
        this.esfera.position.copy(this.posicion); 
        return; 
      }
      this.progresoFase += dt * 1.5 * factorVelocidad;
      if (this.progresoFase >= 1.0) {
        this.fase = 3; 
        this.progresoFase = 0;
      } else {
        const start = new THREE.Vector3(-2.4, 1.60, 0);
        const end = new THREE.Vector3(-1.5, 1.60, 0); 
        this.posicion.lerpVectors(start, end, this.progresoFase);
        this._actualizarTexto("Manguera a Tanque Dos", `P: 101.4 kPa`, `v: ${vBase.toFixed(2)} m/s`);
      }
    }

    else if (this.fase === 3) {
      if (this.progresoFase < 1.0) {
        this.progresoFase += dt * 1.2 * factorVelocidad;
        if (this.progresoFase > 1.0) this.progresoFase = 1.0;
      }
      if (this.progresoFase >= 1.0) {
        if (banco.descarga.valvulaAbierta && banco.descarga.alturaActual > banco.umbralDescarga) {
          this.fase = 4;
          this.progresoFase = 0;
          this.esfera.position.copy(this.posicion);
          return;
        } else {
          this.posicion.set(-0.6, 1.45, 0);
          const p = 101.3 + (banco.rho * banco.g * banco.descarga.alturaActual) / 1000;
          this._actualizarTexto("Esperando Válvula Venturi", `P: ${p.toFixed(1)} kPa`, `Nivel: ${banco.descarga.alturaActual.toFixed(2)} m`);
          this.esfera.position.copy(this.posicion);
          return;
        }
      }
      const pEntrada        = new THREE.Vector3(-1.50, 1.60, 0); 
      const pFondoIzquierda = new THREE.Vector3(-1.20, 1.55, 0); 
      const pPasoInferior   = new THREE.Vector3(-1.00, 1.55, 0); 
      const pFondoDerecha   = new THREE.Vector3(-0.75, 1.55, 0); 
      const pSubidaDerecha  = new THREE.Vector3(-0.65, 1.80, 0); 
      const pSalidaVenturi  = new THREE.Vector3(-0.60, 1.45, 0); 

      let t = this.progresoFase;
      let posActual;
      if (t < 0.2) { posActual = new THREE.Vector3().lerpVectors(pEntrada, pFondoIzquierda, t / 0.2); }
      else if (t < 0.4) { posActual = new THREE.Vector3().lerpVectors(pFondoIzquierda, pPasoInferior, (t - 0.2) / 0.2); }
      else if (t < 0.6) { posActual = new THREE.Vector3().lerpVectors(pPasoInferior, pFondoDerecha, (t - 0.4) / 0.2); }
      else if (t < 0.8) { posActual = new THREE.Vector3().lerpVectors(pFondoDerecha, pSubidaDerecha, (t - 0.6) / 0.2); }
      else { posActual = new THREE.Vector3().lerpVectors(pSubidaDerecha, pSalidaVenturi, (t - 0.8) / 0.2); }

      this.posicion.copy(posActual);
      const p = 101.3 + (banco.rho * banco.g * banco.descarga.alturaActual) / 1000;
      this._actualizarTexto("Dentro del Tanque Dos", `P: ${p.toFixed(1)} kPa`, `Nivel: ${banco.descarga.alturaActual.toFixed(2)} m`);
      this.esfera.position.copy(this.posicion);
      return; 
    }

    else if (this.fase === 4) {
      if (!banco.descarga.valvulaAbierta) return; 
      this.progresoFase += dt * 1.5 * factorVelocidad;
      if (this.progresoFase >= 1.0) {
        this.fase = 5;
        this.progresoFase = 0;
      } else {
        const pts = [
          new THREE.Vector3(-0.6, 1.45, 0), new THREE.Vector3( 0.3, 1.45, 0),
          new THREE.Vector3( 0.3, 1.20, 0), new THREE.Vector3( 0.0, 1.20, 0)
        ];
        const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
        curva.getPoint(this.progresoFase, this.posicion);
        this._actualizarTexto("Tubería al Venturi", `P: 101.5 kPa`, `v: ${vBase.toFixed(2)} m/s`);
      }
    }

    else if (this.fase === 5) {
      if (!banco.descarga.valvulaAbierta || banco.descarga.alturaActual < 0.02) return;
      
      const areaAncha = Math.PI * banco.tuberia.radioAncho * banco.tuberia.radioAncho;
      const areaGarganta = Math.PI * banco.tuberia.radioGarganta * banco.tuberia.radioGarganta;
      
      const v1_efectiva = 2.0 * factorDensidad * factorPotencia; 
      const v2 = (areaAncha * v1_efectiva) / areaGarganta;
      const caudal = areaGarganta * v2;
      
      const velActual = (this.progresoFase > 0.4 && this.progresoFase < 0.6) ? v2 : v1_efectiva;
      this.progresoFase += dt * velActual * factorVelocidad * 0.2;

      if (this.progresoFase >= 1.0) {
        this.fase = 6;
        this.progresoFase = 0;
        this.tCaida = 0;
        this.vxParabola = banco._calcularVelocidadSalida() * banco.factorEscalaChorro;
      } else {
        const start = new THREE.Vector3(0, 1.2, 0);
        const end = new THREE.Vector3(-1.0, 1.2, 0);
        this.posicion.lerpVectors(start, end, this.progresoFase);
        let pActual, vActual, textoZona, idZona;
        
        if (this.progresoFase < 0.33) { 
          pActual = 101.3 + 10; vActual = v1_efectiva; textoZona = "Entrada"; idZona = "Venturi Entrada"; 
        } else if (this.progresoFase < 0.66) { 
          pActual = 101.3 + 10 - (banco.rho * v2 * v2 * 0.5) / 1000; vActual = v2; textoZona = "Garganta"; idZona = "Venturi Garganta"; 
        } else { 
          pActual = 101.3 + 9; vActual = v1_efectiva; textoZona = "Salida"; idZona = "Venturi Salida"; 
        }
        
        this._actualizarTexto(`Venturi (${textoZona})`, `P: ${pActual.toFixed(1)} kPa`, `v: ${vActual.toFixed(2)} m/s`, `Q: ${(caudal*1000).toFixed(1)} L/s`);
        if ((this.progresoFase > 0.15 && this.progresoFase < 0.18) || (this.progresoFase > 0.48 && this.progresoFase < 0.51) || (this.progresoFase > 0.8 && this.progresoFase < 0.83)) {
          this._registrarDato(idZona, pActual, vActual, caudal * 1000, banco.fluidoNombre, banco.rho);
        }
      }
    }

    else if (this.fase === 6) {
      if (!banco.descarga.valvulaAbierta) return;
      this.progresoFase += dt * 1.5 * factorVelocidad;
      if (this.progresoFase >= 1.0) {
        this.fase = 7; 
        this.progresoFase = 0;
        this.yInicioCaida = 1.05; 
        this.datosParabola = []; 
      } else {
        const pts = [
          new THREE.Vector3(-1.0, 1.20, 0), new THREE.Vector3(-1.3, 1.20, 0),
          new THREE.Vector3(-1.3, 1.05, 0), new THREE.Vector3(-1.7, 1.05, 0)
        ];
        const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
        curva.getPoint(this.progresoFase, this.posicion);
        this._actualizarTexto("Tubo al Almacenamiento", `P: 101.3 kPa`, `v: ${vBase.toFixed(2)} m/s`);
      }
    }

    else if (this.fase === 7) {
      if (!banco.descarga.valvulaAbierta) return;
      const g = banco.g;
      this.tCaida += dt * factorVelocidad; 
      
      const alturaAguaRes = banco.bomba.nivelAgua;
      const yObjetivo = Math.min(alturaAguaRes, 1.0);
      const p0 = new THREE.Vector3(-1.7, 1.05, 0);
      const dy = p0.y - yObjetivo;
      const tCaidaTotal = dy > 0 ? Math.sqrt((2 * dy) / g) : 0.1;

      if (this.tCaida >= tCaidaTotal) {
        this.fase = 0; 
        this.progresoFase = 0;
      } else {
        const x = p0.x - this.vxParabola * this.tCaida;
        const y = p0.y - 0.5 * g * this.tCaida * this.tCaida;
        this.posicion.set(x, y, 0);
        
        const vy = g * this.tCaida; 
        const vActual = Math.sqrt(this.vxParabola*this.vxParabola + vy*vy);
        const angulo = Math.atan2(-vy, -this.vxParabola) * (180 / Math.PI);
        this._actualizarTexto("Caída Libre", `v: ${vActual.toFixed(2)} m/s`, `Ángulo: ${angulo.toFixed(0)}°`);
        
        this.datosParabola.push({
          t: this.tCaida,
          x: p0.x - x, 
          y: y,        
          vx: this.vxParabola,
          vy: vy,
          v: vActual
        });
      }
    }

    this.esfera.position.copy(this.posicion);
  }
}