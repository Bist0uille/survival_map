import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

function setup(over = {}) {
  const props = {
    active: new Set<string>(['water']),
    onToggle: vi.fn(),
    showRoutes: false,
    onToggleRoutes: vi.fn(),
    showTreks: false,
    onToggleTreks: vi.fn(),
    showPaths: false,
    onTogglePaths: vi.fn(),
    showProtected: false,
    onToggleProtected: vi.fn(),
    resultCount: 42,
    loading: false,
    error: null,
    ...over,
  }
  render(<FilterBar {...props} />)
  return props
}

describe('<FilterBar>', () => {
  it('affiche le compteur de points', () => {
    setup()
    expect(screen.getByText('42 point(s)')).toBeInTheDocument()
  })

  it('expose le toggle « Bivouac réglementé » et le déclenche', async () => {
    const props = setup()
    const btn = screen.getByText('Bivouac réglementé')
    await userEvent.click(btn)
    expect(props.onToggleProtected).toHaveBeenCalledOnce()
  })

  it('affiche un message d’erreur quand error est défini', () => {
    setup({ error: 'boom' })
    expect(screen.getByText(/Données indisponibles/)).toBeInTheDocument()
  })
})
