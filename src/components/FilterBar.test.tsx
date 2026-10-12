import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  // jsdom does not implement the native dialog top layer; Chrome smoke tests do.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute('open', '') } },
    close: { configurable: true, value() { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) } },
  })
})
afterAll(() => {
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

function Harness({ initial = ['water', 'bakery'] }: { initial?: string[] }) {
  const [active, setActive] = useState(new Set(initial))
  const [trails, setTrails] = useState(false)
  const [protectedAreas, setProtected] = useState(false)
  const toggle = (ids: string[]) => setActive((previous) => {
    const next = new Set(previous)
    const allOn = ids.every((id) => next.has(id))
    for (const id of ids) { if (allOn) next.delete(id); else next.add(id) }
    return next
  })
  return <><FilterBar active={active} onToggle={(id) => toggle([id])} onToggleGroup={toggle}
    showTrails={trails} onToggleTrails={() => setTrails((v) => !v)} showProtected={protectedAreas} onToggleProtected={() => setProtected((v) => !v)} />
    <output data-testid="selection">{[...active].sort().join(',')}</output></>
}

describe('compact map filters', () => {
  it('shows four shortcuts and accurately represents preselected guide filters', () => {
    render(<Harness />)
    const nav = screen.getByRole('navigation', { name: 'Filtres de la carte' })
    expect(within(nav).getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Eau' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Manger' })).toHaveAttribute('aria-pressed', 'mixed')
    expect(screen.getByRole('button', { name: 'Dormir' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles a whole need and allows individual categories to be refined', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[]} />)
    await user.click(screen.getByRole('button', { name: 'Manger' }))
    expect(screen.getByTestId('selection')).toHaveTextContent('bakery,meal,picnic')
    await user.click(screen.getByRole('button', { name: 'Plus de catégories' }))
    const dialog = screen.getByRole('dialog', { name: 'Que cherchez-vous ?' })
    await user.click(within(dialog).getByRole('button', { name: 'Affiner Manger' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Aide alimentaire' }))
    expect(screen.getByTestId('selection')).toHaveTextContent('bakery,picnic')
    expect(screen.getByRole('button', { name: 'Manger' })).toHaveAttribute('aria-pressed', 'mixed')
    await user.click(within(dialog).getByRole('button', { name: 'Voir la carte' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps less common categories and map layers accessible, and clears everything', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Plus de catégories' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Affiner Lire' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Boîte à livres' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sentiers & chemins' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Bivouac réglementé' }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('5 filtres actifs')
    await user.click(within(dialog).getByRole('button', { name: 'Tout effacer' }))
    expect(screen.getByTestId('selection')).toBeEmptyDOMElement()
    for (const input of within(dialog).getAllByRole('checkbox')) expect(input).not.toBeChecked()
    expect(within(dialog).getByRole('status')).toHaveTextContent('Aucun filtre actif')
  })

  it('closes on native cancellation without losing the selected filters', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Plus de catégories' }))
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent(screen.getByRole('dialog'), new Event('cancel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('selection')).toHaveTextContent('bakery,water')
    expect(document.body.style.overflow).toBe('')
  })
})
