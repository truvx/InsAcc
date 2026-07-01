import React from 'react'

interface Props {
  currency?: string
}

export default function PropertyTenants({}: Props) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tenants</div>
          <div className="page-subtitle">Customer management</div>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="empty-state-title">Tenants moved to Hierarchy</div>
            <div className="empty-state-text">Manage tenants as Customers under Properties › Income Categories. Go to the Properties page to add and manage customers.</div>
          </div>
        </div>
      </div>
    </>
  )
}
