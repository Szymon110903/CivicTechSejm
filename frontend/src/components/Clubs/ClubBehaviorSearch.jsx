import React, { useState, useEffect } from 'react';
import { Filter, Search, AlertCircle, Loader2, Calendar, Check, AlertTriangle, Users } from 'lucide-react';

const ClubBehaviorSearch = ({ appliedFilters }) => {
  const [availableClubs, setAvailableClubs] = useState([]);
  
  // Search Form State
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedDecision, setSelectedDecision] = useState('');
  const [maxCohesion, setMaxCohesion] = useState('');
  const [minCohesion, setMinCohesion] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  // Results State
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Fetch available clubs list on mount
  useEffect(() => {
    const fetchClubsList = async () => {
      try {
        const activeOnlyParam = appliedFilters.activeOnly !== undefined ? (appliedFilters.activeOnly ? 'true' : 'false') : 'true';
        const response = await fetch(`/api/clubs?term=10&active_only=${activeOnlyParam}`);
        if (response.ok) {
          const list = await response.json();
          setAvailableClubs(list);
        }
      } catch (err) {
        console.error('Błąd pobierania listy klubów do wyszukiwarki:', err);
      }
    };
    fetchClubsList();
  }, [appliedFilters.activeOnly]);

  const [searchTrigger, setSearchTrigger] = useState(0);

  // 2. Perform search trigger
  const executeSearch = (e) => {
    if (e) e.preventDefault();
    setSearchTrigger(t => t + 1);
  };

  // Trigger search on mount, filter change, or button click
  useEffect(() => {
    const fetchFilteredResults = async () => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const queryParams = new URLSearchParams({ term: '10', limit: '50' });
        if (selectedClub) queryParams.append('club_id', selectedClub);
        if (selectedDecision) queryParams.append('decision', selectedDecision);
        if (maxCohesion !== '') queryParams.append('max_cohesion', maxCohesion);
        if (minCohesion !== '') queryParams.append('min_cohesion', minCohesion);
        if (topicSearch) queryParams.append('topic', topicSearch);

        // Inherit global filters
        if (appliedFilters.fromDate) queryParams.append('date_from', appliedFilters.fromDate);
        if (appliedFilters.toDate) queryParams.append('date_to', appliedFilters.toDate);
        if (appliedFilters.minAttendance > 0) queryParams.append('min_attendance', String(appliedFilters.minAttendance));
        if (appliedFilters.closeVotingsOnly) queryParams.append('close_votings_only', 'true');
        if (appliedFilters.activeOnly !== undefined) queryParams.append('active_only', appliedFilters.activeOnly ? 'true' : 'false');

        const response = await fetch(`/api/clubs/filter?${queryParams.toString()}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Błąd wyszukiwania behawioralnego: HTTP ${response.status}`);
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredResults();
  }, [appliedFilters, selectedClub, selectedDecision, maxCohesion, minCohesion, searchTrigger, topicSearch]);

  // Quick preset handlers
  const applyPreset = (presetType) => {
    if (presetType === 'rebels') {
      setSelectedDecision('');
      setMaxCohesion('80');
      setMinCohesion('');
    } else if (presetType === 'mixed') {
      setSelectedDecision('MIXED');
      setMaxCohesion('');
      setMinCohesion('');
    } else if (presetType === 'high_cohesion') {
      setSelectedDecision('');
      setMaxCohesion('');
      setMinCohesion('98');
    }
  };

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
      case 'MIXED':
      case 'ROZŁAM':
        return <span className="badge bg-purple text-white font-monospace px-2 py-1" style={{ backgroundColor: '#6f42c1' }}>PODZIAŁ</span>;
      default:
        return <span className="badge bg-info text-dark font-monospace px-2 py-1">{dec}</span>;
    }
  };

  // Helper for metric color
  const getMetricColorClass = (val) => {
    if (val === undefined || val === null) return 'text-muted';
    if (val >= 85) return 'text-success';
    if (val >= 60) return 'text-warning';
    return 'text-danger';
  };

  // Main clubs to display in columns
  const mainClubIds = ['KO', 'PiS', 'Lewica', 'PSL-TD', 'Konfederacja'].filter(cid => 
    availableClubs.some(ac => ac.club_id === cid) || results.some(r => r.club_decisions?.[cid])
  );
  if (selectedClub && !mainClubIds.includes(selectedClub)) {
    mainClubIds.unshift(selectedClub);
  }

  return (
    <div className="club-behavior-search-container">
      {/* 1. Search Criteria Form Bar (Bootstrap Card) */}
      <div className="card bg-dark border-secondary shadow-sm mb-4">
        <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <div className="d-flex align-items-center gap-2">
            <Filter size={20} className="text-info" />
            <h3 className="h6 fw-bold text-white mb-0">Wyszukiwarka Behawioralna (Filtrowanie według decyzji, dyscypliny i rozłamów)</h3>
          </div>

          {/* Quick Presets Buttons */}
          <div className="d-flex align-items-center gap-1 small">
            <span className="text-muted me-1 d-none d-md-inline">Szybkie filtry:</span>
            <button type="button" onClick={() => applyPreset('rebels')} className="btn btn-outline-warning btn-sm py-0 px-2 small">
              <AlertTriangle size={12} className="me-1" inline="true" />
              Niska spójność (&lt;80%)
            </button>
            <button type="button" onClick={() => applyPreset('mixed')} className="btn btn-outline-info btn-sm py-0 px-2 small">
              Podział w klubie (MIXED)
            </button>
            <button type="button" onClick={() => applyPreset('high_cohesion')} className="btn btn-outline-success btn-sm py-0 px-2 small">
              Pełna dyscyplina (&ge;98%)
            </button>
          </div>
        </div>

        <div className="card-body py-3">
          <form onSubmit={executeSearch} className="row g-3 align-items-end">
            {/* Wybór Klubu */}
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label small fw-bold text-light mb-1">Badany Klub / Koło</label>
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="form-select form-select-sm bg-dark text-white border-secondary fw-semibold"
                aria-label="Wybierz badany klub"
              >
                <option value="">-- Wszystkie kluby (dowolny) --</option>
                {availableClubs.map(c => (
                  <option key={c.club_id} value={c.club_id}>
                    {c.club_id} ({c.name || c.club_id}) - {c.members_count} posł.
                  </option>
                ))}
              </select>
            </div>

            {/* Decyzja Klubu */}
            <div className="col-12 col-md-6 col-xl-2">
              <label className="form-label small fw-bold text-light mb-1">Decyzja Klubu</label>
              <select
                value={selectedDecision}
                onChange={(e) => setSelectedDecision(e.target.value)}
                className="form-select form-select-sm bg-dark text-white border-secondary fw-semibold"
                aria-label="Wybierz poszukiwaną decyzję"
              >
                <option value="">-- Dowolna --</option>
                <option value="YES">ZA (YES)</option>
                <option value="NO">PRZECIW (NO)</option>
                <option value="ABSTAIN">WSTRZYMAŁ SIĘ (ABSTAIN)</option>
                <option value="MIXED">PODZIAŁ / ROZŁAM (MIXED)</option>
              </select>
            </div>

            {/* Maksymalna spójność */}
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label small fw-bold text-light mb-1" title="pozwala znaleźć głosowania z buntownikami w klubie">
                Maks. spójność (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="np. 80"
                value={maxCohesion}
                onChange={(e) => setMaxCohesion(e.target.value)}
                className="form-control form-control-sm form-control-dark font-monospace"
                aria-label="Maksymalny próg spójności w procentach"
              />
            </div>

            {/* Minimalna spójność */}
            <div className="col-6 col-md-3 col-xl-2">
              <label className="form-label small fw-bold text-light mb-1">
                Min. spójność (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="np. 95"
                value={minCohesion}
                onChange={(e) => setMinCohesion(e.target.value)}
                className="form-control form-control-sm form-control-dark font-monospace"
                aria-label="Minimalny próg spójności w procentach"
              />
            </div>

            {/* Temat / Słowo kluczowe */}
            <div className="col-12 col-md-8 col-xl-2">
              <label className="form-label small fw-bold text-light mb-1">Szukaj w temacie</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-secondary border-secondary text-light">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="np. aborcja, wotum..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="form-control form-control-dark"
                  aria-label="Słowo kluczowe w temacie"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="col-12 col-md-4 col-xl-1">
              <button type="submit" className="btn btn-info btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-1 py-1">
                <Search size={16} />
                <span>Szukaj</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
          <div className="card-body py-5">
            <Loader2 size={36} className="text-info mb-3" style={{ animation: 'spin 1s linear infinite' }} />
            <h3 className="h4 text-white">Przeszukiwanie bazy zachowań parlamentarnych...</h3>
            <p className="text-muted mb-0">Filtrowanie głosowań pod kątem dyscypliny i wskazanych progów kohezji.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="alert alert-danger d-flex align-items-center gap-3 my-4 shadow" role="alert">
          <AlertCircle size={32} className="flex-shrink-0" />
          <div>
            <h4 className="alert-heading h5 mb-1">Wystąpił błąd podczas wyszukiwania</h4>
            <p className="mb-0 small">{error}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && hasSearched && (
        <div className="card bg-dark border-secondary shadow">
          <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
            <div className="d-flex align-items-center gap-2">
              <Calendar size={18} className="text-info" />
              <h3 className="h6 fw-bold text-white mb-0">
                Znalezione głosowania ({results.length} wyników)
              </h3>
            </div>
            {selectedClub && (
              <span className="badge bg-secondary text-light font-monospace small px-2 py-1">
                Wskaźniki dla klubu głównych kolumn (w nawiasie kohezja %)
              </span>
            )}
          </div>

          <div className="card-body p-0 overflow-auto">
            <table className="table table-dark table-hover table-bordered align-middle text-center mb-0" aria-label="Tabela wyników wyszukiwarki behawioralnej">
              <thead className="table-secondary text-dark">
                <tr>
                  <th scope="col" className="py-3" style={{ width: '150px' }}>Data i Posiedz.</th>
                  <th scope="col" className="py-3 text-start">Tytuł / Przedmiot Głosowania</th>
                  <th scope="col" className="py-3" style={{ width: '110px' }}>Wynik Sejmu</th>
                  {mainClubIds.map(cid => (
                    <th key={cid} scope="col" className={`py-3 ${selectedClub === cid ? 'bg-primary text-white fw-bold' : ''}`} style={{ width: '130px' }}>
                      {cid} {selectedClub === cid ? '(Badany)' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={3 + mainClubIds.length} className="py-5 text-muted text-center">
                      Brak głosowań spełniających wybrane kryteria behawioralne. Spróbuj poluzować próg spójności (np. maks. spójność 90%).
                    </td>
                  </tr>
                ) : (
                  results.map((item) => (
                    <tr key={item.voting_id}>
                      <td className="font-monospace small text-muted">
                        <div className="fw-bold text-light">{item.date}</div>
                        <div style={{ fontSize: '0.7rem' }}>Posiedzenie nr {item.sitting}</div>
                        <div style={{ fontSize: '0.7rem' }}>Głosowanie #{item.voting_number}</div>
                      </td>
                      <td className="text-start">
                        <div className="fw-semibold text-white small mb-1">{item.title}</div>
                        {item.topic && <div className="text-muted" style={{ fontSize: '0.75rem', maxWidth: '450px', whiteSpace: 'normal' }}>{item.topic}</div>}
                      </td>
                      <td>
                        {item.passed ? (
                          <span className="badge bg-success font-monospace px-2 py-1">PRZYJĘTO</span>
                        ) : (
                          <span className="badge bg-danger font-monospace px-2 py-1">ODRZUCONO</span>
                        )}
                      </td>
                      {mainClubIds.map(cid => {
                        const dec = item.club_decisions?.[cid];
                        const coh = item.club_cohesions?.[cid];
                        const isSelected = selectedClub === cid;

                        return (
                          <td key={cid} className={isSelected ? 'bg-secondary bg-opacity-10' : ''}>
                            <div className="d-flex flex-column align-items-center gap-1">
                              {renderDecisionBadge(dec)}
                              {coh !== undefined && coh !== null && (
                                <span className={`font-monospace small fw-bold ${getMetricColorClass(coh)}`} style={{ fontSize: '0.75rem' }} title={`Kohezja w klubie ${cid}: ${coh}%`}>
                                  ({coh}%)
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubBehaviorSearch;
