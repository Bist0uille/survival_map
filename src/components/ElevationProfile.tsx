// Mini graphe du profil altimétrique (altitude en fonction de la distance),
// avec une ligne pointillée au niveau de l'altitude maximale.

interface ElevationProfileProps {
  profile: Array<[number, number]> // [distanceKm, altitude m]
}

const W = 300
const H = 64
const PADX = 4
const TOP = 9 // marge haute pour que le pic ne colle pas au bord
const BOT = 4

export function ElevationProfile({ profile }: ElevationProfileProps) {
  if (!profile || profile.length < 2) return null

  const maxD = profile[profile.length - 1][0] || 1
  const eles = profile.map((p) => p[1])
  const minE = Math.min(...eles)
  const maxE = Math.max(...eles)
  const rangeE = Math.max(1, maxE - minE)
  const peakIdx = eles.indexOf(maxE)

  const x = (d: number) => PADX + (d / maxD) * (W - 2 * PADX)
  const y = (e: number) => TOP + (1 - (e - minE) / rangeE) * (H - TOP - BOT)

  const line = profile.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
  const area = `M ${x(0).toFixed(1)},${H - BOT} L ${line.join(' L ')} L ${x(
    maxD,
  ).toFixed(1)},${H - BOT} Z`
  const peakX = x(profile[peakIdx][0])
  const peakY = y(maxE)

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
          points={line.join(' ')}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* niveau de l'altitude max */}
        <line
          x1={PADX}
          y1={peakY}
          x2={W - PADX}
          y2={peakY}
          stroke="#16a34a"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={peakX} cy={peakY} r="2.2" fill="#16a34a" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{Math.round(minE)} m</span>
        <span>↑ {Math.round(maxE)} m</span>
      </div>
    </div>
  )
}
