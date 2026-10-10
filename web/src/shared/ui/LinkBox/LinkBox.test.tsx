import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LinkBox } from './LinkBox'

describe('LinkBox', () => {
  it('copies the whole link', async () => {
    const user = userEvent.setup()
    const url = 'https://mini-manager.example/invite/7Hq2xk9TnPz4Vw8c'
    render(<LinkBox url={url} />)
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    await expect(navigator.clipboard.readText()).resolves.toBe(url)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
