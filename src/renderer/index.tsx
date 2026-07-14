import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/theme.css'

const root = document.getElementById('root')!

// Prevent scroll to change number values on input[type=number]
document.addEventListener('wheel', (e) => {
  if (
    document.activeElement &&
    document.activeElement.tagName === 'INPUT' &&
    (document.activeElement as HTMLInputElement).type === 'number'
  ) {
    e.preventDefault()
  }
}, { passive: false })

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
