// Mini graphe du profil altimétrique (altitude en fonction de la distance).

interface ElevationProfileProps {
  profile: Array<[number, number]> // [distanceKm, altitude m]
}

const W = 300
const H = 64
const PAD = 4

export function ElevationProfile({ profile }: ElevationProfileProps) {
  if (!profile || profile.length < 2) return null

  const maxD = profile[profile.length - 1][0] || 1
  const eles = profile.map((p) => p[1])
  const minE = Math.min(...eles)
  const maxE = Math.max(...eles)
  const rangeE = Math.max(1, maxE - minE)

  const x = (d: number) => PAD + (d / maxD) * (W - 2 * PAD)
  const y = (e: number) => PAD + (1 - (e - minE) / rangeE) * (H - 2 * PAD)

  const line = profile.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
  const area = `M ${x(0).toFixed(1)},${H - PAD} L ${line.join(' L ')} L ${x(
    maxD,
  ).toFixed(1)},${H - PAD} Z`
  const poly = line.join(' ')

  return (
    <div className="mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Profil altimétrique"
      >
        <path d={area} fill="#16a34a22" />
        <polyline
          points={poly}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{Math.round(minE)} m</span>
        <span>↑ {Math.round(maxE)} m</span>
      </div>
    </div>
  )
}
