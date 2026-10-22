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
  etiqueta.sprite.position.set(0, 0.35, 0);
  group.add(etiqueta.sprite);

  const valor = crearEtiqueta3D('0.0', 'rgba(0,0,0,0.9)');
  valor.sprite.position.set(0, -0.35, 0);
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

  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  group.add(caja);

  const etiqueta = crearEtiqueta3D(titulo, 'rgba(0, 150, 255, 0.9)');
  etiqueta.sprite.position.set(0, 0.25, 0);
  etiqueta.sprite.scale.set(0.8, 0.2, 1);
  group.add(etiqueta.sprite);

  const valor = crearEtiqueta3D('0.00', 'rgba(0,0,0,0.9)');
  valor.sprite.position.set(0, 0, 0.06);
  valor.sprite.scale.set(0.8, 0.2, 1);
  group.add(valor.sprite);

  return {
    group,
    setValor(v, unidad = 'm/s') {
      valor.setTexto(`${v.toFixed(2)} ${unidad}`);
    }
  };
}

export function crearEtiqueta3D(texto, bg = 'rgba(0,0,0,0.9)') {
  const tex = textoATextura(texto, bg);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.2, 0.3, 1);
  return {
    sprite,
    setTexto(nuevoTexto) {
      sprite.material.map.dispose();
      sprite.material.map = textoATextura(nuevoTexto, bg);
      sprite.material.needsUpdate = true;
    }
  };
}

function textoATextura(texto, bg = 'rgba(0,0,0,0.9)') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}