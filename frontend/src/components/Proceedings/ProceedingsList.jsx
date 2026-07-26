import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Search, RefreshCw, AlertCircle, ChevronRight, CheckCircle2, XCircle, Maximize2, Minimize2 } from 'lucide-react';
import './Proceedings.css';

const ProceedingsList = () => {
  const { id: urlParamId } = useParams();
  const navigate = useNavigate();

  const [proceedings, setProceedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filter Query
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion open state: Set of opened proceeding numbers
  const [expandedProceedings, setExpandedProceedings] = useState(new Set());

  // Cache fetched votings per proceeding number: { [procNum]: { loading: bool, error: str, data: object } }
  const [votingsCache, setVotingsCache] = useState({});

  // Fetch initial list of proceedings
  useEffect(() => {
    const fetchProceedings = async () => {
      try {
        const response = await fetch('/api/proceedings/');
        if (!response.ok) {
          throw new Error('Nie udało się pobrać listy posiedzeń');
        }
        const data = await response.json();
        const sortedData = data.sort((a, b) => b.number - a.number);
        setProceedings(sortedData);

        // If URL has /posiedzenia/:id, auto-expand that proceeding
        if (urlParamId && !isNaN(Number(urlParamId))) {
          const targetNum = Number(urlParamId);
          setExpandedProceedings(new Set([targetNum]));
          fetchVotingsForProceeding(targetNum);
        } else if (sortedData.length > 0 && !urlParamId) {
          // Auto-expand the latest proceeding by default
          const latestNum = sortedData[0].number;
          setExpandedProceedings(new Set([latestNum]));
          fetchVotingsForProceeding(latestNum);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProceedings();
  }, [urlParamId]);

  // Function to fetch votings for a specific proceeding
  const fetchVotingsForProceeding = async (procNum) => {
    if (votingsCache[procNum]?.data || votingsCache[procNum]?.loading) {
      return;
    }

    setVotingsCache((prev) => ({
      ...prev,
      [procNum]: { loading: true, error: null, data: null }
    }));

    try {
      const response = await fetch(`/api/votings/proceedings/${procNum}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Brak zsynchronizowanych głosowań dla tego posiedzenia. Kliknij synchronizuj lub poczekaj na zadanie w tle.');
        }
        throw new Error('Błąd podczas pobierania głosowań');
      }
      const data = await response.json();
      setVotingsCache((prev) => ({
        ...prev,
        [procNum]: { loading: false, error: null, data }
      }));
    } catch (err) {
      setVotingsCache((prev) => ({
        ...prev,
        [procNum]: { loading: false, error: err.message, data: null }
      }));
    }
  };

  // Toggle proceeding accordion open/close
  const toggleProceeding = (procNum) => {
    setExpandedProceedings((prev) => {
      const next = new Set(prev);
      if (next.has(procNum)) {
        next.delete(procNum);
      } else {
        next.add(procNum);
        fetchVotingsForProceeding(procNum);
      }
      return next;
    });
  };

  // Expand all proceedings
  const expandAll = () => {
    const allNums = proceedings.map((p) => p.number);
    setExpandedProceedings(new Set(allNums));
    allNums.forEach((num) => fetchVotingsForProceeding(num));
  };

  // Collapse all proceedings
  const collapseAll = () => {
    setExpandedProceedings(new Set());
  };

  // Filter proceedings based on search query
  const filteredProceedings = proceedings.filter((proc) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (proc.title || '').toLowerCase().includes(query);
    const numMatch = String(proc.number).includes(query);
    const dateMatch = (proc.dates || []).some((d) => d.toLowerCase().includes(query));
    return titleMatch || numMatch || dateMatch;
  });

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}></div>
        <h3 className="h4 text-muted">Ładowanie posiedzeń Sejmu...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger text-center p-5 shadow-sm rounded-3 max-w-lg mx-auto border border-danger">
          <AlertCircle size={48} className="mb-3 text-danger" />
          <h3 className="h4 fw-bold">Błąd połączenia</h3>
          <p className="lead mb-4">{error}</p>
          <button className="btn btn-danger px-4 py-2 fw-bold" onClick={() => window.location.reload()}>Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 text-light">
      {/* Page Header & Search Bar Card */}
      <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary">
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-lg-6">
              <h2 className="h2 fw-bold text-light mb-2">Posiedzenia Sejmu</h2>
              <p className="text-muted mb-0">
                Rozwiń posiedzenie z listy poniżej, aby przeglądać poszczególne głosowania. Kliknięcie w głosowanie otworzy osobną stronę ze szczegółowymi wynikami oraz drukami sejmowymi.
              </p>
            </div>

            <div className="col-lg-6">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end align-items-stretch">
                <div className="input-group shadow-sm flex-grow-1">
                  <span className="input-group-text bg-body-secondary border-secondary text-muted">
                    <Search size={18} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Szukaj po numerze lub tytule..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control bg-body border-secondary text-light ps-0"
                  />
                  {searchQuery && (
                    <button className="btn btn-outline-secondary border-secondary text-light" type="button" onClick={() => setSearchQuery('')}>&times;</button>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-1 fw-medium text-nowrap shadow-sm flex-fill" 
                    onClick={expandAll} 
                    disabled={expandedProceedings.size === proceedings.length && proceedings.length > 0}
                    title="Rozwiń wszystkie posiedzenia"
                  >
                    <Maximize2 size={16} />
                    <span>Rozwiń wszystkie</span>
                  </button>

                  <button 
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-1 fw-medium text-nowrap shadow-sm flex-fill" 
                    onClick={collapseAll} 
                    disabled={expandedProceedings.size === 0}
                    title="Zwiń wszystkie posiedzenia"
                  >
                    <Minimize2 size={16} />
                    <span>Zwiń wszystkie</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion List of Proceedings */}
      <div className="accordion shadow-sm" id="proceedingsAccordion">
        {filteredProceedings.length === 0 ? (
          <div className="alert alert-warning text-center p-5 rounded-3 mb-0 border border-warning">
            <AlertCircle size={32} className="mb-2" />
            <p className="mb-0 fs-5">Nie znaleziono posiedzeń spełniających kryteria wyszukiwania.</p>
          </div>
        ) : (
          filteredProceedings.map((proceeding) => {
            const isExpanded = expandedProceedings.has(proceeding.number);
            const cacheEntry = votingsCache[proceeding.number];
            const datesList = proceeding.dates || [];
            const displayDate = datesList.length > 0 
              ? (datesList.length === 1 ? datesList[0] : `${datesList[0]} - ${datesList[datesList.length - 1]}`)
              : 'Brak daty';

            // Calculate votings count to display before expanding
            const votingsCount = proceeding.votings_count !== undefined
              ? proceeding.votings_count
              : (cacheEntry?.data?.days?.reduce((acc, d) => acc + d.votings.length, 0) || 0);

            return (
              <div 
                key={proceeding.number} 
                className="accordion-item border border-secondary mb-3 rounded-3 overflow-hidden shadow-sm bg-body"
                id={`proceeding-item-${proceeding.number}`}
              >
                {/* Clickable Accordion Header */}
                <h2 className="accordion-header m-0" id={`heading-${proceeding.number}`}>
                  <button 
                    className={`accordion-button ${isExpanded ? '' : 'collapsed'} p-4 bg-body-tertiary text-light d-flex align-items-center flex-wrap gap-3`}
                    type="button"
                    onClick={() => toggleProceeding(proceeding.number)}
                    aria-expanded={isExpanded}
                  >
                    <div className="d-flex align-items-center gap-3 flex-grow-1 flex-wrap me-2">
                      <span className="badge bg-primary px-3 py-2 fs-6 shadow-sm">Posiedzenie nr {proceeding.number}</span>
                      <span className="fw-bold fs-5 text-light me-auto">{proceeding.title}</span>
                      
                      <span className="badge bg-info text-dark px-3 py-2 fs-6 d-flex align-items-center gap-1 shadow-sm">
                        <span>📊 Głosowań:</span>
                        <strong className="fs-6">{votingsCount}</strong>
                      </span>

                      <span className="badge bg-body-secondary text-light border border-secondary d-flex align-items-center gap-2 px-3 py-2 fs-6">
                        <Calendar size={16} className="text-primary" />
                        <span>{displayDate}</span>
                      </span>
                    </div>
                  </button>
                </h2>

                {/* Expanded Accordion Body (List of Votings) */}
                <div 
                  id={`collapse-${proceeding.number}`} 
                  className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                >
                  <div className="accordion-body bg-body p-4 border-top border-secondary">
                    {cacheEntry?.loading ? (
                      <div className="text-center p-5">
                        <div className="spinner-border text-primary mb-3" role="status"></div>
                        <p className="text-muted mb-0 fs-5">Pobieranie listy głosowań i wyników z archiwum Sejmu...</p>
                      </div>
                    ) : cacheEntry?.error ? (
                      <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-3 p-4 rounded-3 mb-0 border border-danger">
                        <div className="d-flex align-items-center gap-2">
                          <AlertCircle size={24} />
                          <span className="fs-6">{cacheEntry.error}</span>
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 fw-bold" 
                          onClick={() => fetchVotingsForProceeding(proceeding.number)}
                        >
                          <RefreshCw size={16} /> Odśwież
                        </button>
                      </div>
                    ) : !cacheEntry?.data?.days || cacheEntry.data.days.length === 0 ? (
                      <div className="text-center p-5 bg-body-tertiary rounded-3 border border-secondary border-dashed">
                        <p className="text-muted mb-0 fs-5">Brak zarejestrowanych głosowań w systemie dla tego posiedzenia.</p>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-4">
                        {cacheEntry.data.days.map((day) => (
                          <div key={day.date} className="day-votings-group">
                            <div className="d-flex align-items-center gap-2 pb-2 mb-3 border-bottom border-secondary border-2">
                              <span className="fs-5">📅</span>
                              <h4 className="h5 fw-bold mb-0 text-light">Głosowania z dnia: {day.date}</h4>
                              <span className="badge bg-secondary rounded-pill ms-2">{day.votings.length} głosowań</span>
                            </div>

                            {/* List of Votings */}
                            <div className="list-group shadow-sm rounded-3 overflow-hidden border border-secondary">
                              {day.votings.map((voting) => (
                                <button
                                  type="button"
                                  key={voting.id || voting.voting_number}
                                  className="list-group-item list-group-item-action p-3 p-md-4 d-flex justify-content-between align-items-center flex-wrap gap-3 border-bottom border-secondary bg-body-tertiary text-light"
                                  onClick={() => navigate(`/glosowania/${voting.id || voting.voting_number}`, {
                                    state: {
                                      voting,
                                      sitting: proceeding.number,
                                      date: day.date,
                                      fromProceeding: proceeding.number
                                    }
                                  })}
                                  title="Kliknij, aby otworzyć osobną stronę ze szczegółami i drukami"
                                >
                                  <div className="d-flex align-items-start gap-3 flex-grow-1 me-md-3">
                                    <span className="badge bg-secondary px-2 py-2 fs-6 font-monospace mt-1">#{voting.voting_number}</span>
                                    <div>
                                      <h5 className="mb-1 fw-bold text-light fs-6">{voting.title}</h5>
                                      {voting.topic && (
                                        <span className="badge bg-body text-light border border-secondary small mt-1 text-wrap text-start">
                                          {voting.topic}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center justify-content-between justify-content-md-end gap-4 w-100 w-md-auto border-top border-secondary border-md-top-0 pt-2 pt-md-0 mt-2 mt-md-0">
                                    <div className="text-start text-md-end">
                                      <div className="mb-1">
                                        <span className={`badge ${voting.results?.passed ? 'bg-success' : 'bg-danger'} px-3 py-1 fs-6 shadow-sm`}>
                                          {voting.results?.passed ? <CheckCircle2 size={14} className="me-1 d-inline" /> : <XCircle size={14} className="me-1 d-inline" />}
                                          {voting.results?.passed ? 'UCHWALONO' : 'ODRZUCONO'}
                                        </span>
                                      </div>
                                      <div className="small text-muted">
                                        Za: <strong className="text-success">{voting.results?.yes || 0}</strong> &bull; 
                                        Prz: <strong className="text-danger">{voting.results?.no || 0}</strong> &bull; 
                                        Wstrz: <strong className="text-warning">{voting.results?.abstain || 0}</strong>
                                      </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-1 text-primary fw-bold small text-nowrap">
                                      <span>Szczegóły</span>
                                      <ChevronRight size={18} />
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProceedingsList;
