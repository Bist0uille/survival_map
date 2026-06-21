import { Play, Pause, Square, Save, Trash2 } from 'lucide-react'
import type { TrackRecorder } from '../hooks/useTrackRecorder'

interface TrackPanelProps {
  rec: TrackRecorder
  onSave: () => void
  onDiscard: () => void
}

/** Panneau de contrôle du suivi de trace en direct (start/pause/stop/save). */
export function TrackPanel({ rec, onSave, onDiscard }: TrackPanelProps) {
  const { status, stats, error } = rec
  const recording = status === 'recording'
  const paused = status === 'paused'
  const hasTrack = stats.points >= 2
  // « stopped » = on a arrêté mais une trace est en attente de décision.
  const stopped = status === 'idle' && hasTrack

  const h = Math.floor(stats.durationMin / 60)
  const min = stats.durationMin % 60
  const duration = h > 0 ? `${h} h ${String(min).padStart(2, '0')}` : `${min} min`

  return (
    <div className="absolute bottom-6 left-1/2 z-30 w-[min(94vw,26rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-3 shadow-xl">
      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="Distance" value={`${stats.distanceKm} km`} />
        <Stat label="D+" value={`${stats.ascent} m`} />
        <Stat label="Durée" value={duration} />
      </div>

      {error && <p className="mb-2 text-center text-xs text-red-600">{error}</p>}
      {!error && (recording || paused) && (
        <p className="mb-2 text-center text-xs text-slate-400">
          {recording ? 'Enregistrement…' : 'En pause'} · {stats.points} points
        </p>
      )}

      <div className="flex items-center justify-center gap-2">
        {status === 'idle' && !hasTrack && (
          <Btn onClick={rec.start} kind="primary">
            <Play size={18} /> Démarrer
          </Btn>
        )}
        {recording && (
          <>
            <Btn onClick={rec.pause}>
              <Pause size={18} /> Pause
            </Btn>
            <Btn onClick={rec.stop} kind="danger">
              <Square size={18} /> Stop
            </Btn>
          </>
        )}
        {paused && (
          <>
            <Btn onClick={rec.resume} kind="primary">
              <Play size={18} /> Reprendre
            </Btn>
            <Btn onClick={rec.stop} kind="danger">
              <Square size={18} /> Stop
            </Btn>
          </>
        )}
        {stopped && (
          <>
            <Btn onClick={onSave} kind="primary" disabled={!hasTrack}>
              <Save size={18} /> Enregistrer
            </Btn>
            <Btn onClick={onDiscard} kind="danger">
              <Trash2 size={18} /> Jeter
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 py-1">
      <div className="text-sm font-semibold text-slate-800">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  kind = 'neutral',
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  kind?: 'primary' | 'danger' | 'neutral'
  disabled?: boolean
}) {
  const cls =
    kind === 'primary'
      ? 'bg-green-700 text-white hover:bg-green-800'
      : kind === 'danger'
        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow transition disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  )
}
