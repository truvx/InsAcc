import React from 'react'
import type { MainCategory, PropProperty, IncomeCategory, Customer } from '../data/propertyTypes'
import PropertyHierarchy from './PropertyHierarchy'
import type { AuditEvent } from '../data/auditTypes'

interface Props {
  currency?: string
  mainCategories: MainCategory[]
  setMainCategories: React.Dispatch<React.SetStateAction<MainCategory[]>>
  propProperties: PropProperty[]
  setPropProperties: React.Dispatch<React.SetStateAction<PropProperty[]>>
  incomeCategories: IncomeCategory[]
  setIncomeCategories: React.Dispatch<React.SetStateAction<IncomeCategory[]>>
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
  onAuditEvent?: (event: AuditEvent) => void
  loggedInUser?: string
}

export default function PropertyProperties(props: Props) {
  return <PropertyHierarchy {...props} />
}
