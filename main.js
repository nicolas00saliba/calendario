import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as L from './logic.js';

// ---------- Cena ----------
const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
const target = new THREE.Vector3(0, 0, -0.75);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.target.copy(target);
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.15;
controls.minAzimuthAngle = -0.75;
controls.maxAzimuthAngle = 0.75;
controls.rotateSpeed = 0.6;

scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e4da, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-4, 11, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
sun.shadow.radius = 4;
sun.shadow.bias = -0.0005;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xfff4e6, 0.6);
fill.position.set(6, 5, -3);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.12 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.3;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Calendário (papel) ----------
const CELL = 1;
const X0 = -3.9, X1 = 3.9, Z0 = -4.85, Z1 = 3.0; // limites da folha
const PW = X1 - X0, PD = Z1 - Z0, PAD = 0.28;
const cellPos = s => { const [r, c] = L.rc(s); return new THREE.Vector3((c - 3) * CELL, 0, (r - 2) * CELL); };
const isDark = s => { const [r, c] = L.rc(s); return (c + (L.ROWS - 1 - r)) % 2 === 0; };

function pageTexture() {
  const S = 260, cv = document.createElement('canvas');
  cv.width = Math.round(PW * S); cv.height = Math.round(PD * S);
  const g = cv.getContext('2d');
  const px = x => (x - X0) * S, pz = z => (z - Z0) * S;
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, cv.width, cv.height);
  // furos da espiral
  g.fillStyle = '#d9d5cc';
  for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(px(-3.4 + i * 0.4), pz(Z0 + 0.22), 0.055 * S, 0, 7); g.fill(); }
  // título
  g.fillStyle = '#2b2b2b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 ${0.62 * S}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  g.fillText('NOVEMBRO 2026', px(0), pz(-4.0));
  // cabeçalho
  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  g.font = `500 ${0.24 * S}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  days.forEach((d, c) => { g.fillStyle = (c === 0 || c === 6) ? '#2b2b2b' : '#8a8a8a'; g.fillText(d, px(c - 3), pz(-2.95)); });
  // moldura do tabuleiro
  const b = 0.07;
  g.fillStyle = '#2a2622';
  g.fillRect(px(-3.5 - b), pz(-2.5 - b), (7 + 2 * b) * S, (5 + 2 * b) * S);
  // casas
  for (let s = 0; s < L.N; s++) {
    const [r, c] = L.rc(s), dark = isDark(s);
    g.fillStyle = dark ? '#1c1c1c' : '#f4f1ea';
    g.fillRect(px(c - 3.5), pz(r - 2.5), S + 1, S + 1);
    const day = s + 1;
    if (day <= 30) {
      g.fillStyle = dark ? '#e9e4d8' : '#3a3a3a';
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.font = `400 ${0.27 * S}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      g.fillText(String(day), px(c - 3.5) + 0.1 * S, pz(r - 2.5) + 0.09 * S);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const calendar = new THREE.Group();
scene.add(calendar);
{
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.9 });
  const topMat = new THREE.MeshStandardMaterial({ map: pageTexture(), roughness: 0.85 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(PW, PAD, PD), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  pad.position.set((X0 + X1) / 2, -PAD / 2, (Z0 + Z1) / 2);
  pad.castShadow = pad.receiveShadow = true;
  calendar.add(pad);
  const back = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.08, 0.06, PD + 0.08), new THREE.MeshStandardMaterial({ color: 0xbdb6a8, roughness: 0.95 }));
  back.position.set(pad.position.x, -PAD - 0.03 + 0.001, pad.position.z);
  back.castShadow = back.receiveShadow = true;
  calendar.add(back);
  // espiral metálica
  const wire = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.9, roughness: 0.28 });
  const ringGeo = new THREE.TorusGeometry(0.2, 0.022, 10, 32, Math.PI * 1.45);
  for (let i = 0; i < 18; i++) {
    for (const dx of [-0.045, 0.045]) {
      const ring = new THREE.Mesh(ringGeo, wire);
      ring.rotation.y = Math.PI / 2;
      ring.rotation.x = -0.2 * Math.PI;
      ring.position.set(-3.4 + i * 0.4 + dx, -PAD / 2 + 0.01, Z0 + 0.12);
      ring.castShadow = true;
      calendar.add(ring);
    }
  }
}
// placa de seleção invisível para toques no tabuleiro
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// ---------- Peças (Staunton) ----------
const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48);
const BASE = [[0, 0], [0.36, 0], [0.37, 0.03], [0.36, 0.07], [0.31, 0.1], [0.3, 0.14], [0.25, 0.17], [0.21, 0.22], [0.18, 0.27]];
const KING_PROFILE = [...BASE, [0.15, 0.4], [0.125, 0.56], [0.12, 0.64], [0.21, 0.67], [0.21, 0.7], [0.14, 0.73], [0.13, 0.76], [0.17, 0.82], [0.22, 0.92], [0.23, 0.95], [0.19, 0.98], [0.06, 1.0], [0, 1.0]];
const QUEEN_PROFILE = [...BASE, [0.15, 0.4], [0.12, 0.55], [0.11, 0.63], [0.2, 0.66], [0.2, 0.69], [0.13, 0.72], [0.12, 0.75], [0.16, 0.82], [0.22, 0.92], [0.235, 0.95], [0.17, 0.955], [0.1, 0.97], [0, 0.98]];
const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf2e8d5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x161616, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0.05, emissive: 0x000000 });
function shadowed(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function makeKing(mat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe(KING_PROFILE), mat));
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.07), mat); v.position.y = 1.11;
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.07), mat); h.position.y = 1.15;
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat); neck.position.y = 1.0;
  g.add(v, h, neck);
  return shadowed(g);
}
function makeQueen(mat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe(QUEEN_PROFILE), mat));
  const pts = new THREE.SphereGeometry(0.045, 14, 10);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, b = new THREE.Mesh(pts, mat);
    b.position.set(Math.cos(a) * 0.205, 0.975, Math.sin(a) * 0.205); g.add(b);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), mat); top.position.y = 1.06; g.add(top);
  return shadowed(g);
}
// estrutura: posição -> giro -> dobradiça (tombar) -> peça
function makePiece(kind, mat, id) {
  const root = new THREE.Group(), yaw = new THREE.Group(), hinge = new THREE.Group(), holder = new THREE.Group();
  const body = kind === 'king' ? makeKing(mat) : makeQueen(mat);
  holder.add(body); hinge.add(holder); yaw.add(hinge); root.add(yaw);
  root.userData = { id, yaw, hinge, holder };
  root.traverse(o => { o.userData.pieceId = id; });
  scene.add(root);
  return root;
}
const pieces = { wk: makePiece('king', whiteMat, 'wk'), q: makePiece('queen', blackMat.clone(), 'q'), bk: makePiece('king', blackMat.clone(), 'bk') };

