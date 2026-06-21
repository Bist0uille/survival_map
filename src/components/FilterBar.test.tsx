import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

function setup(over = {}) {
  const props = {
    active: new Set<string>(['water']),
    onToggle: vi.fn(),
    showTrails: false,
    onToggleTrails: vi.fn(),
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

  it('expose le toggle « Sentiers & chemins » et le déclenche', async () => {
    const props = setup()
    const btn = screen.getByText(/Sentiers/)
    await userEvent.click(btn)
    expect(props.onToggleTrails).toHaveBeenCalledOnce()
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

  it('catégories en icônes seules : bascule le filtre via l’aria-label', async () => {
    const props = setup()
    // L'icône « Eau » n'a pas de texte visible, juste un aria-label.
    const eau = screen.getByRole('button', { name: 'Eau' })
    await userEvent.click(eau)
    expect(props.onToggle).toHaveBeenCalledWith('water')
  })

  it('affiche le libellé en flash au clic d’une catégorie', async () => {
    setup()
    // Avant clic : aucun texte visible (icône seule, juste l'aria-label).
    expect(screen.queryByText('Toilettes')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Toilettes' }))
    // Après clic : le libellé apparaît en flash.
    expect(screen.getByText('Toilettes')).toBeInTheDocument()
  })
})
