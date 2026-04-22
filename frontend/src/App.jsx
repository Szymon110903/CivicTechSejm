import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Loading backend status...')

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error('Request failed')
        }

        const data = await response.json()
        setStatus(`${data.status}: ${data.message}`)
      } catch {
        setStatus('Backend unavailable. Start containers with Docker Compose.')
      }
    }

    fetchHealth()
  }, [])

  return (
    <main className="app">
      <h1>CivicTechSejm</h1>
      <p>Web app built with React + FastAPI.</p>
      <p className="status">{status}</p>
    </main>
  )
}

export default App
