import * as THREE from 'three';

export function crearManometro(posicion, titulo, escala = 0.35) {
  const group = new THREE.Group();
  group.position.copy(posicion);
  group.scale.set(escala, escala, escala);

  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  disco.rotation.x = Math.PI / 2;
  group.add(disco);

  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 12, 32), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  group.add(aro);

  const aguja = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.01), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
  aguja.position.z = 0.03;
  aguja.geometry.translate(0, 0.1, 0);
  group.add(aguja);

  const etiqueta = crearEtiqueta3D(titulo, 'rgba(0,0,0,0.9)');
  etiqueta.sprite.position.set(0, 0.38, 0);
  group.add(etiqueta.sprite);

  const valor = crearEtiqueta3D('0.0', 'rgba(0,0,0,0.9)');
  valor.sprite.position.set(0, -0.38, 0);
  group.add(valor.sprite);

  return {
    group,
    setValor(v, min, max) {
      const t = Math.min(Math.max((v - min) / (max - min), 0), 1);
      aguja.rotation.z = -Math.PI / 2 + t * Math.PI * 1.5;
      valor.setTexto(v.toFixed(1));
    }
  };
}

export function crearMedidorVelocidad(posicion, titulo, escala = 0.35) {
  const group = new THREE.Group();
  group.position.copy(posicion);
  group.scale.set(escala, escala, escala);

  // Caja negra de fondo más ajustada a la altura del texto
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  group.add(caja);

  const etiqueta = crearEtiqueta3D(titulo, 'rgba(0, 150, 255, 0.9)');
  etiqueta.sprite.position.set(0, 0.22, 0);
  group.add(etiqueta.sprite);

  const valor = crearEtiqueta3D('0.00', 'rgba(0,0,0,0.9)');
  valor.sprite.position.set(0, -0.05, 0.05);
  group.add(valor.sprite);

  return {
    group,
    setValor(v, unidad = 'm/s') {
      valor.setTexto(`${v.toFixed(2)} ${unidad}`);
    }
  };
}

export function crearEtiqueta3D(texto, bg = 'rgba(0,0,0,0.9)') {
  const { tex, aspect } = textoATextura(texto, bg);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  
  // Altura base más pequeña para que los rectángulos no sean tan altos
  const alto = 0.20; 
  sprite.scale.set(alto * aspect, alto, 1);

  return {
    sprite,
    setTexto(nuevoTexto) {
      const { tex: nuevaTex, aspect: nuevoAspect } = textoATextura(nuevoTexto, bg);
      sprite.material.map.dispose();
      sprite.material.map = nuevaTex;
      sprite.material.needsUpdate = true;
      sprite.scale.set(alto * nuevoAspect, alto, 1);
    }
  };
}

function textoATextura(texto, bg = 'rgba(0,0,0,0.9)') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const font = 'bold 64px sans-serif';
  ctx.font = font;
  
  const textWidth = ctx.measureText(texto).width;
  const padding = 15; // Margen horizontal mucho más pequeño
  canvas.width = textWidth + padding * 2;
  canvas.height = 96;

  ctx.font = font;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  
  return { tex, aspect: canvas.width / canvas.height };
}