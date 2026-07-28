import React from 'react';
import { User, Users, Briefcase, Info } from 'lucide-react';
import { getClubColor } from '../../utils/clubConfig';

const PoliticianSidePanel = ({ mp }) => {
  if (!mp) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center text-muted p-4">
        <User size={64} className="mb-3 opacity-50" />
        <p>Wybierz miejsce na sali, aby zobaczyć szczegóły posła.</p>
      </div>
    );
  }

  const clubColor = getClubColor(mp.club);

  return (
    <div className="d-flex flex-column h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="text-center mb-4">
        <div 
          className="rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow-sm"
          style={{ 
            width: '120px', 
            height: '120px', 
            backgroundColor: '#2a2a35',
            border: `4px solid ${clubColor}`
          }}
        >
          <User size={60} color={clubColor} />
        </div>
        <h4 className="mb-1">{mp.firstName} {mp.lastName}</h4>
        <span 
          className="badge rounded-pill px-3 py-2 mt-2 shadow-sm" 
          style={{ backgroundColor: clubColor, fontSize: '0.85rem' }}
        >
          {mp.club || 'Brak klubu'}
        </span>
      </div>

      <div className="mt-2 flex-grow-1">
        <div className="d-flex align-items-start mb-3">
          <Briefcase size={20} className="text-muted me-3 mt-1" />
          <div>
            <h6 className="mb-1 text-light">Wykształcenie / Zawód</h6>
            <p className="text-muted mb-0 small">{mp.educationLevel || 'Brak danych'}</p>
          </div>
        </div>

        <div className="d-flex align-items-start mb-3">
          <Users size={20} className="text-muted me-3 mt-1" />
          <div>
            <h6 className="mb-1 text-light">Okręg Wyborczy</h6>
            <p className="text-muted mb-0 small">
              {mp.districtNum ? `Okręg nr ${mp.districtNum}` : 'Brak danych'}
              {mp.districtName ? ` (${mp.districtName})` : ''}
            </p>
          </div>
        </div>
        
        <div className="d-flex align-items-start mb-3">
          <Info size={20} className="text-muted me-3 mt-1" />
          <div>
            <h6 className="mb-1 text-light">Liczba Głosów</h6>
            <p className="text-muted mb-0 small">
              {mp.numberOfVotes ? mp.numberOfVotes.toLocaleString('pl-PL') : 'Brak danych'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Miejsce na przyszłe dane rządowe z KPRM (Issue 13) */}
      <div className="mt-4 pt-3 border-top border-secondary">
        <small className="text-muted d-block text-center">
          CivicTechSejm - Profil Posła
        </small>
      </div>
    </div>
  );
};

export default PoliticianSidePanel;
