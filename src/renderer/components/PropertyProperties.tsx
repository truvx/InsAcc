import React from 'react'
import type { MainCategory, PropProperty, IncomeCategory, Customer } from '../data/propertyTypes'
import PropertyHierarchy from './PropertyHierarchy'

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
}

export default function PropertyProperties(props: Props) {
  return <PropertyHierarchy {...props} />
}
