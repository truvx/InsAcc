import React, { useState } from 'react'
import { Modal, Button, Select } from './design/DesignSystem'
import { parseOFXStatement, parseCSVStatement } from '../services/bankReconciliationService'
import type { BankStatementLine } from '../accounting/types'

interface BankImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (lines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[]) => void
}

export default function BankImportModal({ open, onClose, onImport }: BankImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileType, setFileType] = useState<'csv' | 'ofx' | null>(null)
  
  // CSV Mappings State
  const [headers, setHeaders] = useState<string[]>([])
  const [dateCol, setDateCol] = useState<string>('')
  const [amountCol, setAmountCol] = useState<string>('')
  const [descCol, setDescCol] = useState<string>('')
  const [refCol, setRefCol] = useState<string>('')
  
  const [previewLines, setPreviewLines] = useState<Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[]>([])
  const [errorMsg, setErrorMsg] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    setErrorMsg('')
    setFile(selectedFile)
    setPreviewLines([])
    
    const isOfx = selectedFile.name.endsWith('.ofx')
    const isCsv = selectedFile.name.endsWith('.csv')
    
    if (!isOfx && !isCsv) {
      setErrorMsg('Invalid file format. Please upload an OFX or CSV statement.')
      return
    }
    
    setFileType(isOfx ? 'ofx' : 'csv')
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setFileContent(content)
      
      if (isOfx) {
        try {
          const parsed = parseOFXStatement(content)
          if (parsed.length === 0) {
            setErrorMsg('No valid transactions found in the OFX statement.')
          } else {
            setPreviewLines(parsed)
          }
        } catch (err) {
          setErrorMsg('Failed to parse OFX statement.')
        }
      } else if (isCsv) {
        // Read headers from first row
        const firstLine = content.split(/\r?\n/)[0]
        if (firstLine) {
          const cols = firstLine.split(',').map((h, i) => ({
            index: i,
            label: h.replace(/"/g, '').trim() || `Column ${i + 1}`,
          }))
          setHeaders(cols.map(c => c.label))
          
          // Auto-guess columns based on name mappings
          const guessDate = cols.find(c => /date/i.test(c.label))?.index.toString() ?? ''
          const guessAmount = cols.find(c => /amount|value|debit|credit/i.test(c.label))?.index.toString() ?? ''
          const guessDesc = cols.find(c => /desc|particular|narration|payee/i.test(c.label))?.index.toString() ?? ''
          const guessRef = cols.find(c => /ref|chq|cheque/i.test(c.label))?.index.toString() ?? ''
          
          setDateCol(guessDate)
          setAmountCol(guessAmount)
          setDescCol(guessDesc)
          setRefCol(guessRef)
          
          // Run initial preview if guesses are fully mapped
          if (guessDate && guessAmount && guessDesc) {
            try {
              const parsed = parseCSVStatement(content, {
                dateCol: parseInt(guessDate),
                amountCol: parseInt(guessAmount),
                descCol: parseInt(guessDesc),
                refCol: guessRef ? parseInt(guessRef) : undefined,
              })
              setPreviewLines(parsed)
            } catch (err) {
              // Ignore guess errors
            }
          }
        }
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleApplyCsvMappings = () => {
    if (!dateCol || !amountCol || !descCol) {
      setErrorMsg('Please select mappings for Date, Amount, and Description.')
      return
    }
    
    setErrorMsg('')
    try {
      const parsed = parseCSVStatement(fileContent, {
        dateCol: parseInt(dateCol),
        amountCol: parseInt(amountCol),
        descCol: parseInt(descCol),
        refCol: refCol ? parseInt(refCol) : undefined,
      })
      
      if (parsed.length === 0) {
        setErrorMsg('No valid transactions parsed. Check your column types and mappings.')
      } else {
        setPreviewLines(parsed)
      }
    } catch (err) {
      setErrorMsg('Parsing failed. Ensure headers and separators are formatted correctly.')
    }
  }

  const handleImport = () => {
    if (previewLines.length === 0) {
      setErrorMsg('No parsed statement lines to import.')
      return
    }
    onImport(previewLines)
    onClose()
  }

  const headerOptions = [
    { value: '', label: '-- Select Column --' },
    ...headers.map((h, i) => ({ value: i.toString(), label: `${h} (Col ${i + 1})` }))
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Bank Statement"
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleImport} disabled={previewLines.length === 0}>
            Import {previewLines.length > 0 ? `(${previewLines.length} lines)` : ''}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Choose Statement File (.ofx or .csv)</label>
          <input
            type="file"
            accept=".csv,.ofx"
            onChange={handleFileChange}
            style={{
              display: 'block',
              width: '100%',
              padding: 12,
              border: '1px dashed #D2D9E5',
              borderRadius: 6,
              background: '#F8FAFC',
              cursor: 'pointer'
            }}
          />
        </div>

        {errorMsg && (
          <div style={{ color: '#D93838', fontSize: 13, background: '#FDF2F2', padding: 10, borderRadius: 6 }}>
            {errorMsg}
          </div>
        )}

        {fileType === 'csv' && headers.length > 0 && (
          <Card title="CSV Column Mappings">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select
                label="Date Column *"
                value={dateCol}
                onChange={e => setDateCol(e.target.value)}
                options={headerOptions}
              />
              <Select
                label="Amount Column *"
                value={amountCol}
                onChange={e => setAmountCol(e.target.value)}
                options={headerOptions}
              />
              <Select
                label="Description Column *"
                value={descCol}
                onChange={e => setDescCol(e.target.value)}
                options={headerOptions}
              />
              <Select
                label="Reference Column (Optional)"
                value={refCol}
                onChange={e => setRefCol(e.target.value)}
                options={headerOptions}
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" onClick={handleApplyCsvMappings}>Apply Mappings</Button>
            </div>
          </Card>
        )}

        {previewLines.length > 0 && (
          <div>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Preview Parsed Transactions</label>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E4EBF4', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E4EBF4', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Date</th>
                    <th style={{ padding: 8 }}>Description</th>
                    <th style={{ padding: 8 }}>Reference</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLines.slice(0, 10).map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E4EBF4' }}>
                      <td style={{ padding: 8 }}>{line.date}</td>
                      <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.description}</td>
                      <td style={{ padding: 8 }}>{line.reference ?? '-'}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: line.amount >= 0 ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                        {line.amount >= 0 ? '+' : ''}{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewLines.length > 10 && (
                <div style={{ padding: 8, textAlign: 'center', color: '#6B7280', fontSize: 12, background: '#F8FAFC', borderTop: '1px solid #E4EBF4' }}>
                  And {previewLines.length - 10} more transactions...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// Inline card component helper for modal grid layout
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #E4EBF4', borderRadius: 6, padding: 12, background: '#FFFFFF' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
