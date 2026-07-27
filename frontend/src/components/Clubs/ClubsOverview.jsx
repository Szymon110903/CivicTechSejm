import React, { useState, useEffect } from 'react';
import { Users, Award, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import './ClubsOverview.css';

const ClubsOverview = ({ appliedFilters, onSelectClub }) => {
  const [clubsData, setClubsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClubsStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ term: '10' });
        if (appliedFilters.fromDate) queryParams.append('date_from', appliedFilters.fromDate);
        if (appliedFilters.toDate) queryParams.append('date_to', appliedFilters.toDate);
        if (appliedFilters.minAttendance > 0) queryParams.append('min_attendance', String(appliedFilters.minAttendance));
        if (appliedFilters.closeVotingsOnly) queryParams.append('close_votings_only', 'true');
        if (appliedFilters.activeOnly !== undefined) queryParams.append('active_only', appliedFilters.activeOnly ? 'true' : 'false');

        const response = await fetch(`/api/clubs?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Błąd pobierania danych klubów: HTTP ${response.status}`);
        }

        const data = await response.json();
        setClubsData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubsStats();
  }, [appliedFilters]);

  // Helper to get bootstrap text color class based on percentage metric
  const getMetricColorClass = (val) => {
    if (val >= 95) return 'text-success';
    if (val >= 85) return 'text-warning';
    return 'text-danger';
  };

  if (loading) {
    return (
      <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
        <div className="card-body py-5">
          <Loader2 size={36} className="text-info mb-3" style={{ animation: 'spin 1s linear infinite' }} />
          <h3 className="h4 text-white">Kalkulacja wskaźników dyscypliny i frekwencji klubów...</h3>
          <p className="text-muted mb-0">Pobieranie zagregowanych statystyk dla wybranego przedziału.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-3 my-4 shadow" role="alert">
        <AlertCircle size={32} className="flex-shrink-0" />
        <div>
          <h4 className="alert-heading h5 mb-1">Wystąpił błąd podczas ładowania statystyk klubowych</h4>
          <p className="mb-0 small">{error}</p>
        </div>
      </div>
    );
  }

  if (!clubsData || clubsData.length === 0) {
    return (
      <div className="card bg-dark border-secondary p-5 text-center my-4 shadow">
        <div className="card-body py-4">
          <Award size={36} className="text-muted mb-3" />
          <h3 className="h4 text-white">Brak danych dla wybranych filtrów</h3>
          <p className="text-muted mb-0">Spróbuj rozszerzyć przedział dat lub zmniejszyć próg minimalnej frekwencji.</p>
        </div>
      </div>
    );
  }

  // Find total votings evaluated (from first club)
  const evaluatedVotingsCount = clubsData[0]?.total_votings || 0;
  const totalMpsCount = clubsData.reduce((sum, c) => sum + (c.members_count || 0), 0);

  return (
    <div className="clubs-overview-container">
      {/* Summary Cards Row (Bootstrap Grid) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card bg-dark border-secondary h-100 shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded bg-primary bg-opacity-25 text-primary">
                  <Award size={24} />
                </div>
                <div>
                  <div className="small text-muted">Liczba klubów i kół</div>
                  <div className="h3 fw-bold text-white mb-0 font-monospace">{clubsData.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card bg-dark border-secondary h-100 shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded bg-info bg-opacity-25 text-info">
                  <Users size={24} />
                </div>
                <div>
                  <div className="small text-muted">Posłowie uwzględnieni</div>
                  <div className="h3 fw-bold text-white mb-0 font-monospace">{totalMpsCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card bg-dark border-secondary h-100 shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between py-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded bg-success bg-opacity-25 text-success">
                  <Award size={24} />
                </div>
                <div>
                  <div className="small text-muted">Badane głosowania</div>
                  <div className="h3 fw-bold text-success mb-0 font-monospace">{evaluatedVotingsCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Club Cards (Bootstrap Cards Grid) */}
      <div className="row g-4">
        {clubsData.map((club) => {
          const decisions = club.decisions_breakdown || { YES: 0, NO: 0, ABSTAIN: 0, MIXED: 0 };
          const totalDecisions = (decisions.YES + decisions.NO + decisions.ABSTAIN + decisions.MIXED) || 1;
          
          const yesPct = ((decisions.YES / totalDecisions) * 100).toFixed(1);
          const noPct = ((decisions.NO / totalDecisions) * 100).toFixed(1);
          const abstainPct = ((decisions.ABSTAIN / totalDecisions) * 100).toFixed(1);
          const mixedPct = ((decisions.MIXED / totalDecisions) * 100).toFixed(1);

          return (
            <div key={club.club_id} className="col-12 col-md-6 col-xl-4">
              <div className="card bg-dark border-secondary h-100 shadow card-hover-effect d-flex flex-column">
                {/* Header */}
                <div className="card-header bg-dark border-bottom border-secondary d-flex justify-content-between align-items-start pt-3 pb-2">
                  <div className="pe-2">
                    <h3 className="h5 fw-bold text-white mb-1">{club.name || club.club_id}</h3>
                    <div className="small text-muted d-flex align-items-center gap-1">
                      <Users size={14} />
                      <span>{club.members_count} {club.members_count === 1 ? 'poseł' : (club.members_count >= 2 && club.members_count <= 4 ? 'posłowie' : 'posłów')}</span>
                    </div>
                  </div>
                  <span className="badge bg-secondary text-white font-monospace fs-6 px-2 py-1">
                    {club.club_id}
                  </span>
                </div>

                <div className="card-body d-flex flex-column justify-content-between py-3">
                  {/* Key Metrics Row */}
                  <div className="row g-2 text-center mb-4">
                    <div className="col-4">
                      <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary h-100 d-flex flex-column justify-content-center">
                        <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Frekwencja</div>
                        <div className={`fw-bold font-monospace fs-5 ${getMetricColorClass(club.avg_attendance)}`}>
                          {club.avg_attendance}%
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary h-100 d-flex flex-column justify-content-center">
                        <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Dyscyplina</div>
                        <div className={`fw-bold font-monospace fs-5 ${getMetricColorClass(club.avg_cohesion)}`}>
                          {club.avg_cohesion}%
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary h-100 d-flex flex-column justify-content-center">
                        <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>Poparcie</div>
                        <div className={`fw-bold font-monospace fs-5 ${getMetricColorClass(club.majority_support_percent)}`}>
                          {club.majority_support_percent}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decisions Breakdown (Bootstrap Stacked Progress Bar) */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                      <span className="fw-semibold">Rozkład decyzji</span>
                      <span className="font-monospace text-light">{club.total_votings} głosowań</span>
                    </div>
                    
                    <div className="progress bg-secondary bg-opacity-25" style={{ height: '12px' }} title={`Za: ${yesPct}%, Przeciw: ${noPct}%, Wstrzymano: ${abstainPct}%, Podział: ${mixedPct}%`}>
                      {decisions.YES > 0 && <div className="progress-bar bg-success" role="progressbar" style={{ width: `${yesPct}%` }} aria-valuenow={yesPct} aria-valuemin="0" aria-valuemax="100"></div>}
                      {decisions.NO > 0 && <div className="progress-bar bg-danger" role="progressbar" style={{ width: `${noPct}%` }} aria-valuenow={noPct} aria-valuemin="0" aria-valuemax="100"></div>}
                      {decisions.ABSTAIN > 0 && <div className="progress-bar bg-warning" role="progressbar" style={{ width: `${abstainPct}%` }} aria-valuenow={abstainPct} aria-valuemin="0" aria-valuemax="100"></div>}
                      {decisions.MIXED > 0 && <div className="progress-bar progress-bar-purple" role="progressbar" style={{ width: `${mixedPct}%` }} aria-valuenow={mixedPct} aria-valuemin="0" aria-valuemax="100"></div>}
                    </div>

                    <div className="d-flex justify-content-around flex-wrap gap-1 mt-2 small text-muted" style={{ fontSize: '0.75rem' }}>
                      <div title="Głosowania, w których klub zagłosował ZA">
                        <span className="legend-dot-bs yes"></span>Za: {decisions.YES}
                      </div>
                      <div title="Głosowania, w których klub zagłosował PRZECIW">
                        <span className="legend-dot-bs no"></span>Przeciw: {decisions.NO}
                      </div>
                      <div title="Głosowania, w których klub się WSTRZYMAŁ">
                        <span className="legend-dot-bs abstain"></span>Wstrz.: {decisions.ABSTAIN}
                      </div>
                      {decisions.MIXED > 0 && (
                        <div title="Głosowania z rozłamem w klubie (brak jednej większościowej decyzji)">
                          <span className="legend-dot-bs mixed"></span>Podział: {decisions.MIXED}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="card-footer bg-dark border-top border-secondary pt-3 mt-auto">
                  <button 
                    type="button" 
                    onClick={() => onSelectClub(club.club_id)}
                    className="btn btn-outline-info w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  >
                    <span>Szczegóły i buntownicy</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClubsOverview;
