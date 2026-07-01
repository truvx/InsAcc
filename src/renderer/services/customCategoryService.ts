export const CUSTOM_OPTION = '➕ Custom...'

export function normalizeCategoryName(name: string): string {
  return name.trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function findDuplicate(
  name: string,
  hardcoded: readonly string[],
  custom: string[],
): string | undefined {
  const lower = normalizeCategoryName(name).toLowerCase()
  return [...hardcoded, ...custom].find(c => c.toLowerCase() === lower)
}

export function mergeCategories(hardcoded: readonly string[], custom: string[]): string[] {
  const set = new Set([...hardcoded, ...custom])
  return [...set]
}
