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

  it('expose le toggle « Sentiers & chemins » (icône) et le déclenche', async () => {
    const props = setup()
    // Inactif = icône seule : ciblé par son nom accessible (aria-label).
    const btn = screen.getByRole('button', { name: /Sentiers/ })
    await userEvent.click(btn)
    expect(props.onToggleTrails).toHaveBeenCalledOnce()
  })

  it('expose le toggle « Bivouac réglementé » et le déclenche', async () => {
    const props = setup()
    const btn = screen.getByRole('button', { name: /Bivouac/ })
    await userEvent.click(btn)
    expect(props.onToggleProtected).toHaveBeenCalledOnce()
  })

  it('affiche un message d’erreur quand error est défini', () => {
    setup({ error: 'boom' })
    expect(screen.getByText(/Données indisponibles/)).toBeInTheDocument()
  })

  it('catégorie inactive = icône seule, sans libellé visible', () => {
    setup() // seul « water » est actif
    // « Toilettes » est inactif → pas de texte visible (juste l'aria-label).
    expect(screen.queryByText('Toilettes')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Toilettes' }),
    ).toBeInTheDocument()
  })

  it('catégorie active = libellé visible', () => {
    setup({ active: new Set(['water']) })
    // « Eau » est actif → son libellé est affiché.
    expect(screen.getByText('Eau')).toBeInTheDocument()
  })

  it('cliquer une catégorie bascule le filtre', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Toilettes' }))
    expect(props.onToggle).toHaveBeenCalledWith('toilets')
  })

  it('toggle de couche actif affiche son libellé', () => {
    setup({ showTrails: true })
    expect(screen.getByText('Sentiers & chemins')).toBeInTheDocument()
  })
})
