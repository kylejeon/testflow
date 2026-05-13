import { StrictMode } from 'react'
import './i18n'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'

initSentry()

// react-snap prerenders marketing routes into static HTML at build time.
// When the browser loads one of those prerendered routes, the #root element
// already contains markup → we must hydrate it instead of replacing it with
// a fresh render (which would cause a flash + lose SEO meta tags react-snap
// captured). For purely client-rendered routes (auth/dashboard) the root is
// empty, so we fall back to createRoot.
const rootElement = document.getElementById('root')

if (!rootElement) {
  // Defensive — should never happen because index.html ships a #root div.
  // If it does, surface it clearly instead of throwing on `null.hasChildNodes()`.
  throw new Error('main.tsx: #root element not found')
}

if (rootElement.hasChildNodes()) {
  hydrateRoot(
    rootElement,
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
