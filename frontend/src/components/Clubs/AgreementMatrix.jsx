import React, { useState, useEffect } from 'react';
import { Grid, TrendingUp, TrendingDown, Info, Loader2, AlertCircle } from 'lucide-react';
import './AgreementMatrix.css';

const AgreementMatrix = ({ appliedFilters }) => {
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ term: '10' });
        if (appliedFilters.fromDate) queryParams.append('from_date', appliedFilters.fromDate);
        if (appliedFilters.toDate) queryParams.append('to_date', appliedFilters.toDate);
        if (appliedFilters.minAttendance > 0) queryParams.append('min_attendance', String(appliedFilters.minAttendance));
        if (appliedFilters.closeVotingsOnly) queryParams.append('close_votings_only', 'true');

        const response = await fetch(`/api/clubs/matrix?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Błąd pobierania macierzy zgodności: HTTP ${response.status}`);
        }

        const data = await response.json();
        setMatrixData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatrix();
  }, [appliedFilters]);

  if (loading) {
    return (
      <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
        <div className="card-body py-5">
          <Loader2 size={36} className="text-info mb-3" style={{ animation: 'spin 1s linear infinite' }} />
          <h3 className="h4 text-white">Generowanie interaktywnej macierzy zgodności...</h3>
          <p className="text-muted mb-0">Porównywanie historii głosowań każdej pary klubów.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-3 my-4 shadow" role="alert">
        <AlertCircle size={32} className="flex-shrink-0" />
        <div>
          <h4 className="alert-heading h5 mb-1">Wystąpił błąd podczas ładowania macierzy zgodności</h4>
          <p className="mb-0 small">{error}</p>
        </div>
      </div>
    );
  }

  if (!matrixData || !matrixData.clubs || matrixData.clubs.length === 0) {
    return (
      <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
        <div className="card-body py-4">
          <Grid size={36} className="text-muted mb-3" />
          <h3 className="h4 text-white">Brak wystarczających danych do zbudowania macierzy</h3>
          <p className="text-muted mb-0">Spróbuj zmienić parametry filtrów czasowych.</p>
        </div>
      </div>
    );
  }

  const { clubs, matrix, total_votings_evaluated } = matrixData;

  // Compute top coalitions and top divides
  const pairs = [];
  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      pairs.push({
        club1: clubs[i],
        club2: clubs[j],
        rate: matrix[i][j]
      });
    }
  }

  const sortedByAgreement = [...pairs].sort((a, b) => b.rate - a.rate);
  const topCoalitions = sortedByAgreement.slice(0, 3);
  const topDivides = [...pairs].sort((a, b) => a.rate - b.rate).slice(0, 3);

  // Helper to determine cell style based on agreement percentage
  const getCellStyle = (rate, isDiagonal) => {
    if (isDiagonal) return {};
    
    if (rate >= 80) {
      const alpha = Math.min(0.85, 0.2 + (rate - 80) * 0.032);
      return { backgroundColor: `rgba(25, 135, 84, ${alpha})`, color: '#d1e7dd' }; // Bootstrap success green
    }
    if (rate >= 50) {
      const alpha = Math.min(0.65, 0.15 + (rate - 50) * 0.016);
      return { backgroundColor: `rgba(255, 193, 7, ${alpha})`, color: '#fff3cd' }; // Bootstrap warning yellow
    }
    const alpha = Math.min(0.75, 0.2 + (50 - rate) * 0.011);
    return { backgroundColor: `rgba(220, 53, 69, ${alpha})`, color: '#f8d7da' }; // Bootstrap danger red
  };

  return (
    <div className="matrix-container">
      {/* 1. Insights Cards Row (Bootstrap Grid & List Group) */}
      <div className="row g-4 mb-4">
        {/* Strongest Coalitions */}
        <div className="col-12 col-md-6">
          <div className="card bg-dark border-secondary h-100 shadow-sm">
            <div className="card-header bg-dark border-bottom border-secondary d-flex align-items-center gap-2 py-3">
              <TrendingUp size={20} className="text-success" />
              <h3 className="h6 fw-bold text-white mb-0">Najsilniejsze koalicje taktyczne</h3>
            </div>
            <ul className="list-group list-group-flush">
              {topCoalitions.map((p, idx) => (
                <li key={`${p.club1}-${p.club2}-${idx}`} className="list-group-item bg-dark text-white border-secondary d-flex justify-content-between align-items-center py-2 px-3">
                  <div className="d-flex align-items-center gap-2 fw-semibold">
                    <span className="badge bg-secondary font-monospace">{p.club1}</span>
                    <span className="text-muted">+</span>
                    <span className="badge bg-secondary font-monospace">{p.club2}</span>
                  </div>
                  <span className="font-monospace fw-bold fs-5 text-success">{p.rate}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Biggest Divides */}
        <div className="col-12 col-md-6">
          <div className="card bg-dark border-secondary h-100 shadow-sm">
            <div className="card-header bg-dark border-bottom border-secondary d-flex align-items-center gap-2 py-3">
              <TrendingDown size={20} className="text-danger" />
              <h3 className="h6 fw-bold text-white mb-0">Największe podziały w Sejmie</h3>
            </div>
            <ul className="list-group list-group-flush">
              {topDivides.map((p, idx) => (
                <li key={`${p.club1}-${p.club2}-${idx}`} className="list-group-item bg-dark text-white border-secondary d-flex justify-content-between align-items-center py-2 px-3">
                  <div className="d-flex align-items-center gap-2 fw-semibold">
                    <span className="badge bg-secondary font-monospace">{p.club1}</span>
                    <span className="text-muted">vs</span>
                    <span className="badge bg-secondary font-monospace">{p.club2}</span>
                  </div>
                  <span className="font-monospace fw-bold fs-5 text-danger">{p.rate}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Heatmap Table Box (Bootstrap Card & Table) */}
      <div className="card bg-dark border-secondary shadow">
        <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <h3 className="h5 fw-bold text-white mb-0">
            Macierz Zgodności Głosowań NxN ({total_votings_evaluated} wspólnych głosowań)
          </h3>
          <div className="d-flex align-items-center gap-3 small text-muted flex-wrap">
            <span><span className="legend-color-box-bs" style={{ background: '#198754' }}></span>Wysoka zgodność (&ge;80%)</span>
            <span><span className="legend-color-box-bs" style={{ background: '#ffc107' }}></span>Umiarkowana (50–79%)</span>
            <span><span className="legend-color-box-bs" style={{ background: '#dc3545' }}></span>Częste konflikty (&lt;50%)</span>
          </div>
        </div>

        <div className="card-body p-3 p-md-4 overflow-auto">
          <table className="table table-dark table-bordered text-center align-middle mb-0 matrix-table-bs" aria-label="Macierz zgodności głosowań między klubami">
            <thead>
              <tr>
                <th className="row-header-bs py-3">Klub / Koło</th>
                {clubs.map(c => (
                  <th key={c} className="py-3" title={`Kolumna dla klubu ${c}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map((rowClub, i) => (
                <tr key={rowClub}>
                  <th className="row-header-bs py-3">{rowClub}</th>
                  {clubs.map((colClub, j) => {
                    const isDiag = i === j;
                    const rate = matrix[i][j];
                    return (
                      <td
                        key={`${rowClub}-${colClub}`}
                        className={`matrix-cell-bs p-3 ${isDiag ? 'diagonal-bs' : ''}`}
                        style={getCellStyle(rate, isDiag)}
                        onMouseEnter={() => !isDiag && setHoveredCell({ club1: rowClub, club2: colClub, rate })}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={isDiag ? `Głosowania klubu ${rowClub}` : `Zgodność głosowań między ${rowClub} a ${colClub}: ${rate}%`}
                      >
                        {isDiag ? '—' : `${rate}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Hover Info Box (Bootstrap Alert) */}
          {hoveredCell ? (
            <div className="alert alert-info bg-dark text-white border-info d-flex align-items-center justify-content-between mt-3 mb-0 shadow-sm" role="status">
              <div>
                Zgodność głosowań między klubem <span className="badge bg-info text-dark font-monospace mx-1">{hoveredCell.club1}</span> a klubem <span className="badge bg-info text-dark font-monospace mx-1">{hoveredCell.club2}</span> wynosi dokładnie:
              </div>
              <div className={`font-monospace fw-bold fs-4 ${hoveredCell.rate >= 80 ? 'text-success' : (hoveredCell.rate >= 50 ? 'text-warning' : 'text-danger')}`}>
                {hoveredCell.rate}%
              </div>
            </div>
          ) : (
            <div className="alert alert-secondary bg-dark text-muted border-secondary d-flex align-items-center gap-2 mt-3 mb-0" role="status">
              <Info size={18} className="text-info flex-shrink-0" />
              <span>Najedź kursorem na dowolną komórkę tabeli, aby zobaczyć szczegółowe porównanie wybranej pary klubów.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgreementMatrix;
