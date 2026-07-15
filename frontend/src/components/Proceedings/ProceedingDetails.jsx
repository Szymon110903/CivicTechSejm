import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import VotingCard from '../VotingList/VotingCard';
import './ProceedingDetails.css';

const ProceedingDetails = () => {
  const { id } = useParams();
  const [proceedingData, setProceedingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProceedingDetails = async () => {
      try {
        const response = await fetch(`/api/votings/proceedings/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Nie znaleziono głosowań dla tego posiedzenia. Spróbuj zaimportować dane w backendzie.');
          }
          throw new Error('Błąd podczas pobierania danych posiedzenia.');
        }
        const data = await response.json();
        setProceedingData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProceedingDetails();
  }, [id]);

  if (loading) {
    return <div className="proceeding-details-loading"><div className="spinner"></div>Ładowanie szczegółów posiedzenia...</div>;
  }

  if (error) {
    return (
      <div className="proceeding-details-error">
        <Link to="/" className="back-link">&larr; Powrót do listy</Link>
        <h3>Błąd</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!proceedingData || !proceedingData.days || proceedingData.days.length === 0) {
    return (
      <div className="proceeding-details-empty">
        <Link to="/" className="back-link">&larr; Powrót do listy</Link>
        <p>Brak głosowań dla tego posiedzenia.</p>
      </div>
    );
  }

  return (
    <div className="proceeding-details-container">
      <div className="details-header">
        <Link to="/" className="back-link">&larr; Wróć do listy posiedzeń</Link>
        <h2>Posiedzenie nr {proceedingData.proceeding_id}</h2>
        <p className="details-subtitle">
          Kadencja {proceedingData.term} &bull; Ostatnia aktualizacja: {new Date(proceedingData.last_updated).toLocaleDateString('pl-PL')}
        </p>
      </div>

      <div className="days-list">
        {proceedingData.days.map((day) => (
          <div key={day.date} className="day-section">
            <h3 className="day-header">Głosowania z dnia: {day.date}</h3>
            <div className="voting-grid">
              {day.votings.map((voting) => {
                // Adapt voting object for VotingCard which expects sitting and date
                const adaptedVoting = {
                  ...voting,
                  sitting: proceedingData.proceeding_id,
                  date: day.date,
                  id: `${proceedingData.proceeding_id}-${day.date}-${voting.voting_number}`
                };
                
                return (
                  <VotingCard
                    key={adaptedVoting.id}
                    voting={adaptedVoting}
                    onClick={() => console.log('Clicked voting', voting.voting_number)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProceedingDetails;
