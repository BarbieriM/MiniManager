import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Field } from '../Field/Field'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('shows and hides the password', async () => {
    render(
      <Field label="Password">
        <PasswordInput defaultValue="correct horse" />
      </Field>,
    )
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
