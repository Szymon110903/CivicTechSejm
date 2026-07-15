import React, { useState, useEffect } from 'react';
import ProceedingCard from './ProceedingCard';
import './Proceedings.css';

const ProceedingsList = () => {
  const [proceedings, setProceedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProceedings = async () => {
      try {
        const response = await fetch('/api/proceedings/');
        if (!response.ok) {
          throw new Error('Failed to fetch proceedings');
        }
        const data = await response.json();
        // The API returns a list of proceedings. Let's sort them by number descending to show newest first.
        const sortedData = data.sort((a, b) => b.number - a.number);
        setProceedings(sortedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProceedings();
  }, []);

  if (loading) {
    return <div className="proceedings-loading">Ładowanie posiedzeń...</div>;
  }

  if (error) {
    return <div className="proceedings-error">Błąd: {error}</div>;
  }

  return (
    <div className="proceedings-container">
      <h2>Posiedzenia Sejmu</h2>
      <p className="proceedings-subtitle">Lista posiedzeń Sejmu X kadencji</p>
      
      <div className="proceedings-grid">
        {proceedings.map((proceeding) => (
          <ProceedingCard key={proceeding.number} proceeding={proceeding} />
        ))}
      </div>
    </div>
  );
};

export default ProceedingsList;
