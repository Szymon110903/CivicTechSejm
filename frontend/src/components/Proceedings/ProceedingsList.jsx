import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Search, RefreshCw, AlertCircle, ChevronRight, CheckCircle2, XCircle, Maximize2, Minimize2, Filter, Flame, FileText, Settings, Layers } from 'lucide-react';
import './Proceedings.css';

// Helper function to categorize voting into substantive/bills vs procedural
const getVotingCategory = (voting) => {
  const text = `${voting.title || ''} ${voting.topic || ''} ${voting.description || ''}`.toLowerCase();
  
  // 1. Procedural keywords (Wnioski formalne, przerwy, quorum, odroczenie, porządek obrad)
  const proceduralKeywords = [
    'przerwę', 'przerwa', 'o przerwę', 'quorum', 'kworum', 'stwierdzenie quorum', 
    'wniosek formalny', 'wniosku formalnego', 'wnioski formalne',
    'porządek dzienny', 'porządku dziennego', 'uzupełnienie porządku', 'zmianę porządku',
    'odroczenie', 'o odroczenie', 'odroczenia', 
    'sposobu prowadzenia', 'sposób prowadzenia', 'zamknięcie dyskusji', 
    'łączną dyskusję', 'łącznego rozpatrzenia',
    'tajność obrad', 'tajnego', 'ograniczenie czasu', 'przejście do porządku'
  ];
  
  if (proceduralKeywords.some(kw => text.includes(kw))) {
    return 'procedural';
  }

  // 2. Bills / Resolutions keywords (Ustawy, Uchwały, Sprawozdania)
  const billKeywords = [
    'projekt ustawy', 'ustawie', 'ustawy', 'ustawa',
    'projekt uchwały', 'uchwale', 'uchwały', 'uchwała',
    'sprawozdanie komisji', 'senatu', 'weto', 'veto', 'przedłożenie',
    'wybór', 'powołanie', 'odwołanie'
  ];
  
  if (billKeywords.some(kw => text.includes(kw))) {
    return 'bill';
  }

  // 3. Substantive / General
  return 'substantive';
};

