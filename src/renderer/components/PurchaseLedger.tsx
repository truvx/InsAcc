import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import type { PurchaseCategory, Purchase, ItemAverages } from '../data/purchaseData'
import Toast from './Toast'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  categories: PurchaseCategory[]
  purchases: Purchase[]
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>
}

function computeAverages(categories: PurchaseCategory[], purchases: Purchase[]): ItemAverages[] {
  const byItem: Record<string, Purchase[]> = {}
  purchases.forEach(p => {
    if (!byItem[p.itemId]) byItem[p.itemId] = []
    byItem[p.itemId].push(p)
  })

  return Object.entries(byItem).map(([itemId, pList]) => {
    const cat = categories.find(c => c.items.some(i => i.id === itemId))
    const item = cat?.items.find(i => i.id === itemId)
    const count = pList.length
    const totalQty = pList.reduce((s, p) => s + p.quantity, 0)
    const totalVal = pList.reduce((s, p) => s + p.totalValue, 0)
    const sumUnitPrice = pList.reduce((s, p) => s + p.unitPrice, 0)
    return {
      itemId,
      itemName: item?.name || itemId,
      categoryName: cat?.name || 'Unknown',
      purchaseCount: count,
      totalQuantity: totalQty,
      totalValue: totalVal,
      avgUnitPrice: count ? +(sumUnitPrice / count).toFixed(2) : 0,
      avgValue: count ? +(totalVal / count).toFixed(2) : 0,
      avgQuantity: count ? +(totalQty / count).toFixed(2) : 0,
    }
  })
}

let purchaseIdCounter = Date.now()
function nextPurchaseId() {
  return `P-${++purchaseIdCounter}`
}

export default function PurchaseLedger({ profile, currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', categories, purchases, setPurchases }: Props) {
  const [selectedCat, setSelectedCat] = useState(categories[0]?.id || '')
  const [selectedItem, setSelectedItem] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formQty, setFormQty] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const currentCat = categories.find(c => c.id === selectedCat)
  const items = currentCat?.items || []

  const filteredPurchases = useMemo(() => {
    if (!selectedItem) return []
    return purchases.filter(p => p.itemId === selectedItem).sort((a, b) => a.date.localeCompare(b.date))
  }, [purchases, selectedItem])

  const averages = useMemo(() => computeAverages(categories, purchases), [categories, purchases])
  const currentAvg = averages.find(a => a.itemId === selectedItem)

  const handleAdd = () => {
    if (!selectedItem) { setToast({ visible: true, message: 'Select an item', type: 'error' }); return }
    if (!formDate) { setToast({ visible: true, message: 'Enter date', type: 'error' }); return }
    const qty = parseFloat(formQty)
    const price = parseFloat(formPrice)
    if (isNaN(qty) || qty <= 0) { setToast({ visible: true, message: 'Enter valid quantity', type: 'error' }); return }
    if (isNaN(price) || price <= 0) { setToast({ visible: true, message: 'Enter valid unit price', type: 'error' }); return }

    setPurchases(prev => [{
      id: nextPurchaseId(),
      date: formDate,
      itemId: selectedItem,
      quantity: qty,
      unitPrice: price,
      totalValue: qty * price,
    }, ...prev])
    setFormQty('')
    setFormPrice('')
    setShowForm(false)
    setToast({ visible: true, message: 'Purchase recorded', type: 'success' })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this purchase?')) return
    setPurchases(prev => prev.filter(p => p.id !== id))
    setToast({ visible: true, message: 'Purchase deleted', type: 'success' })
  }

  const topAverages = useMemo(() => {
    return [...averages].sort((a, b) => b.totalValue - a.totalValue).slice(0, 4)
  }, [averages])

  return (
    <div className="main-content">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="main-header">
        <div>
          <h1>Purchase Ledger</h1>
          <p>Record purchases and track average costs</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={() => { setShowForm(!showForm); if (!showForm) setFormDate(new Date().toISOString().split('T')[0]) }} title="Add Purchase" aria-label="Add Purchase"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        </div>
      </div>

      <div className="scroll-content">
        {topAverages.length > 0 && (
          <div className="dashboard-grid" style={{ marginBottom: 20 }}>
            {topAverages.map(avg => (
              <div key={avg.itemId} className="chart-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{avg.categoryName}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{avg.itemName}</div>
                <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{currency} {avg.avgUnitPrice.toLocaleString()} avg/unit</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{avg.purchaseCount} purchases · {avg.totalQuantity} qty</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select className="settings-field" value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedItem('') }} style={{ minWidth: 160 }}>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {items.length > 0 && (
            <select className="settings-field" value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">-- Select Item --</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          )}
        </div>

        {currentAvg && (
          <div className="chart-card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1F4E79, #15365A)', border: 'none' }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Purchases</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{currentAvg.purchaseCount}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Avg Unit Price</div>
                <div style={{ color: '#D4AF37', fontSize: 20, fontWeight: 700 }}>{currency} {currentAvg.avgUnitPrice.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Avg Value</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{currency} {currentAvg.avgValue.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Avg Qty</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{currentAvg.avgQuantity.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total Qty</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{currentAvg.totalQuantity.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total Value</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{currency} {currentAvg.totalValue.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div className="chart-title" style={{ marginBottom: 12 }}>New Purchase</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="login-input-group" style={{ flex: 1, minWidth: 140 }}>
                <label className="login-label">Date</label>
                <input className="login-input" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="login-input-group" style={{ flex: 1, minWidth: 100 }}>
                <label className="login-label">Quantity</label>
                <input className="login-input" type="number" step="any" placeholder="e.g. 100" value={formQty} onChange={e => setFormQty(e.target.value)} />
              </div>
              <div className="login-input-group" style={{ flex: 1, minWidth: 100 }}>
                <label className="login-label">Unit Price ({currency})</label>
                <input className="login-input" type="number" step="any" placeholder="e.g. 490" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="numpad-btn enter" onClick={handleAdd}>Record</button>
              </div>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                {items.find(i => i.id === selectedItem)?.name || selectedItem} — Purchase History
              </div>
              <div className="chart-subtitle">{filteredPurchases.length} purchase{filteredPurchases.length !== 1 ? 'es' : ''}</div>
            </div>
            {filteredPurchases.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No purchases yet</div>
            ) : (
              <div>
                {filteredPurchases.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{formatDate(p.date, dateFormat)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Qty: {p.quantity} × {currency} {p.unitPrice.toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{currency} {p.totalValue.toLocaleString()}</div>
                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, padding: '0 4px 0 12px', lineHeight: 1 }} title="Remove">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedItem && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">All Items Overview</div>
            </div>
            {averages.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No purchase records yet. Select a category and item, then add purchases.</div>
            ) : (
              <div>
                {averages.map(avg => (
                  <div key={avg.itemId} className="performance-item" style={{ cursor: 'pointer' }} onClick={() => { setSelectedItem(avg.itemId); setSelectedCat(categories.find(c => c.items.some(i => i.id === avg.itemId))?.id || selectedCat) }}>
                    <div className="performance-info">
                      <div className="performance-name">{avg.itemName}</div>
                      <div className="performance-value">{avg.categoryName} · {avg.purchaseCount} purchases</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{currency} {avg.avgUnitPrice.toLocaleString()}/unit</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{currency} {avg.totalValue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
