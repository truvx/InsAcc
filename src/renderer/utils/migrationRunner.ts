type MigrationFn = () => void

const migrations: MigrationFn[] = []

export function registerMigration(fn: MigrationFn) {
  migrations.push(fn)
}

export function runMigrations() {
  for (const fn of migrations) {
    try { fn() } catch (e) { console.error('Migration failed:', e) }
  }
}

export function runCriticalMigrations() {
  const criticalKey = 'insacc_critical_migrations_v1'
  if (localStorage.getItem(criticalKey)) return
  runMigrations()
  try { localStorage.setItem(criticalKey, 'true') } catch {}
}

export function registerAndRunCritical(fn: MigrationFn) {
  registerMigration(fn)
}
