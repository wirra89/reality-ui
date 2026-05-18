interface ClaritySparklineProps {
  scores: number[] // oldest to newest
}

export function ClaritySparkline({ scores }: ClaritySparklineProps) {
  if (scores.length < 2) return null

  const W = 100
  const H = 30
  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * W
      const y = H - (s / 100) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#b090ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
