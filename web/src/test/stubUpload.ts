import { vi } from 'vitest'

// FakeUpload is one upload the code under test sent: where, what form, and controls to finish it.
export type FakeUpload = {
  url: string
  form: FormData
  progress: (percent: number) => void
  succeed: () => void
  fail: (status?: number) => void
}

// stubUpload replaces XMLHttpRequest, which only the photo upload uses (for its progress). Each send is recorded
// and waits until the test calls succeed or fail, so a test can look at the progress in between.
export function stubUpload(): FakeUpload[] {
  const uploads: FakeUpload[] = []
  class FakeXMLHttpRequest {
    status = 0
    upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private url = ''

    open(_method: string, url: string): void {
      this.url = url
    }

    send(form: FormData): void {
      uploads.push({
        url: this.url,
        form,
        progress: (percent) => this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 }),
        succeed: () => {
          this.status = 200
          this.onload?.()
        },
        fail: (status) => {
          if (status === undefined) {
            this.onerror?.()
            return
          }
          this.status = status
          this.onload?.()
        },
      })
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  return uploads
}