// ---------- Marcadores ----------
const goldMat = new THREE.MeshBasicMaterial({ color: 0xe0a93b, transparent: true, opacity: 0.85, depthWrite: false });
const ringSel = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.47, 48), new THREE.MeshBasicMaterial({ color: 0xe0a93b, transparent: true, opacity: 0.95, depthWrite: false }));
ringSel.rotation.x = -Math.PI / 2; ringSel.position.y = 0.006; ringSel.visible = false; scene.add(ringSel);
const markers = new THREE.Group(); scene.add(markers);
const dotGeo = new THREE.CircleGeometry(0.17, 32), haloGeo = new THREE.RingGeometry(0.3, 0.42, 40);
function glowTexture(color) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}
const checkGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(235,40,30,0.95)'), transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
checkGlow.rotation.x = -Math.PI / 2; checkGlow.position.y = 0.008; checkGlow.visible = false; scene.add(checkGlow);
const badFlash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xd33a2c, transparent: true, opacity: 0, depthWrite: false }));
badFlash.rotation.x = -Math.PI / 2; badFlash.position.y = 0.007; scene.add(badFlash);

// ---------- Animações ----------
let speed = 1;
const tweens = [];
function tween(dur, update, ease = t => t) {
  return new Promise(res => tweens.push({ t0: performance.now(), dur: dur / speed, update, ease, res }));
}
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const easeOutBounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i], k = Math.min(1, (now - tw.t0) / tw.dur);
    tw.update(tw.ease(k), k);
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ---------- Envelope ----------
function cardTexture() {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 420;
  const g = cv.getContext('2d');
  g.fillStyle = '#fffdf7'; g.fillRect(0, 0, 640, 420);
  g.strokeStyle = '#c9a25a'; g.lineWidth = 8; g.strokeRect(18, 18, 604, 384);
  g.fillStyle = '#8a6a2c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 40px Georgia, "Times New Roman", serif'; g.fillText('DICA', 320, 90);
  g.fillStyle = '#151515'; g.font = '700 210px Georgia, "Times New Roman", serif'; g.fillText('2b', 320, 255);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function envelopeFrontTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 333;
  const g = cv.getContext('2d');
  g.fillStyle = '#ead6aa'; g.fillRect(0, 0, 512, 333);
  g.strokeStyle = 'rgba(110,80,30,0.45)'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 329);
  g.beginPath(); g.moveTo(0, 333); g.lineTo(256, 150); g.lineTo(512, 333); g.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const envelope = new THREE.Group(); envelope.visible = false; scene.add(envelope);
