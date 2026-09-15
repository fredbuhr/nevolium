// Presentation only: these fibres are not canonical relationships or simulated activity.
// A fixed seed and a shared coordinate system keep filaments, membranes and hit targets aligned.
export type NeuralPoint = { x: number; y: number }
export type NeuralNode = NeuralPoint & { key: string; radius: number; tone: string }
export type NeuralFibre = { path: string; width: number; opacity: number; tone: string }
export type NeuralSpark = NeuralPoint & { radius: number; tone: string; flare: boolean }
export type NeuralMembrane = { node: NeuralNode; body: string; fibres: NeuralFibre[]; sparks: NeuralSpark[] }
export type NeuralGeometry = {
  width: number
  height: number
  nodes: NeuralNode[]
  fibres: NeuralFibre[]
  sheaths: { path: string; tone: string }[]
  sparks: NeuralSpark[]
  membranes: NeuralMembrane[]
}

const PALETTE = ['#72f5d1', '#40e9eb', '#54caff', '#a497ff']

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

const rounded = (n: number) => Number(n.toFixed(2))

// Catmull-Rom interpolation follows an irregular growth trace rather than a single perfect arc.
export function fibrePath(points: NeuralPoint[], closed = false): string {
  if (points.length < 2) return ''
  const at = (i: number) => closed
    ? points[(i + points.length) % points.length]
    : points[Math.max(0, Math.min(points.length - 1, i))]
  let result = `M${rounded(points[0].x)} ${rounded(points[0].y)}`
  for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    result += `C${rounded(b.x + (c.x - a.x) / 6)} ${rounded(b.y + (c.y - a.y) / 6)} ${rounded(c.x - (d.x - b.x) / 6)} ${rounded(c.y - (d.y - b.y) / 6)} ${rounded(c.x)} ${rounded(c.y)}`
  }
  return result + (closed ? 'Z' : '')
}

