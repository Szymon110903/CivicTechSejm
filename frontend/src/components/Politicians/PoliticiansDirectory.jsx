import React, { useState, useEffect } from 'react';
import './Politicians.css';
import { CLUB_ORDER } from '../../utils/clubConfig';

const PoliticiansDirectory = () => {
  const [mps, setMps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMps = async () => {
      try {
        const response = await fetch('/api/mps/?active_only=true');
        if (!response.ok) throw new Error('Nie udało się pobrać danych z API');
        const json = await response.json();
        
        let mpsData = json.data || [];
        
        // Sortowanie: Kolejność polityczna (Lewo-Prawo) -> Nazwisko
        mpsData.sort((a, b) => {
          const clubAIndex = CLUB_ORDER.indexOf(a.club);
          const clubBIndex = CLUB_ORDER.indexOf(b.club);
          
          const aIndex = clubAIndex === -1 ? 999 : clubAIndex;
          const bIndex = clubBIndex === -1 ? 999 : clubBIndex;
          
          if (aIndex !== bIndex) return aIndex - bIndex;
          
          const nameA = a.lastName || '';
          const nameB = b.lastName || '';
          return nameA.localeCompare(nameB, 'pl');
        });
        
        setMps(mpsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMps();
  }, []);

  return (
    <div className="container-fluid h-100 p-3">
      <div className="row h-100">
        <div className="col-lg-8 col-xl-9 d-flex flex-column mb-3 mb-lg-0">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light">
              <h5 className="mb-0">Sala Plenarna Sejmu ({mps.length} posłów)</h5>
            </div>
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              {loading && <p className="text-light">Pobieranie danych o posłach...</p>}
              {error && <p className="text-danger">Błąd: {error}</p>}
              {!loading && !error && <p className="text-muted">Dane pobrane. Trwa budowa interaktywnej sali...</p>}
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 col-xl-3 d-flex flex-column">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light">
              <h5 className="mb-0">Panel Posła</h5>
            </div>
            <div className="card-body text-light">
              <p className="text-muted">Wybierz miejsce na sali, aby zobaczyć szczegóły.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticiansDirectory;