const env = {};
{
  const W = 2.0, H = 1.3, paper = new THREE.MeshStandardMaterial({ color: 0xe6d0a2, roughness: 0.75, emissive: 0x3a2a08, emissiveIntensity: 0 });
  const front = new THREE.MeshStandardMaterial({ map: envelopeFrontTexture(), roughness: 0.75, emissive: 0x3a2a08, emissiveIntensity: 0 });
  env.body = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.05), [paper, paper, paper, paper, front, paper]);
  env.card = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.18), new THREE.MeshBasicMaterial({ map: cardTexture(), side: THREE.DoubleSide, toneMapped: false }));
  env.card.position.set(0, 0, 0);
  const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(0, -0.78); sh.lineTo(-W / 2, 0);
  const flapMat = new THREE.MeshStandardMaterial({ color: 0xd9bf8a, roughness: 0.75, side: THREE.DoubleSide, emissive: 0x3a2a08, emissiveIntensity: 0 });
  env.flap = new THREE.Group(); env.flap.position.set(0, H / 2, 0.03);
  const flapMesh = new THREE.Mesh(new THREE.ShapeGeometry(sh), flapMat); env.flap.add(flapMesh);
  env.seal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0xa3201b, roughness: 0.4, metalness: 0.1 }));
  env.seal.rotation.x = Math.PI / 2; env.seal.position.set(0, -0.68, 0.02); env.flap.add(env.seal);
  env.inner = new THREE.Group();
  env.inner.add(env.body, env.card, env.flap);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,205,110,0.9)'), transparent: true, depthWrite: false }));
  halo.scale.set(3.4, 2.8, 1); halo.position.z = -0.3; env.halo = halo; env.inner.add(halo);
  env.light = new THREE.PointLight(0xffc56b, 1.2, 5, 1.5); env.light.position.set(0, 0.8, -0.6); env.inner.add(env.light);
  env.mats = [paper, front, flapMat];
  envelope.add(env.inner);
  envelope.traverse(o => { o.userData.envelope = true; if (o.isMesh) o.castShadow = true; });
  env.halo.raycast = () => {};
}
const envScale = () => (innerWidth / innerHeight < 0.8 ? 1.35 : 1.15);
let envState = 'hidden'; // hidden | arriving | ready | opening | open
async function showEnvelope() {
  envelope.visible = true; envState = 'arriving';
  env.flap.rotation.x = 0; env.card.position.set(0, 0, 0); env.card.scale.setScalar(1);
  envelope.position.set(0, 7, -0.2); envelope.scale.setScalar(0.6);
  await tween(1300, (k) => { envelope.position.y = 7 - (7 - 2.3) * k; envelope.scale.setScalar(0.6 + (envScale() - 0.6) * k); envelope.rotation.z = Math.sin(k * 9) * 0.12 * (1 - k); }, easeOutBounce);
  envState = 'ready';
  setStatus('Xeque-mate! Toque no envelope.', 'win');
}
async function openEnvelope() {
  if (envState !== 'ready') return false;
  envState = 'opening';
  setStatus('Abrindo…', 'win');
  await tween(650, k => { env.flap.rotation.x = -Math.PI * k; }, easeInOut);
  await tween(700, k => { env.card.position.y = 1.05 * k; }, easeInOut);
  await tween(800, k => { env.card.position.z = 1.0 * k; env.card.position.y = 1.05 - 0.75 * k; env.card.scale.setScalar(1 + 0.75 * k); }, easeOutBack);
  envState = 'open';
  setStatus('Dica: 2b', 'win');
  closeBtn.hidden = false;
  return true;
}
async function closeEnvelope() {
  if (envState !== 'open') return false;
  envState = 'closing';
  closeBtn.hidden = true;
  setStatus('Fechando…', 'win');
  const z0 = env.card.position.z, y0 = env.card.position.y, s0 = env.card.scale.x;
  await tween(600, k => { env.card.position.z = z0 * (1 - k); env.card.position.y = y0 + (1.05 - y0) * k; env.card.scale.setScalar(s0 + (1 - s0) * k); }, easeInOut);
  await tween(600, k => { env.card.position.y = 1.05 * (1 - k); }, easeInOut);
  await tween(600, k => { env.flap.rotation.x = -Math.PI * (1 - k); }, easeInOut);
  env.card.position.set(0, 0, 0); env.card.scale.setScalar(1); env.flap.rotation.x = 0;
  await storeEnvelope();
  return true;
}
// Envelope guardado: deitado na margem superior direita do papel, ao lado do título, fora da grade.
const STORE_POS = new THREE.Vector3(3.3, 0.045, -4.2);
const STORE_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.12));
const STORE_SCALE = 0.44;
const HOVER_POS = new THREE.Vector3(0, 2.3, -0.2);
function moveEnvelope(toPos, toQuat, toScale, dur, lift = 0) {
  const p0 = envelope.position.clone(), q0 = envelope.quaternion.clone(), s0 = envelope.scale.x, i0 = env.inner.position.y;
  return tween(dur, k => {
    envelope.position.lerpVectors(p0, toPos, k);
    envelope.position.y += Math.sin(Math.PI * k) * lift;
    envelope.quaternion.slerpQuaternions(q0, toQuat, k);
    envelope.scale.setScalar(s0 + (toScale - s0) * k);
    env.inner.position.y = i0 * (1 - k);
  }, easeInOut);
}
async function storeEnvelope() {
  envState = 'storing';
  setStatus('Guardando o envelope…', 'win');
  await moveEnvelope(STORE_POS, STORE_QUAT, STORE_SCALE, 1100, 0.8);
  envState = 'stored';
  setStatus('Envelope guardado. Toque nele para abrir de novo.', 'win');
}
async function unstoreEnvelope() {
  if (envState !== 'stored') return false;
  envState = 'unstoring';
  const dummy = new THREE.Object3D(); dummy.position.copy(HOVER_POS); dummy.lookAt(camera.position);
  await moveEnvelope(HOVER_POS, dummy.quaternion, envScale(), 900, 0.6);
  envState = 'ready';
  return openEnvelope();
}
const closeBtn = document.getElementById('close');
closeBtn.addEventListener('click', e => { e.stopPropagation(); closeEnvelope(); });
function placeCloseBtn() {
  if (closeBtn.hidden) return;
  // logo abaixo do cartão aberto
  const v = new THREE.Vector3(0, -0.62, 0); env.card.localToWorld(v); v.project(camera);
  const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
  closeBtn.style.left = `${Math.round(x)}px`;
  closeBtn.style.top = `${Math.round(Math.min(innerHeight - 110, y + 14))}px`;
}

