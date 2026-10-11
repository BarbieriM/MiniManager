import { useSyncExternalStore } from 'react'
import { serverWakeTracker } from './serverWakeTracker'

// useIsServerWaking is true while an API request has been pending for over 3 seconds.
export function useIsServerWaking(): boolean {
  return useSyncExternalStore(serverWakeTracker.subscribe, serverWakeTracker.isWaking)
}
