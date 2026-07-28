import React, { useMemo, useState } from 'react';
import { getClubColor } from '../../utils/clubConfig';
import { generateHemicycle } from '../../utils/hemicycle';

const SejmChamber = ({ mps, selectedMp, onSelectMp, searchQuery }) => {
  const [hoveredMpId, setHoveredMpId] = useState(null);

  // Generate seats once based on the number of MPs
  const seats = useMemo(() => {
    if (mps.length === 0) return [];
    return generateHemicycle(mps.length, 10, 800, 450);
  }, [mps.length]);

  // Normalize search query (remove diacritics)
  const removeDiacritics = (str) => {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };
  
  const searchLower = removeDiacritics(searchQuery);

  return (
    <div className="w-100 d-flex justify-content-center align-items-center" style={{ overflow: 'hidden' }}>
      <svg
        viewBox="0 0 800 450"
        style={{ width: '100%', maxWidth: '750px', height: 'auto' }}
      >
        {seats.map((seat, index) => {
          const mp = mps[index];
          if (!mp) return null;

          const isSelected = selectedMp && selectedMp.id === mp.id;
          const isHovered = hoveredMpId === mp.id;
          
          // Determine if seat matches search query
          let matchesSearch = true;
          if (searchLower) {
            const firstLast = removeDiacritics(`${mp.firstName} ${mp.lastName}`);
            const lastFirst = removeDiacritics(`${mp.lastName} ${mp.firstName}`);
            const clubName = removeDiacritics(mp.club);
            
            if (!firstLast.includes(searchLower) && 
                !lastFirst.includes(searchLower) && 
                !clubName.includes(searchLower)) {
              matchesSearch = false;
            }
          }

          const fill = getClubColor(mp.club);
          let baseOpacity = matchesSearch ? (isSelected ? 1 : 0.8) : 0.15;
          if (isHovered && matchesSearch && !isSelected) {
            baseOpacity = 1;
          }

          const radius = isSelected ? 12 : 9;
          const strokeWidth = isSelected ? 3 : 0;
          const stroke = isSelected ? '#ffffff' : 'none';
          
          const transform = isHovered ? `scale(1.2)` : `scale(1)`;

          return (
            <circle
              key={mp.id || index}
              cx={seat.x}
              cy={seat.y}
              r={radius}
              fill={fill}
              opacity={baseOpacity}
              stroke={stroke}
              strokeWidth={strokeWidth}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform,
                transformOrigin: `${seat.x}px ${seat.y}px`
              }}
              onClick={() => onSelectMp(mp)}
              onMouseEnter={() => setHoveredMpId(mp.id)}
              onMouseLeave={() => setHoveredMpId(null)}
            >
              <title>{`${mp.firstName} ${mp.lastName} (${mp.club || 'Brak klubu'})`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
};

export default SejmChamber;