// ---------- Estado do jogo ----------
let pos, selected = null, busy = false, allowed = [];
function setStatus(text, cls = '') { statusEl.textContent = text; statusEl.className = cls; }
function place(id, s) { const p = cellPos(s); pieces[id].position.set(p.x, 0, p.z); }
function resetPieceTransforms() {
  for (const id in pieces) { const u = pieces[id].userData; u.yaw.rotation.set(0, 0, 0); u.hinge.rotation.set(0, 0, 0); u.hinge.position.set(0, 0, 0); u.holder.position.set(0, 0, 0); pieces[id].position.y = 0; }
  // o rei branco olha para o centro, o rei preto também
}
function clearMarkers() { markers.clear(); ringSel.visible = false; selected = null; for (const id of ['q', 'bk']) pieces[id].userData.holder.position.y = 0; }
function plural(n) { return n === 1 ? '1 lance' : `${n} lances`; }
function idleStatus() {
  const d = L.distance(pos);
  setStatus(`Você joga com as pretas: toque na rainha ou no rei preto. Xeque-mate em ${plural(d)}.`);
}
function newGame(p) {
  tweens.length = 0;
  pos = p ? { ...p } : L.randomStart();
  allowed = L.allowedMoves(pos);
  resetPieceTransforms(); clearMarkers();
  for (const id in pieces) place(id, pos[id]);
  // rei branco virado para o lado das pretas
  pieces.wk.userData.yaw.rotation.y = 0;
  envelope.visible = false; envState = 'hidden'; closeBtn.hidden = true; envelope.quaternion.identity(); env.inner.position.y = 0;
  checkGlow.visible = false; busy = false;
  idleStatus();
}
function select(id) {
  clearMarkers();
  const moves = allowed.filter(m => m.piece === id);
  if (!moves.length) {
    shake(id);
    setStatus(id === 'q' ? 'A rainha não tem lance agora: mova o rei preto.' : 'O rei preto não tem lance agora: mova a rainha.', 'warn');
    return;
  }
  selected = id;
  const p = cellPos(pos[id]);
  ringSel.position.set(p.x, 0.006, p.z); ringSel.visible = true;
  pieces[id].userData.holder.position.y = 0.12;
  for (const m of moves) {
    const c = cellPos(m.to);
    const dot = new THREE.Mesh(dotGeo, goldMat); dot.rotation.x = -Math.PI / 2; dot.position.set(c.x, 0.006, c.z);
    const halo = new THREE.Mesh(haloGeo, goldMat); halo.rotation.x = -Math.PI / 2; halo.position.set(c.x, 0.006, c.z);
    markers.add(dot, halo);
  }
  setStatus('Casas douradas: lances que levam ao xeque-mate.');
}
function shake(id) {
  const h = pieces[id].userData.holder;
  tween(420, (k, raw) => { h.position.x = Math.sin(raw * Math.PI * 6) * 0.08 * (1 - raw); });
}
function flashBad(s) {
  const c = cellPos(s); badFlash.position.set(c.x, 0.007, c.z);
  tween(450, (k, raw) => { badFlash.material.opacity = 0.55 * Math.sin(raw * Math.PI); });
}
async function animateMove(id, to) {
  const from = pieces[id].position.clone(), dest = cellPos(to), dist = from.distanceTo(dest);
  const lift = id === 'bk' ? 0.6 : 0.35 + dist * 0.05;
  await tween(id === 'bk' ? 420 : 380 + dist * 70, k => {
    pieces[id].position.lerpVectors(from, dest, k);
    pieces[id].position.y = Math.sin(Math.PI * k) * lift;
  }, easeInOut);
  pieces[id].position.y = 0;
}
async function toppleWhiteKing() {
  const u = pieces.wk.userData, w = cellPos(pos.wk);
  const dir = new THREE.Vector3(0, 0, 1); void w; // tomba para a frente (fica dentro da tela)
  u.yaw.rotation.y = Math.atan2(-dir.z, dir.x);
  const R = 0.36; u.hinge.position.x = R; u.holder.position.x = -R;
  await tween(250, (k, raw) => { u.hinge.rotation.z = -0.12 * Math.sin(raw * Math.PI * 2); });
  await tween(900, k => { u.hinge.rotation.z = -1.42 * k; }, easeOutBounce);
}
async function doMove(m) {
  busy = true;
  clearMarkers();
  await animateMove(m.piece, m.to);
  pos = L.apply(pos, m);
  allowed = L.allowedMoves(pos);
  if (L.isMate(pos)) {
    checkGlow.position.set(cellPos(pos.wk).x, 0.008, cellPos(pos.wk).z); checkGlow.visible = true;
    setStatus('Xeque-mate!', 'win');
    await toppleWhiteKing();
    await showEnvelope();
  } else {
    idleStatus();
  }
  busy = false;
}
function tapCell(s) {
  if (busy || envState !== 'hidden') return;
  if (s === pos.q || s === pos.bk) return select(s === pos.q ? 'q' : 'bk');
  if (!selected) {
    flashBad(s);
    setStatus('Toque primeiro na rainha ou no rei preto.', 'warn');
    return;
  }
  const m = allowed.find(x => x.piece === selected && x.to === s);
  if (m) return doMove(m);
  shake(selected); flashBad(s);
  setStatus('Esse lance não leva ao xeque-mate. Use uma casa dourada.', 'warn');
}

