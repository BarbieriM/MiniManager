import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WithState } from '../../../test/WithState'
import { NumberStepper } from './NumberStepper'

describe('NumberStepper', () => {
  it('card 5 rule 1: steps stay within 1 to 999', async () => {
    render(<WithState initialValue="1">{(value, setValue) => <NumberStepper value={value} onChange={setValue} />}</WithState>)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('2')
  })

  it('card 5 rule 1: stops at 999', () => {
    render(<NumberStepper value="999" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
  })

  it('keeps typed text as is, so the form can show the error', async () => {
    const onChange = vi.fn()
    render(<NumberStepper value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), '2')
    expect(onChange).toHaveBeenLastCalledWith('2')
  })
})
