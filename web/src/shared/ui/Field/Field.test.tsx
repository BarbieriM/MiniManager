import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { TextInput } from '../TextInput/TextInput'

describe('Field', () => {
  it('labels its control and describes it with the error', () => {
    render(
      <Field label="Name" errorMessage="Name is required.">
        <TextInput />
      </Field>,
    )
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Name is required.')
  })
})
