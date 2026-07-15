import React from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import './Proceedings.css';

const ProceedingCard = ({ proceeding }) => {
  // Format dates
  const datesList = proceeding.dates || [];
  const displayDate = datesList.length > 0 
    ? (datesList.length === 1 ? datesList[0] : `${datesList[0]} - ${datesList[datesList.length - 1]}`)
    : 'Brak daty';

  return (
    <div className="proceeding-card">
      <div className="proceeding-header">
        <span className="proceeding-number">Posiedzenie nr {proceeding.number}</span>
      </div>
      
      <div className="proceeding-title">
        <h3>{proceeding.title}</h3>
      </div>
      
      <div className="proceeding-details">
        <div className="detail-item">
          <Calendar size={16} className="detail-icon" />
          <span>{displayDate}</span>
        </div>
        
        {/* API doesn't always provide time easily in the list endpoint, we will mock it or just show 460 MPs for now */}
        <div className="detail-item">
          <Clock size={16} className="detail-icon" />
          <span>Brak danych o godz.</span>
        </div>
        
        <div className="detail-item">
          <Users size={16} className="detail-icon" />
          <span>460 Posłów</span>
        </div>
      </div>
      
      <div className="proceeding-footer">
        <button className="view-btn">Zobacz szczegóły</button>
      </div>
    </div>
  );
};

export default ProceedingCard;
