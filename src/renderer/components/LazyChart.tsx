import React, { useState, useRef, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  width?: number | string
  height?: number
  placeholder?: React.ReactNode
}

export default function LazyChart({ children, width = '100%', height = 300, placeholder }: Props) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={visible ? { width, minHeight: height } : { width, height, minHeight: height }}>
      {visible ? children : (placeholder || <div style={{ width, height }} />)}
    </div>
  )
}
