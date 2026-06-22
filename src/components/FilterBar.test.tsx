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
    ...over,
  }
  render(<FilterBar {...props} />)
  return props
}

describe('<FilterBar>', () => {
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

  it('catégorie inactive = icône seule, sans libellé visible', () => {
    setup() // seul « water » est actif
    // « Sanitaires » est inactif → pas de texte visible (juste l'aria-label).
    expect(screen.queryByText('Sanitaires')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sanitaires' }),
    ).toBeInTheDocument()
  })

  it('catégorie active = libellé visible', () => {
    setup({ active: new Set(['water']) })
    // « Eau » est actif → son libellé est affiché.
    expect(screen.getByText('Eau')).toBeInTheDocument()
  })

  it('cliquer une catégorie bascule le filtre', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sanitaires' }))
    expect(props.onToggle).toHaveBeenCalledWith('toilets')
  })

  it('toggle de couche actif affiche son libellé', () => {
    setup({ showTrails: true })
    expect(screen.getByText('Sentiers & chemins')).toBeInTheDocument()
  })
})
