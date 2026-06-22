import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrackPanel } from './TrackPanel'
import type { TrackRecorder } from '../hooks/useTrackRecorder'

function makeRec(over: Partial<TrackRecorder> = {}): TrackRecorder {
  return {
    status: 'idle',
    stats: { distanceKm: 0, ascent: 0, durationMin: 0, points: 0 },
    geometry: null,
    points: [],
    error: null,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    ...over,
  }
}

describe('<TrackPanel>', () => {
  it('affiche le bouton Démarrer et la croix de fermeture à l’état initial', () => {
    render(
      <TrackPanel rec={makeRec()} onSave={vi.fn()} onDiscard={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByText('Démarrer')).toBeInTheDocument()
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument()
  })

  it('appelle start() au clic sur Démarrer', async () => {
    const rec = makeRec()
    render(<TrackPanel rec={rec} onSave={vi.fn()} onDiscard={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Démarrer'))
    expect(rec.start).toHaveBeenCalledOnce()
  })

  it('appelle onClose() au clic sur la croix de fermeture', async () => {
    const onClose = vi.fn()
    render(<TrackPanel rec={makeRec()} onSave={vi.fn()} onDiscard={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('montre les stats live en cours d’enregistrement', () => {
    const rec = makeRec({
      status: 'recording',
      stats: { distanceKm: 3.4, ascent: 120, durationMin: 65, points: 50 },
    })
    render(<TrackPanel rec={rec} onSave={vi.fn()} onDiscard={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('3.4 km')).toBeInTheDocument()
    expect(screen.getByText('120 m')).toBeInTheDocument()
    expect(screen.getByText('1 h 05')).toBeInTheDocument()
    expect(screen.getByText('Pause')).toBeInTheDocument()
  })

  it('propose Enregistrer/Jeter après arrêt avec une trace', async () => {
    const onSave = vi.fn()
    const rec = makeRec({
      status: 'idle',
      stats: { distanceKm: 5, ascent: 200, durationMin: 90, points: 100 },
    })
    render(<TrackPanel rec={rec} onSave={onSave} onDiscard={vi.fn()} onClose={vi.fn()} />)
    const save = screen.getByText('Enregistrer')
    expect(save).toBeInTheDocument()
    await userEvent.click(save)
    expect(onSave).toHaveBeenCalledOnce()
  })
})