// Helper to check if a proceeding is planned / future / invalid / not yet conducted
const isPlannedOrInvalidProceeding = (proc, cacheEntry) => {
  if (!proc || !proc.number || Number(proc.number) <= 0) return true;
  if ((proc.title || '').toLowerCase().includes('planowane')) return true;

  const dates = proc.dates || [];
  if (dates.length === 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(dates[0]);
  if (startDate > today) {
    return true;
  }

  const count = proc.votings_count !== undefined
    ? proc.votings_count
    : (cacheEntry?.data?.days?.reduce((acc, d) => acc + d.votings.length, 0) || 0);

  if (startDate >= today && count === 0) {
    return true;
  }

  return false;
};

const ProceedingsList = () => {
  const { id: urlParamId } = useParams();
  const navigate = useNavigate();

  const [proceedings, setProceedings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filter Query
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter for votings: 'important' (default!), 'all', 'bills', 'procedural'
  const [categoryFilter, setCategoryFilter] = useState('important');

  // Accordion open state: Set of opened proceeding numbers
  const [expandedProceedings, setExpandedProceedings] = useState(new Set());

  // Nested Accordion state: Set of opened day identifiers "proceedingNum-dayDate"
  const [expandedDays, setExpandedDays] = useState(new Set());

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

      // Auto-expand the latest day of this proceeding by default
      if (data?.days && data.days.length > 0) {
        setExpandedDays((prevDays) => {
          const next = new Set(prevDays);
          next.add(`${procNum}-${data.days[0].date}`);
          return next;
        });
      }
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

  // Toggle day accordion open/close inside an expanded proceeding
  const toggleDay = (procNum, dayDate) => {
    const key = `${procNum}-${dayDate}`;
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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

  // Expand all days for a specific proceeding
  const expandAllDaysForProceeding = (procNum, days) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      days.forEach((d) => next.add(`${procNum}-${d.date}`));
      return next;
    });
  };

  // Collapse all days for a specific proceeding
  const collapseAllDaysForProceeding = (procNum, days) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      days.forEach((d) => next.delete(`${procNum}-${d.date}`));
      return next;
    });
  };

  // Filter proceedings based on search query and exclude planned/invalid (number <= 0) proceedings
  const filteredProceedings = proceedings.filter((proc) => {
    if (isPlannedOrInvalidProceeding(proc, votingsCache[proc?.number])) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (proc.title || '').toLowerCase().includes(query);
    const numMatch = String(proc.number).includes(query);
    const dateMatch = (proc.dates || []).some((d) => d.toLowerCase().includes(query));
    return titleMatch || numMatch || dateMatch;
  });

  // Filter votings list by selected category
  const filterVotingsByCategory = (votings) => {
    return votings.filter((voting) => {
      const cat = getVotingCategory(voting);
      if (categoryFilter === 'important') {
        return cat !== 'procedural';
      }
      if (categoryFilter === 'bills') {
        return cat === 'bill';
      }
      if (categoryFilter === 'procedural') {
        return cat === 'procedural';
      }
      return true; // 'all'
    });
  };

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
      {/* Page Header, Search Bar & Advanced Category Filter Card */}
      <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary">
        <div className="card-body p-4">
          <div className="row align-items-center g-3 mb-4">
            <div className="col-lg-6">
              <h2 className="h2 fw-bold text-light mb-2 d-flex align-items-center gap-2">
                <Layers size={28} className="text-primary" />
                <span>Posiedzenia Sejmu</span>
              </h2>
              <p className="text-muted mb-0">
                Przeglądaj posiedzenia obrad Sejmu. Skorzystaj z filtrów kategorii poniżej, aby odsiać procedury formalne i skupić się na najważniejszych ustawach i uchwałach.
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

          {/* Advanced Votings Category Filter Bar */}
          <div className="p-3 bg-body rounded-3 border border-secondary shadow-sm">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span className="text-muted small fw-bold d-flex align-items-center gap-1 me-2">
                  <Filter size={16} className="text-primary" />
                  <span>KATEGORIE GŁOSOWAŃ:</span>
                </span>
                
                <button 
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 px-3 py-2 rounded-pill fw-bold transition-all ${categoryFilter === 'important' ? 'btn-warning text-dark shadow' : 'btn-outline-secondary text-light'}`}
                  onClick={() => setCategoryFilter('important')}
                  title="Ukrywa wnioski formalne, przerwy, sprawdzanie quorum i kwestie proceduralne"
                >
                  <Flame size={16} className={categoryFilter === 'important' ? 'text-danger' : 'text-warning'} />
                  <span>Ważne (bez formalnych i przerw)</span>
                </button>

                <button 
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 px-3 py-2 rounded-pill fw-bold transition-all ${categoryFilter === 'bills' ? 'btn-info text-dark shadow' : 'btn-outline-secondary text-light'}`}
                  onClick={() => setCategoryFilter('bills')}
                  title="Pokazuje wyłacznie projekty ustaw, uchwał i sprawozdania komisji"
                >
                  <FileText size={16} />
                  <span>Tylko Ustawy i Uchwały</span>
                </button>

                <button 
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 px-3 py-2 rounded-pill fw-bold transition-all ${categoryFilter === 'all' ? 'btn-primary text-light shadow' : 'btn-outline-secondary text-light'}`}
                  onClick={() => setCategoryFilter('all')}
                  title="Pokazuje komplet głosowań bez żadnego odcinania"
                >
                  <Layers size={16} />
                  <span>Wszystkie głosowania</span>
                </button>

                <button 
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 px-3 py-2 rounded-pill fw-bold transition-all ${categoryFilter === 'procedural' ? 'btn-secondary text-light shadow' : 'btn-outline-secondary text-light'}`}
                  onClick={() => setCategoryFilter('procedural')}
                  title="Pokazuje wyłącznie kwestie formalne, quorum, przerwy i odroczenia"
                >
                  <Settings size={16} />
                  <span>Wnioski formalne / Quorum</span>
                </button>
              </div>

              <div className="small text-muted font-monospace">
                Aktywny filtr: <span className="text-primary fw-bold">{categoryFilter.toUpperCase()}</span>
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

            // Calculate total votings count to display before expanding
            const totalVotingsCount = proceeding.votings_count !== undefined
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
                      
                      <span className="badge bg-info text-dark px-3 py-2 fs-6 d-flex align-items-center gap-1 shadow-sm" title="Ogólna liczba głosowań zarejestrowana dla tego posiedzenia">
                        <span>📊 Głosowań:</span>
                        <strong className="fs-6">{totalVotingsCount}</strong>
                      </span>

                      <span className="badge bg-body-secondary text-light border border-secondary d-flex align-items-center gap-2 px-3 py-2 fs-6">
                        <Calendar size={16} className="text-primary" />
                        <span>{displayDate}</span>
                      </span>
                    </div>
                  </button>
                </h2>

                {/* Expanded Accordion Body (List of Days & Votings) */}
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
                      <div>
                        {/* Sub-header inside Proceeding: Multi-day toggle actions */}
                        {cacheEntry.data.days.length > 1 && (
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 mb-3 border-bottom border-secondary">
                            <span className="text-muted small fw-bold">
                              🗓️ POSIEDZENIE WIELODNIOWE ({cacheEntry.data.days.length} dni obrad)
                            </span>
                            <div className="d-flex gap-2">
                              <button 
                                type="button"
                                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                onClick={() => expandAllDaysForProceeding(proceeding.number, cacheEntry.data.days)}
                              >
                                <Maximize2 size={14} /> <span>Rozwiń wszystkie dni</span>
                              </button>
                              <button 
                                type="button"
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                onClick={() => collapseAllDaysForProceeding(proceeding.number, cacheEntry.data.days)}
                              >
                                <Minimize2 size={14} /> <span>Zwiń wszystkie dni</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of Days (Each Day is a nested collapsible card!) */}
                        <div className="d-flex flex-column gap-3">
                          {cacheEntry.data.days.map((day) => {
                            const dayKey = `${proceeding.number}-${day.date}`;
                            const isDayExpanded = expandedDays.has(dayKey);
                            const filteredDayVotings = filterVotingsByCategory(day.votings);

                            // Count how many important votings occurred on this day
                            const importantCount = day.votings.filter(v => getVotingCategory(v) !== 'procedural').length;

                            return (
                              <div key={day.date} className="card bg-body-tertiary border border-secondary shadow-sm rounded-3 overflow-hidden">
                                {/* Clickable Day Header */}
                                <div 
                                  className="card-header bg-body p-3 p-md-4 d-flex justify-content-between align-items-center flex-wrap gap-3"
                                  onClick={() => toggleDay(proceeding.number, day.date)}
                                  style={{ cursor: "pointer", userSelect: "none" }}
                                  role="button"
                                  aria-expanded={isDayExpanded}
                                >
                                  <div className="d-flex align-items-center gap-3 flex-wrap">
                                    <span className="badge bg-primary px-3 py-2 fs-6 shadow-sm">
                                      📅 {day.date}
                                    </span>
                                    <h4 className="h5 fw-bold mb-0 text-light">
                                      Dzień obrad: {new Date(day.date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h4>
                                  </div>

                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <span className="badge bg-secondary px-3 py-2 fs-6" title="Wszystkie głosowania przeprowadzone tego dnia">
                                      Głosowań w dniu: {day.votings.length}
                                    </span>
                                    <span className="badge bg-warning text-dark px-3 py-2 fs-6 d-flex align-items-center gap-1" title="Liczba głosowań merytorycznych i ustaw (bez wniosków formalnych)">
                                      <Flame size={14} />
                                      <span>Ważnych: {importantCount}</span>
                                    </span>
                                    
                                    <button 
                                      type="button" 
                                      className="btn btn-sm btn-outline-secondary text-light d-flex align-items-center gap-1 ms-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDay(proceeding.number, day.date);
                                      }}
                                    >
                                      {isDayExpanded ? (
                                        <>
                                          <Minimize2 size={16} /> <span>Zwiń dzień</span>
                                        </>
                                      ) : (
                                        <>
                                          <Maximize2 size={16} /> <span>Rozwiń dzień</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Collapsible Votings List for this Day */}
                                {isDayExpanded && (
                                  <div className="card-body p-0 border-top border-secondary">
                                    {filteredDayVotings.length === 0 ? (
                                      <div className="p-4 text-center text-muted bg-body">
                                        <Filter size={32} className="mb-2 text-secondary opacity-50" />
                                        <p className="mb-0 fs-6">
                                          Brak głosowań w kategorii <strong>"{categoryFilter.toUpperCase()}"</strong> dla tego dnia.
                                        </p>
                                        <button 
                                          type="button" 
                                          className="btn btn-link btn-sm text-primary text-decoration-none mt-1"
                                          onClick={() => setCategoryFilter('all')}
                                        >
                                          Pokaż wszystkie głosowania ({day.votings.length})
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="list-group list-group-flush border-0">
                                        {filteredDayVotings.map((voting) => {
                                          const cat = getVotingCategory(voting);
                                          return (
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
                                                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                                    <h5 className="mb-0 fw-bold text-light fs-6">{voting.title}</h5>
                                                    {cat === 'bill' && (
                                                      <span className="badge bg-info text-dark small">📜 Ustawa / Uchwała</span>
                                                    )}
                                                    {cat === 'procedural' && (
                                                      <span className="badge bg-secondary small">⚙️ Formalne / Quorum</span>
                                                    )}
                                                  </div>
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
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
