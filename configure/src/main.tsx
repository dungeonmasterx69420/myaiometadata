import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.tsx'
import './index.css'
import { ConfigProvider } from './contexts/ConfigContext'
import { ThemeProvider } from './components/ThemeProvider'
import StreamingApp from './streaming/StreamingApp'

function ConfigureApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/app/*" element={<StreamingApp />} />
        <Route path="*" element={<ConfigureApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