export function createMyceliumGeometry(width: number, height: number): NeuralGeometry {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 200 || height < 200) {
    throw new RangeError('Mycelium needs a finite, usable presentation surface')
  }
  const random = seededRandom(481516)
  const portrait = width < 540
  const scale = Math.min(width / 960, height / 690)
  const radius = (base: number) => Math.max(portrait ? 32 : 42, base * scale)
  const placements: [string, number, number, number, string][] = portrait ? [
    ['core', .51, .49, 124, PALETTE[2]],
    ['command', .25, .17, 83, PALETTE[0]],
    ['news', .76, .20, 78, PALETTE[3]],
    ['research', .14, .49, 76, PALETTE[2]],
    ['today', .86, .52, 73, PALETTE[0]],
    ['projects', .29, .81, 82, PALETTE[0]],
    ['knowledge', .74, .82, 79, PALETTE[2]],
  ] : [
    ['core', .52, .48, 120, PALETTE[2]],
    ['command', .31, .16, 82, PALETTE[0]],
    ['news', .76, .21, 77, PALETTE[3]],
    ['research', .15, .46, 73, PALETTE[2]],
    ['today', .84, .53, 70, PALETTE[0]],
    ['projects', .29, .80, 79, PALETTE[0]],
    ['knowledge', .71, .83, 76, PALETTE[2]],
  ]
  const nodes: NeuralNode[] = placements.map(([key, x, y, r, tone]) => ({
    key, x: x * width, y: y * height, radius: key === 'core' ? Math.max(48, r * scale) : radius(r), tone,
  }))
  const fibres: NeuralFibre[] = []
  const sheaths: { path: string; tone: string }[] = []
  const sparks: NeuralSpark[] = []
  const freeSpace = (p: NeuralPoint, margin = 0) => nodes.every(n => Math.hypot(p.x - n.x, p.y - n.y) > n.radius + margin)
  const inside = (p: NeuralPoint) => p.x > 5 && p.x < width - 5 && p.y > 5 && p.y < height - 5
  const add = (points: NeuralPoint[], tone: string, stroke: number, opacity: number) => {
    fibres.push({ path: fibrePath(points), tone, width: stroke, opacity })
  }
  const jitterTrace = (a: NeuralPoint, b: NeuralPoint, bend: number, amplitude: number, phase: number) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const length = Math.max(1, Math.hypot(dx, dy))
    return Array.from({ length: 9 }, (_, i) => {
      const t = i / 8
      const envelope = Math.sin(Math.PI * t)
      const offset = envelope * (bend + Math.sin(t * 9 + phase) * amplitude + (random() - .5) * amplitude)
      return { x: a.x + dx * t - dy / length * offset, y: a.y + dy * t + dx / length * offset }
    })
  }

  // Fine secondary growth between scattered junctions. Rejection keeps the labels' interiors quiet.
  const junctions: NeuralPoint[] = []
  for (let i = 0; i < 210 && junctions.length < (portrait ? 35 : 56); i++) {
    const p = { x: random() * width, y: random() * height }
    if (freeSpace(p, 10 * scale)) junctions.push(p)
  }
  junctions.forEach((a, index) => {
    const neighbours = junctions.map((b, j) => ({ b, j, distance: Math.hypot(b.x - a.x, b.y - a.y) }))
      .filter(({ j, distance }) => j > index && distance < 230 * Math.max(.5, scale))
      .sort((a, b) => a.distance - b.distance).slice(0, 3)
    neighbours.forEach(({ b }, n) => {
      const trace = jitterTrace(a, b, (random() - .5) * 44 * scale, 7 * scale, random() * 6)
      if (!trace.every(p => freeSpace(p, -2))) return
      const tone = PALETTE[(index + n) % PALETTE.length]
      add(trace, tone, .45 + random() * .45, .12 + random() * .3)
      // A split branch grows from the same junction and tapers into the surrounding tissue.
      const fork = trace[3]
      const tip = { x: fork.x + (random() - .5) * 95 * scale, y: fork.y + (random() - .5) * 95 * scale }
      if (inside(tip) && freeSpace(tip)) add(jitterTrace(fork, tip, 7 * scale, 3 * scale, index), tone, .38, .26)
    })
    sparks.push({ ...a, radius: .7 + random() * 1.5, tone: PALETTE[index % 4], flare: index % 8 === 0 })
  })

  // Bundles grow from the membranes, split around a shared junction, and reunite.
  const pairs = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 2], [1, 3], [3, 5], [5, 6], [6, 4], [4, 2]]
  pairs.forEach(([from, to], index) => {
    const a = nodes[from], b = nodes[to]
    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    const aRim = { x: a.x + Math.cos(angle) * a.radius, y: a.y + Math.sin(angle) * a.radius }
    const bRim = { x: b.x - Math.cos(angle) * b.radius, y: b.y - Math.sin(angle) * b.radius }
    const bend = (random() - .5) * 48 * scale
    const along = .36 + random() * .27
    const joint = { x: aRim.x + (bRim.x - aRim.x) * along - Math.sin(angle) * bend, y: aRim.y + (bRim.y - aRim.y) * along + Math.cos(angle) * bend }
    const spread = .26 + random() * .15
    const edge = (node: NeuralNode, direction: number) => ({ x: node.x + Math.cos(direction) * node.radius, y: node.y + Math.sin(direction) * node.radius })
    const corners = [edge(a, angle + spread), edge(b, angle + Math.PI - spread), edge(b, angle + Math.PI + spread), edge(a, angle - spread)]
    const point = (p: NeuralPoint) => `${rounded(p.x)} ${rounded(p.y)}`
    const approach = (p: NeuralPoint, t: number) => ({ x: p.x + (joint.x - p.x) * t, y: p.y + (joint.y - p.y) * t })
    sheaths.push({
      path: `M${point(corners[0])}C${point(approach(corners[0], .7))} ${point(approach(corners[1], .75))} ${point(corners[1])}L${point(corners[2])}C${point(approach(corners[2], .7))} ${point(approach(corners[3], .75))} ${point(corners[3])}Z`,
      tone: PALETTE[index % 4],
    })
    for (let strand = 0; strand < 9; strand++) {
      const splay = (strand - 4) * spread / 4
      const start = { x: a.x + Math.cos(angle + splay) * a.radius, y: a.y + Math.sin(angle + splay) * a.radius }
      const end = { x: b.x - Math.cos(angle - splay * 1.35) * b.radius, y: b.y - Math.sin(angle - splay * 1.35) * b.radius }
      const offset = (strand - 4) * 3.2 * Math.max(.5, scale)
      const trace = [
        ...jitterTrace(start, joint, offset, 2.7 * scale, strand).slice(0, -1),
        ...jitterTrace(joint, end, -offset * .75, 2.7 * scale, strand + 2),
      ]
      add(trace, PALETTE[(index + (strand % 3 === 0 ? 1 : 0)) % 4], strand === 4 ? 1.25 : .5 + random() * .55, strand === 4 ? .86 : .28 + random() * .32)
      if (strand === 2 || strand === 6) {
        const fork = trace[5]
        const tip = { x: joint.x - Math.sin(angle) * offset * 5, y: joint.y + Math.cos(angle) * offset * 5 }
        if (inside(tip) && freeSpace(tip)) add(jitterTrace(fork, tip, offset, 3 * scale, index), a.tone, .5, .32)
      }
    }
    sparks.push({ ...joint, radius: 1.5 * Math.max(.6, scale), tone: PALETTE[index % 4], flare: true })
  })

  const membranes = nodes.map((node, index): NeuralMembrane => {
    const paths: NeuralFibre[] = []
    const lights: NeuralSpark[] = []
    const ring = (layer: number) => Array.from({ length: 72 }, (_, i) => {
      const angle = i / 72 * Math.PI * 2
      const fold = Math.sin(angle * 3 + index) * .032 + Math.sin(angle * 7 - index) * .018
      const braid = layer * .009 + Math.sin(angle * (5 + layer % 3) + layer * 1.9) * (.012 + layer * .004)
      const r = node.radius * (1 + fold + braid)
      return { x: node.x + Math.cos(angle) * r, y: node.y + Math.sin(angle) * r * (1 + Math.sin(index) * .025) }
    })
    for (let layer = 0; layer < 7; layer++) {
      const points = ring(layer)
      paths.push({ path: fibrePath(points, true), tone: PALETTE[(index + layer) % 4], width: layer === 0 ? 1.65 : .55 + random() * .6, opacity: layer === 0 ? .9 : .32 + random() * .38 })
      if (layer % 2 === 0) {
        for (let i = 4 + layer; i < 69; i += 12 + layer) {
          paths.push({ path: fibrePath(points.slice(i, i + 4)), tone: '#d7fffa', width: .9 + random(), opacity: .85 })
          lights.push({ ...points[i], radius: .65 + random() * 1.3, tone: '#cbfff7', flare: layer === 0 && i % 3 === 1 })
        }
      }
    }
    // Irregular short radial fibrils grow out of each rim; no concentric CSS orbit.
    for (let i = 0; i < 13; i++) {
      const angle = random() * Math.PI * 2
      const start = { x: node.x + Math.cos(angle) * node.radius, y: node.y + Math.sin(angle) * node.radius }
      const reach = node.radius * (1.18 + random() * .43)
      const tip = { x: node.x + Math.cos(angle + .15) * reach, y: node.y + Math.sin(angle + .15) * reach }
      if (inside(tip) && freeSpace(tip, -2)) add(jitterTrace(start, tip, 8 * scale, 2 * scale, i), node.tone, .42, .36)
    }
    return { node, body: fibrePath(ring(0), true), fibres: paths, sparks: lights }
  })
  return { width, height, nodes, fibres, sheaths, sparks, membranes }
}
