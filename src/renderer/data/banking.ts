export interface BankAccount {
  id: string
  institution: string
  accountName: string
  accountNumber: string
  currency: string
  openingBalance: number
  accountType: 'checking' | 'savings' | 'cash' | 'credit'
  theme: string
  icon: string
  status: 'active' | 'archived' | 'closed' | 'hidden'
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
