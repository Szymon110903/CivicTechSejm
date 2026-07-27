import React, { useState, useEffect } from 'react';
import { GitCompare, Users, Award, Check, X, AlertCircle, Loader2, ArrowRight, Filter, Calendar } from 'lucide-react';

const ClubComparison = ({ appliedFilters }) => {
  const [availableClubs, setAvailableClubs] = useState([]);
  const [selectedClub1, setSelectedClub1] = useState('');
  const [selectedClub2, setSelectedClub2] = useState('');
  const [selectedClub3, setSelectedClub3] = useState('');
  
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOnlyDisagreements, setShowOnlyDisagreements] = useState(false);

  // 1. Fetch available clubs list on mount
  useEffect(() => {
    const fetchClubsList = async () => {
      try {
        const response = await fetch('/api/clubs?term=10');
        if (response.ok) {
          const list = await response.json();
          setAvailableClubs(list);
          // Default selection: KO and PiS (or first two available)
          if (list.length >= 2) {
            const ko = list.find(c => c.club_id === 'KO' || c.name?.includes('Koalicja Obywatelska'));
            const pis = list.find(c => c.club_id === 'PiS' || c.name?.includes('Prawo i Sprawiedliwość'));
            setSelectedClub1(ko ? ko.club_id : list[0].club_id);
            setSelectedClub2(pis ? pis.club_id : list[1].club_id);
          }
        }
      } catch (err) {
        console.error('Błąd pobierania listy klubów do porównywarki:', err);
      }
    };
    fetchClubsList();
  }, []);

  // 2. Fetch comparison data whenever selected clubs or filters change
  useEffect(() => {
    const fetchComparison = async () => {
      if (!selectedClub1 || !selectedClub2 || selectedClub1 === selectedClub2) {
        setComparisonData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ term: '10', limit: '100' });
        queryParams.append('clubs', selectedClub1);
        queryParams.append('clubs', selectedClub2);
        if (selectedClub3 && selectedClub3 !== selectedClub1 && selectedClub3 !== selectedClub2) {
          queryParams.append('clubs', selectedClub3);
        }

        if (appliedFilters.fromDate) queryParams.append('from_date', appliedFilters.fromDate);
        if (appliedFilters.toDate) queryParams.append('to_date', appliedFilters.toDate);
        if (appliedFilters.minAttendance > 0) queryParams.append('min_attendance', String(appliedFilters.minAttendance));
        if (appliedFilters.closeVotingsOnly) queryParams.append('close_votings_only', 'true');

        const response = await fetch(`/api/clubs/compare?${queryParams.toString()}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Błąd porównywania klubów: HTTP ${response.status}`);
        }

        const data = await response.json();
        setComparisonData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [selectedClub1, selectedClub2, selectedClub3, appliedFilters]);

  // Helper for decision badges using Bootstrap classes
  const renderDecisionBadge = (dec) => {
    if (!dec) return <span className="badge bg-secondary">—</span>;
    switch (dec.toUpperCase()) {
      case 'YES':
      case 'ZA':
        return <span className="badge bg-success font-monospace px-2 py-1">ZA</span>;
      case 'NO':
      case 'PRZECIW':
        return <span className="badge bg-danger font-monospace px-2 py-1">PRZECIW</span>;
      case 'ABSTAIN':
      case 'WSTRZYMAŁ SIĘ':
        return <span className="badge bg-warning text-dark font-monospace px-2 py-1">WSTRZYMAŁ SIĘ</span>;
      default:
        return <span className="badge bg-info text-dark font-monospace px-2 py-1">{dec}</span>;
    }
  };

  // Helper for metric color
  const getMetricColorClass = (val) => {
    if (val >= 80) return 'text-success';
    if (val >= 50) return 'text-warning';
    return 'text-danger';
  };

  // Filtered history
  const historyItems = comparisonData?.comparison_history || [];
  const displayedHistory = showOnlyDisagreements 
    ? historyItems.filter(item => !item.agreed) 
    : historyItems;

  const activeClubsCount = [selectedClub1, selectedClub2, selectedClub3].filter(Boolean).length;

  return (
    <div className="club-comparison-container">
      {/* 1. Club Selector Form Bar (Bootstrap Card) */}
      <div className="card bg-dark border-secondary shadow-sm mb-4">
        <div className="card-header bg-dark border-bottom border-secondary d-flex align-items-center gap-2 py-3">
          <GitCompare size={20} className="text-primary" />
          <h3 className="h6 fw-bold text-white mb-0">Wybierz kluby lub koła do bezpośredniej konfrontacji (2–3 kluby)</h3>
        </div>
        <div className="card-body py-3">
          <div className="row g-3 align-items-center">
            {/* Club 1 */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-light mb-1">Pierwszy Klub (Główny)</label>
              <select
                value={selectedClub1}
                onChange={(e) => setSelectedClub1(e.target.value)}
                className="form-select form-select-sm bg-dark text-white border-secondary fw-semibold"
                aria-label="Wybierz pierwszy klub"
              >
                <option value="">-- Wybierz klub --</option>
                {availableClubs.map(c => (
                  <option key={c.club_id} value={c.club_id}>
                    {c.club_id} ({c.name || c.club_id}) - {c.members_count} posł.
                  </option>
                ))}
              </select>
            </div>

            {/* Club 2 */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-light mb-1">Drugi Klub (Oponent / Partner)</label>
              <select
                value={selectedClub2}
                onChange={(e) => setSelectedClub2(e.target.value)}
                className="form-select form-select-sm bg-dark text-white border-secondary fw-semibold"
                aria-label="Wybierz drugi klub"
              >
                <option value="">-- Wybierz klub --</option>
                {availableClubs.map(c => (
                  <option key={c.club_id} value={c.club_id} disabled={c.club_id === selectedClub1}>
                    {c.club_id} ({c.name || c.club_id}) - {c.members_count} posł.
                  </option>
                ))}
              </select>
            </div>

            {/* Club 3 (Optional) */}
            <div className="col-12 col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">Trzeci Klub (Opcjonalnie)</label>
              <div className="input-group input-group-sm">
                <select
                  value={selectedClub3}
                  onChange={(e) => setSelectedClub3(e.target.value)}
                  className="form-select bg-dark text-white border-secondary fw-semibold"
                  aria-label="Wybierz opcjonalny trzeci klub"
                >
                  <option value="">-- Brak (tylko 2 kluby) --</option>
                  {availableClubs.map(c => (
                    <option key={c.club_id} value={c.club_id} disabled={c.club_id === selectedClub1 || c.club_id === selectedClub2}>
                      {c.club_id} ({c.name || c.club_id})
                    </option>
                  ))}
                </select>
                {selectedClub3 && (
                  <button 
                    type="button" 
                    onClick={() => setSelectedClub3('')} 
                    className="btn btn-outline-secondary d-flex align-items-center"
                    title="Usuń trzeci klub"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedClub1 && selectedClub2 && selectedClub1 === selectedClub2 && (
            <div className="alert alert-warning py-2 px-3 mt-3 mb-0 small d-flex align-items-center gap-2" role="alert">
              <AlertCircle size={16} />
              <span>Wybierz dwa różne kluby, aby dokonać analizy porównawczej.</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
          <div className="card-body py-5">
            <Loader2 size={36} className="text-primary mb-3" style={{ animation: 'spin 1s linear infinite' }} />
            <h3 className="h4 text-white">Zestawianie historii głosowań wybranych klubów...</h3>
            <p className="text-muted mb-0">Analizowanie zgodności decyzji i wyliczanie wskaźników kohezji.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="alert alert-danger d-flex align-items-center gap-3 my-4 shadow" role="alert">
          <AlertCircle size={32} className="flex-shrink-0" />
          <div>
            <h4 className="alert-heading h5 mb-1">Wystąpił błąd podczas konfrontacji klubów</h4>
            <p className="mb-0 small">{error}</p>
          </div>
        </div>
      )}

      {/* Comparison Content */}
      {!loading && !error && comparisonData && (
        <>
          {/* 2. Hero Alignment Score Card */}
          <div className="card bg-dark border-secondary shadow mb-4">
            <div className="card-body p-4 text-center">
              <div className="small text-uppercase text-muted fw-bold mb-2 tracking-wide">
                Ogólny wskaźnik zgodności głosowań w wybranym przedziale
              </div>
              <div className="d-flex align-items-center justify-content-center flex-wrap gap-3 my-2">
                {comparisonData.clubs.map((c, i) => (
                  <React.Fragment key={c.club_id}>
                    <span className="badge bg-secondary font-monospace fs-5 py-2 px-3 shadow-sm border border-secondary">
                      {c.club_id}
                    </span>
                    {i < comparisonData.clubs.length - 1 && (
                      <span className="text-muted fw-bold fs-4">vs</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className={`display-3 fw-bold font-monospace my-3 ${getMetricColorClass(comparisonData.alignment_percent)}`}>
                {comparisonData.alignment_percent}%
              </div>
              <p className="text-muted small max-w-md mx-auto mb-0" style={{ maxWidth: '650px' }}>
                Kluby te zagłosowały **identycznie w {Math.round((comparisonData.alignment_percent / 100) * comparisonData.common_votings)} z {comparisonData.common_votings} wspólnych głosowań**. 
                {comparisonData.alignment_percent >= 80 
                  ? ' Świadczy to o ścisłej koalicji taktycznej i wspólnym bloku programowym.' 
                  : (comparisonData.alignment_percent >= 50 
                    ? ' Wykazują umiarkowaną współpracę przy projektach niebędących przedmiotem ostrego sporu politycznego.' 
                    : ' Wykazują zasadniczą rozbieżność stanowisk i znajdują się po przeciwnych stronach politycznego sporu.')}
              </p>
            </div>
          </div>

          {/* 3. Side-by-Side Club Summary Cards (Bootstrap Grid) */}
          <div className="row g-3 mb-4">
            {comparisonData.clubs.map((club) => {
              const dec = club.decisions_breakdown || { YES: 0, NO: 0, ABSTAIN: 0, MIXED: 0 };
              const totalDec = (dec.YES + dec.NO + dec.ABSTAIN + dec.MIXED) || 1;
              const yesPct = ((dec.YES / totalDec) * 100).toFixed(1);
              const noPct = ((dec.NO / totalDec) * 100).toFixed(1);
              const abstainPct = ((dec.ABSTAIN / totalDec) * 100).toFixed(1);

              return (
                <div key={club.club_id} className={`col-12 col-md-${12 / activeClubsCount}`}>
                  <div className="card bg-dark border-secondary h-100 shadow-sm">
                    <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h4 className="h5 fw-bold text-white mb-0">{club.club_id}</h4>
                        <div className="small text-muted">{club.name}</div>
                      </div>
                      <span className="badge bg-info text-dark font-monospace fs-6 px-2 py-1">
                        <Users size={14} className="me-1" inline="true" />
                        {club.members_count} posł.
                      </span>
                    </div>
                    <div className="card-body py-3">
                      <div className="row g-2 text-center mb-3">
                        <div className="col-6">
                          <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary">
                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Frekwencja</div>
                            <div className="fw-bold font-monospace text-light fs-5">{club.avg_attendance}%</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary">
                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Dyscyplina</div>
                            <div className={`fw-bold font-monospace fs-5 ${getMetricColorClass(club.avg_cohesion)}`}>{club.avg_cohesion}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Decisions breakdown bar */}
                      <div className="small text-muted d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                        <span>Rozkład głosów (wspólne)</span>
                        <span className="font-monospace text-light">{club.total_votings} głos.</span>
                      </div>
                      <div className="progress bg-secondary bg-opacity-25 mb-2" style={{ height: '10px' }}>
                        {dec.YES > 0 && <div className="progress-bar bg-success" style={{ width: `${yesPct}%` }} title={`Za: ${yesPct}%`}></div>}
                        {dec.NO > 0 && <div className="progress-bar bg-danger" style={{ width: `${noPct}%` }} title={`Przeciw: ${noPct}%`}></div>}
                        {dec.ABSTAIN > 0 && <div className="progress-bar bg-warning" style={{ width: `${abstainPct}%` }} title={`Wstrzymał się: ${abstainPct}%`}></div>}
                      </div>
                      <div className="d-flex justify-content-around small text-muted" style={{ fontSize: '0.7rem' }}>
                        <span className="text-success fw-semibold">Za: {dec.YES}</span>
                        <span className="text-danger fw-semibold">Przeciw: {dec.NO}</span>
                        <span className="text-warning fw-semibold">Wstrz.: {dec.ABSTAIN}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Comparison History Table (Bootstrap Table) */}
          <div className="card bg-dark border-secondary shadow">
            <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
              <div className="d-flex align-items-center gap-2">
                <Calendar size={18} className="text-info" />
                <h3 className="h6 fw-bold text-white mb-0">
                  Historia wspólnych głosowań ({displayedHistory.length} z {comparisonData.common_votings} wykazanych)
                </h3>
              </div>

              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="disagreementsOnlySwitch"
                  checked={showOnlyDisagreements}
                  onChange={(e) => setShowOnlyDisagreements(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-check-label text-light small fw-semibold pe-1" htmlFor="disagreementsOnlySwitch" style={{ cursor: 'pointer' }}>
                  Pokaż tylko punkty sporne (rozbieżne decyzje)
                </label>
              </div>
            </div>

            <div className="card-body p-0 overflow-auto">
              <table className="table table-dark table-hover table-bordered align-middle text-center mb-0" aria-label="Tabela porównania historii głosowań">
                <thead className="table-secondary text-dark">
                  <tr>
                    <th scope="col" className="py-3" style={{ width: '150px' }}>Data i Posiedz.</th>
                    <th scope="col" className="py-3 text-start">Temat / Tytuł Głosowania</th>
                    <th scope="col" className="py-3" style={{ width: '110px' }}>Wynik Sejmu</th>
                    {comparisonData.clubs.map(c => (
                      <th key={c.club_id} scope="col" className="py-3" style={{ width: '120px' }}>
                        Decyzja {c.club_id}
                      </th>
                    ))}
                    <th scope="col" className="py-3" style={{ width: '130px' }}>Zgodność</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3 + comparisonData.clubs.length + 1} className="py-5 text-muted text-center">
                        Brak głosowań spełniających wybrane kryteria (np. brak punktów spornych w wybranym okresie).
                      </td>
                    </tr>
                  ) : (
                    displayedHistory.map((item) => (
                      <tr key={item.voting_id} className={!item.agreed ? 'table-danger table-opacity-10' : ''}>
                        <td className="font-monospace small text-muted">
                          <div className="fw-bold text-light">{item.date}</div>
                          <div style={{ fontSize: '0.7rem' }}>Posiedzenie nr {item.sitting}</div>
                          <div style={{ fontSize: '0.7rem' }}>Głosowanie #{item.voting_number}</div>
                        </td>
                        <td className="text-start">
                          <div className="fw-semibold text-white small mb-1">{item.title}</div>
                          {item.topic && <div className="text-muted" style={{ fontSize: '0.75rem', maxWidth: '400px', whiteSpace: 'normal' }}>{item.topic}</div>}
                        </td>
                        <td>
                          {item.passed ? (
                            <span className="badge bg-success font-monospace px-2 py-1">PRZYJĘTO</span>
                          ) : (
                            <span className="badge bg-danger font-monospace px-2 py-1">ODRZUCONO</span>
                          )}
                        </td>
                        {comparisonData.clubs.map(c => (
                          <td key={c.club_id}>
                            {renderDecisionBadge(item.decisions[c.club_id])}
                          </td>
                        ))}
                        <td>
                          {item.agreed ? (
                            <span className="badge bg-success bg-opacity-25 text-success border border-success d-inline-flex align-items-center gap-1 px-2 py-1">
                              <Check size={12} />
                              <span>Zgodne</span>
                            </span>
                          ) : (
                            <span className="badge bg-danger bg-opacity-25 text-danger border border-danger d-inline-flex align-items-center gap-1 px-2 py-1">
                              <X size={12} />
                              <span>Sporne</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClubComparison;
