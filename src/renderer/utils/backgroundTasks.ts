const pendingTasks: Array<() => void> = []
let flushed = false

export function defer(fn: () => void) {
  if (flushed) {
    requestIdleCallback(() => fn(), { timeout: 2000 })
    return
  }
  pendingTasks.push(fn)
}

export function flushDeferred() {
  flushed = true
  const tasks = pendingTasks.splice(0)
  for (const fn of tasks) {
    requestIdleCallback(() => fn(), { timeout: 3000 })
  }
}

export function runWhenIdle(fn: () => void, timeout = 3000) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => fn(), { timeout })
  } else {
    setTimeout(fn, 500)
  }
}
