import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('clears the text with the clear button', async () => {
    render(<WithState initialValue="">{(value, setValue) => <SearchInput value={value} onValueChange={setValue} />}</WithState>)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search miniatures' }), 'goblin')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
})
