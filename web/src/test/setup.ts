import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only cleans up automatically when Vitest globals are on; they are off here.
afterEach(cleanup)

// jsdom has no showModal()/close() on <dialog>. These stand-ins only toggle the open attribute;
// focus trapping and the inert page are browser behaviour and are not tested here.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
