import React from 'react';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      </div>
      
      <div className="proceeding-footer">
        <Link to={`/posiedzenia/${proceeding.number}`} className="view-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Zobacz szczegóły
        </Link>
      </div>
    </div>
  );
};

export default ProceedingCard;
