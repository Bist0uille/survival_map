import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

function setup(over = {}) {
  const props = {
    active: new Set<string>(['water']),
    onToggle: vi.fn(),
    onToggleGroup: vi.fn(),
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
  it('expose le toggle « Sentiers & chemins » et le déclenche', async () => {
    const props = setup()
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

  it('affiche le libellé de chaque catégorie, active ou non', () => {
    setup() // seul « water » est actif
    // Inactif : libellé quand même visible (lisibilité de la barre).
    expect(screen.getByText('Sanitaires')).toBeInTheDocument()
    // Actif : visible aussi.
    expect(screen.getByText('Eau')).toBeInTheDocument()
  })

  it('cliquer une catégorie bascule le filtre', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sanitaires' }))
    expect(props.onToggle).toHaveBeenCalledWith('toilets')
  })

  it('groupe les catégories par besoin avec un label de groupe', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Tout « Dormir »' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout « Boire »' })).toBeInTheDocument()
  })

  it('cliquer un label de besoin bascule tout le groupe', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Tout « Dormir »' }))
    expect(props.onToggleGroup).toHaveBeenCalledWith(['refuge', 'rest_area', 'hostel'])
  })

  it('marque le groupe pressé quand toutes ses catégories sont actives', () => {
    setup({ active: new Set(['water']) })
    // « Boire » ne contient que water → groupe entièrement actif.
    expect(screen.getByRole('button', { name: 'Tout « Boire »' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Tout « Dormir »' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
