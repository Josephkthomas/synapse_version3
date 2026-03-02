interface SynapseLogoProps {
  size?: number
  className?: string
}

export function SynapseLogo({ size = 30, className }: SynapseLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 280"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="sl-flameMain" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#8B2500"/>
          <stop offset="30%" stopColor="#c23400"/>
          <stop offset="60%" stopColor="#d63a00"/>
          <stop offset="85%" stopColor="#e85420"/>
          <stop offset="100%" stopColor="#f06830"/>
        </linearGradient>
        <linearGradient id="sl-facetLeft" x1="0" y1="0.3" x2="1" y2="0.7">
          <stop offset="0%" stopColor="#a62e00"/>
          <stop offset="100%" stopColor="#c23400"/>
        </linearGradient>
        <linearGradient id="sl-facetRight" x1="1" y1="0.3" x2="0" y2="0.7">
          <stop offset="0%" stopColor="#e04a10"/>
          <stop offset="100%" stopColor="#d63a00"/>
        </linearGradient>
        <linearGradient id="sl-facetCenter" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#c23400"/>
          <stop offset="40%" stopColor="#d63a00"/>
          <stop offset="100%" stopColor="#ef6025"/>
        </linearGradient>
        <linearGradient id="sl-innerGlow" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#d63a00"/>
          <stop offset="100%" stopColor="#ff8044"/>
        </linearGradient>
      </defs>

      <g transform="translate(100, 140)">
        <polygon points="0,-130 -52,20 -30,60 0,-40" fill="url(#sl-facetLeft)"/>
        <polygon points="0,-130 52,20 30,60 0,-40" fill="url(#sl-facetRight)"/>
        <polygon points="-52,20 -30,60 -48,100 -60,60" fill="#9a2800"/>
        <polygon points="52,20 30,60 48,100 60,60" fill="#b83200"/>
        <polygon points="-30,60 30,60 48,100 0,130 -48,100" fill="#8B2500"/>
        <polygon points="0,-130 -30,60 0,20 30,60" fill="url(#sl-facetCenter)"/>
        <polygon points="0,-80 -16,30 0,10 16,30" fill="url(#sl-innerGlow)" opacity="0.5"/>
        <polygon points="0,-130 -8,-90 0,-95 8,-90" fill="#ff8044" opacity="0.6"/>
      </g>
    </svg>
  )
}
