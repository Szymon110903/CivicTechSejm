import React from 'react';
import './VotingList.css';

const VotingCard = ({ voting, onClick }) => {
  const {
    voting_number,
    title,
    topic,
    date,
    sitting,
    results,
    club_results
  } = voting;

  const passed = results.passed;
  const outcomeClass = passed ? 'outcome-passed' : 'outcome-failed';
  const outcomeText = passed ? 'Passed' : 'Failed';

  // Format date if it's an ISO string, else just display it
  const formattedDate = new Date(date).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="voting-card" onClick={onClick}>
      <div className="voting-card-meta">
        <span className="voting-card-date">{formattedDate}</span>
        <span className="voting-card-sitting">Sitting #{sitting} &bull; Vote #{voting_number}</span>
      </div>

      {topic && <span className="voting-card-topic">{topic}</span>}
      
      <h3 className="voting-card-title" title={title}>
        {title}
      </h3>

      <div className={`voting-card-outcome ${outcomeClass}`}>
        {outcomeText} ({results.attendance} attendance)
      </div>

      <div className="voting-stats-grid">
        <div className="stat-item">
          <span className="stat-label">Yes</span>
          <span className="stat-value yes">{results.yes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">No</span>
          <span className="stat-value no">{results.no}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Abstain</span>
          <span className="stat-value abstain">{results.abstain}</span>
        </div>
      </div>

      {club_results && club_results.length > 0 && (
        <div className="club-results-preview">
          <div className="club-result-title">Party Decisions:</div>
          <div className="club-pills">
            {club_results.slice(0, 6).map((cr) => (
              <span key={cr.club_id} className={`club-pill decision-${cr.decision}`}>
                {cr.club_id}
              </span>
            ))}
            {club_results.length > 6 && (
              <span className="club-pill">+{club_results.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingCard;
