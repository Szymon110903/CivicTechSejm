import React, { useState, useEffect } from 'react';
import VotingCard from './VotingCard';
import './VotingList.css';

const PAGE_SIZE = 12;

const VotingList = ({ onViewDetails }) => {
  const [votings, setVotings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchVotings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/votings/?page=${page}&limit=${PAGE_SIZE}`);
        if (!response.ok) {
          throw new Error('Failed to fetch votings');
        }
        const data = await response.json();
        setVotings(data.items || []);
        setTotalPages(data.pages || 1);
        setTotalItems(data.total || 0);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching votings.');
      } finally {
        setLoading(false);
      }
    };

    fetchVotings();
  }, [page]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Votings</h3>
        <p>{error}</p>
        <button className="pagination-button" onClick={() => setPage(1)}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="voting-list-container">
      <div className="voting-list-header">
        <h2>Sejm Votings</h2>
        <p>Browse all recent parliamentary votes, outcomes, and party decisions.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading votings data...</p>
        </div>
      ) : (
        <>
          <div className="voting-grid">
            {votings.length > 0 ? (
              votings.map((voting) => (
                <VotingCard
                  key={voting.id}
                  voting={voting}
                  onClick={() => onViewDetails(voting)}
                />
              ))
            ) : (
              <p>No votings found. Try running the backend import first.</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                &larr; Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages} <span style={{ opacity: 0.5 }}>({totalItems} total)</span>
              </span>
              <button
                className="pagination-button"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VotingList;