// ---------- Toques ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
  down = null;
  if (moved < 9 && dt < 700) handleTap(e.clientX, e.clientY);
});
function handleTap(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (envelope.visible) {
    const hit = ray.intersectObject(envelope, true)[0];
    if (hit) { if (envState === 'open') closeEnvelope(); else if (envState === 'stored') unstoreEnvelope(); else openEnvelope(); return; }
  }
  const hit = ray.intersectObjects([pieces.q, pieces.bk], true)[0];
  if (hit && !busy && envState === 'hidden') return select(hit.object.userData.pieceId);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(boardPlane, p)) return;
  const c = Math.round(p.x / CELL + 3), r = Math.round(p.z / CELL + 2);
  if (c < 0 || c >= L.COLS || r < 0 || r >= L.ROWS) return;
  tapCell(L.sq(r, c));
}
document.getElementById('restart').addEventListener('click', () => newGame());

// ---------- Câmera / tamanho ----------
function fitCamera() {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  const needW = aspect < 0.8 ? 8.9 : 9.2, needH = 9.0;
  const dist = Math.max((needW / 2) / Math.tan(hf / 2), (needH / 2) / Math.tan(vf / 2)) * (aspect < 0.8 ? 1.0 : 1.02);
  const polar = aspect < 0.8 ? 0.5 : 0.72; // ângulo a partir da vertical
  camera.position.set(target.x, target.y + dist * Math.cos(polar), target.z + dist * Math.sin(polar));
  controls.minDistance = dist * 0.55; controls.maxDistance = dist * 1.35;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', fitCamera);
fitCamera();

// ---------- Loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(now => {
  const t = clock.getElapsedTime();
  runTweens(performance.now());
  goldMat.opacity = 0.6 + 0.3 * Math.sin(t * 5);
  if (envelope.visible) {
    const parked = envState === 'stored' || envState === 'storing' || envState === 'unstoring';
    if (!parked && envState !== 'arriving') env.inner.position.y = Math.sin(t * 2) * 0.08;
    if (envState === 'arriving') env.inner.position.y = 0;
    const glow = envState === 'ready' || envState === 'stored' ? 0.18 + 0.14 * Math.sin(t * 4) : 0.04;
    env.mats.forEach(m => m.emissiveIntensity = glow);
    env.halo.material.opacity = envState === 'open' ? 0.35 : envState === 'stored' ? 0.35 + 0.25 * Math.sin(t * 4) : 0.55 + 0.3 * Math.sin(t * 4);
    env.halo.scale.set(parked ? 2.6 : 3.4, parked ? 2.0 : 2.8, 1);
    env.light.intensity = parked ? 0.4 : 1.2;
    if (!parked) envelope.lookAt(camera.position);
  }
  if (checkGlow.visible) checkGlow.material.opacity = 0.75 + 0.25 * Math.sin(t * 6);
  controls.update();
  renderer.render(scene, camera);
  placeCloseBtn();
});

