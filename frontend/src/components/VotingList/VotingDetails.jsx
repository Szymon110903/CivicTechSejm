import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import VotingDetailsView from './VotingDetailsView';
import './VotingDetails.css';

const VotingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // If we navigated here with state (e.g. from VotingCard in VotingList), use that first
  const [votingData, setVotingData] = useState(location.state?.voting || null);
  const [loading, setLoading] = useState(!votingData);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have voting from state, no need to fetch metadata
    if (votingData) return;

    const fetchVotingById = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/votings/${id}`);
        if (!response.ok) {
          throw new Error('Nie znaleziono szczegółów głosowania w bazie danych.');
        }
        const data = await response.json();
        setVotingData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVotingById();
  }, [id, votingData]);

  if (loading) {
    return (
      <div className="voting-details-loading-page">
        <div className="spinner"></div>
        <h3>Ładowanie danych głosowania...</h3>
      </div>
    );
  }

  if (error || !votingData) {
    return (
      <div className="voting-details-error-page">
        <Link to="/" className="back-link">&larr; Wróć do listy posiedzeń</Link>
        <h3>Błąd</h3>
        <p>{error || 'Nie znaleziono głosowania.'}</p>
      </div>
    );
  }

  // Render the unified, rich VotingDetailsView with the prominent X close button!
  return (
    <div className="voting-details-route-container">
      <VotingDetailsView 
        voting={votingData} 
        onClose={() => {
          if (location.state?.fromProceeding) {
            navigate(`/posiedzenia/${location.state.fromProceeding}`);
          } else {
            navigate(-1);
          }
        }} 
      />
    </div>
  );
};

export default VotingDetails;
