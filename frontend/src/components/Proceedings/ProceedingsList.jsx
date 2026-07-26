import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, Search, RefreshCw, AlertCircle, ChevronRight, CheckCircle2, XCircle, Maximize2, Minimize2 } from 'lucide-react';
import VotingDetailsView from '../VotingList/VotingDetailsView';
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

  // Selected voting for the detail view/modal
  const [selectedVoting, setSelectedVoting] = useState(null);

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
          // Auto-expand the latest proceeding by default to make the page feel alive!
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
    // If already loaded or currently loading, skip
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

  // Toggle all expand/collapse
  const toggleAll = () => {
    if (expandedProceedings.size === proceedings.length) {
      setExpandedProceedings(new Set());
    } else {
      const allNums = proceedings.map((p) => p.number);
      setExpandedProceedings(new Set(allNums));
      allNums.forEach((num) => fetchVotingsForProceeding(num));
    }
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
      <div className="proceedings-loading">
        <div className="spinner"></div>
        <h3>Ładowanie posiedzeń Sejmu...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proceedings-error">
        <AlertCircle size={32} />
        <h3>Błąd połączenia</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <div className="proceedings-container">
      {/* Detail Modal / Overlay when a voting is clicked */}
      {selectedVoting && (
        <VotingDetailsView 
          voting={selectedVoting.voting} 
          context={{ sitting: selectedVoting.sitting, date: selectedVoting.date }}
          onClose={() => setSelectedVoting(null)} 
        />
      )}

      {/* Page Header & Search Bar */}
      <div className="proceedings-top-bar">
        <div className="proceedings-title-area">
          <h2>Posiedzenia Sejmu</h2>
          <p className="proceedings-subtitle">
            Rozwiń posiedzenie z listy poniżej, aby przeglądać poszczególne głosowania i zapoznać się ze szczegółowymi wynikami oraz drukami sejmowymi.
          </p>
        </div>

        <div className="proceedings-actions">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Szukaj posiedzenia po numerze, dacie lub tytule..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="proceedings-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>
            )}
          </div>

          <button className="toggle-all-btn" onClick={toggleAll} title="Rozwiń lub zwiń wszystkie posiedzenia">
            {expandedProceedings.size === proceedings.length ? (
              <>
                <Minimize2 size={16} />
                <span>Zwiń wszystkie</span>
              </>
            ) : (
              <>
                <Maximize2 size={16} />
                <span>Rozwiń wszystkie</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Accordion List of Proceedings */}
      <div className="proceedings-accordion-list">
        {filteredProceedings.length === 0 ? (
          <div className="no-results-box">
            <AlertCircle size={28} />
            <p>Nie znaleziono posiedzeń spełniających kryteria wyszukiwania.</p>
          </div>
        ) : (
          filteredProceedings.map((proceeding) => {
            const isExpanded = expandedProceedings.has(proceeding.number);
            const cacheEntry = votingsCache[proceeding.number];
            const datesList = proceeding.dates || [];
            const displayDate = datesList.length > 0 
              ? (datesList.length === 1 ? datesList[0] : `${datesList[0]} - ${datesList[datesList.length - 1]}`)
              : 'Brak daty';

            return (
              <div 
                key={proceeding.number} 
                className={`proceeding-accordion-item ${isExpanded ? 'expanded' : ''}`}
                id={`proceeding-item-${proceeding.number}`}
              >
                {/* Clickable Accordion Header */}
                <div 
                  className="proceeding-accordion-header" 
                  onClick={() => toggleProceeding(proceeding.number)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="header-left">
                    <span className="proceeding-number-pill">Posiedzenie nr {proceeding.number}</span>
                    <span className="proceeding-date-badge">
                      <Calendar size={15} />
                      <span>{displayDate}</span>
                    </span>
                  </div>

                  <div className="header-main-title">
                    <h3>{proceeding.title}</h3>
                  </div>

                  <div className="header-right">
                    <span className="expand-indicator">
                      {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Accordion Body (List of Votings) */}
                {isExpanded && (
                  <div className="proceeding-accordion-content">
                    {cacheEntry?.loading ? (
                      <div className="accordion-loading-box">
                        <div className="spinner-small"></div>
                        <span>Pobieranie listy głosowań i wyników z archiwum Sejmu...</span>
                      </div>
                    ) : cacheEntry?.error ? (
                      <div className="accordion-error-box">
                        <AlertCircle size={20} />
                        <span>{cacheEntry.error}</span>
                        <button 
                          className="retry-small-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchVotingsForProceeding(proceeding.number);
                          }}
                        >
                          <RefreshCw size={14} /> Odśwież
                        </button>
                      </div>
                    ) : !cacheEntry?.data?.days || cacheEntry.data.days.length === 0 ? (
                      <div className="accordion-empty-box">
                        <p>Brak zarejestrowanych głosowań w systemie dla tego posiedzenia.</p>
                      </div>
                    ) : (
                      <div className="days-votings-wrapper">
                        {cacheEntry.data.days.map((day) => (
                          <div key={day.date} className="day-votings-group">
                            <div className="day-group-header">
                              <span className="day-icon">📅</span>
                              <span className="day-date-text">Głosowania z dnia: {day.date}</span>
                              <span className="day-votings-count">({day.votings.length} głosowań)</span>
                            </div>

                            {/* List of Votings */}
                            <div className="votings-interactive-list">
                              {day.votings.map((voting) => (
                                <div
                                  key={voting.id || voting.voting_number}
                                  className="voting-list-item"
                                  onClick={() => setSelectedVoting({
                                    voting,
                                    sitting: proceeding.number,
                                    date: day.date
                                  })}
                                  title="Kliknij, aby otworzyć szczegóły głosowania i druki"
                                >
                                  <div className="voting-item-num">
                                    <span className="num-badge">#{voting.voting_number}</span>
                                  </div>

                                  <div className="voting-item-info">
                                    <h4 className="voting-item-title">{voting.title}</h4>
                                    {voting.topic && <span className="voting-item-topic">{voting.topic}</span>}
                                  </div>

                                  <div className="voting-item-outcome-area">
                                    <div className="outcome-and-stats">
                                      <span className={`outcome-pill ${voting.results?.passed ? 'passed' : 'failed'}`}>
                                        {voting.results?.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                        <span>{voting.results?.passed ? 'UCHWALONO' : 'ODRZUCONO'}</span>
                                      </span>

                                      <span className="mini-stats-text">
                                        Za: <strong className="yes-text">{voting.results?.yes || 0}</strong> &bull; 
                                        Prz: <strong className="no-text">{voting.results?.no || 0}</strong> &bull; 
                                        Wstrz: <strong className="abstain-text">{voting.results?.abstain || 0}</strong>
                                      </span>
                                    </div>

                                    <div className="voting-item-action">
                                      <span className="action-label">Szczegóły</span>
                                      <ChevronRight size={18} className="arrow-icon" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProceedingsList;
