import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { Suspense } from 'react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback="Loading...">
      <App />
    </Suspense>
  </StrictMode>,
)
