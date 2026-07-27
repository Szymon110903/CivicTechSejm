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
  Sliders,
  Users
} from 'lucide-react';
import './ClubsDashboard.css';
import ClubsOverview from './ClubsOverview';
import AgreementMatrix from './AgreementMatrix';
import ClubDetailRebels from './ClubDetailRebels';
import ClubComparison from './ClubComparison';
import ClubBehaviorSearch from './ClubBehaviorSearch';

const ClubsDashboard = () => {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClubForRebels, setSelectedClubForRebels] = useState(null);

  // Filter form state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAttendance, setMinAttendance] = useState(0);
  const [closeVotingsOnly, setCloseVotingsOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  // Applied filters state (passed to analytical views in Steps 4 & 5)
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    minAttendance: 0,
    closeVotingsOnly: false,
    activeOnly: true
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
      closeVotingsOnly,
      activeOnly
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setMinAttendance(0);
    setCloseVotingsOnly(false);
    setActiveOnly(true);
    setAppliedFilters({
      fromDate: '',
      toDate: '',
      minAttendance: 0,
      closeVotingsOnly: false,
      activeOnly: true
    });
  };

  // Remove single active filter badge
  const removeFilter = (key) => {
    const updated = { 
      ...appliedFilters, 
      [key]: key === 'closeVotingsOnly' ? false : (key === 'minAttendance' ? 0 : (key === 'activeOnly' ? true : '')) 
    };
    setAppliedFilters(updated);
    if (key === 'fromDate') setFromDate('');
    if (key === 'toDate') setToDate('');
    if (key === 'minAttendance') setMinAttendance(0);
    if (key === 'closeVotingsOnly') setCloseVotingsOnly(false);
    if (key === 'activeOnly') setActiveOnly(true);
  };

  // Check if any filter is currently applied
  const hasActiveFilters = Boolean(
    appliedFilters.fromDate || 
    appliedFilters.toDate || 
    appliedFilters.minAttendance > 0 || 
    appliedFilters.closeVotingsOnly ||
    appliedFilters.activeOnly === false
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
    <div className="clubs-dashboard-wrapper container-fluid py-4">
      {/* 1. Header Section */}
      <header className="mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h1 className="h2 fw-bold text-white mb-0">Analityka Klubów i Partii</h1>
          <span className="badge rounded-pill bg-primary d-inline-flex align-items-center gap-2 px-3 py-2 fs-6">
            <Briefcase size={16} />
            <span>Kadencja 10 Sejmu RP</span>
          </span>
        </div>
        <p className="text-muted fs-6 mb-0">
          Kompleksowy pulpit nawigacyjny do analizy dyscypliny klubowej, spójności wewnętrznej, frekwencji oraz taktycznych koalicji w głosowaniach parlamentarnych.
        </p>
      </header>

      {/* 2. Sub-navigation Tabs (Bootstrap Nav Pills) */}
      <ul className="nav nav-pills nav-pills-scrollable gap-2 pb-3 mb-4 border-bottom border-secondary" role="tablist">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <li className="nav-item" key={tab.id} role="presentation">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`nav-link d-flex align-items-center gap-2 py-2 px-3 ${isActive ? 'active bg-primary text-white fw-semibold shadow-sm' : 'text-light bg-dark border border-secondary'}`}
                role="tab"
                aria-selected={isActive}
              >
                <TabIcon size={18} />
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 3. Global Analytics Filter Bar (Bootstrap Card) */}
      <section className="card bg-dark border-secondary mb-4 shadow-sm" aria-label="Globalny Pasek Filtrów">
        <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-2 fw-semibold text-white">
            <Sliders size={18} className="text-info" />
            <span>Globalne Filtry Analityczne</span>
          </div>
          <button 
            type="button" 
            onClick={handleResetFilters} 
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
            title="Zresetuj wszystkie filtry do domyślnych"
          >
            <RotateCcw size={14} />
            <span>Resetuj</span>
          </button>
        </div>

        <div className="card-body py-3">
          <form onSubmit={handleApplyFilters} className="row g-3 align-items-end">
            {/* Przedział Dat */}
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label d-flex align-items-center gap-1 text-light small fw-bold mb-1">
                <Calendar size={14} /> Przedział czasowy
              </label>
              <div className="input-group input-group-sm mb-1">
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)}
                  className="form-control form-control-dark" 
                  aria-label="Data od"
                />
                <span className="input-group-text bg-secondary border-secondary text-white">–</span>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)}
                  className="form-control form-control-dark" 
                  aria-label="Data do"
                />
              </div>
              <div className="d-flex gap-1">
                <button type="button" onClick={() => handleQuickDate(30)} className="btn btn-outline-secondary btn-sm py-0 px-2 small">30 dni</button>
                <button type="button" onClick={() => handleQuickDate(90)} className="btn btn-outline-secondary btn-sm py-0 px-2 small">3 mies.</button>
                <button type="button" onClick={() => handleQuickDate(0)} className="btn btn-outline-secondary btn-sm py-0 px-2 small">Wszystkie</button>
              </div>
            </div>

            {/* Minimalna Frekwencja */}
            <div className="col-12 col-md-6 col-xl-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label d-flex align-items-center gap-1 text-light small fw-bold mb-0">
                  <Percent size={14} /> Min. Frekwencja
                </label>
                <span className="badge bg-info text-dark font-monospace">{minAttendance}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={minAttendance} 
                onChange={(e) => setMinAttendance(e.target.value)}
                className="form-range"
                aria-label="Suwak minimalnej frekwencji"
              />
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.7rem' }}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Ważne / Stykowe Głosowania */}
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label d-flex align-items-center gap-1 text-light small fw-bold mb-1">
                <Zap size={14} /> Kategoria głosowań
              </label>
              <div className="card bg-secondary bg-opacity-25 border-secondary p-2">
                <div className="form-check form-switch mb-0 d-flex align-items-center justify-content-between ps-0">
                  <label className="form-check-label text-light small mb-0 pe-2" htmlFor="closeVotingsSwitch" style={{ cursor: 'pointer' }}>
                    Tylko stykowe (40–60% poparcia)
                  </label>
                  <input 
                    className="form-check-input ms-0 float-none" 
                    type="checkbox" 
                    role="switch" 
                    id="closeVotingsSwitch"
                    checked={closeVotingsOnly} 
                    onChange={(e) => setCloseVotingsOnly(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Zakres Posłów / Mandatów */}
            <div className="col-12 col-md-6 col-xl-2">
              <label className="form-label d-flex align-items-center gap-1 text-light small fw-bold mb-1">
                <Users size={14} /> Zakres posłów
              </label>
              <div className="card bg-secondary bg-opacity-25 border-secondary p-2">
                <div className="form-check form-switch mb-0 d-flex align-items-center justify-content-between ps-0" title="Gdy włączone, uwzględnia tylko 460 aktualnych posłów. Gdy wyłączone, uwzględnia wszystkich z kadencji (np. wygasłe mandaty).">
                  <label className="form-check-label text-light small mb-0 pe-2" htmlFor="activeOnlySwitch" style={{ cursor: 'pointer' }}>
                    Tylko aktualni (460)
                  </label>
                  <input 
                    className="form-check-input ms-0 float-none" 
                    type="checkbox" 
                    role="switch" 
                    id="activeOnlySwitch"
                    checked={activeOnly} 
                    onChange={(e) => setActiveOnly(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Przycisk Zastosuj */}
            <div className="col-12 col-md-6 col-xl-2">
              <button type="submit" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 shadow-sm py-2">
                <Check size={18} />
                <span className="fw-semibold">Zastosuj</span>
              </button>
            </div>
          </form>

          {/* Aktywne Badges */}
          {hasActiveFilters && (
            <div className="d-flex align-items-center flex-wrap gap-2 mt-3 pt-3 border-top border-secondary">
              <span className="small text-muted fw-semibold">Aktywne filtry:</span>
              {appliedFilters.fromDate && (
                <span className="badge bg-secondary d-inline-flex align-items-center gap-1 py-1 px-2">
                  Od: {appliedFilters.fromDate}
                  <button type="button" onClick={() => removeFilter('fromDate')} className="btn-close btn-close-white" style={{ fontSize: '0.5rem' }} aria-label="Usuń filtr od daty"></button>
                </span>
              )}
              {appliedFilters.toDate && (
                <span className="badge bg-secondary d-inline-flex align-items-center gap-1 py-1 px-2">
                  Do: {appliedFilters.toDate}
                  <button type="button" onClick={() => removeFilter('toDate')} className="btn-close btn-close-white" style={{ fontSize: '0.5rem' }} aria-label="Usuń filtr do daty"></button>
                </span>
              )}
              {appliedFilters.minAttendance > 0 && (
                <span className="badge bg-secondary d-inline-flex align-items-center gap-1 py-1 px-2">
                  Min. frekwencja: {appliedFilters.minAttendance}%
                  <button type="button" onClick={() => removeFilter('minAttendance')} className="btn-close btn-close-white" style={{ fontSize: '0.5rem' }} aria-label="Usuń filtr minimalnej frekwencji"></button>
                </span>
              )}
              {appliedFilters.closeVotingsOnly && (
                <span className="badge bg-secondary d-inline-flex align-items-center gap-1 py-1 px-2">
                  Tylko stykowe głosowania
                  <button type="button" onClick={() => removeFilter('closeVotingsOnly')} className="btn-close btn-close-white" style={{ fontSize: '0.5rem' }} aria-label="Usuń filtr stykowe głosowania"></button>
                </span>
              )}
              {appliedFilters.activeOnly === false && (
                <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1 py-1 px-2">
                  Wszyscy posłowie w kadencji (z historycznymi)
                  <button type="button" onClick={() => removeFilter('activeOnly')} className="btn-close" style={{ fontSize: '0.5rem' }} aria-label="Przełącz na tylko aktualnych posłów"></button>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. Main Target Container for Analytical Views */}
      <main className="clubs-content-area">
        {activeTab === 'overview' && (
          <ClubsOverview 
            appliedFilters={appliedFilters} 
            onSelectClub={(clubId) => {
              setSelectedClubForRebels(clubId);
              setActiveTab('rebels');
            }} 
          />
        )}

        {activeTab === 'matrix' && (
          <AgreementMatrix appliedFilters={appliedFilters} />
        )}

        {activeTab === 'rebels' && (
          <ClubDetailRebels 
            appliedFilters={appliedFilters} 
            initialClubId={selectedClubForRebels} 
          />
        )}

        {activeTab === 'compare' && (
          <ClubComparison appliedFilters={appliedFilters} />
        )}

        {activeTab === 'search' && (
          <ClubBehaviorSearch appliedFilters={appliedFilters} />
        )}
      </main>
    </div>
  );
};

export default ClubsDashboard;
