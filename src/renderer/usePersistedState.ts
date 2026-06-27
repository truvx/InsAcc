import { useState, useEffect } from 'react'

export function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored)
    } catch {}
    return defaultValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])

  const reset = () => {
    try {
      localStorage.removeItem(key)
    } catch {}
    setState(defaultValue)
  }

  return [state, setState, reset]
}
