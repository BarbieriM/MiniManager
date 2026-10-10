import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MessageBox } from './MessageBox'

describe('MessageBox', () => {
  it('announces errors at once and other messages politely', () => {
    render(
      <>
        <MessageBox kind="error">Email or password is incorrect.</MessageBox>
        <MessageBox kind="ok">If that email exists, we sent a link.</MessageBox>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByRole('status')).toHaveTextContent('If that email exists, we sent a link.')
  })
})
