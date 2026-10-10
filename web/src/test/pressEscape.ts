import { fireEvent } from '@testing-library/react'

// pressEscape fires the event a browser sends to an open modal <dialog> when Esc is pressed.
// jsdom does not turn the Esc key into this event itself.
export function pressEscape(dialogElement: HTMLElement): void {
  fireEvent(dialogElement, new Event('cancel', { cancelable: true }))
}
