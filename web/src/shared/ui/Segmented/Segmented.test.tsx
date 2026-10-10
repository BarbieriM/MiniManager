import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import { Segmented } from './Segmented'

describe('Segmented', () => {
  it('moves the choice with the arrow keys', async () => {
    const options = [
      { value: 'not_painted', label: 'Not painted' },
      { value: 'pre_painted', label: 'Pre-painted' },
      { value: 'hand_painted', label: 'Hand-painted' },
    ]
    render(<WithState initialValue="not_painted">{(value, setValue) => <Segmented label="Paint status" options={options} value={value} onChange={setValue} />}</WithState>)
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Not painted' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Pre-painted' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Pre-painted' })).toHaveFocus()
  })
})
