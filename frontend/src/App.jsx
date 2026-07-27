import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Layout/Sidebar'
import ProceedingsList from './components/Proceedings/ProceedingsList'
import VotingDetails from './components/VotingList/VotingDetails'
import ClubsDashboard from './components/Clubs/ClubsDashboard'

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
        setStatus(data.message ? `${data.status}: ${data.message}` : data.status)
      } catch {
        setStatus('Backend unavailable. Start containers with Docker Compose.')
      }
    }

    fetchHealth()
  }, [])

  return (
    <div className="app-layout bg-dark text-light">
      <Sidebar />
      <main className="app-main bg-dark text-light">
        <header className="app-header">
          <h1>CivicTechSejm</h1>
          <p className="status-indicator">{status}</p>
        </header>

        <div className="content-area">
          <Routes>
            <Route path="/" element={<ProceedingsList />} />
            <Route path="/posiedzenia/:id" element={<ProceedingsList />} />
            <Route path="/glosowania/:id" element={<VotingDetails />} />
            <Route path="/kluby/*" element={<ClubsDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
