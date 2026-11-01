import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.deferredPwaPrompt = null
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  window.deferredPwaPrompt = event
  window.dispatchEvent(new Event('pwa-ready'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