newGame();
document.getElementById('loading').remove();

// ---------- Gancho de teste ----------
window.__test = {
  state: () => ({ ...pos, distance: L.distance(pos), mate: L.isMate(pos), envelope: envState, status: statusEl.textContent }),
  allowed: () => allowed.map(m => ({ ...m })),
  setPosition: p => newGame(p),
  setSpeed: s => { speed = s; },
  select: id => select(id),
  tapCell: s => tapCell(s),
  screenOf: s => { const v = cellPos(s).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
  envelopeScreen: () => { const v = envelope.getWorldPosition(new THREE.Vector3()).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
  playOne: async () => { const m = allowed[0]; if (!m) return false; await doMove(m); return true; },
  playToMate: async () => { while (!L.isMate(pos)) { const m = allowed[Math.floor(Math.random() * allowed.length)]; await doMove(m); } },
  openEnvelope: () => openEnvelope(),
  closeEnvelope: () => closeEnvelope(),
  layout: () => {
    const rect = obj => { const b = new THREE.Box3().setFromObject(obj), r = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const v = new THREE.Vector3(x, y, z).project(camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        r.x0 = Math.min(r.x0, sx); r.x1 = Math.max(r.x1, sx); r.y0 = Math.min(r.y0, sy); r.y1 = Math.max(r.y1, sy); }
      return r; };
    const cells = [];
    for (let s = 0; s < L.N; s++) { const c = cellPos(s), r = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) { const v = new THREE.Vector3(c.x + dx, 0, c.z + dz).project(camera), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        r.x0 = Math.min(r.x0, sx); r.x1 = Math.max(r.x1, sx); r.y0 = Math.min(r.y0, sy); r.y1 = Math.max(r.y1, sy); }
      cells.push(r); }
    const envRect = rect(env.body);
    const pcs = { wk: rect(pieces.wk), q: rect(pieces.q), bk: rect(pieces.bk) };
    return { envelope: envRect, cells, pieces: pcs, vw: innerWidth, vh: innerHeight };
  },
  ready: true,
};
