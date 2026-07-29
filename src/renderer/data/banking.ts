export interface BankAccount {
  id: string
  institution: string
  accountNumber?: string
  currency: string
  openingBalance: number
  theme: string
  icon: string
  status: 'active' | 'archived' | 'closed' | 'hidden'
  iban?: string
  swift?: string
  branch?: string
  chartAccountId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface BankTransaction {
  id: string
  accountId: string
  date: string
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out'
  amount: number
  description: string
  category: string
  status: 'imported' | 'pending' | 'cleared' | 'reconciled'
  reference: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface Transfer {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface StatementEntry {
  date: string
  desc: string
  amount: string
  type: 'credit' | 'debit'
}
