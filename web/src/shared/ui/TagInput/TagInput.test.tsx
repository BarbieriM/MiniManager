import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import { TagInput } from './TagInput'

describe('TagInput', () => {
  it('card 5 rule 3: normalizes a typed tag', async () => {
    render(<WithState<string[]> initialValue={[]}>{(value, setValue) => <TagInput value={value} onChange={setValue} />}</WithState>)
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a tag' }), 'Faction: Drow{Enter}')
    expect(screen.getByRole('button', { name: 'Remove faction:drow' })).toBeInTheDocument()
    expect(screen.getByText('1 of 20 tags. namespace:value is optional.')).toBeInTheDocument()
  })

  it('card 5 rule 3: refuses a tag that breaks the rules and says why', async () => {
    render(<WithState<string[]> initialValue={[]}>{(value, setValue) => <TagInput value={value} onChange={setValue} />}</WithState>)
    await userEvent.type(screen.getByRole('combobox'), 'gob!in{Enter}')
    expect(screen.getByText(/Use letters, numbers, - or _/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('suggests tags in use', async () => {
    render(<WithState<string[]> initialValue={[]}>{(value, setValue) => <TagInput value={value} onChange={setValue} tagsInUse={['weapon:bow', 'weapon:spear', 'goblinoid']} />}</WithState>)
    await userEvent.type(screen.getByRole('combobox'), 'weap')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(screen.getByRole('button', { name: 'Remove weapon:spear' })).toBeInTheDocument()
  })
})
