import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.DEV && typeof performance?.mark === 'function') {
  performance.mark('astrobase-app-start')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV && typeof performance?.mark === 'function') {
  requestAnimationFrame(() => {
    performance.mark('astrobase-first-frame')
    performance.measure(
      'astrobase-app-to-first-frame',
      'astrobase-app-start',
      'astrobase-first-frame',
    )
  })
}
