import React, { useState, useEffect } from 'react';
import { AlertTriangle, UserX, CheckCircle, Users, Award, Loader2, AlertCircle, Calendar } from 'lucide-react';
import './ClubDetailRebels.css';

const ClubDetailRebels = ({ appliedFilters, initialClubId }) => {
  const [clubsList, setClubsList] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(initialClubId || null);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prevInitialClubId, setPrevInitialClubId] = useState(initialClubId);

  // Synchronizowanie zmiany propa initialClubId bez użycia useEffect (React best practice)
  if (initialClubId !== prevInitialClubId) {
    setPrevInitialClubId(initialClubId);
    if (initialClubId) {
      setSelectedClubId(initialClubId);
    }
  }

  // 1. Fetch available clubs list for the selector bar
  useEffect(() => {
    const fetchClubsList = async () => {
      try {
        const response = await fetch('/api/clubs?term=10');
        if (response.ok) {
          const list = await response.json();
          setClubsList(list);
          setSelectedClubId((prev) => prev || initialClubId || (list.length > 0 ? list[0].club_id : null));
        }
      } catch (err) {
        console.error('Failed to fetch clubs list:', err);
      }
    };
    fetchClubsList();
  }, [initialClubId]);

  // 2. Fetch detailed stats and rebels for selectedClubId
  useEffect(() => {
    if (!selectedClubId) return;

    const fetchClubStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ term: '10' });
        if (appliedFilters.fromDate) queryParams.append('from_date', appliedFilters.fromDate);
        if (appliedFilters.toDate) queryParams.append('to_date', appliedFilters.toDate);

        const response = await fetch(`/api/clubs/${selectedClubId}/stats?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Błąd pobierania statystyk klubu: HTTP ${response.status}`);
        }

        const data = await response.json();
        setStatsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubStats();
  }, [selectedClubId, appliedFilters]);

  // Helper for bootstrap rank badge class
  const getRankBadgeClass = (idx) => {
    if (idx === 0) return 'bg-warning text-dark border border-warning';
    if (idx === 1) return 'bg-secondary text-white border border-light';
    if (idx === 2) return 'bg-danger text-white border border-danger';
    return 'bg-dark text-muted border border-secondary';
  };

  return (
    <div className="rebels-container-bs">
      {/* Club Selector Bar (Bootstrap Card & Button Group) */}
      <div className="card bg-dark border-secondary p-3 mb-4 shadow-sm" role="tablist" aria-label="Wybierz klub lub koło">
        <div className="d-flex align-items-center gap-2 overflow-auto flex-nowrap pb-1">
          <span className="small fw-bold text-muted text-uppercase text-nowrap me-2">Wybierz Klub / Koło:</span>
          {clubsList.map((c) => (
            <button
              key={c.club_id}
              type="button"
              role="tab"
              aria-selected={selectedClubId === c.club_id}
              onClick={() => setSelectedClubId(c.club_id)}
              className={`btn btn-sm text-nowrap font-monospace fw-semibold ${selectedClubId === c.club_id ? 'btn-primary shadow-sm' : 'btn-outline-secondary text-light'}`}
            >
              {c.club_id} ({c.members_count})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
          <div className="card-body py-5">
            <Loader2 size={36} className="text-info mb-3" style={{ animation: 'spin 1s linear infinite' }} />
            <h3 className="h4 text-white">Analiza indywidualnych głosowań posłów {selectedClubId}...</h3>
            <p className="text-muted mb-0">Wyliczanie wskaźników buntów i absencji w wybranym przedziale czasowym.</p>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger d-flex align-items-center gap-3 my-4 shadow" role="alert">
          <AlertCircle size={32} className="flex-shrink-0" />
          <div>
            <h4 className="alert-heading h5 mb-1">Wystąpił błąd podczas ładowania danych posłów</h4>
            <p className="mb-0 small">{error}</p>
          </div>
        </div>
      ) : !statsData ? (
        <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
          <div className="card-body py-4">
            <Users size={36} className="text-muted mb-3" />
            <h3 className="h4 text-white">Wybierz klub z paska powyżej</h3>
          </div>
        </div>
      ) : (
        <>
          {/* Club Hero Header (Bootstrap Card) */}
          <div className="card bg-dark border-secondary p-4 mb-4 shadow">
            <div className="row g-3 align-items-center justify-content-between">
              <div className="col-12 col-md-7">
                <h2 className="h3 fw-bold text-white mb-2">{statsData.name || statsData.club_id} ({statsData.club_id})</h2>
                <div className="d-flex align-items-center gap-3 text-muted small flex-wrap">
                  <div className="d-flex align-items-center gap-1">
                    <Users size={16} className="text-info" />
                    <span>{statsData.members_count} posłów</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <Calendar size={16} className="text-primary" />
                    <span>Przeanalizowano {statsData.total_votings} głosowań</span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-5 d-flex justify-content-md-end gap-3">
                <div className="p-3 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                  <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Frekwencja</div>
                  <div className="fw-bold font-monospace fs-4 text-success">{statsData.avg_attendance}%</div>
                </div>
                <div className="p-3 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                  <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Dyscyplina (Cohesion)</div>
                  <div className="fw-bold font-monospace fs-4 text-warning">{statsData.avg_cohesion}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rankings Grid (Bootstrap Row & Columns) */}
          <div className="row g-4">
            {/* Top Rebels Table Card */}
            <div className="col-12 col-xl-6">
              <div className="card bg-dark border-secondary h-100 shadow">
                <div className="card-header bg-dark border-bottom border-secondary pt-3 pb-2">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <AlertTriangle size={20} className="text-warning" />
                    <h3 className="h6 fw-bold text-white mb-0">Ranking Buntowników</h3>
                  </div>
                  <p className="small text-muted mb-1">
                    Posłowie najczęściej głosujący niezgodnie ze stanowiskiem większości klubu.
                  </p>
                </div>

                <div className="card-body p-0">
                  {(!statsData.rebels || statsData.rebels.length === 0) ? (
                    <div className="p-5 text-center my-2">
                      <CheckCircle size={32} className="text-success mb-2" />
                      <div className="fw-bold text-white">Perfekcyjna dyscyplina klubowa!</div>
                      <div className="small text-muted mx-auto mt-1" style={{ maxWidth: '300px' }}>
                        W badanym przedziale żaden poseł tego klubu nie zagłosował przeciwko linii klubu w istotnych głosowaniach.
                      </div>
                    </div>
                  ) : (
                    <table className="table table-dark table-hover align-middle mb-0" aria-label="Ranking posłów buntowników">
                      <thead className="table-secondary">
                        <tr className="small text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>
                          <th className="py-2 px-3">Poz.</th>
                          <th className="py-2 px-3">Poseł</th>
                          <th className="py-2 px-3">Buntów</th>
                          <th className="py-2 px-3 text-end">Wskaźnik</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.rebels.map((mp, idx) => (
                          <tr key={mp.mp_id}>
                            <td className="px-3" style={{ width: '60px' }}>
                              <span className={`badge font-monospace ${getRankBadgeClass(idx)}`}>#{idx + 1}</span>
                            </td>
                            <td className="fw-semibold text-white px-3">{mp.mp_name}</td>
                            <td className="font-monospace fw-bold px-3">{mp.rebel_votes_count}</td>
                            <td className="font-monospace fw-bold text-warning text-end px-3">{mp.rebel_rate_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Top Absentees Table Card */}
            <div className="col-12 col-xl-6">
              <div className="card bg-dark border-secondary h-100 shadow">
                <div className="card-header bg-dark border-bottom border-secondary pt-3 pb-2">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <UserX size={20} className="text-danger" />
                    <h3 className="h6 fw-bold text-white mb-0">Ranking Absencji</h3>
                  </div>
                  <p className="small text-muted mb-1">
                    Posłowie z największą liczbą opuszczonych głosowań w wybranym okresie.
                  </p>
                </div>

                <div className="card-body p-0">
                  {(!statsData.top_absentees || statsData.top_absentees.length === 0) ? (
                    <div className="p-5 text-center my-2">
                      <CheckCircle size={32} className="text-success mb-2" />
                      <div className="fw-bold text-white">Pełna 100% frekwencja!</div>
                      <div className="small text-muted mx-auto mt-1" style={{ maxWidth: '300px' }}>
                        W badanym przedziale czasowym żaden poseł tego klubu nie opuścił ani jednego głosowania.
                      </div>
                    </div>
                  ) : (
                    <table className="table table-dark table-hover align-middle mb-0" aria-label="Ranking absencji posłów">
                      <thead className="table-secondary">
                        <tr className="small text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>
                          <th className="py-2 px-3">Poz.</th>
                          <th className="py-2 px-3">Poseł</th>
                          <th className="py-2 px-3">Absencji</th>
                          <th className="py-2 px-3 text-end">Wskaźnik</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.top_absentees.map((mp, idx) => (
                          <tr key={`${mp.mp_id}-absent`}>
                            <td className="px-3" style={{ width: '60px' }}>
                              <span className={`badge font-monospace ${getRankBadgeClass(idx)}`}>#{idx + 1}</span>
                            </td>
                            <td className="fw-semibold text-white px-3">{mp.mp_name}</td>
                            <td className="font-monospace fw-bold px-3">{mp.absent_votes_count}</td>
                            <td className="font-monospace fw-bold text-danger text-end px-3">{mp.absent_rate_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClubDetailRebels;
