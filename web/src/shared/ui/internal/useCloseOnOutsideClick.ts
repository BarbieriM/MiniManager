import { useEffect, useEffectEvent, type RefObject } from 'react'

// useCloseOnOutsideClick calls onOutsideClick when the user clicks or taps outside containerRef while isOpen.
// useEffectEvent lets the listener call the latest onOutsideClick without re-subscribing on every render.
export function useCloseOnOutsideClick(containerRef: RefObject<HTMLElement | null>, isOpen: boolean, onOutsideClick: () => void): void {
  const handleOutsideClick = useEffectEvent(onOutsideClick)
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) handleOutsideClick()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [containerRef, isOpen])
}
