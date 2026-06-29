import { useEffect, useState } from 'react'
import './App.css'
import VotingList from './components/VotingList/VotingList'

function App() {
  const [status, setStatus] = useState('Loading backend status...')
  const [selectedVoting, setSelectedVoting] = useState(null)

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

  const handleViewDetails = (voting) => {
    setSelectedVoting(voting)
    console.log("Viewing details for:", voting)
  }

  const handleBackToList = () => {
    setSelectedVoting(null)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CivicTechSejm</h1>
        <p className="status-indicator">{status}</p>
      </header>

      <main className="app-main">
        {selectedVoting ? (
          <div className="voting-details-placeholder">
            <button className="back-button" onClick={handleBackToList}>
              &larr; Back to List
            </button>
            <h2>Voting Details</h2>
            <p><strong>Title:</strong> {selectedVoting.title}</p>
            <p><strong>Date:</strong> {selectedVoting.date}</p>
            <p><strong>Outcome:</strong> {selectedVoting.results.passed ? 'Passed' : 'Failed'}</p>
            <div className="placeholder-note">
              <p>Full detailed bill info will be implemented in a future update.</p>
            </div>
          </div>
        ) : (
          <VotingList onViewDetails={handleViewDetails} />
        )}
      </main>
    </div>
  )
}

export default App
