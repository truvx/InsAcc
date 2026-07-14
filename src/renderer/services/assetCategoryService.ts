// ─── Asset Category Service ───────────────────────────────────────────────────
// Pure business-logic layer for managing investment categories and assets.
// React components must only call these functions — no logic inside components.

import type { InvestmentCategory, InvestmentAsset } from '../data/investmentMasterData'
import { DEFAULT_INVESTMENT_CATEGORIES } from '../data/investmentMasterData'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUILT_IN_CATEGORY_IDS = new Set([
  'cat-gold',
  'cat-silver',
  'cat-bonds',
  'cat-mutual-funds',
  'cat-stocks',
  'cat-shares',
])

const MAX_CATEGORY_NAME_LENGTH = 50

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ServiceResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

function validateCategoryName(
  name: string,
  existingCategories: InvestmentCategory[],
  excludeId?: string
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Category name is required'
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) return `Maximum ${MAX_CATEGORY_NAME_LENGTH} characters allowed`
  const duplicate = existingCategories.find(
    c => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== excludeId
  )
  if (duplicate) return `Category "${trimmed}" already exists`
  return null
}

function validateAssetName(
  name: string,
  categoryId: string,
  existingAssets: InvestmentAsset[],
  excludeId?: string
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Asset name is required'
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) return `Maximum ${MAX_CATEGORY_NAME_LENGTH} characters allowed`
  const duplicate = existingAssets.find(
    a => a.categoryId === categoryId && a.name.toLowerCase() === trimmed.toLowerCase() && a.id !== excludeId
  )
  if (duplicate) return `Asset "${trimmed}" already exists in this category`
  return null
}

// ─── ID Generation ────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── Category Operations ──────────────────────────────────────────────────────

export function createCategory(
  name: string,
  categories: InvestmentCategory[]
): ServiceResult<InvestmentCategory> {
  const error = validateCategoryName(name, categories)
  if (error) return { ok: false, error }

  const maxOrder = categories.reduce((m, c) => Math.max(m, c.displayOrder), 0)
  const newCategory: InvestmentCategory = {
    id: generateId('cat'),
    name: name.trim(),
    active: true,
    displayOrder: maxOrder + 1,
  }
  return { ok: true, data: newCategory }
}

export function renameCategory(
  categoryId: string,
  newName: string,
  categories: InvestmentCategory[]
): ServiceResult<InvestmentCategory> {
  if (isBuiltInCategory(categoryId)) {
    return { ok: false, error: 'Built-in categories cannot be renamed' }
  }
  const error = validateCategoryName(newName, categories, categoryId)
  if (error) return { ok: false, error }

  const category = categories.find(c => c.id === categoryId)
  if (!category) return { ok: false, error: 'Category not found' }

  return { ok: true, data: { ...category, name: newName.trim() } }
}

export function deleteCategory(
  categoryId: string,
  categories: InvestmentCategory[],
  assets: InvestmentAsset[],
  purchaseRecords: { assetType: string }[]
): ServiceResult {
  if (isBuiltInCategory(categoryId)) {
    return { ok: false, error: 'Built-in categories cannot be deleted' }
  }
  const category = categories.find(c => c.id === categoryId)
  if (!category) return { ok: false, error: 'Category not found' }

  const categoryAssets = assets.filter(a => a.categoryId === categoryId)
  const inUse = purchaseRecords.some(p => p.assetType === category.name)
  if (inUse) {
    return { ok: false, error: 'Cannot delete a category that has existing purchase records' }
  }
  if (categoryAssets.length > 0) {
    return { ok: false, error: 'Delete all assets in this category first' }
  }
  return { ok: true }
}

// ─── Asset Operations ─────────────────────────────────────────────────────────

export function createAsset(
  categoryId: string,
  name: string,
  assets: InvestmentAsset[],
  options?: { symbol?: string; unit?: string }
): ServiceResult<InvestmentAsset> {
  const error = validateAssetName(name, categoryId, assets)
  if (error) return { ok: false, error }

  const categoryAssets = assets.filter(a => a.categoryId === categoryId)
  const maxOrder = categoryAssets.reduce((m, a) => Math.max(m, a.displayOrder), 0)

  const newAsset: InvestmentAsset = {
    id: generateId('ast'),
    categoryId,
    name: name.trim(),
    symbol: options?.symbol?.trim() || undefined,
    unit: options?.unit?.trim() || undefined,
    active: true,
    displayOrder: maxOrder + 1,
  }
  return { ok: true, data: newAsset }
}

export function renameAsset(
  assetId: string,
  newName: string,
  assets: InvestmentAsset[]
): ServiceResult<InvestmentAsset> {
  const asset = assets.find(a => a.id === assetId)
  if (!asset) return { ok: false, error: 'Asset not found' }

  const error = validateAssetName(newName, asset.categoryId, assets, assetId)
  if (error) return { ok: false, error }

  return { ok: true, data: { ...asset, name: newName.trim() } }
}

export function deleteAsset(
  assetId: string,
  assets: InvestmentAsset[],
  purchaseRecords: { assetName: string }[]
): ServiceResult {
  const asset = assets.find(a => a.id === assetId)
  if (!asset) return { ok: false, error: 'Asset not found' }

  const inUse = purchaseRecords.some(p => p.assetName === asset.name)
  if (inUse) {
    return { ok: false, error: 'Cannot delete an asset that has existing purchase records' }
  }
  return { ok: true }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function isBuiltInCategory(categoryId: string): boolean {
  return BUILT_IN_CATEGORY_IDS.has(categoryId)
}
