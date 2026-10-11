import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import { ButtonLink } from './ButtonLink'

describe('ButtonLink', () => {
  it('is a link that goes where it says, drawn as a button', () => {
    renderAtPath('/', <ButtonLink to="/minis/new" variant="primary" icon="plus">Add miniature</ButtonLink>)

    const link = screen.getByRole('link', { name: 'Add miniature' })
    expect(link).toHaveAttribute('href', '/minis/new')
    expect(link.className).toContain('bg-accent')
  })
})
