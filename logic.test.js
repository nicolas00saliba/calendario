import assert from 'node:assert/strict';
import * as L from './logic.js';
const { sq } = L;
let n = 0; const t = (name, f) => { f(); n++; console.log('ok -', name); };

t('movimentos da rainha param em peças', () => {
  const p = { wk: sq(4,0), q: sq(0,6), bk: sq(0,3) };
  const qm = L.blackMoves(p).filter(m => m.piece === 'q').map(m => m.to);
  assert(qm.includes(sq(0,4)) && !qm.includes(sq(0,3)) && !qm.includes(sq(0,2)));
  assert(qm.includes(sq(4,2)) && qm.includes(sq(4,6)));
});
t('rei preto não encosta no rei branco', () => {
  const p = { wk: sq(4,0), q: sq(0,6), bk: sq(2,2) };
  const km = L.blackMoves(p).filter(m => m.piece === 'bk').map(m => m.to);
  assert(!km.includes(sq(3,1)) && km.includes(sq(2,3)) && km.length === 7);
});
t('xeque e raio-x', () => {
  const p = { wk: sq(4,0), q: sq(4,4), bk: sq(0,6) };
  assert(L.inCheck(p)); assert(!L.whiteKingMoves(p).includes(sq(4,1)));
});
t('mate clássico com rainha defendida', () => {
  const p = { wk: sq(4,0), q: sq(3,1), bk: sq(2,2) };
  assert(L.isMate(p)); assert.equal(L.distance(p), 0);
});
t('rainha desprotegida adjacente não é mate', () => {
  const p = { wk: sq(4,0), q: sq(3,1), bk: sq(0,6) };
  assert(L.inCheck(p)); assert(!L.isMate(p));
});
t('afogamento detectado', () => {
  const p = { wk: sq(4,0), q: sq(2,1), bk: sq(0,6) };
  assert(L.isStalemate(p)); assert.equal(L.distance(p), Infinity);
});

const rng = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)(12345);
t('5000 posições iniciais respeitam as regras', () => {
  for (let i = 0; i < 5000; i++) {
    const p = L.randomStart(rng);
    assert(L.CORNERS.includes(p.wk)); assert(L.onOppositeSide(p));
    assert(L.isLegal(p) && !L.inCheck(p) && !L.isStalemate(p));
    const d = L.distance(p); assert(d >= 2 && d < Infinity);
  }
});
t('5000 partidas com lances permitidos aleatórios sempre terminam em mate', () => {
  let maxLen = 0;
  for (let i = 0; i < 5000; i++) {
    let p = L.randomStart(rng); const wk = p.wk; let len = 0;
    while (!L.isMate(p)) {
      const ms = L.allowedMoves(p);
      assert(ms.length > 0, 'posição sem lance permitido');
      const d = L.distance(p);
      p = L.apply(p, ms[Math.floor(rng() * ms.length)]);
      assert.equal(p.wk, wk);
      assert(L.isMate(p) || (L.isQuiet(p)), 'passou por xeque/afogamento');
      assert.equal(L.distance(p), d - 1);
      assert(++len < 50);
    }
    maxLen = Math.max(maxLen, len);
  }
  console.log('   maior partida:', maxLen, 'lances');
});
t('toda posição quieta com mate alcançável tem lance permitido (todos os cantos)', () => {
  let cnt = 0;
  for (const wk of L.CORNERS) for (let q = 0; q < L.N; q++) for (let bk = 0; bk < L.N; bk++) {
    const p = { wk, q, bk }; const d = L.distance(p);
    if (d > 0 && d < Infinity) { assert(L.allowedMoves(p).length > 0); cnt++; }
  }
  console.log('   posições verificadas:', cnt);
});
console.log(`${n} testes passaram`);
