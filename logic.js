// Lógica do mate rainha+rei contra rei branco parado (tabuleiro 7x5).
export const COLS = 7, ROWS = 5, N = COLS * ROWS;
export const rc = s => [Math.floor(s / COLS), s % COLS];
export const sq = (r, c) => r * COLS + c;
const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
export const CORNERS = [sq(0,0), sq(0,COLS-1), sq(ROWS-1,0), sq(ROWS-1,COLS-1)];

export function adjacent(a, b) {
  const [r1, c1] = rc(a), [r2, c2] = rc(b);
  return a !== b && Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}
export function neighbors(s) {
  const [r, c] = rc(s), out = [];
  for (const [dr, dc] of DIRS) if (inside(r + dr, c + dc)) out.push(sq(r + dr, c + dc));
  return out;
}
// A rainha em q ataca t? (bloqueadores: lista de casas ocupadas)
export function queenAttacks(q, t, blockers) {
  if (q === t) return false;
  const [r1, c1] = rc(q), [r2, c2] = rc(t);
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  if (!(r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2))) return false;
  let r = r1 + dr, c = c1 + dc;
  while (!(r === r2 && c === c2)) {
    if (blockers.includes(sq(r, c))) return false;
    r += dr; c += dc;
  }
  return true;
}
export function isLegal(p) {
  return p.wk !== p.q && p.wk !== p.bk && p.q !== p.bk && !adjacent(p.wk, p.bk);
}
export function inCheck(p) { return queenAttacks(p.q, p.wk, [p.bk]); }
// Casas para onde o rei branco poderia fugir (regras de xadrez).
export function whiteKingMoves(p) {
  return neighbors(p.wk).filter(s => {
    if (s === p.bk || adjacent(s, p.bk)) return false;
    if (s === p.q) return true; // captura (rainha sem defesa do rei preto)
    return !queenAttacks(p.q, s, [p.bk]); // o rei branco não bloqueia (raio-x)
  });
}
export function isMate(p) { return isLegal(p) && inCheck(p) && whiteKingMoves(p).length === 0; }
export function isStalemate(p) { return isLegal(p) && !inCheck(p) && whiteKingMoves(p).length === 0; }
// Posição intermediária aceitável: legal, sem xeque, sem afogamento.
export function isQuiet(p) { return isLegal(p) && !inCheck(p) && whiteKingMoves(p).length > 0; }

// Todos os lances pseudo-legais das pretas: {piece:'q'|'bk', from, to}
export function blackMoves(p) {
  const out = [];
  const [qr, qc] = rc(p.q);
  for (const [dr, dc] of DIRS) {
    let r = qr + dr, c = qc + dc;
    while (inside(r, c)) {
      const s = sq(r, c);
      if (s === p.wk || s === p.bk) break;
      out.push({ piece: 'q', from: p.q, to: s });
      r += dr; c += dc;
    }
  }
  for (const s of neighbors(p.bk)) {
    if (s === p.wk || s === p.q || adjacent(s, p.wk)) continue;
    out.push({ piece: 'bk', from: p.bk, to: s });
  }
  return out;
}
export function apply(p, m) { return m.piece === 'q' ? { ...p, q: m.to } : { ...p, bk: m.to }; }

const key = (q, bk) => q * N + bk;
const tables = new Map();
// Distância (em lances pretos) até o mate, com o rei branco fixo em wk. Infinity = sem mate.
export function distTable(wk) {
  if (tables.has(wk)) return tables.get(wk);
  const d = new Float64Array(N * N).fill(Infinity);
  for (let q = 0; q < N; q++) for (let bk = 0; bk < N; bk++)
    if (isMate({ wk, q, bk })) d[key(q, bk)] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let q = 0; q < N; q++) for (let bk = 0; bk < N; bk++) {
      const p = { wk, q, bk };
      if (!isQuiet(p)) continue;
      let best = Infinity;
      for (const m of blackMoves(p)) {
        const n = apply(p, m), dn = d[key(n.q, n.bk)];
        if (dn + 1 < best) best = dn + 1;
      }
      if (best < d[key(q, bk)]) { d[key(q, bk)] = best; changed = true; }
    }
  }
  tables.set(wk, d);
  return d;
}
export function distance(p) {
  if (isMate(p)) return 0;
  if (!isQuiet(p)) return Infinity;
  return distTable(p.wk)[key(p.q, p.bk)];
}
// Lances permitidos: só os que diminuem estritamente a distância até o mate.
export function allowedMoves(p) {
  const d = distance(p);
  if (!(d > 0 && d < Infinity)) return [];
  return blackMoves(p).filter(m => distance(apply(p, m)) < d);
}
export function status(p) {
  if (isMate(p)) return 'mate';
  if (inCheck(p)) return 'check';
  return 'play';
}
// Posição inicial aleatória: rei branco num canto; rainha e rei preto na metade oposta.
export function randomStart(rand = Math.random) {
  for (let i = 0; i < 100000; i++) {
    const wk = CORNERS[Math.floor(rand() * 4)];
    const wc = rc(wk)[1];
    const side = [];
    for (let s = 0; s < N; s++) {
      const c = rc(s)[1];
      if (wc === 0 ? c >= COLS - 3 : c <= 2) side.push(s);
    }
    const q = side[Math.floor(rand() * side.length)];
    const bk = side[Math.floor(rand() * side.length)];
    const p = { wk, q, bk };
    if (!isQuiet(p)) continue;
    const d = distance(p);
    if (d >= 2 && d < Infinity) return p;
  }
  throw new Error('sem posição inicial');
}
export function onOppositeSide(p) {
  const wc = rc(p.wk)[1];
  return [p.q, p.bk].every(s => (wc === 0 ? rc(s)[1] >= COLS - 3 : rc(s)[1] <= 2));
}
