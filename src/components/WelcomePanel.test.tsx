import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomePanel } from './WelcomePanel'
import { WELCOME_SEEN } from '../data/prefs'

afterEach(() => localStorage.clear())

describe('<WelcomePanel>', () => {
  it('présente la promesse et les trois gestes', () => {
    render(<WelcomePanel onClose={vi.fn()} />)
    expect(screen.getByText(/même sans réseau/)).toBeInTheDocument()
    expect(screen.getByText(/Filtre par besoin/)).toBeInTheDocument()
    expect(screen.getByText(/Télécharge ta zone/)).toBeInTheDocument()
    expect(screen.getByText(/Crée un itinéraire/)).toBeInTheDocument()
  })

  it('« C’est parti » persiste le flag et ferme', async () => {
    const onClose = vi.fn()
    render(<WelcomePanel onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(localStorage.getItem(WELCOME_SEEN)).toBe('1')
  })

  it('la croix persiste aussi le flag (dismiss = vu)', async () => {
    const onClose = vi.fn()
    render(<WelcomePanel onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(localStorage.getItem(WELCOME_SEEN)).toBe('1')
  })
})
