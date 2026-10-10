import type { ReactElement } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../Button/Button'
import { successToastDurationMs, ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

describe('ToastProvider', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function Trigger(): ReactElement {
    const toast = useToast()
    return (
      <>
        <Button onClick={() => toast.show('ok', 'Changes saved.')}>Save</Button>
        <Button onClick={() => toast.show('error', 'Could not save. Try again.')}>Fail</Button>
      </>
    )
  }

  it('removes a success toast on its own, after a few seconds', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved.')
    act(() => vi.advanceTimersByTime(successToastDurationMs))
    expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument()
  })

  it('keeps an error toast until it is dismissed', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save. Try again.')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
