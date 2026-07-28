import React, { useState, useEffect } from 'react';
import { CLUB_ORDER } from '../../utils/clubConfig';
import SejmChamber from './SejmChamber';
import PoliticianSidePanel from './PoliticianSidePanel';
import { Search } from 'lucide-react';

const PoliticiansDirectory = () => {
  const [mps, setMps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for interaction
  const [selectedMp, setSelectedMp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        <div className="col-lg-6 col-xl-7 d-flex flex-column mb-3 mb-lg-0">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Sala Plenarna Sejmu ({mps.length} posłów)</h5>
              
              <div className="input-group" style={{ width: '250px' }}>
                <span className="input-group-text bg-secondary border-secondary text-light">
                  <Search size={16} />
                </span>
                <input 
                  type="text" 
                  className="form-control bg-dark text-light border-secondary" 
                  placeholder="Szukaj posła lub partii..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="card-body d-flex flex-column align-items-center justify-content-center overflow-hidden p-0 position-relative">
              {loading && <div className="text-light text-center p-4">Pobieranie danych o posłach...</div>}
              {error && <div className="text-danger text-center p-4">Błąd: {error}</div>}
              
              {!loading && !error && (
                <SejmChamber 
                  mps={mps} 
                  selectedMp={selectedMp} 
                  onSelectMp={setSelectedMp}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="col-lg-6 col-xl-5 d-flex flex-column">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light">
              <h5 className="mb-0">Informacje o Pośle</h5>
            </div>
            <div className="card-body text-light">
              <PoliticianSidePanel mp={selectedMp} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticiansDirectory;
