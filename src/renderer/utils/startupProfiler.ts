const marks: Record<string, number> = {}

export function mark(name: string) {
  if (typeof performance === 'undefined') return
  marks[name] = performance.now()
  performance.mark(`startup:${name}`)
}

export function measure(name: string, fromMark: string, toMark?: string) {
  if (typeof performance === 'undefined') return
  const start = marks[fromMark]
  if (!start) return
  const end = toMark ? marks[toMark] : performance.now()
  const duration = end - start
  try {
    performance.measure(`startup:${name}`, {
      start: `startup:${fromMark}`,
      end: toMark ? `startup:${toMark}` : undefined,
    })
  } catch {}
  return Math.round(duration)
}

export function logStartupSummary() {
  const phases = [
    'main-process',
    'preload',
    'renderer-init',
    'app-mount',
    'login-render',
    'db-init',
    'migrations',
    'app-interactive',
  ]
  const results: string[] = ['[Profiler] Startup Timeline:']
  let lastMark = 'main-process'
  for (const phase of phases) {
    const dur = measure(phase, lastMark, phase)
    if (dur !== undefined) {
      results.push(`  ${phase}: ${dur}ms`)
      lastMark = phase
    }
  }
  const total = measure('total', 'main-process', 'app-interactive')
  if (total !== undefined) results.push(`  total: ${total}ms`)
  console.log(results.join('\n'))
}
