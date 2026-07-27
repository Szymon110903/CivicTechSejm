import React, { useState } from 'react';
import { 
  Briefcase, 
  BarChart2, 
  Grid, 
  GitCompare, 
  Filter, 
  AlertTriangle, 
  RotateCcw, 
  Check, 
  Calendar, 
  Percent, 
  Zap, 
  X,
  Sliders
} from 'lucide-react';
import './ClubsDashboard.css';

const ClubsDashboard = () => {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('overview');

  // Filter form state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAttendance, setMinAttendance] = useState(0);
  const [closeVotingsOnly, setCloseVotingsOnly] = useState(false);

  // Applied filters state (passed to analytical views in Steps 4 & 5)
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    minAttendance: 0,
    closeVotingsOnly: false
  });

  // Handle Quick Date Selection
  const handleQuickDate = (days) => {
    if (days === 0) {
      setFromDate('');
      setToDate('');
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    }
  };

  // Apply filters button handler
  const handleApplyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters({
      fromDate,
      toDate,
      minAttendance: Number(minAttendance),
      closeVotingsOnly
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setMinAttendance(0);
    setCloseVotingsOnly(false);
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      minAttendance: 0,
      closeVotingsOnly: false
    });
  };

  // Remove single active filter badge
  const removeFilter = (key) => {
    const updated = { ...appliedFilters, [key]: key === 'closeVotingsOnly' ? false : (key === 'minAttendance' ? 0 : '') };
    setAppliedFilters(updated);
    if (key === 'fromDate') setFromDate('');
    if (key === 'toDate') setToDate('');
    if (key === 'minAttendance') setMinAttendance(0);
    if (key === 'closeVotingsOnly') setCloseVotingsOnly(false);
  };

  // Check if any filter is currently applied
  const hasActiveFilters = Boolean(
    appliedFilters.fromDate || 
    appliedFilters.toDate || 
    appliedFilters.minAttendance > 0 || 
    appliedFilters.closeVotingsOnly
  );

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Przegląd Klubów', icon: BarChart2, desc: 'Zestawienie kafelków wszystkich klubów i kół ze wskaźnikami frekwencji, spójności (cohesion) oraz podziałem głosów.' },
    { id: 'matrix', label: 'Macierz Zgodności NxN', icon: Grid, desc: 'Interaktywna heatmapa zgodności głosowań między każdą parą klubów w Sejmie RP.' },
    { id: 'rebels', label: 'Dyscyplina i Buntownicy', icon: AlertTriangle, desc: 'Szczegółowy ranking posłów najczęściej głosujących przeciwko linii własnego klubu oraz największych absencji.' },
    { id: 'compare', label: 'Porównywarka Klubów', icon: GitCompare, desc: 'Bezpośrednie porównanie 2–3 wybranych klubów obok siebie w wybranym przedziale czasowym.' },
    { id: 'search', label: 'Wyszukiwarka Behawioralna', icon: Filter, desc: 'Wyszukiwanie konkretnych głosowań według zachowania klubów, progu jednomyślności oraz rozłamów w koalicji.' }
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];
  const IconComponent = currentTabInfo.icon;

  return (
    <div className="clubs-dashboard">
      {/* 1. Header Section */}
      <header className="clubs-header">
        <div className="clubs-title-row">
          <h1 className="clubs-title">Analityka Klubów i Partii</h1>
          <div className="clubs-badge">
            <Briefcase size={16} />
            <span>Kadencja 10 Sejmu RP</span>
          </div>
        </div>
        <p className="clubs-subtitle">
          Kompleksowy pulpit nawigacyjny do analizy dyscypliny klubowej, spójności wewnętrznej, frekwencji oraz taktycznych koalicji w głosowaniach parlamentarnych.
        </p>
      </header>

      {/* 2. Sub-navigation Tabs */}
      <nav className="clubs-tabs" aria-label="Zakładki analityczne">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`club-tab-btn ${isActive ? 'active' : ''}`}
            >
              <TabIcon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Glassmorphism Global Analytics Filter Bar */}
      <section className="analytics-filter-bar" aria-label="Globalny Pasek Filtrów">
        <div className="filter-bar-header">
          <div className="filter-bar-title">
            <Sliders size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            <span>Globalne Filtry Analityczne</span>
          </div>
          <button 
            type="button" 
            onClick={handleResetFilters} 
            className="filter-bar-reset-btn"
            title="Zresetuj wszystkie filtry do domyślnych"
          >
            <RotateCcw size={14} />
            <span>Resetuj</span>
          </button>
        </div>

        <form onSubmit={handleApplyFilters} className="filter-grid">
          {/* Przedział Dat */}
          <div className="filter-group">
            <div className="filter-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} /> Przedział czasowy
              </span>
            </div>
            <div className="filter-input-row">
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)}
                className="filter-date-input" 
                placeholder="Od daty"
                aria-label="Data od"
              />
              <span style={{ color: 'var(--text)' }}>–</span>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)}
                className="filter-date-input" 
                placeholder="Do daty"
                aria-label="Data do"
              />
            </div>
            <div className="quick-date-pills">
              <button type="button" onClick={() => handleQuickDate(30)} className="date-pill-btn">30 dni</button>
              <button type="button" onClick={() => handleQuickDate(90)} className="date-pill-btn">3 mies.</button>
              <button type="button" onClick={() => handleQuickDate(0)} className="date-pill-btn">Wszystkie</button>
            </div>
          </div>

          {/* Minimalna Frekwencja */}
          <div className="filter-group">
            <div className="filter-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Percent size={14} /> Min. Frekwencja w Głosowaniu
              </span>
              <span className="filter-label-value">{minAttendance}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={minAttendance} 
              onChange={(e) => setMinAttendance(e.target.value)}
              className="filter-range-slider"
              aria-label="Suwak minimalnej frekwencji"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text)' }}>
              <span>0% (Dowolna)</span>
              <span>50% (Kworum)</span>
              <span>100% (Pełna)</span>
            </div>
          </div>

          {/* Ważne / Stykowe Głosowania */}
          <div className="filter-group">
            <div className="filter-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={14} /> Kategoria głosowań
              </span>
            </div>
            <label className={`filter-toggle-card ${closeVotingsOnly ? 'active' : ''}`}>
              <span className="toggle-label-text">Tylko stykowe (40–60% poparcia)</span>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={closeVotingsOnly} 
                  onChange={(e) => setCloseVotingsOnly(e.target.checked)}
                  aria-label="Przełącznik tylko stykowe głosowania"
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>

          {/* Przycisk Zastosuj */}
          <div className="filter-group">
            <button type="submit" className="filter-apply-btn">
              <Check size={18} />
              <span>Zastosuj Filtry</span>
            </button>
          </div>
        </form>

        {/* Aktywne Badges */}
        {hasActiveFilters && (
          <div className="active-filters-row">
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>Aktywne filtry:</span>
            {appliedFilters.fromDate && (
              <span className="active-filter-badge">
                Od: {appliedFilters.fromDate}
                <button type="button" onClick={() => removeFilter('fromDate')} aria-label="Usuń filtr od daty">
                  <X size={13} />
                </button>
              </span>
            )}
            {appliedFilters.toDate && (
              <span className="active-filter-badge">
                Do: {appliedFilters.toDate}
                <button type="button" onClick={() => removeFilter('toDate')} aria-label="Usuń filtr do daty">
                  <X size={13} />
                </button>
              </span>
            )}
            {appliedFilters.minAttendance > 0 && (
              <span className="active-filter-badge">
                Min. frekwencja: {appliedFilters.minAttendance}%
                <button type="button" onClick={() => removeFilter('minAttendance')} aria-label="Usuń filtr minimalnej frekwencji">
                  <X size={13} />
                </button>
              </span>
            )}
            {appliedFilters.closeVotingsOnly && (
              <span className="active-filter-badge">
                Tylko stykowe głosowania
                <button type="button" onClick={() => removeFilter('closeVotingsOnly')} aria-label="Usuń filtr stykowe głosowania">
                  <X size={13} />
                </button>
              </span>
            )}
          </div>
        )}
      </section>

      {/* 4. Skeleton Preview / Target Container (For Step 4 & Step 5) */}
      <main className="clubs-content-area">
        <div className="skeleton-preview-card">
          <div className="skeleton-icon-wrapper">
            <IconComponent size={36} />
          </div>
          <h2 className="skeleton-title">{currentTabInfo.label}</h2>
          <p className="skeleton-description">
            {currentTabInfo.desc}
          </p>

          <div className="skeleton-params-box">
            <div className="skeleton-params-title">
              Podgląd parametrów zapytania do API (Gotowe do Kroku 4 i 5):
            </div>
            <pre className="skeleton-params-json">
{JSON.stringify({
  active_view: activeTab,
  query_params: {
    term: 10,
    from_date: appliedFilters.fromDate || null,
    to_date: appliedFilters.toDate || null,
    min_attendance: appliedFilters.minAttendance > 0 ? appliedFilters.minAttendance : null,
    close_votings_only: appliedFilters.closeVotingsOnly
  }
}, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClubsDashboard;
