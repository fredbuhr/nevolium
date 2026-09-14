import { memo, useId } from 'react'

import { type NeuralGeometry, type NeuralSpark } from './lib/myceliumGeometry'

function Spark({ spark, glowId }: { spark: NeuralSpark; glowId: string }) {
  return (
    <g>
      <circle cx={spark.x} cy={spark.y} r={spark.radius * 5} fill={`url(#${glowId})`} opacity={spark.flare ? .9 : .4} />
      <circle cx={spark.x} cy={spark.y} r={spark.radius} fill={spark.tone} />
      {spark.flare ? <path d={`M${spark.x - spark.radius * 4} ${spark.y}h${spark.radius * 8}M${spark.x} ${spark.y - spark.radius * 4}v${spark.radius * 8}`} stroke={spark.tone} strokeWidth=".5" opacity=".65" /> : null}
    </g>
  )
}

export const MyceliumField = memo(function MyceliumField({ geometry, ambient = false }: { geometry: NeuralGeometry; ambient?: boolean }) {
  const id = useId().replace(/:/g, '')
  const { width, height, fibres, sheaths, membranes, sparks } = geometry
  return (
    <svg
      key={`${width}:${height}`}
      className={ambient ? 'mycelium-ambient-field neural-field' : 'mycelium-network neural-field'}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-material="branched-bioluminescent-fibres"
    >
      <defs>
        <filter id={`${id}-luminous-alpha`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 1 0 0" />
        </filter>
        <filter id={`${id}-bloom`} x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="2.1" />
        </filter>
        <radialGradient id={`${id}-spark`}>
          <stop stopColor="#cffff9" stopOpacity=".9" /><stop offset=".23" stopColor="#66edff" stopOpacity=".3" /><stop offset="1" stopColor="#0aaeff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="48%" cy="46%" r="56%">
          <stop stopColor="#020e18" stopOpacity=".97" />
          <stop offset=".65" stopColor="#041927" stopOpacity=".9" />
          <stop offset=".86" stopColor="#032838" stopOpacity=".5" />
          <stop offset="1" stopColor="#06364a" stopOpacity=".15" />
        </radialGradient>
        <g id={`${id}-fibres`} fill="none" strokeLinecap="round">
          {fibres.map((fibre, index) => <path key={index} d={fibre.path} stroke={fibre.tone} strokeWidth={fibre.width} opacity={fibre.opacity} />)}
        </g>
        <g id={`${id}-membranes`} fill="none" strokeLinecap="round">
          {membranes.flatMap((membrane, index) => membrane.fibres.map((fibre, layer) => (
            <path key={`${index}-${layer}`} d={fibre.path} stroke={fibre.tone} strokeWidth={fibre.width} opacity={fibre.opacity} />
          )))}
        </g>
      </defs>
      <g className="neural-tissue">
        {sheaths.map((sheath, index) => <path key={index} d={sheath.path} fill={sheath.tone} opacity=".08" />)}
        <use href={`#${id}-fibres`} filter={`url(#${id}-bloom)`} opacity=".7" />
        <use href={`#${id}-fibres`} />
      </g>
      <g className="neural-membranes">
        {membranes.map(membrane => <path key={membrane.node.key} d={membrane.body} fill={`url(#${id}-body)`} />)}
        <use href={`#${id}-membranes`} filter={`url(#${id}-bloom)`} opacity=".22" />
        <use href={`#${id}-membranes`} opacity=".25" />
        {membranes.map(({ node }, index) => (
          <image
            key={node.key}
            data-node-key={node.key}
            className="neural-membrane-texture"
            href="/mycelium-membrane.webp"
            x={node.x - node.radius * 1.33}
            y={node.y - node.radius * 1.33}
            width={node.radius * 2.66}
            height={node.radius * 2.66}
            transform={`rotate(${index * 67} ${node.x} ${node.y})`}
            filter={`url(#${id}-luminous-alpha)`}
            style={{ mixBlendMode: 'screen' }}
          />
        ))}
      </g>
      <g className="neural-junctions">
        {[...sparks, ...membranes.flatMap(m => m.sparks)].map((spark, index) => <Spark key={index} spark={spark} glowId={`${id}-spark`} />)}
      </g>
    </svg>
  )
})

export function MyceliumAtmosphere() {
  return <div className="quiet-atmosphere" aria-hidden="true"><i /><i /><i /></div>
}
