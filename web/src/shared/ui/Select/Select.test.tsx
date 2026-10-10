import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import { Field } from '../Field/Field'
import { Select } from './Select'

const types = [
  { value: 'dragon', label: 'Dragon', count: 21 },
  { value: 'giant', label: 'Giant', count: 14 },
  { value: 'humanoid', label: 'Humanoid', count: 96 },
]

describe('Select', () => {
  it('opens with the keyboard, moves with arrows and picks with Enter', async () => {
    render(
      <WithState<string | null> initialValue="dragon">
        {(value, setValue) => (
          <Field label="Creature type">
            <Select options={types} value={value} onChange={setValue} />
          </Field>
        )}
      </WithState>,
    )
    const select = screen.getByRole('combobox', { name: /Creature type/ })
    select.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(select).toHaveTextContent('Giant')
  })

  it('closes on Escape without changing the value', async () => {
    render(<Select label="Creature type" options={types} value="dragon" onChange={() => {}} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Dragon')
  })
})
