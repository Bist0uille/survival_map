import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NearestMenu } from './NearestMenu'

describe('<NearestMenu>', () => {
  it('ouvre le menu des besoins vitaux et remonte le choix', async () => {
    const onPick = vi.fn()
    render(<NearestMenu busy={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Le plus proche de moi' }))
    expect(screen.getByText('Le plus proche')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Eau/ }))
    expect(onPick).toHaveBeenCalledWith('water')
    // Le menu se referme après le choix.
    expect(screen.queryByText('Le plus proche')).not.toBeInTheDocument()
  })

  it('est désactivé pendant la recherche', () => {
    render(<NearestMenu busy={true} onPick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Le plus proche de moi' })).toBeDisabled()
  })
})
