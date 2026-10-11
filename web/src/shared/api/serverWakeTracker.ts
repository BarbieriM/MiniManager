// A request still pending after this long means Render is waking the server from sleep.
const slowRequestMilliseconds = 3000

const slowRequests = new Set<symbol>()
const listeners = new Set<() => void>()

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

// serverWakeTracker knows whether any API request has been pending for over 3 seconds, which on Render's free
// plan means the server is waking up. The waking-server banner reads it through useIsServerWaking.
export const serverWakeTracker = {
  async track<Result>(request: Promise<Result>): Promise<Result> {
    const requestId = Symbol('request')
    const timer = setTimeout(() => {
      slowRequests.add(requestId)
      notifyListeners()
    }, slowRequestMilliseconds)
    try {
      return await request
    } finally {
      clearTimeout(timer)
      if (slowRequests.delete(requestId)) notifyListeners()
    }
  },
  isWaking(): boolean {
    return slowRequests.size > 0
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
