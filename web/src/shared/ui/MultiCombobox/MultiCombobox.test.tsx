import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import { MultiCombobox } from './MultiCombobox'

const types = [
  { value: 'dragon', label: 'Dragon', count: 21 },
  { value: 'giant', label: 'Giant', count: 14 },
  { value: 'humanoid', label: 'Humanoid', count: 96 },
]

describe('MultiCombobox', () => {
  it('filters as you type, toggles with Enter and removes the last value with Backspace', async () => {
    render(<WithState<string[]> initialValue={[]}>{(value, setValue) => <MultiCombobox label="Creature type" options={types} value={value} onChange={setValue} />}</WithState>)
    const input = screen.getByRole('combobox', { name: 'Creature type' })
    await userEvent.type(input, 'hum')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Humanoid' })).toBeInTheDocument()
    expect(input).toHaveValue('')
    await userEvent.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'Remove Humanoid' })).not.toBeInTheDocument()
  })
})
